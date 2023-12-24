import { DeviceConnection } from "./DeviceConnection";
import { encodeInstruction, Instruction } from "./Module";

export enum TimerSelection {
  None,
  Fast,
  Medium,
  Slow,
}

export enum SourceSelection {
  SetValue,
  AdvancedParameter,
  MultiAdjust,
  OtherChannel,
}

export class ValueSelectFlags {
  public invertValue: boolean;
  public rateSource: SourceSelection;
  public invertMin: boolean;
  public valOrMinSource: SourceSelection;
  public timerSelection: TimerSelection;

  public constructor(value: number) {
    this.invertValue = (value & 0b10000000) !== 0;
    this.rateSource = (value & 0b01100000) >> 5;
    this.invertMin = (value & 0b00010000) !== 0;
    this.valOrMinSource = (value & 0b00001100) >> 2;
    this.timerSelection = (value & 0b00000011);
  }

  public toValue(): number {
    return ((this.invertValue ? 1 : 0) << 7) | (this.rateSource << 5) | ((this.invertMin ? 1 : 0) << 4) | (this.valOrMinSource << 2) | this.timerSelection;
  }
}

export class ChannelVariable {
  private readonly connection: DeviceConnection;
  private readonly baseAddress: number;

  public constructor(connection: DeviceConnection, baseAddress: number) {
    this.connection = connection;
    this.baseAddress = baseAddress;
  }

  public readonly getValue = async (): Promise<number> => this.connection.peek(this.baseAddress);
  public readonly setValue = async (value: number): Promise<void> => this.connection.poke(this.baseAddress, value);
  public readonly getMin = async (): Promise<number> => this.connection.peek(this.baseAddress + 1);
  public readonly setMin = async (value: number): Promise<void> => this.connection.poke(this.baseAddress + 1, value);
  public readonly getMax = async (): Promise<number> => this.connection.peek(this.baseAddress + 2);
  public readonly setMax = async (value: number): Promise<void> => this.connection.poke(this.baseAddress + 2, value);
  public readonly getRate = async (): Promise<number> => this.connection.peek(this.baseAddress + 3);
  public readonly setRate = async (value: number): Promise<void> => this.connection.poke(this.baseAddress + 3, value);
  public readonly getStep = async (): Promise<number> => this.connection.peek(this.baseAddress + 4);
  public readonly setStep = async (value: number): Promise<void> => this.connection.poke(this.baseAddress + 4, value);
  public readonly getActionAtMin = async (): Promise<number> => this.connection.peek(this.baseAddress + 5);
  public readonly setActionAtMin = async (value: number): Promise<void> => this.connection.poke(this.baseAddress + 5, value);
  public readonly getActionAtMax = async (): Promise<number> => this.connection.peek(this.baseAddress + 6);
  public readonly setActionAtMax = async (value: number): Promise<void> => this.connection.poke(this.baseAddress + 6, value);
  public readonly getSelect = async (): Promise<ValueSelectFlags> => this.connection.peek(this.baseAddress + 7).then(value => new ValueSelectFlags(value));
  public readonly setSelect = async (flags: ValueSelectFlags): Promise<void> => this.connection.poke(this.baseAddress + 7, flags.toValue());
  public readonly getTimer = async (): Promise<number> => this.connection.peek(this.baseAddress + 8);
  public readonly setTimer = async (value: number): Promise<void> => this.connection.poke(this.baseAddress + 8, value);
}

export class GateSelectFlags {
  public onSource: SourceSelection;
  public offSource: SourceSelection;
  public timerSelection: TimerSelection;

  public constructor(value: number) {
    this.offSource = (value & 0b11100000) >> 5;
    this.onSource = (value & 0b00011100) >> 2;
    this.timerSelection = (value & 0b00000011);
  }

  public toValue(): number {
    return (this.offSource << 5) | (this.onSource << 2) | this.timerSelection;
  }
}

export class Channel {
  private readonly connection: DeviceConnection;
  private readonly baseAddress: number;

  public readonly ramp: ChannelVariable;
  public readonly intensity: ChannelVariable;
  public readonly frequency: ChannelVariable;
  public readonly width: ChannelVariable;

  public constructor(connection: DeviceConnection, baseAddress: number) {
    this.connection = connection;
    this.baseAddress = baseAddress;

    this.ramp = new ChannelVariable(connection, baseAddress + 0x9C);
    this.intensity = new ChannelVariable(connection, baseAddress + 0xA5);
    this.frequency = new ChannelVariable(connection, baseAddress + 0xAE);
    this.width = new ChannelVariable(connection, baseAddress + 0xB7);
  }

  public readonly getGateOnTime = async (): Promise<number> => this.connection.peek(this.baseAddress + 0x98);
  public readonly setGateOnTime = async (value: number): Promise<void> => this.connection.poke(this.baseAddress + 0x98, value);
  public readonly getGateOffTime = async (): Promise<number> => this.connection.peek(this.baseAddress + 0x99);
  public readonly setGateOffTime = async (value: number): Promise<void> => this.connection.poke(this.baseAddress + 0x99, value);
  public readonly getGateSelect = async (): Promise<GateSelectFlags> => this.connection.peek(this.baseAddress + 0x9A).then(value => new GateSelectFlags(value));
  public readonly setGateSelect = async (flags: GateSelectFlags): Promise<void> => this.connection.poke(this.baseAddress + 0x9A, flags.toValue());
}

export class DeviceApi {
  private readonly connection: DeviceConnection;

  public readonly channelA: Channel;
  public readonly channelB: Channel;

  public constructor(connection: DeviceConnection) {
    this.connection = connection;

    this.channelA = new Channel(connection, 0x4000);
    this.channelB = new Channel(connection, 0x4100);
  }

  public readonly getCurrentMode = async (): Promise<number> => this.connection.peek(0x407B);

  public readonly switchToMode = async (mode: number): Promise<void> => {
    await this.connection.poke(0x407B, mode); // Selected Menu Item
    await this.connection.poke(0x4070, [0x04, 0x12]); // Exit Menu, Select New Mode

    // Wait some time for the this.connection to execute the commands.
    await new Promise(resolve => setTimeout(resolve, 18));
  };

  public readonly getSplitModes = async (): Promise<[number, number]> => [
    await this.connection.peek(0x41F5),
    await this.connection.peek(0x41F6),
  ];

  public readonly executeInstructions = async (modules: Instruction[][]): Promise<void> => {
    let cursor = 0;
    for (let i = 0; i < modules.length; ++i) {
      // Set the module start offset.
      await this.connection.poke(0x41D0 + i, cursor);

      // Write the instructions to the scratchpad module data.
      for (let instruction of modules[i]) {
        const encoded = encodeInstruction(instruction);
        if ((0x40C0 + cursor + encoded.length) >= 0x417F) {
          throw new Error("ran out of bytes to write instructions to scratchpad");
        }

        // We add the terminator to each instruction, in case we're interrupted.
        await this.connection.poke(0x40C0 + cursor, [...encoded, 0x00]);
        cursor += encoded.length;
      }

      // Account for the terminator byte.
      cursor += 1;
    }

    // If we didn't write anything, write an empty module so nothing is executed.
    if (cursor === 0) {
      // Instruction.
      await this.connection.poke(0x40C0, 0x00);

      // Module start offset.
      await this.connection.poke(0x41D0, 0x00);
    }

    // Get the mode index we can point at the scratchpad.
    const currentTopMode = await this.connection.peek(0x8008); // EEPROM CurrentTopMode
    const scratchpadMode = Math.min(Math.max(0x88, currentTopMode + 1), 0x8E); // "User 1" - "User 7"

    // Write the scratchpad module ID as the start module for the selected mode.
    // This seems to be set in the EEPROM even for the scratchpad modules.
    await this.connection.poke(0x8018 + (scratchpadMode - 0x88), 0xC0);

    // Set the in-memory high mode to include our newly assigned scratchpad mode.
    await this.connection.poke(0x41F3, scratchpadMode); // RAM CurrentTopMode

    // Switch to the new scratchpad mode.
    await this.switchToMode(scratchpadMode);
  };
}
