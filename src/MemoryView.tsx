import { Button, Classes, H3, HTMLTable, Switch, Tab, Tabs } from "@blueprintjs/core";
import React, { HTMLAttributes, useEffect, useRef, useState } from "react";
import { DeviceConnection } from "./DeviceConnection";
import { EEPROM_VARIABLES, RAM_VARIABLES, REGISTER_VARIABLES, VariableInfo } from "./MemoryVariables";
import "./MemoryView.css";

const VariableDescription = React.memo(function VariableDescription(props: { skeleton?: boolean, text: string }) {
  const chunks = props.text.split("`")
    .map((chunk, i) => {
      if (chunk.length === 0) {
        return undefined;
      }

      const className = (i % 2) === 0 ? undefined : Classes.MONOSPACE_TEXT;
      return React.createElement("span", { key: i, className }, chunk);
    });

  return <span className={props.skeleton ? Classes.SKELETON : undefined}>
    {chunks}
  </span>;
});

const VariableFlagString = React.memo(function VariableFlagString(props: { mask: number, value: number } & HTMLAttributes<HTMLSpanElement>) {
  const chars = new Array(8);

  for (let i = 0; i < chars.length; ++i) {
    const bit = chars.length - i - 1;

    const used = (props.mask & (1 << bit)) !== 0;
    if (!used) {
      chars[i] = "\xA0";
      continue;
    }

    const set = (props.value & (1 << bit)) !== 0;
    chars[i] = set ? "1" : "0";
  }

  return <span {...props}>{chars.join("\u202F")}</span>;
});

interface VariableTableProps {
  base: number;
  data: Uint8Array,
  variables: VariableInfo[],
  forcedRedraw: number,
}

function TrailingZeroCount(v: number): number {
  let c: number = 32;
  v &= -v;
  if (v) c--;
  if (v & 0x0000FFFF) c -= 16;
  if (v & 0x00FF00FF) c -= 8;
  if (v & 0x0F0F0F0F) c -= 4;
  if (v & 0x33333333) c -= 2;
  if (v & 0x55555555) c -= 1;
  return c;
}

function VariableTable(props: VariableTableProps) {
  const hasNames = props.variables.some(prop => !!prop.name);

  const rows = props.variables.map(variable => {
    const address = variable.address
      .toString(16).toUpperCase().padStart(4, "0");

    const value = props.data[variable.address - props.base];
    const valueHex = value.toString(16).toUpperCase().padStart(2, "0");

    const valueRow = variable.values && <tr>
        <td colSpan={hasNames ? 3 : 2} />
        <td style={{ paddingLeft: 22, paddingRight: 22, fontStyle: "italic" }}>
            <VariableDescription skeleton={props.forcedRedraw === 0} text={variable.values[value] || "Unknown"} />
        </td>
    </tr>;

    const flagRows = variable.flags && variable.flags.map(flag => <tr key={flag.mask}>
      <td />
      <td colSpan={hasNames ? 2 : 1} style={{ textAlign: "right" }} className={Classes.MONOSPACE_TEXT}>
        <VariableFlagString mask={flag.mask} value={value} className={(props.forcedRedraw === 0) ? Classes.SKELETON : undefined} />
      </td>
      <td style={{ paddingLeft: 22, paddingRight: 22, fontStyle: "italic" }}>
        {flag.description ? <VariableDescription skeleton={props.forcedRedraw === 0}
          text={flag.values ? `${flag.description} \u2013 ${flag.values[(value & flag.mask) >> TrailingZeroCount(flag.mask)] || "Unknown"}` : flag.description} /> : "\xA0"}
      </td>
    </tr>);

    return <React.Fragment key={variable.address}>
      <tr>
        <td className={Classes.MONOSPACE_TEXT}>{address}</td>
        {hasNames && <td>{variable.name || ""}</td>}
        <td className={Classes.MONOSPACE_TEXT} style={{ textAlign: "right" }}>
          <span className={(props.forcedRedraw === 0) ? Classes.SKELETON : undefined}>0x{valueHex}</span>
        </td>
        <td>{variable.description && <VariableDescription text={variable.description} />}</td>
      </tr>
      {valueRow}
      {flagRows}
    </React.Fragment>;
  });

  return <HTMLTable condensed={true} className="variable-table">
    <thead>
      <tr>
        <th>Address</th>
        {hasNames && <th>Name</th>}
        <th style={{ textAlign: "right" }}>Value</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      {rows}
    </tbody>
  </HTMLTable>;
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

      const doRead = (addr: number) => {
        const i = addr - props.base;
        const peekPromise = () => {
          if (hasUnmounted) {
            return Promise.resolve();
          }

          return props.device.peek(addr)
            .then(value => {
              if (props.autoRefresh && ref.current.data[i] !== value) {
                ref.current.lastChange[i] = now;
              }

              ref.current.data[i] = value;
            });
        };

        // Whether to wait for each command to complete.
        // Bulk-sending the commands seems to break when the device is busy.
        // TODO: See thoughts in DeviceConnection.
        if (true) {
          readPromise = readPromise.then(peekPromise);
        } else {
          readPromise = peekPromise();
        }
      };

      if (props.variables) {
        for (let i = 0; i < props.variables.length; ++i) {
          doRead(props.variables[i].address);
        }
      } else {
        for (let i = 0; i < ref.current.data.length; ++i) {
          doRead(props.base + i);
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
              onChange={ev => props.setShowVariableView && props.setShowVariableView(!ev.currentTarget.checked)}
              label="Raw View" />
      <div style={{ flex: 1 }} />
      <Switch large={true} checked={props.autoRefresh} onChange={ev => props.setAutoRefresh(ev.currentTarget.checked)}
              label="Auto Refresh" alignIndicator="right" />
      <Button icon="refresh" large={true} minimal={true} style={{ marginLeft: 10, marginBottom: 10 }}
              disabled={props.autoRefresh || forcedRedraw === 0}
              onClick={() => {
                setForcedRedraw(0);
                setForcedRefresh(prev => prev + 1);
              }} />
    </div>
    {
      props.variables
        ? <VariableTable base={props.base} data={ref.current.data} variables={props.variables}
                         forcedRedraw={forcedRedraw} />
        : <MemoryTable base={props.base} data={ref.current.data} lastChange={ref.current.lastChange}
                       willAutoRefresh={props.autoRefresh} forcedRedraw={forcedRedraw}
                       setForcedRedraw={setForcedRedraw} />
    }
  </div>;
}

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
                                     variables={showVariableView && REGISTER_VARIABLES}
                                     setShowVariableView={setShowVariableView}
                                     autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh} />;
      break;
    case "ram":
      tabContent = <DeviceMemoryDump key="ram" device={props.device} base={0x4000 + 96} length={1024 - 96} label="RAM"
                                     variables={showVariableView && RAM_VARIABLES}
                                     setShowVariableView={setShowVariableView}
                                     autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh} />;
      break;
    case "eeprom":
      tabContent = <DeviceMemoryDump key="eeprom" device={props.device} base={0x8000} length={512} label="EEPROM"
                                     variables={showVariableView && EEPROM_VARIABLES}
                                     setShowVariableView={setShowVariableView}
                                     autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh} />;
      break;
  }

  return <div>
    <Tabs className="memoryViewTabs" id="memoryViewTabs" large={true} selectedTabId={selectedTab}
          onChange={tab => setSelectedTab(tab.toString())} renderActiveTabPanelOnly={true}>
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
