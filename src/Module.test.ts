import { FirmwareImage } from "./FirmwareImage";
import { decodeInstruction, encodeInstruction, parseModule, simulateInstruction } from "./Module";

const FIRMWARE_PATH = __dirname + "/../312-16.upg";

let firmwareImage: FirmwareImage | null = null;

function isErrorException(error: unknown): error is NodeJS.ErrnoException {
  if (error === null || !(typeof error === 'object')) {
    return false;
  }

  return error.hasOwnProperty('errno');
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
  if (isErrorException(e) && e.code === 'ENOENT') {
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
    { operation: 'set', address: 0x85, forceHigh: false, value: 0x03 },
    { operation: 'copy', address: 0x86, values: [ 0x08, 0x52 ] },
    { operation: 'and', address: 0xB5, value: 0xE3 },
    { operation: 'or', address: 0xB5, value: 0x08 },
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

  simulateInstruction(memory, { operation: 'set', address: 0xA6, value: 0x08 });
  expect(memory[0x00A6]).toBe(0x08);
  expect(memory[0x01A6]).toBe(0x08);

  simulateInstruction(memory, { operation: 'set', address: 0xA6, value: 0x52, forceHigh: true });
  expect(memory[0x00A6]).toBe(0x08);
  expect(memory[0x01A6]).toBe(0x52);

  simulateInstruction(memory, { operation: 'store', address: 0x00A6 });
  expect(memory[0x008C]).toBe(0x08);
  expect(memory[0x018C]).toBe(0x52);
});
