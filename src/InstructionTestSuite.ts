import { Instruction } from "./Module";

type InstructionTest = { address: number, initial?: number, expected?: number, correct?: number };

export type TestSuiteTest = { name: string, instructions: Instruction[][], tests: InstructionTest[] };

export const TEST_SUITE: TestSuiteTest[] = [
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
      { operation: "copy", address: 0x98, values: [0x50, 0x60] },
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
      { operation: "set", address: 0x18C, value: 0x60 },
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
    name: "div2 instruction A only",
    instructions: [[
      { operation: "set", address: 0x85, value: 0x01 },
      { operation: "set", address: 0x98, value: 0x50 },
      { operation: "div2", address: 0x98 },
    ]],
    tests: [
      { address: 0x0098, initial: 0x3E, expected: 0x28 },
      { address: 0x0198, initial: 0x3E, expected: 0x3E },
    ],
  },
  {
    // Buggy: div2 instruction executes twice.
    name: "div2 instruction A only set both",
    instructions: [[
      { operation: "set", address: 0x98, value: 0x50 },
      { operation: "set", address: 0x85, value: 0x01 },
      { operation: "div2", address: 0x98 },
    ]],
    tests: [
      { address: 0x0098, initial: 0x3E, expected: 0x14, correct: 0x28 },
      { address: 0x0198, initial: 0x3E, expected: 0x50 },
    ],
  },
  {
    name: "div2 instruction B only",
    instructions: [[
      { operation: "set", address: 0x85, value: 0x02 },
      { operation: "set", address: 0x98, value: 0x50 },
      { operation: "div2", address: 0x98 },
    ]],
    tests: [
      { address: 0x0098, initial: 0x3E, expected: 0x3E },
      { address: 0x0198, initial: 0x3E, expected: 0x28 },
    ],
  },
  {
    // Buggy: Would expect it to execute twice (for each channel), but only runs once.
    name: "div2 instruction high address",
    instructions: [[
      { operation: "set", address: 0x98, value: 0x50 },
      { operation: "div2", address: 0x198 },
    ]],
    tests: [
      { address: 0x0098, initial: 0x3E, expected: 0x50 },
      { address: 0x0198, initial: 0x3E, expected: 0x28, correct: 0x14 },
    ],
  },
  {
    // Buggy: div2 instruction executes twice.
    name: "div2 instruction high address A only",
    instructions: [[
      { operation: "set", address: 0x85, value: 0x01 },
      { operation: "set", address: 0x98, value: 0x50 },
      { operation: "div2", address: 0x198 },
    ]],
    tests: [
      { address: 0x0098, initial: 0x3E, expected: 0x50 },
      { address: 0x0198, initial: 0x3E, expected: 0x0F, correct: 0x1F },
    ],
  },
  {
    name: "div2 instruction high address A only high set",
    instructions: [[
      { operation: "set", address: 0x85, value: 0x01 },
      { operation: "set", address: 0x198, value: 0x50 },
      { operation: "div2", address: 0x198 },
    ]],
    tests: [
      { address: 0x0098, initial: 0x3E, expected: 0x3E },
      { address: 0x0198, initial: 0x3E, expected: 0x28 },
    ],
  },
  {
    name: "div2 instruction high address B only",
    instructions: [[
      { operation: "set", address: 0x85, value: 0x02 },
      { operation: "set", address: 0x98, value: 0x50 },
      { operation: "div2", address: 0x198 },
    ]],
    tests: [
      { address: 0x0098, initial: 0x3E, expected: 0x3E },
      { address: 0x0198, initial: 0x3E, expected: 0x28 },
    ],
  },
  {
    name: "div2 instruction high address B only high set",
    instructions: [[
      { operation: "set", address: 0x85, value: 0x02 },
      { operation: "set", address: 0x198, value: 0x50 },
      { operation: "div2", address: 0x198 },
    ]],
    tests: [
      { address: 0x0098, initial: 0x3E, expected: 0x3E },
      { address: 0x0198, initial: 0x3E, expected: 0x28 },
    ],
  },
  {
    name: "rand instruction",
    instructions: [[
      { operation: "copy", address: 0x8D, values: [0x50, 0x50] },
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
    name: "add instruction negative",
    instructions: [[
      { operation: "add", address: 0x98, value: 0xF0 },
    ]],
    tests: [
      { address: 0x0098, initial: 0x3E, expected: 0x2E },
      { address: 0x0198, initial: 0x3E, expected: 0x2E },
    ],
  },
  {
    // Buggy: Would expect it to execute twice (for each channel), but only runs once.
    name: "add instruction high address",
    instructions: [[
      { operation: "set", address: 0x98, value: 0x50 },
      { operation: "add", address: 0x198, value: 0x10 },
    ]],
    tests: [
      { address: 0x0098, initial: 0x3E, expected: 0x50 },
      { address: 0x0198, initial: 0x3E, expected: 0x60, correct: 0x70 },
    ],
  },
  {
    // Buggy: add instruction executes twice.
    name: "add instruction high address A only",
    instructions: [[
      { operation: "set", address: 0x85, value: 0x01 },
      { operation: "set", address: 0x98, value: 0x50 },
      { operation: "add", address: 0x198, value: 0x10 },
    ]],
    tests: [
      { address: 0x0098, initial: 0x3E, expected: 0x50 },
      { address: 0x0198, initial: 0x3E, expected: 0x5E, correct: 0x4E },
    ],
  },
  {
    // Buggy: Both channels execute too many times, A more than B.
    name: "add instruction fuzz",
    instructions: [[
      { operation: "set", address: 0x98, value: 0x00 },
      { operation: "add", address: 0x98, value: 0x01 },
      { operation: "add", address: 0x198, value: 0x01 },
      { operation: "set", address: 0x85, value: 0x01 },
      { operation: "add", address: 0x98, value: 0x01 },
      { operation: "add", address: 0x198, value: 0x01 },
      { operation: "set", address: 0x85, value: 0x02 },
      { operation: "add", address: 0x98, value: 0x01 },
      { operation: "add", address: 0x198, value: 0x01 },
      { operation: "set", address: 0x85, value: 0x03 },
      { operation: "add", address: 0x98, value: 0x01 },
      { operation: "add", address: 0x198, value: 0x01 },
    ]],
    tests: [
      { address: 0x0098, initial: 0x3E, expected: 0x05, correct: 0x03 },
      { address: 0x0198, initial: 0x3E, expected: 0x08, correct: 0x07 },
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

export enum TestState {
  // Expected initial state doesn't match before state.
  Broken,
  // Expected after state doesn't match after state.
  Failed,
  // After state doesn't match correctly calculated state (indicates a buggy instruction).
  Incorrect,
  // None of the above.
  Passed,
}

type InstructionTestResult = InstructionTest & { state: TestState, before: number, after: number };

export type InstructionTestTestResult = { state: TestState, results: InstructionTestResult[] };

type TestRunner = {
  peek: (address: number) => Promise<number>,
  executeScratchpadMode: (modules: Instruction[][]) => Promise<void>,
};

export async function testInstructions(runner: TestRunner, modules: Instruction[][], tests: InstructionTest[]): Promise<InstructionTestTestResult> {
  // Execute an empty module to ensure the channel memory is in a clean state.
  await runner.executeScratchpadMode([]);

  // Get the initial value for all the interesting memory addresses.
  const beforeState: number[] = new Array(tests.length);
  for (let i = 0; i < tests.length; ++i) {
    beforeState[i] = await runner.peek(0x4000 + tests[i].address);
  }

  // Execute the instructions under test.
  await runner.executeScratchpadMode(modules);

  // Get the current value for all the interesting memory addresses.
  const afterState: number[] = new Array(tests.length);
  for (let i = 0; i < tests.length; ++i) {
    afterState[i] = await runner.peek(0x4000 + tests[i].address);
  }

  let suiteState = TestState.Passed;

  const results: InstructionTestResult[] = new Array(tests.length);
  for (let i = 0; i < tests.length; ++i) {
    const test = tests[i];

    let testState = TestState.Passed;

    if (test.initial !== undefined && test.initial !== beforeState[i]) {
      testState = TestState.Broken;
    }

    if (test.expected !== undefined && test.expected !== afterState[i]) {
      if (testState === TestState.Passed) {
        testState = TestState.Failed;
      }
    }

    if (test.correct !== undefined && test.correct !== afterState[i]) {
      if (testState === TestState.Passed) {
        testState = TestState.Incorrect;
      }
    }

    suiteState = Math.min(suiteState, testState);

    if (test.initial === undefined && beforeState[i] === afterState[i]) {
      console.warn("initial expected value not specified and before state the same as after, is the test correct?");
    }

    results[i] = {
      state: testState,
      ...test,
      before: beforeState[i],
      after: afterState[i],
    };
  }

  return {
    state: suiteState,
    results: results,
  };
}