import { RawIngredient } from "eroslink-file";
import { FirmwareImage } from "./FirmwareImage";
import { TEST_SUITE, testInstructions, TestSuiteTest } from "./InstructionTestSuite";
import {
  decodeInstruction,
  encodeInstruction,
  findReferencedModules,
  Instruction,
  parseModule,
  simulateInstruction,
} from "./Module";

const FIRMWARE_PATH = __dirname + "/../312-16.upg";

let firmwareImage: FirmwareImage | null = null;

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  if (error === null || !(typeof error === "object")) {
    return false;
  }

  return error.hasOwnProperty("errno");
}

try {
  const fs = require("fs");
  const firmware = fs.readFileSync(FIRMWARE_PATH);
  firmwareImage = new FirmwareImage(firmware);

  if (!firmwareImage.isChecksumValid()) {
    firmwareImage = null;
    console.error("firmware image checksum invalid");
  }
} catch (e) {
  if (isErrnoException(e) && e.code === "ENOENT") {
    console.log("firmware tests wont run as no firmware file found");
  } else {
    console.error(e);
  }
}

const firmwareTest = (firmwareImage !== null) ? test : test.skip;

firmwareTest("parse firmware init module", () => {
  const INIT_MODULE = [[ 0x90, 0x07 ]];

  const moduleOffset = firmwareImage!.getBuiltInModuleOffset(1)!;

  // iterBytes doesn't know where to stop, so we have to feed it via parseModule.
  const parsedModule = Array.from(parseModule(firmwareImage!.iterBytes(moduleOffset)));
  expect(parsedModule).toStrictEqual(INIT_MODULE);
});

firmwareTest("parse all firmware modules", () => {
  for (let i = 0; true; ++i) {
    const moduleOffset = firmwareImage!.getBuiltInModuleOffset(i);
    if (moduleOffset === null) {
      break;
    }

    const parsedModule = Array.from(parseModule(firmwareImage!.iterBytes(moduleOffset)));
    // console.log(i, parsedModule, parsedModule.map(decodeInstruction));

    for (let instruction of parsedModule) {
      const decodedInstruction = decodeInstruction(instruction);
      const encodedInstruction = encodeInstruction(decodedInstruction);
      expect(encodedInstruction).toStrictEqual(instruction);
    }

    expect(() => {
      findReferencedModules(parsedModule.map(decodeInstruction));
    }).not.toThrow();
  }
});

test("parse eroslink module", () => {
  // Channel: Both
  // Multi-A: Affect Freq, Min 0.0, Max 30.0, Unscaled
  const MODULE = [0x85, 0x03, 0x28, 0x86, 0x08, 0x52, 0x54, 0xB5, 0xE3, 0x58, 0xB5, 0x08, 0x00];

  const parsedModule = Array.from(parseModule(MODULE));
  expect(parsedModule).toStrictEqual([
    [ 0x85, 0x03 ],
    [ 0x28, 0x86, 0x08, 0x52 ],
    [ 0x54, 0xB5, 0xE3 ],
    [ 0x58, 0xB5, 0x08 ],
  ]);

  const decodedModule = parsedModule.map(decodeInstruction);
  expect(decodedModule).toStrictEqual([
    { operation: "set", address: 0x85, value: 0x03 },
    { operation: "copy", address: 0x86, values: [ 0x08, 0x52 ] },
    { operation: "and", address: 0xB5, value: 0xE3 },
    { operation: "or", address: 0xB5, value: 0x08 },
  ]);
});

test("parse interactive init module", () => {
  const rawIngredient = new RawIngredient();
  rawIngredient.rawBytesString = "0x85 0x03   0x86 01  0x9a 0x02   0xac 0x01   0xb5 0x01   0xbe 0x01";

  const module = rawIngredient.toArray();
  expect(module).not.toBeNull();
  expect(module!.some(a => typeof a !== "number")).toBe(false);

  const parsedModule = Array.from(parseModule(module as number[]));
  expect(parsedModule).toStrictEqual([
    [ 0x85, 0x03 ],
    [ 0x86, 0x01 ],
    [ 0x9A, 0x02 ],
    [ 0xAC, 0x01 ],
    [ 0xB5, 0x01 ],
    [ 0xBE, 0x01 ],
  ]);

  const decodedModule = parsedModule.map(decodeInstruction);
  expect(decodedModule).toStrictEqual([
    { operation: "set", address: 0x85, value: 0x03 },
    { operation: "set", address: 0x86, value: 0x01 },
    { operation: "set", address: 0x9A, value: 0x02 },
    { operation: "set", address: 0xAC, value: 0x01 },
    { operation: "set", address: 0xB5, value: 0x01 },
    { operation: "set", address: 0xBE, value: 0x01 },
  ]);

  // Affect both channel A and B
  // Multi Adjust Range Min = 1
  // Channel X: Current Gate Select = Medium Timer, Set Value for On and Off Source
  // Channel X: Current Intensity Modulation Select = Fast Timer, Set Value for Min and Rate
  // Channel X: Current Frequency Modulation Select = Fast Timer, Set Value for Min and Rate
  // Channel X: Current Width Modulation Select = Fast Timer, Set Value for Min and Rate
});

test("simulate simple set", () => {
  const memory = new Uint8Array(0x0400);
  memory[0x0085] = 0x03;

  simulateInstruction(memory, {
    operation: "set",
    address: 0x98,
    value: 0x50,
  });

  expect(memory[0x0098]).toEqual(0x50);
  expect(memory[0x0198]).toEqual(0x50);
});

// Same test as "add instruction high address" without the test runner workaround.
test("simulate add in start module", () => {
  const memory = new Uint8Array(0x0400);
  memory[0x0098] = 0x3E;
  memory[0x0198] = 0x3E;

  // See explanation below in mock executeScratchpadMode.
  for (const channelBits of [0x01, 0x02]) {
    memory[0x0085] = channelBits;

    simulateInstruction(memory, {
      operation: "set",
      address: 0x98,
      value: 0x50,
    });

    simulateInstruction(memory, {
      operation: "add",
      address: 0x198,
      value: 0x10,
    });
  }

  expect(memory[0x0098]).toEqual(0x50);
  expect(memory[0x0198]).toEqual(0x60);
});

describe("simulate instructions", () => {
  const memory = new Uint8Array(0x0400);

  const runner = {
    peek: async (address: number) => memory[address - 0x4000],
    executeScratchpadMode: async (modules: Instruction[][], startModuleIndex: number = 0) => {
      // TODO: Move this implementation to a whole mock device.

      if (startModuleIndex >= Math.max(1, modules.length)) {
        throw new Error("invalid mode start module number");
      }

      // This is our version of setting up the initial memory, we just do what the tests look at.
      TEST_SUITE.forEach(suiteTest => {
        suiteTest.tests.forEach(test => {
          if (test.initial !== undefined) {
            memory[test.address] = test.initial;
          }
        });
      });

      // TODO: This should live with simulateInstruction.
      const simulateModule = (module: Instruction[]) => {
        let shouldStartNewModule = false;

        for (const instruction of module) {
          if (simulateInstruction(memory, instruction)) {
            shouldStartNewModule = true;
          }
        }

        return shouldStartNewModule;
      };

      // Affect both channels.
      memory[0x0085] = 0x03;

      // Simulate module 1
      simulateModule([
        { operation: "set", address: 0x90, value: 0x07 },
      ]);

      if (modules.length === 0) {
        return;
      }

      let nextModuleToExecute: number | null = null;

      // The initial start module for a new mode has a slightly different execution pattern from normal,
      // it is executed twice independently, once for channel A, then again for channel B.
      // This is part of how the Split mode works with the built-in modules.
      for (const channelBits of [0x01, 0x02]) {
        memory[0x0085] = channelBits;

        if (simulateModule(modules[startModuleIndex]) || nextModuleToExecute !== null) {
          nextModuleToExecute = memory[0x0084] - 0xC0;
        }
      }

      while (nextModuleToExecute !== null) {
        if (nextModuleToExecute < 0 || nextModuleToExecute >= modules.length) {
          throw new Error("tried to jump to an invalid scratchpad module");
        }

        if (simulateModule(modules[nextModuleToExecute])) {
          nextModuleToExecute = memory[0x0084] - 0xC0;
        } else {
          nextModuleToExecute = null;
        }
      }
    },
  };

  test.each(TEST_SUITE)("$name", async (suiteTest: TestSuiteTest) => {
    const testResult = await testInstructions(runner, suiteTest.instructions, suiteTest.tests);

    for (const result of testResult.results) {
      if (result.expected !== undefined) {
        expect(result.after).toEqual(result.expected);
      }
    }
  });
});
