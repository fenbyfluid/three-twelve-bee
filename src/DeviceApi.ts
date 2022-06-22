import { DeviceConnection } from "./DeviceConnection";
import { encodeInstruction, Instruction } from "./Module";

export class ChannelVariable {
  private readonly connection: DeviceConnection;
  private readonly baseAddress: number;

  public constructor(connection: DeviceConnection, baseAddress: number) {
    this.connection = connection;
    this.baseAddress = baseAddress;
  }

  public async getValue(): Promise<number> {
    return this.connection.peek(this.baseAddress);
  }

  public async setValue(value: number): Promise<void> {
    return this.connection.poke(this.baseAddress, value);
  }

  public async getMin(): Promise<number> {
    return this.connection.peek(this.baseAddress + 1);
  }

  public async setMin(value: number): Promise<void> {
    return this.connection.poke(this.baseAddress + 1, value);
  }

  public async getMax(): Promise<number> {
    return this.connection.peek(this.baseAddress + 2);
  }

  public async setMax(value: number): Promise<void> {
    return this.connection.poke(this.baseAddress + 2, value);
  }

  public async getRate(): Promise<number> {
    return this.connection.peek(this.baseAddress + 3);
  }

  public async setRate(value: number): Promise<void> {
    return this.connection.poke(this.baseAddress + 3, value);
  }

  public async getStep(): Promise<number> {
    return this.connection.peek(this.baseAddress + 4);
  }

  public async setStep(value: number): Promise<void> {
    return this.connection.poke(this.baseAddress + 4, value);
  }

  public async getActionAtMin(): Promise<number> {
    return this.connection.peek(this.baseAddress + 5);
  }

  public async setActionAtMin(value: number): Promise<void> {
    return this.connection.poke(this.baseAddress + 5, value);
  }

  public async getActionAtMax(): Promise<number> {
    return this.connection.peek(this.baseAddress + 6);
  }

  public async setActionAtMax(value: number): Promise<void> {
    return this.connection.poke(this.baseAddress + 6, value);
  }

  public async getSelect(): Promise<number> {
    return this.connection.peek(this.baseAddress + 7);
  }

  public async setSelect(value: number): Promise<void> {
    return this.connection.poke(this.baseAddress + 7, value);
  }

  public async getTimer(): Promise<number> {
    return this.connection.peek(this.baseAddress + 8);
  }

  public async setTimer(value: number): Promise<void> {
    return this.connection.poke(this.baseAddress + 8, value);
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

  public async getCurrentMode(): Promise<number> {
    return this.connection.peek(0x407B);
  }

  async switchToMode(mode: number): Promise<void> {
    await this.connection.poke(0x407B, mode); // Selected Menu Item
    await this.connection.poke(0x4070, [0x04, 0x12]); // Exit Menu, Select New Mode

    // Wait some time for the this.connection to execute the commands.
    await new Promise(resolve => setTimeout(resolve, 18));
  }

  public async getSplitModes(): Promise<[number, number]> {
    return [
      await this.connection.peek(0x41F5),
      await this.connection.peek(0x41F6),
    ];
  }

  async executeInstructions(modules: Instruction[][]): Promise<void> {
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
  }
}
