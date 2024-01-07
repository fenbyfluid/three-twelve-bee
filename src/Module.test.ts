import { RawIngredient } from "eroslink-file";
import { FirmwareImage } from "./FirmwareImage";
import { decodeInstruction, encodeInstruction, parseModule, simulateInstruction } from "./Module";

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

test("simulate instructions", () => {
  let memory = new Uint8Array(0x0400);

  if (firmwareImage) {
    const initializer = firmwareImage.getChannelInitializationData();

    // Channel A + shared bytes
    for (let i = 0; i < initializer.length; ++i) {
      memory[0x0080 + i] = initializer[i];
    }

    // Channel B
    for (let i = 0x08; i < initializer.length; ++i) {
      memory[0x0180 + i] = initializer[i];
    }
  } else {
    // Affect both channels.
    memory[0x0085] = 0x03;
  }

  simulateInstruction(memory, { operation: "set", address: 0xA6, value: 0x08 });
  expect(memory[0x00A6]).toBe(0x08);
  expect(memory[0x01A6]).toBe(0x08);

  simulateInstruction(memory, { operation: "set", address: 0x1A6, value: 0x52 });
  expect(memory[0x00A6]).toBe(0x08);
  expect(memory[0x01A6]).toBe(0x52);

  simulateInstruction(memory, { operation: "store", address: 0x00A6 });
  expect(memory[0x008C]).toBe(0x08);
  expect(memory[0x018C]).toBe(0x52);
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
