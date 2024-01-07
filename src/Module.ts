// Module Indexes:
// 0x00 - 0x7F : Built-in
// 0x80 - 0x9F : User Bank A
// 0xA0 - 0xBF : User Bank B
// 0xC0 - 0xDF : Scratchpad
// 0xE0 - 0xFF : Invalid

// Built-in
// 0x2000 + (mem[0x1C3E + module] * 2)

// Scratchpad
// 0x00C0 + mem[0x01D0 + (module - 0xC0)]

function getInstructionLength(opcode: number) {
  // If none of the opcode bits are set, we've reach the end.
  // 1110 0000 === 0000 0000
  if ((opcode & 0xE0) === 0x00) {
    return 0;
  }

  // The copy bytes instruction takes up to 7 bytes.
  // 1110 0000 === 0010 0000
  if ((opcode & 0xE0) === 0x20) {
    // 0001 1100
    return 1 + ((opcode & 0x1C) >>> 2);
  }

  // Some of the math instructions take a value.
  // 1111 0000 === 0101 0000
  if ((opcode & 0xF0) === 0x50) {
    return 1 + 1;
  }

  // Every instruction has at least one extra byte,
  // either a value or the low byte of a long address.
  return 1;
}

// TODO: Return Uint8Arrays?
export function* parseModule(module: Iterable<number>): Generator<number[], void> {
  const iterator = module[Symbol.iterator]();

  while (true) {
    const opcodeResult = iterator.next();

    // If the iterator returns nothing at the start of a new instruction, we're just done.
    if (opcodeResult.done) {
      return;
    }

    let opcode = opcodeResult.value;

    let length = getInstructionLength(opcode);
    if (length === 0) {
      return;
    }

    let instruction = new Array(1 + length);
    instruction[0] = opcode;

    for (let i = 0; i < length; ++i) {
      const operandResult = iterator.next();

      if (operandResult.done) {
        throw new Error("ran out of bytes while reading instruction");
      }

      instruction[1 + i] = operandResult.value;
    }

    yield instruction;
  }
}

// TODO: Return Uint8Arrays?
// TODO: Figure out how to de-dupe this with parseModule.
export async function* parseModuleAsync(module: AsyncIterable<number>): AsyncGenerator<number[], void> {
  const iterator = module[Symbol.asyncIterator]();

  while (true) {
    const opcodeResult = await iterator.next();

    // If the iterator returns nothing at the start of a new instruction, we're just done.
    if (opcodeResult.done) {
      return;
    }

    let opcode = opcodeResult.value;

    let length = getInstructionLength(opcode);
    if (length === 0) {
      return;
    }

    let instruction = new Array(1 + length);
    instruction[0] = opcode;

    for (let i = 0; i < length; ++i) {
      const operandResult = await iterator.next();

      if (operandResult.done) {
        throw new Error("ran out of bytes while reading instruction");
      }

      instruction[1 + i] = operandResult.value;
    }

    yield instruction;
  }
}

interface CopyInstruction {
  readonly operation: "copy";
  readonly address: number;
  readonly values: number[];
}

interface MemoryInstruction {
  readonly operation: "store" | "load" | "div2" | "rand" | "condexec";
  readonly address: number;
}

interface MathInstruction {
  readonly operation: "set" | "add" | "and" | "or" | "xor";
  readonly address: number;
  readonly value: number;
}

export type Instruction = CopyInstruction | MemoryInstruction | MathInstruction;

// TODO: Read from a Unit8Array?
export function decodeInstruction(instruction: number[]): Instruction {
  const opcode = instruction[0];

  // 1000 0000
  if ((opcode & 0x80) === 0x80) {
    // 1000 0000 < Marker for this instruction
    // 0100 0000 < If address is Channel B forced
    // 0011 1111 < Address to write

    // 0011 1111
    let address = 0x80 + (opcode & 0x3F);

    if ((opcode & 0x40) === 0x40) {
      address |= 0x100;
    }

    const param = instruction[1];

    return {
      operation: "set",
      address: address,
      value: param,
    };
  }

  // 0000 0011
  let address = ((opcode & 0x03) << 8) | instruction[1];

  // 1110 0000 === 0010 0000
  if ((opcode & 0xE0) === 0x20) {
    // 1000 0000 < Inaccessible bits
    // 0110 0000 < Marker for this instruction (01)
    // 0001 1100 < Length of data
    // 0000 0011 < High bits of target address

    // 0001 1100
    const length = (opcode & 0x1C) >>> 2;

    return {
      operation: "copy",
      address: address,
      values: instruction.slice(2, 2 + length),
    };
  }

  // 1111 0000 === 0100 0000
  if ((opcode & 0xF0) === 0x40) {
    // 1000 0000 < Inaccessible bit
    // 0110 0000 < Marker for this instruction (10)
    // 0001 0000 < If has value (false)
    // 0000 1100 < Math operation
    // 0000 0011 < High bits of address

    // 0000 1100
    switch ((opcode & 0x0C) >>> 2) {
      case 0:
        return {
          operation: "store",
          address: address,
        };
      case 1:
        return {
          operation: "load",
          address: address,
        };
      case 2:
        return {
          operation: "div2",
          address: address,
        };
      case 3:
        return {
          operation: "rand",
          address: address,
        };
    }

    throw new Error("unreachable code");
  }

  // 1111 0000 === 0101 0000
  if ((opcode & 0xF0) === 0x50) {
    // 1000 0000 < Inaccessible bits
    // 0110 0000 < Marker for this instruction (10)
    // 0001 0000 < If has value (true)
    // 0000 1100 < Math operation
    // 0000 0011 < High bits of address

    const value = instruction[2];

    // 0000 1100
    switch ((opcode & 0x0C) >>> 2) {
      case 0:
        return {
          operation: "add",
          address: address,
          value: value,
        };
      case 1:
        return {
          operation: "and",
          address: address,
          value: value,
        };
      case 2:
        return {
          operation: "or",
          address: address,
          value: value,
        };
      case 3:
        return {
          operation: "xor",
          address: address,
          value: value,
        };
    }

    throw new Error("unreachable code");
  }

  // The instruction parsing code requires at least one of the high 3 bits
  // to be set, so at this point the high 3 bits must look like 011.
  // 1xx, 001, and 010 will have all be parsed as other instructions,
  // and 000 would have been rejected earlier.

  // 0001 0000 === 0001 0000
  if ((opcode & 0x10) === 0x10) {
    // 1110 0000 < Inaccessible bits
    // 0001 0000 < Marker for this instruction
    // 0000 1100 < Unused?
    // 0000 0011 < High bits of target address

    return {
      operation: "condexec",
      address: address,
    };
  }

  // At this point we know the bit pattern in |opcode| is |0110 ??XX|, where
  // XX represents the high bits of the address param (which we must have).
  // That leaves room to implement 4 additional opcodes (with no additional
  // params), which it appears the current firmware will just ignore.

  throw new Error("!!! unknown opcode !!!");
}

// TODO: Output to a Unit8Array?
export function encodeInstruction(instruction: Instruction): number[] {
  if (instruction.address > 0x03FF) {
    throw new Error("address out of range");
  }

  const addressHigh = (instruction.address >>> 8) & 0x03;
  const addressLow = instruction.address & 0xFF;

  if ("value" in instruction && instruction.value > 0xFF) {
    throw new Error("value out of range");
  }

  switch (instruction.operation) {
    case "copy":
      if (instruction.values.length > 7) {
        throw new Error("too many values to copy");
      }

      if (instruction.values.some(v => (v > 0xFF))) {
        throw new Error("value out of range");
      }

      return [0x20 | (instruction.values.length << 2) | addressHigh, addressLow, ...instruction.values];
    case "store":
      return [0x40 | (0 << 2) | addressHigh, addressLow];
    case "load":
      return [0x40 | (1 << 2) | addressHigh, addressLow];
    case "div2":
      return [0x40 | (2 << 2) | addressHigh, addressLow];
    case "rand":
      return [0x40 | (3 << 2) | addressHigh, addressLow];
    case "set":
      if (addressHigh > 0x01) {
        throw new Error("address out of range");
      }

      if (addressLow < 0x80 || addressLow > 0xBF) {
        throw new Error("address out of range");
      }

      return [0x80 | (addressHigh << 6) | (addressLow & 0x3F), instruction.value];
    case "add":
      return [0x50 | (0 << 2) | addressHigh, addressLow, instruction.value];
    case "and":
      return [0x50 | (1 << 2) | addressHigh, addressLow, instruction.value];
    case "or":
      return [0x50 | (2 << 2) | addressHigh, addressLow, instruction.value];
    case "xor":
      return [0x50 | (3 << 2) | addressHigh, addressLow, instruction.value];
    case "condexec":
      return [0x70 | addressHigh, addressLow];
  }
}

// TODO: Should we encode the instruction into the right bit of memory first?
// TODO: Move this to a whole mock device we can use for tests.
export function simulateInstruction(memory: { [key: number]: number }, instruction: Instruction): void {
  const channelBits = memory[0x0085];
  if (channelBits === 0) {
    return;
  }

  let channelB = false;
  if ((channelBits & 0x01) === 0) {
    channelB = true;
  }

  while (true) {
    let address = instruction.address;
    if (channelB && address >= 0x008C && address < 0x00C0) {
      address |= 0x0100;
    }

    const bank = channelB ? 0x018C : 0x008C;

    switch (instruction.operation) {
      case "copy":
        for (let i = 0; i < instruction.values.length; ++i) {
          memory[address + i] = instruction.values[i];
        }
        break;
      case "store":
        memory[bank] = memory[address];
        break;
      case "load":
        memory[address] = memory[bank];
        break;
      case "div2":
        memory[address] /= 2;
        break;
      case "rand":
        const low = memory[0x008D];
        const high = memory[0x008E];
        memory[address] = low + Math.round(Math.random() * (high - low));
        break;
      case "set":
        memory[address] = instruction.value;
        break;
      case "add":
        memory[address] += instruction.value;
        break;
      case "and":
        memory[address] &= instruction.value;
        break;
      case "or":
        memory[address] |= instruction.value;
        break;
      case "xor":
        memory[address] ^= instruction.value;
        break;
      case "condexec":
        if (memory[address] === memory[bank]) {
          // switch_to_module(memory[0x0084]);
          throw new Error("condexec instruction can't be simulated");
        }
        break;
    }

    if (channelB || (channelBits & 0x02) === 0) {
      break;
    }

    channelB = true;
  }
}
