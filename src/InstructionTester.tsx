import { Button, Callout, Collapse, H3 } from "@blueprintjs/core";
import React, { useEffect, useRef, useState } from "react";
import { DeviceApi } from "./DeviceApi";
import { DeviceConnection } from "./DeviceConnection";
import {
  InstructionTestTestResult,
  TEST_SUITE,
  testInstructions,
  TestState,
  TestSuiteTest,
} from "./InstructionTestSuite";

async function runTestSuite(connection: DeviceConnection, setSuiteResults: React.Dispatch<React.SetStateAction<(InstructionTestTestResult | undefined)[]>>, suite: TestSuiteTest[], testIndex?: number, cancelledRef?: React.MutableRefObject<boolean>) {
  const device = new DeviceApi(connection);

  const runner = {
    peek: connection.peek.bind(connection),
    executeScratchpadMode: device.executeScratchpadMode.bind(device),
  };

  setSuiteResults(prevState => {
    if (testIndex !== undefined) {
      const newState = prevState.slice();
      newState[testIndex] = undefined;
      return newState;
    } else {
      return new Array(suite.length);
    }
  });

  for (let i = 0; i < suite.length; ++i) {
    if (testIndex !== undefined && i !== testIndex) {
      continue;
    }

    const results = await testInstructions(runner, suite[i].instructions, suite[i].tests);

    console.log(suite[i].name, suite[i].instructions, results);

    if (cancelledRef && cancelledRef.current) {
      return;
    }

    setSuiteResults(prevState => {
      const newState = prevState.slice();
      newState[i] = results;
      return newState;
    });
  }
}

export function TestResult(props: { suite: TestSuiteTest, results?: InstructionTestTestResult, runTest?: () => void }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(props.results ? props.results.state <= TestState.Failed : false);
  }, [props.results]);

  const stateIntents = [
    "danger",
    "danger",
    "warning",
    "success",
  ] as const;

  const stateIcons = [
    "error",
    "cross",
    "warning-sign",
    "tick",
  ] as const;

  const intent = props.results ? stateIntents[props.results.state] : undefined;
  const icon = props.results ? stateIcons[props.results.state] : "time";
  const details = props.results && props.results.results.map(result => {
    const address = result.address.toString(16).toUpperCase().padStart(4, "0");
    const initial = (result.initial === undefined) ? "??" : result.initial.toString(16).toUpperCase().padStart(2, "0");
    const expected = (result.expected === undefined) ? "??" : result.expected.toString(16).toUpperCase().padStart(2, "0");
    const before = result.before.toString(16).toUpperCase().padStart(2, "0");
    const after = result.after.toString(16).toUpperCase().padStart(2, "0");
    const correct = (result.correct !== undefined) ? result.correct.toString(16).toUpperCase().padStart(2, "0") : undefined;

    const intent = stateIntents[result.state];
    const icon = stateIcons[result.state];
    return <Callout key={result.address} intent={intent} icon={icon} style={{ marginTop: 5, marginBottom: 5 }}>
      0x{address} {" "}
      Expected: {initial} {">"} {expected},
      Actual: {before} {">"} {after}
      {correct && ` (Correct: ${correct})`}
    </Callout>
  });

  return <div style={{ margin: "0 20px 10px", display: "flex", gap: 10 }}>
    <Callout onClick={() => setExpanded(!expanded)} intent={intent} icon={icon} style={{ cursor: "pointer" }}>
      {props.suite.name}
      <Collapse isOpen={details && expanded}>
        <div>{details}</div>
      </Collapse>
    </Callout>
    <Button icon="play" large={true} style={{ boxShadow: "none" }} disabled={!props.runTest} onClick={() => props.runTest && props.runTest()} />
  </div>;
}

export function InstructionTester(props: { device: DeviceConnection }) {
  const [testsRunning, setTestsRunning] = useState(false);
  const [suiteResults, setSuiteResults] = useState<(InstructionTestTestResult | undefined)[]>([]);

  // Randomise the test order.
  // const testSuite = useMemo(() => TEST_SUITE.slice().sort(() => 0.5 - Math.random()), []);
  const testSuite = TEST_SUITE;

  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    return () => {
      cancelledRef.current = true;
    };
  }, [cancelledRef]);

  const runTests = (testIndex?: number) => {
    setTestsRunning(true);

    runTestSuite(props.device, setSuiteResults, testSuite, testIndex, cancelledRef)
      .then(() => {
        if (!cancelledRef.current) {
          setTestsRunning(false);
        }
      });
  };

  const testInfo = testSuite.map((suite, i) => {
    const results = suiteResults[i];

    return <TestResult key={"test-" + i} suite={suite} results={results} runTest={!testsRunning ? () => runTests(i) : undefined} />
  });

  return <div style={{ marginBottom: 20 }}>
    <H3 style={{ margin: 20, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
      Instruction Tester
      <Button large={true} intent="primary" icon="play" disabled={testsRunning} onClick={() => runTests()}>Run Tests</Button>
    </H3>
    {testInfo}
  </div>;
}
