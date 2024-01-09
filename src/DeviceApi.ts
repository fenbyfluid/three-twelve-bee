import { useEffect, useState } from "react";
import { encodeInstruction, Instruction } from "./Module";

export enum TimerAction {
  Stop = 0xFC,
  Loop,
  ReverseAndTogglePolarity,
  Reverse,
}

export enum TimerSelection {
  None,
  Fast,
  Medium,
  Slow,
}

export namespace TimerSelection {
  /**
   * Returns the tick interval of the specified timer in milliseconds.
   */
  export function getTimerInterval(timer: TimerSelection): number {
    let divisor = 0;
    switch (timer) {
      case TimerSelection.Fast:
        divisor = 1;
        break;
      case TimerSelection.Medium:
        divisor = 8;
        break;
      case TimerSelection.Slow:
        divisor = 256;
        break;
      default:
        return 0;
    }

    // The main timer ticks at 244 Hz.
    return (1 / (244 / divisor)) * 1000;
  }
}

export enum SourceSelection {
  SetValue,
  AdvancedParameter,
  MultiAdjust,
  OtherChannel, // Only valid for channel values, not gates.
}

export interface ValueSelectFlags {
  invertRate: boolean;
  rateSource: SourceSelection;
  invertValOrMin: boolean;
  valOrMinSource: SourceSelection;
  timerSelection: TimerSelection;
}

export namespace ValueSelectFlags {
  export function fromValue(value: number): ValueSelectFlags {
    return {
      invertRate: (value & 0b10000000) !== 0,
      rateSource: (value & 0b01100000) >> 5,
      invertValOrMin: (value & 0b00010000) !== 0,
      valOrMinSource: (value & 0b00001100) >> 2,
      timerSelection: (value & 0b00000011),
    };
  }

  export function toValue(flags: ValueSelectFlags): number {
    return ((flags.invertRate ? 1 : 0) << 7) | (flags.rateSource << 5) | ((flags.invertValOrMin ? 1 : 0) << 4) | (flags.valOrMinSource << 2) | flags.timerSelection;
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
  public readonly getActionAtMin = async (): Promise<TimerAction> => this.connection.peek(this.baseAddress + 5);
  public readonly setActionAtMin = async (action: TimerAction): Promise<void> => this.connection.poke(this.baseAddress + 5, action);
  public readonly getActionAtMax = async (): Promise<TimerAction> => this.connection.peek(this.baseAddress + 6);
  public readonly setActionAtMax = async (action: TimerAction): Promise<void> => this.connection.poke(this.baseAddress + 6, action);
  public readonly getSelect = async (): Promise<ValueSelectFlags> => this.connection.peek(this.baseAddress + 7).then(value => ValueSelectFlags.fromValue(value));
  public readonly setSelect = async (flags: ValueSelectFlags): Promise<void> => this.connection.poke(this.baseAddress + 7, ValueSelectFlags.toValue(flags));
  public readonly getTimer = async (): Promise<number> => this.connection.peek(this.baseAddress + 8);
  public readonly setTimer = async (value: number): Promise<void> => this.connection.poke(this.baseAddress + 8, value);
}

export enum GatePulsePolarity {
  None,
  Negative,
  Positive,
  Biphasic,
}

export interface GateValueFlags {
  unknownPhase3: boolean;
  audioControlsIntensity: boolean;
  audioControlsFrequency: boolean;
  invertPolarity: boolean;
  alternatePolarity: boolean;
  pulsePolarity: GatePulsePolarity;
  outputEnabled: boolean;
}

export namespace GateValueFlags {
  export function fromValue(value: number): GateValueFlags {
    return {
      unknownPhase3: (value & 0b10000000) !== 0,
      audioControlsIntensity: (value & 0b01000000) !== 0,
      audioControlsFrequency: (value & 0b00100000) !== 0,
      invertPolarity: (value & 0b00010000) !== 0,
      alternatePolarity: (value & 0b00001000) !== 0,
      pulsePolarity: (value & 0b00000110) >> 1,
      outputEnabled: (value & 0b00000001) !== 0,
    };
  }

  export function toValue(flags: GateValueFlags): number {
    return ((flags.unknownPhase3 ? 1 : 0) << 7) |
      ((flags.audioControlsIntensity ? 1 : 0) << 6) |
      ((flags.audioControlsFrequency ? 1 : 0) << 5) |
      ((flags.invertPolarity ? 1 : 0) << 4) |
      ((flags.alternatePolarity ? 1 : 0) << 3) |
      (flags.pulsePolarity << 1) |
      (flags.outputEnabled ? 1 : 0);
  }
}

export interface GateSelectFlags {
  onSource: SourceSelection;
  offSource: SourceSelection;
  timerSelection: TimerSelection;
}

export namespace GateSelectFlags {
  export function fromValue(value: number): GateSelectFlags {
    return {
      onSource: (value & 0b11100000) >> 5,
      offSource: (value & 0b00011100) >> 2,
      timerSelection: (value & 0b00000011),
    };
  }

  export function toValue(flags: GateSelectFlags): number {
    return (flags.onSource << 5) | (flags.offSource << 2) | flags.timerSelection;
  }
}

export class Channel {
  private readonly connection: DeviceConnection;
  private readonly baseAddress: number;
  private readonly levelAddress: number;

  public readonly ramp: ChannelVariable;
  public readonly intensity: ChannelVariable;
  public readonly frequency: ChannelVariable;
  public readonly width: ChannelVariable;

  public constructor(connection: DeviceConnection, baseAddress: number, levelAddress: number) {
    this.connection = connection;
    this.baseAddress = baseAddress;
    this.levelAddress = levelAddress;

    this.ramp = new ChannelVariable(connection, baseAddress + 0x9C);
    this.intensity = new ChannelVariable(connection, baseAddress + 0xA5);
    this.frequency = new ChannelVariable(connection, baseAddress + 0xAE);
    this.width = new ChannelVariable(connection, baseAddress + 0xB7);
  }

  public readonly getLevel = async (): Promise<number> => this.connection.peek(this.levelAddress);
  public readonly setLevel = async (value: number): Promise<void> => this.connection.poke(this.levelAddress, value);

  public readonly getGateValue = async (): Promise<GateValueFlags> => this.connection.peek(this.baseAddress + 0x90).then(value => GateValueFlags.fromValue(value));
  public readonly setGateValue = async (flags: GateValueFlags): Promise<void> => this.connection.poke(this.baseAddress + 0x90, GateValueFlags.toValue(flags));
  public readonly getGateOnTime = async (): Promise<number> => this.connection.peek(this.baseAddress + 0x98);
  public readonly setGateOnTime = async (value: number): Promise<void> => this.connection.poke(this.baseAddress + 0x98, value);
  public readonly getGateOffTime = async (): Promise<number> => this.connection.peek(this.baseAddress + 0x99);
  public readonly setGateOffTime = async (value: number): Promise<void> => this.connection.poke(this.baseAddress + 0x99, value);
  public readonly getGateSelect = async (): Promise<GateSelectFlags> => this.connection.peek(this.baseAddress + 0x9A).then(value => GateSelectFlags.fromValue(value));
  public readonly setGateSelect = async (flags: GateSelectFlags): Promise<void> => this.connection.poke(this.baseAddress + 0x9A, GateSelectFlags.toValue(flags));
  public readonly getGateTimer = async (): Promise<number> => this.connection.peek(this.baseAddress + 0x9B);
  public readonly setGateTimer = async (value: number): Promise<void> => this.connection.poke(this.baseAddress + 0x9B, value);
}

export enum Mode {
  Waves = 0x76,
  Stroke,
  Climb,
  Combo,
  Intense,
  Rhythm,
  Audio1,
  Audio2,
  Audio3,
  Split,
  Random1,
  Random2,
  Toggle,
  Orgasm,
  Torment,
  Phase1,
  Phase2,
  Phase3,
  User1,
  User2,
  User3,
  User4,
  User5,
  User6,
  User7,
}

export namespace Mode {
  export function getDisplayName(mode: Mode): string | undefined {
    return Mode[mode]?.replace(/^(\D*)(\d*)$/, "$1 $2");
  }

  export function getAsValues() {
    const values = Object.values(Mode).filter(value => typeof value === "number") as Mode[];

    return values.map(mode => ({ key: Mode[mode]!, label: Mode.getDisplayName(mode)!, value: mode }));
  }
}

export enum PowerLevel {
  Low = 1,
  Normal,
  High,
}

export interface ReadonlySettings {
  getPowerLevel(): Promise<PowerLevel>;
  getSplitModeA(): Promise<Mode>;
  getSplitModeB(): Promise<Mode>;
  getFavouriteMode(): Promise<Mode>;
  getRampLevelParameter(): Promise<number>;
  getRampTimeParameter(): Promise<number>;
  getDepthParameter(): Promise<number>;
  getTempoParameter(): Promise<number>;
  getFrequencyParameter(): Promise<number>;
  getEffectParameter(): Promise<number>;
  getWidthParameter(): Promise<number>;
  getPaceParameter(): Promise<number>;
}

export const DEFAULT_SETTINGS: ReadonlySettings = {
  async getPowerLevel(): Promise<PowerLevel> {
    return PowerLevel.Normal;
  },
  async getSplitModeA(): Promise<Mode> {
    return Mode.Stroke;
  },
  async getSplitModeB(): Promise<Mode> {
    return Mode.Waves;
  },
  async getFavouriteMode(): Promise<Mode> {
    return Mode.Waves;
  },
  async getRampLevelParameter(): Promise<number> {
    return 225;
  },
  async getRampTimeParameter(): Promise<number> {
    return 20;
  },
  async getDepthParameter(): Promise<number> {
    return 215;
  },
  async getTempoParameter(): Promise<number> {
    // The manual says this should be 10, but it seems to be 1 in practice.
    return 1;
  },
  async getFrequencyParameter(): Promise<number> {
    return 25;
  },
  async getEffectParameter(): Promise<number> {
    return 5;
  },
  async getWidthParameter(): Promise<number> {
    return 130;
  },
  async getPaceParameter(): Promise<number> {
    return 5;
  },
};

// TODO: Do we need to use the menu commands for these setters?
export class Settings implements ReadonlySettings {
  private readonly connection: DeviceConnection;
  private readonly baseAddress: number;

  public constructor(connection: DeviceConnection, baseAddress: number) {
    this.connection = connection;
    this.baseAddress = baseAddress;
  }

  public readonly getTopMode = async (): Promise<Mode> => this.connection.peek(this.baseAddress);
  public readonly setTopMode = async (mode: Mode): Promise<void> => this.connection.poke(this.baseAddress, mode);

  public readonly getPowerLevel = async (): Promise<PowerLevel> => this.connection.peek(this.baseAddress + 1);
  public readonly setPowerLevel = async (powerLevel: PowerLevel): Promise<void> => this.connection.poke(this.baseAddress + 1, powerLevel);

  public readonly getSplitModeA = async (): Promise<Mode> => this.connection.peek(this.baseAddress + 2);
  public readonly setSplitModeA = async (mode: Mode): Promise<void> => this.connection.poke(this.baseAddress + 2, mode);
  public readonly getSplitModeB = async (): Promise<Mode> => this.connection.peek(this.baseAddress + 3);
  public readonly setSplitModeB = async (mode: Mode): Promise<void> => this.connection.poke(this.baseAddress + 3, mode);

  public readonly getFavouriteMode = async (): Promise<Mode> => this.connection.peek(this.baseAddress + 4);
  public readonly setFavouriteMode = async (mode: Mode): Promise<void> => this.connection.poke(this.baseAddress + 4, mode);

  public readonly getRampLevelParameter = async (): Promise<number> => this.connection.peek(this.baseAddress + 5);
  public readonly setRampLevelParameter = async (value: number): Promise<void> => this.connection.poke(this.baseAddress + 5, value);
  public readonly getRampTimeParameter = async (): Promise<number> => this.connection.peek(this.baseAddress + 6);
  public readonly setRampTimeParameter = async (value: number): Promise<void> => this.connection.poke(this.baseAddress + 6, value);
  public readonly getDepthParameter = async (): Promise<number> => this.connection.peek(this.baseAddress + 7);
  public readonly setDepthParameter = async (value: number): Promise<void> => this.connection.poke(this.baseAddress + 7, value);
  public readonly getTempoParameter = async (): Promise<number> => this.connection.peek(this.baseAddress + 8);
  public readonly setTempoParameter = async (value: number): Promise<void> => this.connection.poke(this.baseAddress + 8, value);
  public readonly getFrequencyParameter = async (): Promise<number> => this.connection.peek(this.baseAddress + 9);
  public readonly setFrequencyParameter = async (value: number): Promise<void> => this.connection.poke(this.baseAddress + 9, value);
  public readonly getEffectParameter = async (): Promise<number> => this.connection.peek(this.baseAddress + 10);
  public readonly setEffectParameter = async (value: number): Promise<void> => this.connection.poke(this.baseAddress + 10, value);
  public readonly getWidthParameter = async (): Promise<number> => this.connection.peek(this.baseAddress + 11);
  public readonly setWidthParameter = async (value: number): Promise<void> => this.connection.poke(this.baseAddress + 11, value);
  public readonly getPaceParameter = async (): Promise<number> => this.connection.peek(this.baseAddress + 12);
  public readonly setPaceParameter = async (value: number): Promise<void> => this.connection.poke(this.baseAddress + 12, value);
}

export interface ControlFlags {
  unusedBits: number;
  disableMultiAdjustControl: boolean;
  programExcludedFromSlaveLink: boolean;
  pendingModuleChange: boolean;
  disableKnobs: boolean;
}

export namespace ControlFlags {
  export function fromValue(value: number): ControlFlags {
    return {
      unusedBits: (value & 0b11110000) >> 4,
      disableMultiAdjustControl: (value & 0b00001000) !== 0,
      programExcludedFromSlaveLink: (value & 0b00000100) !== 0,
      pendingModuleChange: (value & 0b00000010) !== 0,
      disableKnobs: (value & 0b00000001) !== 0,
    };
  }

  export function toValue(flags: ControlFlags): number {
    return (flags.unusedBits << 4) |
      ((flags.disableMultiAdjustControl ? 1 : 0) << 3) |
      ((flags.programExcludedFromSlaveLink ? 1 : 0) << 2) |
      ((flags.pendingModuleChange ? 1 : 0) << 1) |
      (flags.disableKnobs ? 1 : 0);
  }
}

export interface OutputFlags {
  unused: boolean;
  monoAudioIntensity: boolean;
  disableButtons: boolean;
  splitMode: boolean;
  phaseControl3: boolean;
  phaseControl2: boolean;
  waitForAudioTrigger: boolean;
  phaseControl: boolean; // Or something MA related?
}

export namespace OutputFlags {
  export function fromValue(value: number): OutputFlags {
    return {
      unused: (value & 0b10000000) !== 0,
      monoAudioIntensity: (value & 0b01000000) !== 0,
      disableButtons: (value & 0b00100000) !== 0,
      splitMode: (value & 0b00010000) !== 0,
      phaseControl3: (value & 0b00001000) !== 0,
      phaseControl2: (value & 0b00000100) !== 0,
      waitForAudioTrigger: (value & 0b00000010) !== 0,
      phaseControl: (value & 0b00000001) !== 0,
    };
  }

  export function toValue(flags: OutputFlags): number {
    return ((flags.unused ? 1 : 0) << 7) |
      ((flags.monoAudioIntensity ? 1 : 0) << 6) |
      ((flags.disableButtons ? 1 : 0) << 5) |
      ((flags.splitMode ? 1 : 0) << 4) |
      ((flags.phaseControl3 ? 1 : 0) << 3) |
      ((flags.phaseControl2 ? 1 : 0) << 2) |
      ((flags.waitForAudioTrigger ? 1 : 0) << 1) |
      (flags.phaseControl ? 1 : 0);
  }
}

export interface DeviceConnection {
  peek(address: number): Promise<number>;
  poke(address: number, data: number | number[]): Promise<void>;
}

export class DeviceApi {
  private readonly connection: DeviceConnection;

  public readonly channelA: Channel;
  public readonly channelB: Channel;

  public readonly currentSettings: Settings;
  public readonly savedSettings: Settings;

  public constructor(connection: DeviceConnection) {
    this.connection = connection;

    this.channelA = new Channel(connection, 0x4000, 0x4064);
    this.channelB = new Channel(connection, 0x4100, 0x4065);

    this.currentSettings = new Settings(connection, 0x41F3);
    this.savedSettings = new Settings(connection, 0x8008);
  }

  public readonly getControlFlags = async (): Promise<ControlFlags> => this.connection.peek(0x400F).then(value => ControlFlags.fromValue(value));
  public readonly setControlFlags = async (flags: ControlFlags): Promise<void> => this.connection.poke(0x400F, ControlFlags.toValue(flags));

  public readonly getButtonActions = async (): Promise<{ up: number, down: number, menu: number, ok: number }> => ({
    up: await this.connection.peek(0x4013),
    down: await this.connection.peek(0x4014),
    menu: await this.connection.peek(0x4015),
    ok: await this.connection.peek(0x4016),
  });
  public readonly setButtonActions = async (actions: { up: number, down: number, menu: number, ok: number }): Promise<void> =>
    this.connection.poke(0x4013, [actions.up, actions.down, actions.menu, actions.ok]);

  // These are reset when the routine changes and may be controlled by some routines.
  // TODO: The phase flags aren't well understood enough to expose in the UI currently - enabling Phase 3 on a blank mode will output dangerously long pulses on B.
  public readonly getOutputFlags = async (): Promise<OutputFlags> => this.connection.peek(0x4083).then(value => OutputFlags.fromValue(value));
  public readonly setOutputFlags = async (flags: OutputFlags): Promise<void> => this.connection.poke(0x4083, OutputFlags.toValue(flags));

  public readonly getMultiAdjustMin = async (): Promise<number> => this.connection.peek(0x4086);
  public readonly setMultiAdjustMin = async (value: number): Promise<void> => this.connection.poke(0x4086, value);
  public readonly getMultiAdjustMax = async (): Promise<number> => this.connection.peek(0x4087);
  public readonly setMultiAdjustMax = async (value: number): Promise<void> => this.connection.poke(0x4087, value);
  public readonly getMultiAdjustValue = async (): Promise<number> => this.connection.peek(0x420D);
  public readonly setMultiAdjustValue = async (value: number): Promise<void> => this.connection.poke(0x420D, value);

  public readonly getCurrentMode = async (): Promise<Mode> => this.connection.peek(0x407B);
  public readonly switchToMode = async (mode: Mode): Promise<void> => {
    await this.connection.poke(0x407B, mode); // Selected Menu Item
    await this.connection.poke(0x4070, [0x04, 0x12]); // Exit Menu, Select New Mode

    // Wait some time for the device to execute the commands.
    await new Promise<void>(resolve => setTimeout(() => resolve(), 18));
  };

  public readonly getBatteryLevel = async (): Promise<number> => this.connection.peek(0x4203);

  public readonly getDebugMode = async (): Promise<boolean> => this.connection.peek(0x4207).then(value => value !== 0);
  public readonly setDebugMode = async (enabled: boolean): Promise<void> => this.connection.poke(0x4207, enabled ? 1 : 0);

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
        // TODO: We could optimise writes here by batching 8 bytes at a time.
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
    const currentTopMode = await this.savedSettings.getTopMode();
    const scratchpadMode = Math.min(Math.max(Mode.User1, currentTopMode + 1), Mode.User7);

    // Write the scratchpad module ID as the start module for the selected mode.
    // This seems to be set in the EEPROM even for the scratchpad modules.
    await this.connection.poke(0x8018 + (scratchpadMode - 0x88), 0xC0);

    // Set the in-memory high mode to include our newly assigned scratchpad mode.
    await this.currentSettings.setTopMode(scratchpadMode);

    // Switch to the new scratchpad mode.
    await this.switchToMode(scratchpadMode);
  };
}

export function usePolledGetter<T>(getter: (() => Promise<T>) | false): T | undefined {
  const [cachedValue, setCachedValue] = useState<T | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    if (getter !== false) {
      (async () => {
        while (!cancelled) {
          const value = await getter();
          if (cancelled) {
            break;
          }

          setCachedValue(oldValue => {
            if (Array.isArray(value) && Array.isArray(oldValue)) {
              if (value.length === oldValue.length) {
                for (let i = 0; i < value.length; ++i) {
                  if (value[i] !== oldValue[i]) {
                    return value;
                  }
                }

                return oldValue;
              }
            }

            return value;
          });
        }
      })();
    }

    return () => {
      cancelled = true;

      setCachedValue(undefined);
    };
  }, [getter]);

  return cachedValue;
}

// TODO: This is just a stub. What we want is usePolledGetter but with more control over the cache and polling for improved perf.
//       e.g. disabled or low-rate polling, clear / update cache on setter used, on-demand cache clearing.
export function useDeviceState<T, Ts extends ((value: T) => Promise<void>) | undefined, Tf extends T | undefined>(getter: (() => Promise<T>) | false, setter: Ts, fallback: Tf): [T | Tf, Ts] {
  let value = usePolledGetter(getter);
  let ret = (value !== undefined) ? value : fallback;

  return [ret, setter];
}
