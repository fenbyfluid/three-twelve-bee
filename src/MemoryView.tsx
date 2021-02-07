import { Button, Classes, H3, HTMLTable, Switch, Tab, Tabs } from "@blueprintjs/core";
import { DeviceConnection } from "./DeviceConnection";
import React, { useEffect, useRef, useState } from "react";
import "./MemoryView.css";

interface FlagInfo {
  mask: number,
  description?: string,
}

interface VariableInfo {
  address: number,
  name: string,
  description?: string,
  flags?: FlagInfo[],
}

const VariableDescription = React.memo(function VariableDescription(props: { text: string }) {
  const chunks = props.text.split("`")
    .map((chunk, i) => {
      if (chunk.length === 0) {
        return undefined;
      }

      const className = (i % 2) === 0 ? undefined : Classes.MONOSPACE_TEXT;
      return React.createElement("span", { key: i, className }, chunk);
    });

  return <React.Fragment>
    {chunks}
  </React.Fragment>;
});

interface VariableFlagTableProps {
  value: number,
  flags: FlagInfo[],
}

const VariableFlagTable = React.memo(function VariableFlagTable(props: VariableFlagTableProps) {
  const rows = props.flags.map(flag => {
    const cells = [];
    for (let i = 7; i >= 0; --i) {
      const used = (flag.mask & (1 << i)) !== 0;
      const set = (props.value & (1 << i)) !== 0;

      cells.push(<td key={i} className={Classes.MONOSPACE_TEXT}>
        { used && (set ? "1" : "0") }
      </td>);
    }

    cells.push(<td key={-1}>
      {flag.description && <VariableDescription text={flag.description} />}
    </td>);

    return <tr>{cells}</tr>;
  });

  return <HTMLTable condensed={true} className="flag-table">
    <tbody>
      {rows}
    </tbody>
  </HTMLTable>;
});

interface VariableTableProps {
  base: number;
  data: Uint8Array,
  variables: VariableInfo[],
}

function VariableTable(props: VariableTableProps) {
  const rows = props.variables.map(variable => {
    const address = variable.address
      .toString(16).toUpperCase().padStart(4, "0");

    const value = props.data[variable.address - props.base];
    const valueHex = value.toString(16).toUpperCase().padStart(2, "0");

    const flagTable = variable.flags && <tr>
        <td />
        <td colSpan={3}>
            <VariableFlagTable value={value} flags={variable.flags} />
        </td>
    </tr>;

    return <React.Fragment key={variable.address}>
      <tr>
        <td className={Classes.MONOSPACE_TEXT}>{address}</td>
        <td>{variable.name}</td>
        <td className={Classes.MONOSPACE_TEXT}>0x{valueHex}</td>
        <td>{variable.description && <VariableDescription text={variable.description} />}</td>
      </tr>
      {flagTable}
    </React.Fragment>;
  });

  return <HTMLTable condensed={true} className="variable-table">
    <thead>
      <tr>
        <th>Address</th>
        <th>Name</th>
        <th>Value</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      {rows}
    </tbody>
  </HTMLTable>
}

interface MemoryTableProps {
  stride?: number,
  base: number;
  data: Uint8Array,
  lastChange: number[],
  willAutoRefresh: boolean,
  forcedRedraw: number,
  setForcedRedraw: React.Dispatch<React.SetStateAction<number>>,
}

function MemoryTable(props: MemoryTableProps) {
  const stride = props.stride || 16;

  const litCellRedrawTimeout = useRef(0);

  useEffect(() => {
    return () => {
      if (litCellRedrawTimeout.current !== 0) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        window.clearTimeout(litCellRedrawTimeout.current);
      }
    };
  }, []);

  const now = Date.now();

  const header = [<th key={-1} />, <th key={-2} />];
  for (let x = 0; x < stride; ++x) {
    header.push(<th key={x}>{x.toString(16).toUpperCase()}</th>);

    if ((x % 8) === 7) {
      header.push(<th key={stride + x} />);
    }
  }

  const rows = [];
  for (let y = 0; y < (props.data.length / stride); ++y) {
    const cells = [];
    for (let x = 0; x < stride; ++x) {
      const i = (y * stride) + x;
      const value = props.data[i]
        .toString(16).toUpperCase().padStart(2, "0");

      const age = (now - (props.lastChange[i] || 0)) / 200;
      const lightness = 40 - Math.min(Math.max(0, age), 40);

      if (lightness > 0 && litCellRedrawTimeout.current === 0 && !props.willAutoRefresh) {
        litCellRedrawTimeout.current = window.setTimeout(() => {
          litCellRedrawTimeout.current = 0;
          props.setForcedRedraw(prev => prev + 1);
        }, 250);
      }

      cells.push(<td key={x}>
        <span className={(props.forcedRedraw === 0) ? Classes.SKELETON : undefined}
              style={{ color: lightness > 0 ? `hsl(337, 66%, ${lightness}%)` : undefined }}>{value}</span>
      </td>);

      if ((x % 8) === 7) {
        cells.push(<th key={stride + x} />);
      }
    }

    const address = (props.base + (y * stride))
      .toString(16).toUpperCase().padStart(4, "0");

    rows.push(<tr key={y}>
      <th>{address}</th>
      <th key={-2} />
      {cells}
    </tr>);
  }

  return <HTMLTable className={`memory-table ${Classes.MONOSPACE_TEXT}`}>
    <thead>
      <tr>{header}</tr>
    </thead>
    <tbody>
      {rows}
    </tbody>
  </HTMLTable>;
}

interface DeviceMemoryDumpProps {
  device: DeviceConnection;
  base: number;
  length: number;
  label: string;
  variables?: VariableInfo[] | false,
  setShowVariableView?: React.Dispatch<React.SetStateAction<boolean>>,
  autoRefresh: boolean,
  setAutoRefresh: React.Dispatch<React.SetStateAction<boolean>>,
}

function DeviceMemoryDump(props: DeviceMemoryDumpProps) {
  const ref = useRef({
    data: new Uint8Array(props.length),
    lastChange: new Array(props.length),
  });

  const [forcedRedraw, setForcedRedraw] = useState(0);
  const [forcedRefresh, setForcedRefresh] = useState(0);

  useEffect(() => {
    if (ref.current.data.length !== props.length) {
      ref.current.data = new Uint8Array(props.length);
      ref.current.lastChange = new Array(props.length);
    }

    let hasUnmounted = false;
    let nextReadTimeout: number | null = null;

    const updateData = function () {
      const now = Date.now();
      let readPromise = Promise.resolve();

      for (let i = 0; i < ref.current.data.length; ++i) {
        const peekPromise = () => props.device.peek(props.base + i)
          .then(value => {
            if (props.autoRefresh && ref.current.data[i] !== value) {
              ref.current.lastChange[i] = now;
            }

            ref.current.data[i] = value;
          });

        // Whether to wait for each command to complete.
        // Bulk-sending the commands seems to break when the device is busy.
        if (true) {
          readPromise = readPromise.then(peekPromise);
        } else {
          readPromise = peekPromise();
        }
      }

      readPromise.then(() => {
        if (hasUnmounted) {
          return;
        }

        setForcedRedraw(prev => prev + 1);

        if (props.autoRefresh) {
          nextReadTimeout = window.setTimeout(() => {
            updateData();
          }, 50);
        }
      });
    };

    updateData();

    return () => {
      hasUnmounted = true;

      if (nextReadTimeout) {
        window.clearTimeout(nextReadTimeout);
      }
    };
  }, [props, forcedRefresh]);

  return <div style={{ margin: "20px 0" }}>
    <div style={{ display: "flex", alignItems: "center" }}>
      <Switch large={true} checked={!props.variables} disabled={!props.setShowVariableView}
              onChange={ev => props.setShowVariableView && props.setShowVariableView(!ev.currentTarget.checked)} label="Raw View" />
      <div style={{ flex: 1 }}/>
      <Switch large={true} checked={props.autoRefresh} onChange={ev => props.setAutoRefresh(ev.currentTarget.checked)} label="Auto Refresh" alignIndicator="right" />
      <Button icon="refresh" large={true} minimal={true} style={{ marginLeft: 10, marginBottom: 10 }} disabled={props.autoRefresh || forcedRedraw === 0}
              onClick={() => {
                setForcedRedraw(0);
                setForcedRefresh(prev => prev + 1);
              }} />
    </div>
    {
      props.variables
        ? <VariableTable base={props.base} data={ref.current.data} variables={props.variables} />
        : <MemoryTable base={props.base} data={ref.current.data} lastChange={ref.current.lastChange}
                       willAutoRefresh={props.autoRefresh} forcedRedraw={forcedRedraw} setForcedRedraw={setForcedRedraw} />
    }
  </div>;
}

const REGISTER_VARIABLES: VariableInfo[] = [
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
  { address: 0x400F, name: "r15", description: "ADC disable and other flags", flags: [
      { mask: 0b00000001, description: "Disable output level controls" },
      { mask: 0b00000010, description: "If set then we jump to a new module number given in `0x4084`" },
      { mask: 0b00000100, description: "Program excluded from slave link" },
      { mask: 0b00001000, description: "Disable Multi Adjust control" },
    ],
  },
  { address: 0x4010, name: "r16", description: "Various flags", flags: [
      { mask: 0b00000100, description: "Set if we are a linked slave" },
      { mask: 0b01000000, description: "Which bank of slave registers to send next" },
    ],
  },
  { address: 0x4011, name: "r17", description: "Various flags", flags: [
      { mask: 0b00000001, description: "Apply loading module to channel A" },
      { mask: 0b00000010, description: "Apply loading module to channel B" },
      { mask: 0b00000100, description: "Timer has triggered" },
      { mask: 0b00001000, description: "ADC conversion running" },
      { mask: 0b00100000, description: "Serial command pending" },
      { mask: 0b01000000, description: "Serial command error" },
      { mask: 0b10000000, description: "Set if we are a linked master" },
    ],
  },
  { address: 0x4012, name: "r18" },
  { address: 0x4013, name: "r19", description: "Action when Down key pushed" },
  { address: 0x4014, name: "r20", description: "Action when Up key pushed" },
  { address: 0x4015, name: "r21", description: "Action when Menu key pushed" },
  { address: 0x4016, name: "r22", description: "Action when OK key pushed" },
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

interface MemoryViewProps {
  device: DeviceConnection;
}

export function MemoryView(props: MemoryViewProps) {
  const [selectedTab, setSelectedTab] = useState("registers");
  const [showVariableView, setShowVariableView] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  let tabContent = null;
  switch (selectedTab) {
    case "flash":
      tabContent = <DeviceMemoryDump key="flash" device={props.device} base={0x0000} length={256} label="Flash"
                                     autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh} />;
      break;
    case "registers":
      tabContent = <DeviceMemoryDump key="registers" device={props.device} base={0x4000} length={96} label="Registers"
                                     variables={showVariableView && REGISTER_VARIABLES} setShowVariableView={setShowVariableView}
                                     autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh} />;
      break;
    case "ram":
      tabContent = <DeviceMemoryDump key="ram" device={props.device} base={0x4000 + 96} length={1024 - 96} label="RAM"
                                     autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh} />;
      break;
    case "eeprom":
      tabContent = <DeviceMemoryDump key="eeprom" device={props.device} base={0x8000} length={512} label="EEPROM"
                                     autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh} />;
      break;
  }

  return <div>
    <Tabs className="memoryViewTabs" id="memoryViewTabs" large={true} selectedTabId={selectedTab} onChange={tab => setSelectedTab(tab.toString())} renderActiveTabPanelOnly={true}>
      <H3>Memory View</H3>
      <Tabs.Expander />
      <Tab id="flash" title="Flash" />
      <Tab id="registers" title="Registers" />
      <Tab id="ram" title="RAM" />
      <Tab id="eeprom" title="EEPROM" />
    </Tabs>
    {tabContent}
  </div>;
}
