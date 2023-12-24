import { Card, Checkbox, H3, H5, H6, Slider, Tag } from "@blueprintjs/core";
import React, { useEffect, useMemo, useState } from "react";
import "./InteractiveControls.css";
import { DeviceApi, GateSelectFlags, SourceSelection, TimerSelection, ValueSelectFlags } from "./DeviceApi";
import { DeviceConnection } from "./DeviceConnection";
import { MODES } from "./MemoryVariables";

interface ChannelControlProps {
  label: string,
  value?: number | undefined, // TODO: make required
  min?: number,
  invert?: boolean,
  multiAdjust?: boolean,
  source?: "Effect" | "Tempo" | "Depth" | "Freq" | "Width" | "Pace",
  sourceChecked?: boolean,
}

function ChannelControl(props: ChannelControlProps) {
  const minValue = props.min ?? 0;
  const maxValue = 255;
  const boundedValue = Math.min(Math.max(minValue, props.value ?? 0), maxValue);
  const displayValue = props.invert ? (maxValue - (boundedValue - minValue)) : boundedValue;

  return <div className="channel-control">
    <span>{props.label}</span>
    <Slider min={minValue} max={maxValue} labelRenderer={false} value={displayValue} disabled={true} />
    {props.multiAdjust !== undefined ? <Checkbox label="MA" checked={props.multiAdjust} disabled={true} /> : <span />}
    {props.source ? <Checkbox label={props.source} checked={props.sourceChecked} disabled={true} /> : <span />}
  </div>
}

interface ChannelControlsProps {
  device: DeviceApi
  channel: "A" | "B",
  splitMode?: string,
}

function ChannelControls(props: ChannelControlsProps) {
  const channel = props.channel === "A" ? props.device.channelA : props.device.channelB;
  const gateSelect = usePolledGetter(channel.getGateSelect) ?? new GateSelectFlags(0);
  const intensitySelect = usePolledGetter(channel.intensity.getSelect) ?? new ValueSelectFlags(0);
  const frequencySelect = usePolledGetter(channel.frequency.getSelect) ?? new ValueSelectFlags(0);
  const widthSelect = usePolledGetter(channel.width.getSelect) ?? new ValueSelectFlags(0);

  return <div style={{ flex: 1, [props.channel === "A" ? "paddingRight": "paddingLeft"]: 10 }}>
    <H5 style={{ padding: "0 20px" }}>
      Channel {props.channel}
      {props.splitMode && <Tag minimal={true} style={{ float: "right" }}>{props.splitMode}</Tag>}
    </H5>
    <Card className="channel-control-group">
      <H6 className="channel-control-group-label">Timing</H6>
      <ChannelControl label="On" value={usePolledGetter(channel.getGateOnTime)} multiAdjust={gateSelect.onSource === SourceSelection.MultiAdjust} source="Effect" sourceChecked={gateSelect.onSource === SourceSelection.AdvancedParameter} />
      <ChannelControl label="Off" value={usePolledGetter(channel.getGateOffTime)} multiAdjust={gateSelect.offSource === SourceSelection.MultiAdjust} source="Tempo" sourceChecked={gateSelect.offSource === SourceSelection.AdvancedParameter} />
    </Card>
    <Card className="channel-control-group">
      <H6 className="channel-control-group-label">Level</H6>
      <ChannelControl label="Val" min={127} value={usePolledGetter(channel.intensity.getValue)} />
      <ChannelControl label="Min" min={127} value={usePolledGetter(channel.intensity.getMin)} source="Depth" sourceChecked={intensitySelect.timerSelection !== TimerSelection.None && intensitySelect.valOrMinSource === SourceSelection.AdvancedParameter} />
      <ChannelControl label="Max" min={127} value={usePolledGetter(channel.intensity.getMax)} />
      <ChannelControl label="Rate" min={1} invert={true} value={usePolledGetter(channel.intensity.getRate)} multiAdjust={intensitySelect.rateSource === SourceSelection.MultiAdjust} source="Tempo" sourceChecked={intensitySelect.rateSource === SourceSelection.AdvancedParameter} />
    </Card>
    <Card className="channel-control-group">
      <H6 className="channel-control-group-label">Frequency</H6>
      <ChannelControl label="Val" min={8} invert={true} value={usePolledGetter(channel.frequency.getValue)} multiAdjust={frequencySelect.timerSelection === TimerSelection.None && frequencySelect.valOrMinSource === SourceSelection.MultiAdjust} source="Freq" sourceChecked={frequencySelect.timerSelection === TimerSelection.None && frequencySelect.valOrMinSource === SourceSelection.AdvancedParameter} />
      <ChannelControl label="Min" min={8} invert={true} value={usePolledGetter(channel.frequency.getMax)} />
      <ChannelControl label="Max" min={8} invert={true} value={usePolledGetter(channel.frequency.getMin)} multiAdjust={frequencySelect.timerSelection !== TimerSelection.None && frequencySelect.valOrMinSource === SourceSelection.MultiAdjust} source="Freq" sourceChecked={frequencySelect.timerSelection !== TimerSelection.None && frequencySelect.valOrMinSource === SourceSelection.AdvancedParameter} />
      <ChannelControl label="Rate" min={1} invert={true} value={usePolledGetter(channel.frequency.getRate)} multiAdjust={frequencySelect.rateSource === SourceSelection.MultiAdjust} source="Effect" sourceChecked={frequencySelect.rateSource === SourceSelection.AdvancedParameter} />
    </Card>
    <Card className="channel-control-group">
      <H6 className="channel-control-group-label">Width</H6>
      <ChannelControl label="Val" min={70} value={usePolledGetter(channel.width.getValue)} source="Width" sourceChecked={widthSelect.timerSelection === TimerSelection.None && widthSelect.valOrMinSource === SourceSelection.AdvancedParameter} />
      <ChannelControl label="Min" min={70} value={usePolledGetter(channel.width.getMin)} source="Width" sourceChecked={widthSelect.timerSelection !== TimerSelection.None && widthSelect.valOrMinSource === SourceSelection.AdvancedParameter} />
      <ChannelControl label="Max" min={70} value={usePolledGetter(channel.width.getMax)} />
      <ChannelControl label="Rate" min={1} invert={true} value={usePolledGetter(channel.width.getRate)} multiAdjust={widthSelect.rateSource === SourceSelection.MultiAdjust} source="Pace" sourceChecked={widthSelect.rateSource === SourceSelection.AdvancedParameter} />
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

export function InteractiveControls({ connection }: { connection: DeviceConnection }) {
  const device = useMemo(() => new DeviceApi(connection), [connection]);
  const currentMode = usePolledGetter(device.getCurrentMode);
  const [splitModeA, splitModeB] = usePolledGetter(currentMode === 0x7F && device.getSplitModes) ?? [undefined, undefined];

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
      <ChannelControls device={device} channel="A" splitMode={splitModeA !== undefined ? MODES[splitModeA] : undefined} />
      <ChannelControls device={device} channel="B" splitMode={splitModeB !== undefined ? MODES[splitModeB] : undefined} />
    </div>
  </div>;
}
