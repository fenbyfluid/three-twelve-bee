import { Card, Checkbox, H3, H5, H6, Slider, Tag } from "@blueprintjs/core";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./InteractiveControls.css";
import { DeviceApi } from "./DeviceApi";
import { DeviceConnection } from "./DeviceConnection";
import { MODES } from "./MemoryVariables";

interface ChannelControlProps {
  label: string,
  value?: number | undefined, // TODO: make required
  multiAdjust?: boolean,
  source?: "Effect" | "Tempo" | "Depth" | "Freq" | "Width" | "Pace",
  sourceChecked?: boolean,
}

function ChannelControl(props: ChannelControlProps) {
  return <div className="channel-control">
    <span>{props.label}</span>
    <Slider max={0xFF} labelRenderer={false} value={props.value} onChange={() => {/* TODO */}} />
    {props.multiAdjust !== undefined ? <Checkbox label="MA" checked={props.multiAdjust} /> : <span />}
    {props.source ? <Checkbox label={props.source} checked={props.sourceChecked} /> : <span />}
  </div>
}

interface ChannelControlsProps {
  device: DeviceConnection
  channel: "A" | "B",
  splitMode?: string,
}

function ChannelControls(props: ChannelControlsProps) {
  const channelOffset = props.channel === "A" ? 0 : 0x100;
  const gateSelect = useDeviceValue(props.device, 0x409A + channelOffset) ?? 0;

  return <div style={{ flex: 1, [props.channel === "A" ? "paddingRight": "paddingLeft"]: 10 }}>
    <H5 style={{ padding: "0 20px" }}>
      Channel {props.channel}
      {props.splitMode && <Tag minimal={true} style={{ float: "right" }}>{props.splitMode}</Tag>}
    </H5>
    <Card className="channel-control-group">
      <H6 className="channel-control-group-label">Timing</H6>
      <ChannelControl label="On" value={useDeviceValue(props.device, 0x4098 + channelOffset)} multiAdjust={(gateSelect & 0b11100000) === 0b01000000} source="Effect" sourceChecked={(gateSelect & 0b11100000) === 0b00100000} />
      <ChannelControl label="Off" value={useDeviceValue(props.device, 0x4099 + channelOffset)} multiAdjust={(gateSelect & 0b00011100) === 0b00001000} source="Tempo" sourceChecked={(gateSelect & 0b00011100) === 0b00000100} />
    </Card>
    <Card className="channel-control-group">
      <H6 className="channel-control-group-label">Intensity</H6>
      <ChannelControl label="Val" value={useDeviceValue(props.device, 0x40A5 + channelOffset)} />
      <ChannelControl label="Min" value={useDeviceValue(props.device, 0x40A6 + channelOffset)} source="Depth" sourceChecked={false} />
      <ChannelControl label="Max" value={useDeviceValue(props.device, 0x40A7 + channelOffset)} />
      <ChannelControl label="Rate" value={useDeviceValue(props.device, 0x40A8 + channelOffset)} multiAdjust={false} source="Tempo" sourceChecked={false} />
    </Card>
    <Card className="channel-control-group">
      <H6 className="channel-control-group-label">Frequency</H6>
      <ChannelControl label="Val" multiAdjust={false} source="Freq" sourceChecked={false} />
      <ChannelControl label="Min" />
      <ChannelControl label="Max" multiAdjust={false} source="Freq" sourceChecked={false} />
      <ChannelControl label="Rate" multiAdjust={false} source="Effect" sourceChecked={false} />
    </Card>
    <Card className="channel-control-group">
      <H6 className="channel-control-group-label">Width</H6>
      <ChannelControl label="Val" source="Width" sourceChecked={false} />
      <ChannelControl label="Min" source="Width" sourceChecked={false} />
      <ChannelControl label="Max" />
      <ChannelControl label="Rate" multiAdjust={false} source="Pace" sourceChecked={false} />
    </Card>
  </div>
}

function usePolledGetter<T>(getter: (() => Promise<T>) | false): T | undefined {
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

function useDeviceValue(device: DeviceConnection, address: number | false): number | undefined {
  const callback = useCallback(() => address !== false ? device.peek(address) : Promise.resolve(undefined), [device, address]);
  return usePolledGetter(address !== false && callback);
}

export function InteractiveControls({ connection }: { connection: DeviceConnection }) {
  const device = useMemo(() => new DeviceApi(connection), [connection]);
  const currentMode = usePolledGetter(useCallback(() => device.getCurrentMode(), [device]));
  const getSplitModes = useCallback(() => device.getSplitModes(), [device]);
  const [splitModeA, splitModeB] = usePolledGetter(currentMode === 0x7F && getSplitModes) ?? [undefined, undefined];

  console.log(currentMode, splitModeA, splitModeB);

  // useEffect(() => {
  //   (async () => {
  //     await device.poke(0x407B, 0);
  //     await new Promise(resolve => setTimeout(resolve, 18));
  //     await device.poke(0x4070, 0x4);
  //     await new Promise(resolve => setTimeout(resolve, 18));
  //     await device.poke(0x4070, 0x10);
  //   })();
  // }, [device]);

  const style: React.CSSProperties = {
    display: "flex",
    flexDirection: "row",
    marginBottom: 20,
  };

  return <div>
    <H3 style={{ margin: 20 }}>
      Interactive Controls
      {currentMode !== undefined && <Tag minimal={true} large={true} style={{ float: "right" }}>{MODES[currentMode] ?? currentMode}</Tag>}
    </H3>
    <div style={style}>
      <ChannelControls device={connection} channel="A" splitMode={splitModeA !== undefined ? MODES[splitModeA] : undefined} />
      <ChannelControls device={connection} channel="B" splitMode={splitModeB !== undefined ? MODES[splitModeB] : undefined} />
    </div>
  </div>;
}
