import React, { useEffect, useState } from "react";
import { DeviceConnection } from "./DeviceConnection";
import { Button, Callout, Collapse, H3 } from "@blueprintjs/core";
import { encodeInstruction, Instruction } from "./Module";

async function executeInstructions(device: DeviceConnection, modules: Instruction[][]): Promise<void> {
  let cursor = 0;
  for (let i = 0; i <modules.length; ++i) {
    // Set the module start offset.
    await device.poke(0x41D0 + i, cursor);

    // Write the instructions to the scratchpad module data.
    for (let instruction of modules[i]) {
      const encoded = encodeInstruction(instruction);
      if ((0x40C0 + cursor + encoded.length) >= 0x417F) {
        throw new Error("ran out of bytes to write instructions to scratchpad");
      }

      // We add the terminator to each instruction, in case we're interrupted.
      await device.poke(0x40C0 + cursor, [...encoded, 0x00]);
      cursor += encoded.length;
    }

    // Account for the terminator byte.
    cursor += 1;
  }

  // If we didn't write anything, write an empty module so nothing is executed.
  if (cursor === 0) {
    // Instruction.
    await device.poke(0x40C0, 0x00);

    // Module start offset.
    await device.poke(0x41D0, 0x00);
  }

  // Get the mode index we can point at the scratchpad.
  const currentTopMode = await device.peek(0x8008); // EEPROM CurrentTopMode
  const scratchpadMode = Math.min(Math.max(0x88, currentTopMode + 1), 0x8E); // "User 1" - "User 7"

  // Write the scratchpad module ID as the start module for the selected mode.
  // This seems to be set in the EEPROM even for the scratchpad modules.
  await device.poke(0x8018 + (scratchpadMode - 0x88), 0xC0);

  // Set the in-memory high mode to include our newly assigned scratchpad mode.
  await device.poke(0x41F3, scratchpadMode); // RAM CurrentTopMode

  // Switch to the new scratchpad mode.
  await device.poke(0x407B, scratchpadMode); // Selected Menu Item
  await device.poke(0x4070, [0x04, 0x12]); // Exit Menu, Select New Mode

  // Wait some time for the device to execute the commands.
  return new Promise(resolve => setTimeout(resolve, 18));
}

type InstructionTest = { address: number, initial?: number, expected?: number };
type InstructionTestResult = InstructionTest & { passed: boolean, before: number, after: number };
type InstructionTestTestResult = { passed: boolean, results: InstructionTestResult[] };

async function testInstructions(device: DeviceConnection, modules: Instruction[][], tests: InstructionTest[]): Promise<InstructionTestTestResult> {
  // Execute an empty module to ensure the channel memory is in a clean state.
  await executeInstructions(device, []);

  // Get the initial value for all the interesting memory addresses.
  const beforeState: number[] = new Array(tests.length);
  for (let i = 0; i < tests.length; ++i) {
    beforeState[i] = await device.peek(0x4000 + tests[i].address);
  }

  // Execute the instructions under test.
  await executeInstructions(device, modules);

  // Get the current value for all the interesting memory addresses.
  const afterState: number[] = new Array(tests.length);
  for (let i = 0; i < tests.length; ++i) {
    afterState[i] = await device.peek(0x4000 + tests[i].address);
  }

  let suitePassed = true;

  const results: InstructionTestResult[] = new Array(tests.length);
  for (let i = 0; i < tests.length; ++i) {
    const test = tests[i];

    let testPassed = true;

    if (test.initial !== undefined && test.initial !== beforeState[i]) {
      testPassed = false;
    }

    if (test.expected !== undefined && test.expected !== afterState[i]) {
      testPassed = false;
    }

    if (!testPassed) {
      suitePassed = false;
    }

    if (test.initial === undefined && beforeState[i] === afterState[i]) {
      console.warn("initial expected value not specified and before state the same as after, is the test correct?");
    }

    results[i] = {
      passed: testPassed,
      ...test,
      before: beforeState[i],
      after: afterState[i],
    };
  }

  return {
    passed: suitePassed,
    results: results,
  }
}

type TestSuiteTest = { name: string, instructions: Instruction[][], tests: InstructionTest[] };

async function runTestSuite(device: DeviceConnection, setSuiteResults: React.Dispatch<React.SetStateAction<(InstructionTestTestResult | undefined)[]>>, suite: TestSuiteTest[]) {
  setSuiteResults(new Array(suite.length));

  for (let i = 0; i < suite.length; ++i) {
    const results = await testInstructions(device, suite[i].instructions, suite[i].tests);

    console.log(suite[i].name, suite[i].instructions, results);

    setSuiteResults(prevState => {
      const newState = prevState.slice();
      newState[i] = results;
      return newState;
    });
  }
}

const TEST_SUITE: TestSuiteTest[] = [
  {
    name: "set instruction",
    instructions: [[
      { operation: "set", address: 0x98, value: 0x50 },
    ]],
    tests: [
      { address: 0x0098, initial: 0x3E, expected: 0x50 },
      { address: 0x0198, initial: 0x3E, expected: 0x50 },
    ],
  },
  {
    name: "copy instruction",
    instructions: [[
      { operation: "copy", address: 0x98, values: [ 0x50, 0x60 ] },
    ]],
    tests: [
      { address: 0x0098, initial: 0x3E, expected: 0x50 },
      { address: 0x0198, initial: 0x3E, expected: 0x50 },
      { address: 0x0099, initial: 0x3E, expected: 0x60 },
      { address: 0x0199, initial: 0x3E, expected: 0x60 },
    ],
  },
  {
    name: "store instruction",
    instructions: [[
      { operation: "set", address: 0x98, value: 0x50 },
      { operation: "store", address: 0x98 },
    ]],
    tests: [
      { address: 0x0098, initial: 0x3E, expected: 0x50 },
      { address: 0x0198, initial: 0x3E, expected: 0x50 },
      { address: 0x008C, initial: 0x00, expected: 0x50 },
      { address: 0x018C, initial: 0x00, expected: 0x50 },
    ],
  },
  {
    name: "store instruction channel A only",
    instructions: [[
      { operation: "set", address: 0x85, value: 0x01 },
      { operation: "set", address: 0x98, value: 0x50 },
      { operation: "store", address: 0x98 },
    ]],
    tests: [
      { address: 0x0098, initial: 0x3E, expected: 0x50 },
      { address: 0x0198, initial: 0x3E, expected: 0x3E },
      { address: 0x008C, initial: 0x00, expected: 0x50 },
      { address: 0x018C, initial: 0x00, expected: 0x00 },
    ],
  },
  {
    name: "load instruction",
    instructions: [[
      { operation: "set", address: 0x8C, value: 0x50 },
      { operation: "set", address: 0x8C, value: 0x60, forceHigh: true },
      { operation: "load", address: 0x98 },
    ]],
    tests: [
      { address: 0x008C, initial: 0x00, expected: 0x50 },
      { address: 0x018C, initial: 0x00, expected: 0x60 },
      { address: 0x0098, initial: 0x3E, expected: 0x50 },
      { address: 0x0198, initial: 0x3E, expected: 0x60 },
    ],
  },
  {
    name: "div2 instruction",
    instructions: [[
      { operation: "set", address: 0x98, value: 0x50 },
      { operation: "div2", address: 0x98 },
    ]],
    tests: [
      { address: 0x0098, initial: 0x3E, expected: 0x28 },
      { address: 0x0198, initial: 0x3E, expected: 0x28 },
    ],
  },
  {
    name: "rand instruction",
    instructions: [[
      { operation: "copy", address: 0x8D, values: [ 0x50, 0x50 ] },
      { operation: "rand", address: 0x98 },
    ]],
    tests: [
      { address: 0x0098, initial: 0x3E, expected: 0x50 },
      { address: 0x0198, initial: 0x3E, expected: 0x50 },
    ],
  },
  {
    name: "condexec instruction",
    instructions: [
      [
        // Only operate on Channel A.
        { operation: "set", address: 0x85, value: 0x01 },
        // Set the module we want to jump to on condexec.
        { operation: "set", address: 0x84, value: 0xC1 },
        // Set the stored value to be compared against.
        { operation: "set", address: 0x8C, value: 0x01 },
        // 0x98 will be used as the comparator source.
        { operation: "set", address: 0x98, value: 0x00 },
        // 0x99 will be written to by the 2nd module, to see if it executed.
        { operation: "set", address: 0x99, value: 0x00 },
        // First condexec, shouldn't call the module.
        { operation: "condexec", address: 0x98 },
        // Set 0x98 again, should match the stored value.
        { operation: "set", address: 0x98, value: 0x01 },
        // Second condexec, this one should call the module.
        // TODO: Due to the timing, this doesn't actually tell us if we've
        //       tried to execute twice - as this just sets a flag, really
        //       we'd need a delay timer as well to give execution a chance.
        { operation: "condexec", address: 0x98 },
      ], [
        // Use an add operation so we can see if it executed multiple times.
        { operation: "add", address: 0x99, value: 0x01 },
      ],
    ],
    tests: [
      { address: 0x0084, initial: 0x00, expected: 0xC1 },
      { address: 0x008C, initial: 0x00, expected: 0x01 },
      { address: 0x0098, initial: 0x3E, expected: 0x01 },
      { address: 0x0099, initial: 0x3E, expected: 0x01 },
    ],
  },
  {
    name: "add instruction",
    instructions: [[
      { operation: "add", address: 0x98, value: 0x10 },
    ]],
    tests: [
      { address: 0x0098, initial: 0x3E, expected: 0x4E },
      { address: 0x0198, initial: 0x3E, expected: 0x4E },
    ],
  },
  {
    name: "and instruction",
    instructions: [[
      { operation: "and", address: 0x98, value: 0x30 },
    ]],
    tests: [
      { address: 0x0098, initial: 0x3E, expected: 0x30 },
      { address: 0x0198, initial: 0x3E, expected: 0x30 },
    ],
  },
  {
    name: "or instruction",
    instructions: [[
      { operation: "or", address: 0x98, value: 0x40 },
    ]],
    tests: [
      { address: 0x0098, initial: 0x3E, expected: 0x7E },
      { address: 0x0198, initial: 0x3E, expected: 0x7E },
    ],
  },
  {
    name: "xor instruction",
    instructions: [[
      { operation: "xor", address: 0x98, value: 0x50 },
    ]],
    tests: [
      { address: 0x0098, initial: 0x3E, expected: 0x6E },
      { address: 0x0198, initial: 0x3E, expected: 0x6E },
    ],
  },
];

export function TestResult(props: { suite: TestSuiteTest, results?: InstructionTestTestResult }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(props.results ? !props.results.passed : false);
  }, [props.results])

  const intent = props.results ? (props.results.passed ? "success" : "danger") : undefined;
  const icon = props.results ? (props.results.passed ? "tick" : "cross") : "time";
  const details = props.results && props.results.results.map((result, i) => {
    const address = result.address.toString(16).toUpperCase().padStart(4, '0');
    const initial = (result.initial === undefined) ? "??" : result.initial.toString(16).toUpperCase().padStart(2, '0');
    const expected = (result.expected === undefined) ? "??" : result.expected.toString(16).toUpperCase().padStart(2, '0');
    const before = result.before.toString(16).toUpperCase().padStart(2, '0');
    const after = result.after.toString(16).toUpperCase().padStart(2, '0');

    return <Callout key={result.address} intent={result.passed ? "success" : "danger"} icon={result.passed ? "tick" : "cross"} style={{ marginTop: 5, marginBottom: 5 }}>
      0x{address} {" "}
      Expected: {initial} {">"} {expected},
      Actual: {before} {">"} {after}
    </Callout>
  });

  return <Callout onClick={() => setExpanded(!expanded)} intent={intent} icon={icon} style={{ marginBottom: 10 }}>
    {props.suite.name}
    <Collapse isOpen={details && expanded}>
      <div>{details}</div>
    </Collapse>
  </Callout>
}

export function InstructionTester(props: { device: DeviceConnection }) {
  const [suiteResults, setSuiteResults] = useState(new Array(TEST_SUITE.length) as (InstructionTestTestResult | undefined)[]);

  useEffect(() => {
    if (TEST_SUITE.length !== suiteResults.length) {
      setSuiteResults(new Array(TEST_SUITE.length));
    }
  }, [suiteResults.length]);

  const testInfo = TEST_SUITE.map((suite, i) => {
    const results = suiteResults[i];

    return <TestResult key={'test-' + i} suite={suite} results={results} />
  });

  return <div>
    <H3 style={{ margin: 20, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
      Instruction Tester
      <Button large={true} intent="primary" icon="play" onClick={() => runTestSuite(props.device, setSuiteResults, TEST_SUITE)}>Run Tests</Button>
    </H3>
    {testInfo}
  </div>;
}
