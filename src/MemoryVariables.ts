/**
 * Data in this file is sourced from STPIHKAL.
 *
 * https://stpihkal.docs.buttplug.io/hardware/erostek-et312b.html
 */

export interface FlagInfo {
  mask: number,
  description?: string,
  values?: { [key: number]: string },
}

export interface VariableInfo {
  address: number,
  name?: string,
  description?: string,
  flags?: FlagInfo[],
  values?: { [key: number]: string },
}

const ACTIONS: { [key: number]: string } = {
  0x00: "Reset Current Routine",
  0x01: "Do Nothing",
  0x02: "Display Status Screen",
  0x03: "Select Current Menu Item",
  0x04: "Exit Menu",
  0x05: "Start Favourite Routine",
  0x06: "Set Power Level",
  0x07: "Edit Advanced Parameter",
  0x08: "Display Next Menu Item",
  0x09: "Display Previous Menu Item",
  0x0A: "Show Main Menu",
  0x0B: "Jump to Split Mode Settings Menu",
  0x0C: "Activates Split Mode",
  0x0D: "Advanced Value Up",
  0x0E: "Advanced Value Down",
  0x0F: "Show Advanced Menu",
  0x10: "Switch to Next Mode",
  0x11: "Switch to Previous Mode",
  0x12: "New Mode",
  0x13: "Write Character to LCD",
  0x14: "Write Number to LCD",
  0x15: "Write String from Stringtable to LCD",
  0x16: "Load Module",
  0x17: "Hard Reset",
  0x18: "Clear Module (Mute)",
  0x19: "Swap Channel A and B",
  0x1A: "Copy Channel A to Channel B",
  0x1B: "Copy Channel B to Channel A",
  0x1C: "Copy Defaults from EEPROM",
  0x1D: "Sets up Running Module Registers",
  0x1E: "Handles single instruction from a module",
  0x1F: "General way to call these functions",
  0x20: "Advanced Setting Update",
  0x21: "Start Ramp",
  0x22: "Does an ADC conversion",
  0x23: "Set LCD Position",
  0xFF: "No Command Pending",
};

// Some of these are firmware dependent, the values here are from f002.
export const MODES: { [key: number]: string } = {
  0x00: "Power On",
  0x01: "Unknown",
  // Main Menu Items
  0x07: "Start Ramp Up?",
  0x08: "Set Split Mode?",
  0x09: "Set As Favorite?",
  0x0A: "Set Pwr Level?",
  0x0B: "More Options?",
  0x0C: "Save Settings?",
  0x0D: "Reset Settings?",
  0x0E: "Adjust Advanced?",
  // More Options Menu Items
  0x20: "Random3 Mode ?",
  0x21: "Random4 Mode ?",
  0x22: "Debug Mode?",
  0x23: "Link Slave Unit?",
  // Power Level Menu Items
  0x6B: "Low",
  0x6C: "Normal",
  0x6D: "High",
  // Modes
  0x76: "Waves",
  0x77: "Stroke",
  0x78: "Climb",
  0x79: "Combo",
  0x7A: "Intense",
  0x7B: "Rhythm",
  0x7C: "Audio 1",
  0x7D: "Audio 2",
  0x7E: "Audio 3",
  0x7F: "Split",
  0x80: "Random 1",
  0x81: "Random 2",
  0x82: "Toggle",
  0x83: "Orgasm",
  0x84: "Torment",
  0x85: "Phase 1",
  0x86: "Phase 2",
  0x87: "Phase 3",
  0x88: "User 1",
  0x89: "User 2",
  0x8A: "User 3",
  0x8B: "User 4",
  0x8C: "User 5",
  0x8D: "User 6",
  0x8E: "User 7",
  // Adjust Advanced Menu Items
  0xD2: "RampLevl Adjust?",
  0xD3: "RampTime Adjust?",
  0xD4: "Depth Adjust?",
  0xD5: "Tempo Adjust?",
  0xD6: "Freq. Adjust?",
  0xD7: "Effect Adjust?",
  0xD8: "Width Adjust?",
  0xD9: "Pace Adjust?",
};

/*
 * This is with a sine wave input into Audio 3, all ranges are inclusive.
 * Pulse width comes from the Width advanced parameter.
 * 0 - 4 Hz there is no response.
 * 5 - 111 is glitchy with occasional double pulses.
 * 112 - 321 the output pulse frequency is an exact match
 * 322 - 325 is glitchy with occasional half pulses.
 * 326 - 646 divides the output frequency by 2 (163 - 323)
 * 647 - 652 is glitchy
 * 653 - 970 div 3 (217.67 - 323.33)
 * 971 - 974 is glitchy
 * 975 - 1293 div 4 (243.75 - 323.25)
 * 1294 - 1299 is glitchy
 * 1300 - 1616 div 5 (260 - 323.2)
 * 1617 - 1623 is glitchy
 * 1624 - 1941 div 6 (270.67 - 323.5)
 * 1942 - 1948 is glitchy
 * 1949 - div 7 (278.43 - )
 * This pattern continues.
 */

export const REGISTER_VARIABLES: VariableInfo[] = [
  { address: 0x4000, name: "r0" },
  { address: 0x4001, name: "r1" },
  { address: 0x4002, name: "r2" },
  { address: 0x4003, name: "r3" },
  { address: 0x4004, name: "r4" },
  { address: 0x4005, name: "r5", description: "Copied from `0x4090`" },
  { address: 0x4006, name: "r6", description: "Copied from `0x409C`" },
  { address: 0x4007, name: "r7", description: "Copied from `0x40A5`" },
  { address: 0x4008, name: "r8", description: "Copied from `min(9, 0x40AE)`" },
  { address: 0x4009, name: "r9", description: "Copied from `min(50, 0x40B7)`" },
  { address: 0x400A, name: "r10", description: "Copied from `0x4190`" },
  { address: 0x400B, name: "r11", description: "Copied from `0x419C`" },
  { address: 0x400C, name: "r12", description: "Copied from `0x41A5`" },
  { address: 0x400D, name: "r13", description: "Copied from `min(9, 0x41AE)`" },
  { address: 0x400E, name: "r14", description: "Copied from `min(50, 0x41B7)`" },
  {
    address: 0x400F, name: "r15", description: "ADC disable and other flags", flags: [
      { mask: 0b00000001, description: "Disable front panel knobs" },
      { mask: 0b00000010, description: "If set then we jump to a new module number given in `0x4084`" },
      { mask: 0b00000100, description: "Program excluded from slave link" },
      { mask: 0b00001000, description: "Disable Multi Adjust control" },
      { mask: 0b11110000, description: "Unused" },
    ],
  },
  {
    address: 0x4010, name: "r16", description: "Various flags", flags: [
      { mask: 0b00000011, description: "Channel A Gate Unknown" },
      { mask: 0b00000100, description: "Set if we are a linked slave" },
      { mask: 0b00001000, description: "Channel A Unknown" },
      { mask: 0b00110000, description: "Channel B Gate Unknown" },
      { mask: 0b01000000, description: "Which bank of slave registers to send next" },
      { mask: 0b10000000, description: "Channel B Unknown" },
    ],
  },
  {
    address: 0x4011, name: "r17", description: "Various flags", flags: [
      { mask: 0b00000001, description: "Apply loading module to channel A" },
      { mask: 0b00000010, description: "Apply loading module to channel B" },
      { mask: 0b00000100, description: "Timer has triggered" },
      { mask: 0b00001000, description: "ADC conversion running" },
      { mask: 0b00010000, description: "Unknown" },
      { mask: 0b00100000, description: "Serial command pending" },
      { mask: 0b01000000, description: "Serial command error" },
      { mask: 0b10000000, description: "Set if we are a linked master" },
    ],
  },
  { address: 0x4012, name: "r18" },
  { address: 0x4013, name: "r19", description: "Action when Up key pushed", values: ACTIONS },
  { address: 0x4014, name: "r20", description: "Action when Down key pushed", values: ACTIONS },
  { address: 0x4015, name: "r21", description: "Action when Menu key pushed", values: ACTIONS },
  { address: 0x4016, name: "r22", description: "Action when OK key pushed", values: ACTIONS },
  { address: 0x4017, name: "r23" },
  { address: 0x4018, name: "r24" },
  { address: 0x4019, name: "r25" },
  { address: 0x401A, name: "r26" },
  { address: 0x401B, name: "r27" },
  { address: 0x401C, name: "r28" },
  { address: 0x401D, name: "r29" },
  { address: 0x401E, name: "r30" },
  { address: 0x401F, name: "r31" },
  { address: 0x4020, name: "TWBR" },
  { address: 0x4021, name: "TWSR" },
  { address: 0x4022, name: "TWAR" },
  { address: 0x4023, name: "TWDR" },
  { address: 0x4024, name: "ADCL" },
  { address: 0x4025, name: "ADCH" },
  { address: 0x4026, name: "ADCSRA" },
  { address: 0x4027, name: "ADMUX" },
  { address: 0x4028, name: "ACSR" },
  { address: 0x4029, name: "UBRRL" },
  { address: 0x402A, name: "UCSRB" },
  { address: 0x402B, name: "UCSRA" },
  { address: 0x402C, name: "UDR" },
  { address: 0x402D, name: "SPCR" },
  { address: 0x402E, name: "SPSR" },
  { address: 0x402F, name: "SPDR" },
  { address: 0x4030, name: "PIND" },
  { address: 0x4031, name: "DDRD" },
  { address: 0x4032, name: "PORTD" },
  { address: 0x4033, name: "PINC" },
  { address: 0x4034, name: "DDRC" },
  { address: 0x4035, name: "PORTC" },
  { address: 0x4036, name: "PINB" },
  { address: 0x4037, name: "DDRB" },
  { address: 0x4038, name: "PORTB" },
  { address: 0x4039, name: "PINA" },
  { address: 0x403A, name: "DDRA" },
  { address: 0x403B, name: "PORTA" },
  { address: 0x403C, name: "EECR" },
  { address: 0x403D, name: "EEDR" },
  { address: 0x403E, name: "EEARL" },
  { address: 0x403F, name: "EEARH" },
  { address: 0x4040, name: "UBRRH/UCSRC" },
  { address: 0x4041, name: "WDTCR" },
  { address: 0x4042, name: "ASSR" },
  { address: 0x4043, name: "OCR2" },
  { address: 0x4044, name: "TCNT2" },
  { address: 0x4045, name: "TCCR2" },
  { address: 0x4046, name: "ICR1L" },
  { address: 0x4047, name: "ICR1H" },
  { address: 0x4048, name: "OCR1BL" },
  { address: 0x4049, name: "OCR1BH" },
  { address: 0x404A, name: "OCR1AL" },
  { address: 0x404B, name: "OCR1AH" },
  { address: 0x404C, name: "TCNT1L" },
  { address: 0x404D, name: "TCNT1H" },
  { address: 0x404E, name: "TCCR1B" },
  { address: 0x404F, name: "TCCR1A" },
  { address: 0x4050, name: "SFIOR" },
  { address: 0x4051, name: "OSCCAL/OCDR" },
  { address: 0x4052, name: "TCNT0" },
  { address: 0x4053, name: "TCCR0" },
  { address: 0x4054, name: "MCUCSR" },
  { address: 0x4055, name: "MCUCR" },
  { address: 0x4056, name: "TWCR" },
  { address: 0x4057, name: "SPMCSR" },
  { address: 0x4058, name: "TIFR" },
  { address: 0x4059, name: "TIMSK" },
  { address: 0x405A, name: "GIFR" },
  { address: 0x405B, name: "GICR" },
  { address: 0x405C, name: "OCR0" },
  { address: 0x405D, name: "SPL" },
  { address: 0x405E, name: "SPH" },
  { address: 0x405F, name: "SREG" },
];

const BUTTONS: FlagInfo[] = [
  { mask: 0b00001111, description: "Unused" },
  { mask: 0b00010000, description: "Down" },
  { mask: 0b00100000, description: "OK" },
  { mask: 0b01000000, description: "Up" },
  { mask: 0b10000000, description: "Menu" },
];

const GATE_POLARITY: { [key: number]: string } = {
  0b00: "No Pulses",
  0b01: "Negative Pulses",
  0b10: "Positive Pulses",
  0b11: "Biphasic Pulses",
};

const GATE_VALUE: FlagInfo[] = [
  { mask: 0b00000001, description: "Gate On" }, // 0:
  { mask: 0b00000110, description: "Polarity", values: GATE_POLARITY }, // 1,2: Stroke toggles between these - output polarity control - chan a becomes r16 bit 0 and 1
  { mask: 0b00001000, description: "Alternate Polarity" }, // 3: Never seen these set - pulses alternate in polarity at half frequency
  { mask: 0b00010000, description: "Invert Polarity" }, // 4: Never seen these set - chan a becomes r16 bit 3
  { mask: 0b00100000, description: "Audio Controls Frequency" }, // 5: Set in Audio 3 only
  { mask: 0b01000000, description: "Audio Controls Intensity" }, // 6: Set in all audio modes
  { mask: 0b10000000, description: "Unknown Phase 3" }, // 7: Set for only Channel B in Phase 3 (along with "Audio 3" flag)
];

const GATE_TIMERS: { [key: number]: string } = {
  0b00: "No gating",
  0b01: "Use the `0x4088` (244Hz) timer for gating",
  0b10: "Use the `0x4088` div 8 (30.5Hz) timer for gating",
  0b11: "Use the `0x4089` (.953Hz) timer for gating",
};

const GATE_OFF_SOURCE: { [key: number]: string } = {
  0b00: "Set Value",
  0b01: "Tempo Advanced Parameter",
  0b10: "MA Knob",
};

const GATE_ON_SOURCE: { [key: number]: string } = {
  0b00: "Set Value",
  0b01: "Effect Advanced Parameter",
  0b10: "MA Knob",
};

const GATE_SELECT: FlagInfo[] = [
  { mask: 0b00000011, description: "Timer Selection", values: GATE_TIMERS },
  { mask: 0b00011100, description: "Off Time Source", values: GATE_OFF_SOURCE },
  { mask: 0b11100000, description: "On Time Source", values: GATE_ON_SOURCE },
];

const VALUE_ABS_SOURCES: { [key: number]: string } = {
  0b00: "Leave value alone, nop",
  0b01: "Set the value to advanced default for this variable",
  0b10: "Set the value to the current MA knob value",
  0b11: "Copy from the other channels value",
};

const VALUE_TIMER_SOURCES: { [key: number]: string } = {
  0b00: "Rate is from parameter",
  0b01: "Rate is from advanced parameter default",
  0b10: "Rate is from MA value",
  0b11: "Rate is rate from other channel",
};

const VALUE_MIN_ACTION: { [key: number]: string } = {
  0b00: "Don't change min",
  0b01: "Set min to advanced parameter default",
  0b10: "Set min to MA value",
  0b11: "Set min to min of other channel",
};

const  VALUE_SELECT: FlagInfo[] = [
  { mask: 0b00000011, description: "Timer Selection", values: GATE_TIMERS },
  { mask: 0b01111100, description: "No-Timer Value Source", values: VALUE_ABS_SOURCES },
  { mask: 0b00001100, description: "Timer Min Source", values: VALUE_MIN_ACTION },
  { mask: 0b00010000, description: "Invert Min" },
  { mask: 0b01100000, description: "Timer Rate Source", values: VALUE_TIMER_SOURCES },
  { mask: 0b10000000, description: "Invert Value" },
];

const MODULES: { [key: number]: string } = {
  0: "None",
  1: "Initialization",
  2: "Intense B",
  3: "Stroke A",
  4: "Stroke B",
  5: "Climb A",
  // 6?
  // 7?
  8: "Climb B",
  // 9? "b variant of 6"
  // 10? "b variant of 7"
  11: "Waves A",
  12: "Waves B",
  13: "Combo A",
  14: "Intense A",
  15: "Rhythm (1)",
  16: "Rhythm (2)",
  17: "Rhythm (3)",
  18: "Toggle (1)",
  19: "Toggle (2)",
  20: "Phase (1)",
  21: "Phase (2)",
  22: "Phase 2",
  23: "Audio 1/2",
  24: "Orgasm (1)",
  25: "Orgasm (2)",
  26: "Orgasm (3)",
  27: "Orgasm (4)",
  28: "Torment (1)",
  29: "Torment (2)",
  30: "Torment (3)",
  31: "Torment (4)",
  32: "Random 2",
  33: "Combo B",
  34: "Audio 3",
  35: "Phase (3)",

  // 128+ User Modules
  ...Array.from({ length: 64 }, (_, i) => `User ${i + 1}`)
    .reduce((o, name, i) => ({ ...o, [128 + i]: name }), {}),

  // 192+ Scratchpad Modules
  ...Array.from({ length: 32 }, (_, i) => `Scratchpad ${i + 1}`)
    .reduce((o, name, i) => ({ ...o, [192 + i]: name }), {}),
}

const ACTION_AT_MIN_MAX: { [key: number]: string } = {
  ...Array.from({ length: 224 }, (_, i) => MODULES[i] || `Unknown ${i}`)
    .reduce((o, name, i) => ({ ...o, [i]: `Switch to Module: ${name}` }), {}),

  0xFC: "Stop",
  0xFD: "Loop",
  0xFE: "Reverse and Toggle Polarity",
  0xFF: "Reverse",
};

const POWER_LEVELS = {
  1: "Low",
  2: "Normal",
  3: "High",
};

export const RAM_VARIABLES: VariableInfo[] = [
  { address: 0x4060, description: "ADC0: Output Current Sense" },
  { address: 0x4061, description: "ADC1: Multi Adjust Offset" },
  { address: 0x4062, description: "ADC2: Power Supply Voltage" },
  { address: 0x4063, description: "ADC3: Battery Voltage" },
  { address: 0x4064, description: "ADC4: Level Pot A" },
  { address: 0x4065, description: "ADC5: Level Pot B" },
  { address: 0x4066, description: "ADC6: Audio Input Level A (Half wave)" },
  { address: 0x4067, description: "ADC7: Audio Input Level B (Half wave)" },
  { address: 0x4068, description: "Current pushed buttons", flags: BUTTONS },
  { address: 0x4069, description: "Last pushed buttons", flags: BUTTONS },
  { address: 0x406A, description: "Master timer (MSB) runs 1.91Hz" },
  { address: 0x406B, description: "Channel A calibration (DAC power offset)" },
  { address: 0x406C, description: "Channel B calibration (DAC power offset)" },
  { address: 0x406D, description: "Menu State", values: { 1: "In Startup Screen or Menu", 2: "Program Display Showing" } },
  // { address: 0x406E, description: "Unused" },
  // { address: 0x406F, description: "Unused" },
  { address: 0x4070, description: "Execute Command (1)", values: ACTIONS },
  { address: 0x4071, description: "Execute Command (2)", values: ACTIONS },
  { address: 0x4072, description: "Last random number picked" },
  { address: 0x4073, description: "Master timer (LSB) runs at 488Hz (8MHz/64(scaler)/256)" },
  { address: 0x4074, description: "Random 1 mode, 1 (start) or current random mode number" },
  { address: 0x4075, description: "Random 1 mode, stores counter time when to change mode" },
  // { address: 0x4076, description: "Unused" },
  // { address: 0x4077, description: "Unused" },
  { address: 0x4078, description: "Current displayed Menu Item/Mode (not yet selected)", values: MODES },
  { address: 0x4079, description: "Lowest Selectable Menu Item/Mode", values: MODES },
  { address: 0x407A, description: "Highest Selectable Menu Item/Mode", values: MODES },
  { address: 0x407B, description: "Current Mode", values: MODES },
  { address: 0x407C, description: "Oscillator Ch A (updated but unused)" },
  { address: 0x407D, description: "Oscillator Ch A (updated but unused)" },
  { address: 0x407E, description: "Oscillator Ch B (updated but unused)" },
  { address: 0x407F, description: "Oscillator Ch B (updated but unused)" },
  // { address: 0x4080, description: "Unused" },
  // { address: 0x4081, description: "Unused" },
  { address: 0x4082, description: "Retry counter when communicating with slave" },
  {
    address: 0x4083, description: "Output Control Flags", flags: [
      { mask: 0b00000001, description: "Phase Control" }, // Has something to do with updating MA value - Phase 1, Phase 2
      { mask: 0b00000010, description: "Wait for Audio Trigger" },
      { mask: 0b00000100, description: "Phase Control 2" }, // Audio 3, Phase 1, Phase 2
      { mask: 0b00001000, description: "Phase Control 3" }, // Phase 3
      { mask: 0b00010000, description: "Split Mode" }, // Not observable via serial, only for Channel B module execution?
      { mask: 0b00100000, description: "Disable Front Panel Buttons" },
      { mask: 0b01000000, description: "Mono Audio Intensity" },
      { mask: 0b10000000, description: "Unused" },
    ],
  },
  { address: 0x4084, description: "Module to load if condition met", values: MODULES },
  {
    address: 0x4085, description: "When module loading determines which channels to set", flags: [
      { mask: 0b00000001, description: "Channel A" },
      { mask: 0b00000010, description: "Channel B" },
      { mask: 0b11111100, description: "Unused" },
    ],
  },
  { address: 0x4086, description: "Multi Adjust Range Min" },
  { address: 0x4087, description: "Multi Adjust Range Max" },
  { address: 0x4088, description: "Module timer (3 bytes) low - 244Hz (409uS)" },
  { address: 0x4089, description: "Module timer (3 bytes) mid - 0.953Hz (1.048S)" },
  { address: 0x408A, description: "Module timer (3 bytes) high - (268.43S)" },
  { address: 0x408B, description: "Module timer (slower) - 30.5Hz" },
  { address: 0x408C, description: "Channel A: Module temporary byte store" },
  { address: 0x408D, description: "Random Number Min" },
  { address: 0x408E, description: "Random Number Max" },
  { address: 0x408F, description: "Module to load if audio triggered", values: MODULES },
  { address: 0x4090, description: "Channel A: Current Gate Value", flags: GATE_VALUE },
  { address: 0x4091, description: "Module wants to change channel A gates" },
  { address: 0x4092, description: "Module wants to change channel B gates" },
  // { address: 0x4093, description: "Unused" },
  { address: 0x4094, description: "Channel A: Next module timer current" },
  { address: 0x4095, description: "Channel A: Next module timer max" },
  { address: 0x4096, description: "Channel A: Next module flag" },
  { address: 0x4097, description: "Channel A: Next module number", values: MODULES },
  { address: 0x4098, description: "Channel A: Current Gate OnTime" },
  { address: 0x4099, description: "Channel A: Current Gate OffTime" },
  { address: 0x409A, description: "Channel A: Current Gate Select", flags: GATE_SELECT },
  { address: 0x409B, description: "Channel A: Number of Gate transitions Done" },
  { address: 0x409C, description: "Channel A: Mode Switch Ramp Value Counter" },
  { address: 0x409D, description: "Channel A: Mode Switch Ramp Value Min" },
  { address: 0x409E, description: "Channel A: Mode Switch Ramp Value Max" },
  { address: 0x409F, description: "Channel A: Mode Switch Ramp Value Rate" },
  { address: 0x40A0, description: "Channel A: Mode Switch Ramp Value Step" },
  { address: 0x40A1, description: "Channel A: Mode Switch Ramp Action at Min", values: ACTION_AT_MIN_MAX },
  { address: 0x40A2, description: "Channel A: Mode Switch Ramp Action at Max", values: ACTION_AT_MIN_MAX },
  { address: 0x40A3, description: "Channel A: Mode Switch Ramp Select" },
  { address: 0x40A4, description: "Channel A: Mode Switch Ramp Current Timer" },
  { address: 0x40A5, description: "Channel A: Current Intensity Modulation Value" },
  { address: 0x40A6, description: "Channel A: Current Intensity Modulation Min" },
  { address: 0x40A7, description: "Channel A: Current Intensity Modulation Max" },
  { address: 0x40A8, description: "Channel A: Current Intensity Modulation Rate" },
  { address: 0x40A9, description: "Channel A: Current Intensity Modulation Step" },
  { address: 0x40AA, description: "Channel A: Current Intensity Action at Min", values: ACTION_AT_MIN_MAX },
  { address: 0x40AB, description: "Channel A: Current Intensity Action at Max", values: ACTION_AT_MIN_MAX },
  { address: 0x40AC, description: "Channel A: Current Intensity Modulation Select", flags: VALUE_SELECT },
  { address: 0x40AD, description: "Channel A: Current Intensity Modulation Timer" },
  { address: 0x40AE, description: "Channel A: Current Frequency Modulation Value" },
  { address: 0x40AF, description: "Channel A: Current Frequency Modulation Min" },
  { address: 0x40B0, description: "Channel A: Current Frequency Modulation Max" },
  { address: 0x40B1, description: "Channel A: Current Frequency Modulation Rate" },
  { address: 0x40B2, description: "Channel A: Current Frequency Modulation Step" },
  { address: 0x40B3, description: "Channel A: Current Frequency Modulation Action Min", values: ACTION_AT_MIN_MAX },
  { address: 0x40B4, description: "Channel A: Current Frequency Modulation Action Max", values: ACTION_AT_MIN_MAX },
  { address: 0x40B5, description: "Channel A: Current Frequency Modulation Select", flags: VALUE_SELECT },
  { address: 0x40B6, description: "Channel A: Current Frequency Modulation Timer" },
  { address: 0x40B7, description: "Channel A: Current Width Modulation Value" },
  { address: 0x40B8, description: "Channel A: Current Width Modulation Min" },
  { address: 0x40B9, description: "Channel A: Current Width Modulation Max" },
  { address: 0x40BA, description: "Channel A: Current Width Modulation Rate" },
  { address: 0x40BB, description: "Channel A: Current Width Modulation Step" },
  { address: 0x40BC, description: "Channel A: Current Width Modulation Action Min", values: ACTION_AT_MIN_MAX },
  { address: 0x40BD, description: "Channel A: Current Width Modulation Action Max", values: ACTION_AT_MIN_MAX },
  { address: 0x40BE, description: "Channel A: Current Width Modulation Select", flags: VALUE_SELECT },
  { address: 0x40BF, description: "Channel A: Current Width Modulation Timer" },
  // 0x40C0 - 0x417F Scratchpad module data
  { address: 0x4180, description: "Write LCD Parameter" },
  { address: 0x4181, description: "Write LCD Position" },
  { address: 0x4182, description: "Parameter `r26` for box command" },
  { address: 0x4183, description: "Parameter `r27` for box command" },
  { address: 0x4184, description: "Set to random number during Random 1 Program" },
  { address: 0x4185, description: "Need to show select mode message" },
  // 0x4186 - 0x4187 Unused
  // 0x4188 - 0x418B Unused - bytes above here are initialized at routine start
  { address: 0x418C, description: "Channel B: Module temporary byte store" },
  // 0x418D - 0x418F Unused
  { address: 0x4190, description: "Channel B: Current Gate Value", flags: GATE_VALUE },
  // 0x4191 - 0x4193 Unused
  { address: 0x4194, description: "Channel B: Next module timer current" },
  { address: 0x4195, description: "Channel B: Next module timer max" },
  { address: 0x4196, description: "Channel B: Next module flag" },
  { address: 0x4197, description: "Channel B: Next module number", values: MODULES },
  { address: 0x4198, description: "Channel B: Current Gate OnTime" },
  { address: 0x4199, description: "Channel B: Current Gate OffTime" },
  { address: 0x419A, description: "Channel B: Current Gate Select", flags: GATE_SELECT },
  { address: 0x419B, description: "Channel B: Number of Gate Transitions Done" },
  { address: 0x419C, description: "Channel B: Mode Switch Ramp Value Counter" },
  { address: 0x419D, description: "Channel B: Mode Switch Ramp Value Min" },
  { address: 0x419E, description: "Channel B: Mode Switch Ramp Value Max" },
  { address: 0x419F, description: "Channel B: Mode Switch Ramp Value Rate" },
  { address: 0x41A0, description: "Channel B: Mode Switch Ramp Value Step" },
  { address: 0x41A1, description: "Channel B: Mode Switch Ramp Action at Min", values: ACTION_AT_MIN_MAX },
  { address: 0x41A2, description: "Channel B: Mode Switch Ramp Action at Max", values: ACTION_AT_MIN_MAX },
  { address: 0x41A3, description: "Channel B: Mode Switch Ramp Select" },
  { address: 0x41A4, description: "Channel B: Mode Switch Ramp Current Timer" },
  { address: 0x41A5, description: "Channel B: Current Intensity Modulation Value" },
  { address: 0x41A6, description: "Channel B: Current Intensity Modulation Min" },
  { address: 0x41A7, description: "Channel B: Current Intensity Modulation Max" },
  { address: 0x41A8, description: "Channel B: Current Intensity Modulation Rate" },
  { address: 0x41A9, description: "Channel B: Current Intensity Modulation Step" },
  { address: 0x41AA, description: "Channel B: Current Intensity Action at Min", values: ACTION_AT_MIN_MAX },
  { address: 0x41AB, description: "Channel B: Current Intensity Action at Max", values: ACTION_AT_MIN_MAX },
  { address: 0x41AC, description: "Channel B: Current Intensity Modulation Select", flags: VALUE_SELECT },
  { address: 0x41AD, description: "Channel B: Current Intensity Modulation Timer" },
  { address: 0x41AE, description: "Channel B: Current Frequency Modulation Value" },
  { address: 0x41AF, description: "Channel B: Current Frequency Modulation Min" },
  { address: 0x41B0, description: "Channel B: Current Frequency Modulation Max" },
  { address: 0x41B1, description: "Channel B: Current Frequency Modulation Rate" },
  { address: 0x41B2, description: "Channel B: Current Frequency Modulation Step" },
  { address: 0x41B3, description: "Channel B: Current Frequency Modulation Action Min", values: ACTION_AT_MIN_MAX },
  { address: 0x41B4, description: "Channel B: Current Frequency Modulation Action Max", values: ACTION_AT_MIN_MAX },
  { address: 0x41B5, description: "Channel B: Current Frequency Modulation Select", flags: VALUE_SELECT },
  { address: 0x41B6, description: "Channel B: Current Frequency Modulation Timer" },
  { address: 0x41B7, description: "Channel B: Current Width Modulation Value" },
  { address: 0x41B8, description: "Channel B: Current Width Modulation Min" },
  { address: 0x41B9, description: "Channel B: Current Width Modulation Max" },
  { address: 0x41BA, description: "Channel B: Current Width Modulation Rate" },
  { address: 0x41BB, description: "Channel B: Current Width Modulation Step" },
  { address: 0x41BC, description: "Channel B: Current Width Modulation Action Min", values: ACTION_AT_MIN_MAX },
  { address: 0x41BD, description: "Channel B: Current Width Modulation Action Max", values: ACTION_AT_MIN_MAX },
  { address: 0x41BE, description: "Channel B: Current Width Modulation Select", flags: VALUE_SELECT },
  { address: 0x41BF, description: "Channel B: Current Width Modulation Timer" },
  // 0x41C0 - 0x41CF Last 16 MA knob readings used for averaging
  // 0x41D0 - 0x41EF Scratchpad module pointers 0xC0 - 0xDF
  { address: 0x41F0, description: "Pointer (counter) for MA knob averaging" },
  { address: 0x41F1, description: "Pointer (counter) for serial output buffer" },
  { address: 0x41F2, description: "Pointer (counter) for serial input buffer" },
  { address: 0x41F3, description: "Current Top Mode (written during routine write)", values: MODES },
  { address: 0x41F4, description: "Power Level", values: POWER_LEVELS },
  { address: 0x41F5, description: "Split Mode Number A", values: MODES },
  { address: 0x41F6, description: "Split Mode Number B", values: MODES },
  { address: 0x41F7, description: "Favourite Mode", values: MODES },
  { address: 0x41F8, description: "Advanced Parameter: RampLevel" },
  { address: 0x41F9, description: "Advanced Parameter: RampTime" },
  { address: 0x41FA, description: "Advanced Parameter: Depth" },
  { address: 0x41FB, description: "Advanced Parameter: Tempo" },
  { address: 0x41FC, description: "Advanced Parameter: Frequency" },
  { address: 0x41FD, description: "Advanced Parameter: Effect" },
  { address: 0x41FE, description: "Advanced Parameter: Width" },
  { address: 0x41FF, description: "Advanced Parameter: Pace" },
  { address: 0x4200, description: "Value of advanced parameter being edited" },
  { address: 0x4201, description: "Min value of advanced parameter being edited" },
  { address: 0x4202, description: "Max value of advanced parameter being edited" },
  { address: 0x4203, description: "Battery level as a percentage (0-99)" },
  { address: 0x4204, description: "Calculated PWM frequency" },
  { address: 0x4205, description: "Channel A DAC level" },
  { address: 0x4206, description: "Channel B DAC level" },
  { address: 0x4207, description: "Debug mode: displays current module number if not 0" },
  { address: 0x4208, description: "Used for DAC SPI transfer" },
  { address: 0x4209, description: "Channel A PWM mark" },
  { address: 0x420A, description: "Channel A PWM mark" },
  { address: 0x420B, description: "Channel A PWM space" },
  { address: 0x420C, description: "Channel A PWM space" },
  { address: 0x420D, description: "Current Multi Adjust Value" },
  { address: 0x420E, description: "Channel B PWM mark" },
  { address: 0x420F, description: "Channel B PWM mark" },
  { address: 0x4210, description: "Channel B PWM space" },
  { address: 0x4211, description: "Channel B PWM space" },
  { address: 0x4212, description: "Com instruction expected instruction length" },
  { address: 0x4213, description: "Com cipher key" },
  { address: 0x4214, description: "Com buffer incrementer" },
  {
    address: 0x4215, description: "Power status bits", flags: [
      { mask: 0b00000001, description: "Has Battery" },
      { mask: 0b00000010, description: "Has Power Supply" },
      { mask: 0b11111100, description: "Unused" },
    ],
  },
  // 0x4216 - 0x4217 Unused
  // 0x4218 - 0x421F Decoded module instruction to parse
  // 0x4220 - 0x422B Serial comms input buffer
  // 0x422C - 0x4237 Serial comms input buffer
  // 0x4238 - 0x43FF Unused
];

export const EEPROM_VARIABLES: VariableInfo[] = [
  // { address: 0x8000, description: "Unused" },
  { address: 0x8001, description: "Magic", values: { 0x55: "Provisioned", 0xFF: "Blank" } },
  { address: 0x8002, description: "Box Serial 1" },
  { address: 0x8003, description: "Box Serial 2" },
  // { address: 0x8004, description: "Unused" },
  // { address: 0x8005, description: "Unused" },
  { address: 0x8006, description: "ELinkSig1" },
  { address: 0x8007, description: "ELinkSig2" },
  { address: 0x8008, description: "Top Mode (written during routine write)", values: MODES },
  { address: 0x8009, description: "Power Level", values: POWER_LEVELS },
  { address: 0x800A, description: "Split Mode Number A", values: MODES },
  { address: 0x800B, description: "Split Mode Number B", values: MODES },
  { address: 0x800C, description: "Favourite Mode", values: MODES },
  { address: 0x800D, description: "Advanced Parameter: RampLevel" },
  { address: 0x800E, description: "Advanced Parameter: RampTime" },
  { address: 0x800F, description: "Advanced Parameter: Depth" },
  { address: 0x8010, description: "Advanced Parameter: Tempo" },
  { address: 0x8011, description: "Advanced Parameter: Frequency" },
  { address: 0x8012, description: "Advanced Parameter: Effect" },
  { address: 0x8013, description: "Advanced Parameter: Width" },
  { address: 0x8014, description: "Advanced Parameter: Pace" },
  // 0x8015 - 0x8017 Unused
  { address: 0x8018, description: "Start Vector User 1" },
  { address: 0x8019, description: "Start Vector User 2" },
  { address: 0x801A, description: "Start Vector User 3" },
  { address: 0x801B, description: "Start Vector User 4" },
  { address: 0x801C, description: "Start Vector User 5" },
  { address: 0x801D, description: "Start Vector User 6" },
  { address: 0x801E, description: "Start Vector User 7 (Not Implemented)" },
  { address: 0x801F, description: "Start Vector User 8 (Not Implemented)" },
  // 0x8020 - 0x803F User routine module pointers 0x80-0x9F
  ...Array.from({ length: 32 }, (_, i) => ({ address: 0x8020 + i, description: `Start User Module ${i + 1}` })),
  // 0x8040 - 0x80FF Space for User Modules
  // 0x8100 - 0x811F User routine module pointers 0xA0-0xBF
  ...Array.from({ length: 32 }, (_, i) => ({ address: 0x8100 + i, description: `Start User Module ${i + 33}` })),
  // 0x8120 - 0x81FF Space for User Modules
];
