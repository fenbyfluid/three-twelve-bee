import { Button, Card, Classes, H3, H5, HTMLTable, Switch } from "@blueprintjs/core";
import { DeviceConnection } from "./DeviceConnection";
import React, { useEffect, useRef, useState } from "react";
import "./MemoryView.css";

interface DeviceMemoryDumpProps {
  device: DeviceConnection;
  base: number;
  length: number;
  label: string;
}

function DeviceMemoryDump(props: DeviceMemoryDumpProps) {
  const stride = 16;

  const ref = useRef({
    litCellRedrawTimeout: 0,
    data: new Uint8Array(props.length),
    lastChange: new Array(props.length),
  });

  const [forcedRedraw, setForcedRedraw] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [forcedRefresh, setForcedRefresh] = useState(0);

  useEffect(() => {
    return () => {
      if (ref.current.litCellRedrawTimeout !== 0) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        window.clearTimeout(ref.current.litCellRedrawTimeout);
      }
    };
  }, []);

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
        readPromise = props.device.peek(props.base + i)
          .then(value => {
            if (autoRefresh && ref.current.data[i] !== value) {
              ref.current.lastChange[i] = now;
            }

            ref.current.data[i] = value;
          });
      }

      readPromise.then(() => {
        if (hasUnmounted) {
          return;
        }

        setForcedRedraw(prev => prev + 1);

        if (autoRefresh) {
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
  }, [props, autoRefresh, forcedRefresh]);

  const now = Date.now();

  const header = [<th key={-1} />];
  for (let x = 0; x < stride; ++x) {
    header.push(<th key={x}>{x.toString(16).toUpperCase()}</th>);
  }

  const rows = [];
  for (let y = 0; y < (ref.current.data.length / stride); ++y) {
    const cells = [];
    for (let x = 0; x < stride; ++x) {
      const i = (y * stride) + x;
      const value = ref.current.data[i]
        .toString(16).toUpperCase().padStart(2, "0");

      const age = (now - (ref.current.lastChange[i] || 0)) / 200;
      const lightness = 40 - Math.min(Math.max(0, age), 40);

      if (lightness > 0 && ref.current.litCellRedrawTimeout === 0 && !autoRefresh) {
        ref.current.litCellRedrawTimeout = window.setTimeout(() => {
          ref.current.litCellRedrawTimeout = 0;
          setForcedRedraw(prev => prev + 1);
        }, 250);
      }

      cells.push(<td key={x}>
        <span className={(forcedRedraw === 0) ? Classes.SKELETON : undefined}
              style={{ color: `hsl(337, 66%, ${lightness}%)` }}>{value}</span>
      </td>);
    }

    const address = (props.base + (y * stride))
      .toString(16).toUpperCase().padStart(4, "0");

    rows.push(<tr key={y}>
      <th>{address}</th>
      {cells}
    </tr>);
  }

  return <Card style={{ margin: 20 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <H5>{props.label}</H5>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Switch checked={autoRefresh} onChange={ev => setAutoRefresh(ev.currentTarget.checked)} />
        <Button icon="refresh" minimal={true} style={{ marginBottom: 10 }} disabled={autoRefresh || forcedRedraw === 0}
                onClick={() => {
                  setForcedRedraw(0);
                  setForcedRefresh(prev => prev + 1);
                }} />
      </div>
    </div>
    <HTMLTable className={`memory-table ${Classes.MONOSPACE_TEXT}`}>
      <thead>
        <tr>{header}</tr>
      </thead>
      <tbody>
        {rows}
      </tbody>
    </HTMLTable>
  </Card>;
}

interface MemoryViewProps {
  device: DeviceConnection;
}

export function MemoryView(props: MemoryViewProps) {
  return <div>
    <H3 style={{ margin: 20 }}>Memory View</H3>
    <DeviceMemoryDump device={props.device} base={0x0000} length={256} label="Flash" />
    <DeviceMemoryDump device={props.device} base={0x4000} length={96} label="Registers" />
    <DeviceMemoryDump device={props.device} base={0x4000 + 96} length={1024 - 96} label="RAM" />
    <DeviceMemoryDump device={props.device} base={0x8000} length={512} label="EEPROM" />
  </div>;
}