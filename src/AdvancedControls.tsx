import { Button, ControlGroup, FormGroup, H3, H5, Label, MenuItem, Switch, TabsExpander } from "@blueprintjs/core";
import type { IconName } from "@blueprintjs/icons";
import { ItemRenderer, Select, SelectProps } from "@blueprintjs/select";
import React, { useCallback, useMemo } from "react";
import {
  Channel,
  ChannelVariable,
  DeviceApi,
  GatePulsePolarity,
  GateSelectFlags,
  GateValueFlags,
  SourceSelection,
  TimerAction,
  TimerSelection,
  useDeviceState,
  ValueSelectFlags,
} from "./DeviceApi";
import { PanelCard } from "./PanelCard";
import { ParameterSlider } from "./ParameterSlider";
import "./AdvancedControls.css";

type SimpleSelectItem<T> = { label: String, value: T };

interface SimpleSelectProps<T> {
  value?: T,
}

function SimpleSelect<T extends React.Key>({ value, items, ...props }: SimpleSelectProps<T> & Omit<SelectProps<SimpleSelectItem<T>>, "itemRenderer" | "filterable" | "popoverProps">) {
  const itemRenderer: ItemRenderer<SimpleSelectItem<T>> = useCallback(({ label, value }, {ref, handleClick, handleFocus, modifiers}) => <MenuItem
    key={value} text={label} ref={ref} onClick={handleClick} onFocus={handleFocus} active={modifiers.active} disabled={modifiers.disabled}
  />, []);

  const selectedItem = useMemo(() => items.find(item => item.value === value), [value, items]);

  return <Select items={items} itemRenderer={itemRenderer} filterable={false} popoverProps={{ minimal: true, matchTargetWidth: true }} {...props}>
    <Button text={selectedItem?.label ?? "\u00a0"} rightIcon="caret-down" fill={true} alignText="left" />
  </Select>;
}

function TimerSelect({ value, onItemSelect }: { value?: TimerSelection, onItemSelect?: (value: TimerSelection) => void }) {
  return <SimpleSelect items={[
    { label: "None", value: TimerSelection.None },
    { label: "Slow", value: TimerSelection.Slow },
    { label: "Medium", value: TimerSelection.Medium },
    { label: "Fast", value: TimerSelection.Fast },
  ]} onItemSelect={({ value }) => onItemSelect && onItemSelect(value)} value={value} />
}

function SourceSelect({ value, onItemSelect, includeOtherChannel }: { value?: SourceSelection, onItemSelect?: (value: SourceSelection) => void, includeOtherChannel?: boolean }) {
  return <SimpleSelect items={[
    { label: "Set Value", value: SourceSelection.SetValue },
    { label: "Advanced Parameter", value: SourceSelection.AdvancedParameter },
    { label: "Multi Adjust", value: SourceSelection.MultiAdjust },
    ...((includeOtherChannel ?? true) ? [
      { label: "Other Channel", value: SourceSelection.OtherChannel },
    ] : []),
  ]} onItemSelect={({ value }) => onItemSelect && onItemSelect(value)} value={value} />
}

function formatTimerValue(timer: TimerSelection, value: number) {
  const timeInMs = ((value + 1) * TimerSelection.getTimerInterval(timer));

  const minutes = Math.floor((timeInMs / 1000) / 60);
  const seconds = Math.floor(timeInMs / 1000) - (minutes * 60);
  const milliseconds = Math.round(timeInMs) - (minutes * 60 * 1000) - (seconds * 1000);

  const displaySeconds = (seconds + (milliseconds / 1000))
    .toPrecision(4)
    .replace(/\.?0+$/, "");

  if (minutes > 0) {
    if (seconds > 0 || milliseconds > 0) {
      return `${minutes}m${displaySeconds}s`;
    } else {
      return `${minutes}m`;
    }
  } else if (seconds > 0) {
    return `${displaySeconds}s`;
  } else {
    return `${milliseconds}ms`;
  }
}

interface ValueSliderProps {
  min?: number;
  max?: number;
  labelRenderer?: (v: number) => string;
  getter: () => Promise<number>;
  setter: (value: number) => Promise<void>;
}

function ValueSlider({ min, max, labelRenderer, getter, setter }: ValueSliderProps) {
  const [value, setValue] = useDeviceState(getter, setter, 0);

  return <ParameterSlider
    min={min ?? 0} max={max ?? 255} value={value}
    labelRenderer={labelRenderer}
    onRelease={value => setValue(value)}
  />;
}

interface TimerSliderProps {
  min?: number;
  timer: TimerSelection,
  getter: () => Promise<number>,
  setter: (value: number) => Promise<void>,
}

function TimerSlider({ min, timer, getter, setter }: TimerSliderProps) {
  return <ValueSlider
    min={min ?? 0} max={255}
    labelRenderer={value => formatTimerValue(timer, value)}
    getter={getter} setter={setter}
  />;
}

function TimerActionSelect({ getter, setter }: { getter: () => Promise<TimerAction>, setter: (action: TimerAction) => Promise<void> }) {
  const [action, setAction] = useDeviceState(getter, setter, undefined);

  return <SimpleSelect items={[
    { label: "Stop", value: TimerAction.Stop },
    { label: "Loop", value: TimerAction.Loop },
    { label: "Reverse", value: TimerAction.Reverse },
    { label: "Reverse and Toggle Polarity", value: TimerAction.ReverseAndTogglePolarity },
  ]} onItemSelect={({ value }) => setAction(value)} value={action} />
}

interface GateControlsCardProps {
  channel: Channel;
  otherChannel: Channel;
  syncLeftIcon: IconName;
  syncRightIcon: IconName;
  style?: React.CSSProperties;
}

function GateControlsCard({channel, otherChannel, syncLeftIcon, syncRightIcon, style}: GateControlsCardProps) {
  const [gateSelect, setGateSelect] = useDeviceState(channel.getGateSelect, channel.setGateSelect, GateSelectFlags.fromValue(0));
  const [gateValue, setGateValue] = useDeviceState(channel.getGateValue, channel.setGateValue, GateValueFlags.fromValue(0));

  const syncTiming = useCallback(async () => {
    // TODO: This only seems to work intermittently, forcing the value and timer for both to zero might be more reliable.

    await Promise.all([
      channel.getGateValue(),
      otherChannel.getGateValue(),
    ]).then(([gateValue, otherGateValue]) => {
      otherChannel.setGateValue({ ...otherGateValue, outputEnabled: gateValue.outputEnabled });
    });

    await channel.getGateTimer().then(otherChannel.setGateTimer);
  }, [channel, otherChannel]);

  const syncButton = <Button onClick={syncTiming} small={true} icon={syncLeftIcon} rightIcon={syncRightIcon} />;

  return <PanelCard label="Gating" rightLabel={syncButton} className="channel-card" style={{ paddingBottom: 0, ...style }}>
    <FormGroup label="Timer">
      <TimerSelect onItemSelect={async (value) => {
        await setGateSelect({ ...gateSelect, timerSelection: value });
      }} value={gateSelect.timerSelection} />
    </FormGroup>
    {(gateSelect.timerSelection === TimerSelection.None) ? <>
      <FormGroup>
        <Switch label="Output Enabled" alignIndicator="right" checked={gateValue.outputEnabled} onChange={async (ev) => {
          await setGateValue({ ...gateValue, outputEnabled: ev.target.checked });
        }} />
      </FormGroup>
    </> : <>
      <FormGroup label="Gate On Time">
        <SourceSelect onItemSelect={async (value) => {
          await setGateSelect({ ...gateSelect, onSource: value });
        }} value={gateSelect.onSource} includeOtherChannel={false} />
        {(gateSelect.onSource === SourceSelection.SetValue) && <>
            <TimerSlider timer={gateSelect.timerSelection} getter={channel.getGateOnTime} setter={channel.setGateOnTime} />
        </>}
      </FormGroup>
      <FormGroup label="Gate Off Time">
        <SourceSelect onItemSelect={async (value) => {
          await setGateSelect({ ...gateSelect, offSource: value });
        }} value={gateSelect.offSource} includeOtherChannel={false} />
        {(gateSelect.offSource === SourceSelection.SetValue) && <>
            <TimerSlider min={1} timer={gateSelect.timerSelection} getter={channel.getGateOffTime} setter={channel.setGateOffTime} />
        </>}
      </FormGroup>
    </>}
    <FormGroup label="Pulse Polarity">
      {/* We fake the alternate polarity flag as an option here, as it overrides what the bits are set to.
          We can't just have it as an option in the GatePulsePolarity enum, as the Reverse and Toggle Polarity timer
          action acts only on the pulsePolarity bits. */}
      <SimpleSelect items={[
        { label: "None", value: GatePulsePolarity.None },
        { label: "Positive", value: GatePulsePolarity.Positive },
        { label: "Negative", value: GatePulsePolarity.Negative },
        { label: "Biphasic", value: GatePulsePolarity.Biphasic },
        { label: "Alternate", value: -1 },
      ]} onItemSelect={async ({ value }) => {
        if (value === -1) {
          await setGateValue({ ...gateValue, pulsePolarity: GatePulsePolarity.Biphasic, alternatePolarity: true });
        } else {
          await setGateValue({ ...gateValue, pulsePolarity: value, alternatePolarity: false });
        }
      }} value={gateValue.alternatePolarity ? -1 : gateValue.pulsePolarity} />
      <Switch label="Invert" alignIndicator="right" checked={gateValue.invertPolarity} onChange={async (ev) => {
        await setGateValue({ ...gateValue, invertPolarity: ev.target.checked });
      }} />
    </FormGroup>
    <FormGroup label="Audio Input">
      {/* TODO: These should disable the matching channel controls. */}
      <Switch label="Controls Intensity" alignIndicator="right" checked={gateValue.audioControlsIntensity} onChange={async (ev) => {
        await setGateValue({ ...gateValue, audioControlsIntensity: ev.target.checked });
      }} />
      <Switch label="Controls Frequency" alignIndicator="right" checked={gateValue.audioControlsFrequency} onChange={async (ev) => {
        await setGateValue({ ...gateValue, audioControlsFrequency: ev.target.checked });
      }} />
    </FormGroup>
  </PanelCard>;
}

interface VariableControlsCardProps {
  label: string;
  minValue?: number;
  maxValue?: number;
  valueLabelRenderer?: (v: number) => string;
  channelVariable: ChannelVariable;
  otherChannelVariable?: ChannelVariable;
  syncLeftIcon?: IconName;
  syncRightIcon?: IconName;
  style?: React.CSSProperties;
}

function VariableControlsCard({ label, minValue = 0, maxValue = 255, valueLabelRenderer, channelVariable, otherChannelVariable, syncLeftIcon, syncRightIcon, style }: VariableControlsCardProps) {
  const [select, setSelect] = useDeviceState(channelVariable.getSelect, channelVariable.setSelect, ValueSelectFlags.fromValue(0));

  // The <step> is the amount the <value> will change every <rate> ticks of <timer>
  // When the <min/max action> is set to reverse, it is inverted, thus it is a twos-complement signed int.
  // We don't want our UI jumping around as the timer ticks, so we take the abs value of it instead.
  const getStep = useCallback(async () => {
    const value = await channelVariable.getStep();

    // The RHS of this ternary should be negated to get the true negative value.
    return (value < 128) ? value : (256 - value);
  }, [channelVariable])

  // We don't preserve the sign of the step, so it'll always be increasing after setting.
  const setStep = useCallback(async (value: number) => {
    await channelVariable.setStep(value & 255);
  }, [channelVariable]);

  const resetTiming = useCallback(async () => {
    const currentAbsStep = await getStep();

    // Disable the step to keep it from updating.
    await channelVariable.setStep(0);

    await channelVariable.setTimer(0);

    // TODO: Do we need to be checking the select here, or can we trust min?
    await channelVariable.getMin().then(channelVariable.setValue);

    // Restore the abs step so we're definitely incrementing.
    await channelVariable.setStep(currentAbsStep);
  }, [channelVariable, getStep]);

  const syncTiming = useCallback(async () => {
    // TODO: This is a mess and probably not working, see the note in the gate version.
    if (!otherChannelVariable) {
      return;
    }

    await channelVariable.getValue().then(otherChannelVariable.setValue);
    await channelVariable.getTimer().then(otherChannelVariable.setTimer);
  }, [channelVariable, otherChannelVariable]);

  const headerButtons = <ControlGroup>
    <Button onClick={resetTiming} small={true} icon="reset" />
    {otherChannelVariable && <Button onClick={syncTiming} small={true} icon={syncLeftIcon} rightIcon={syncRightIcon} />}
  </ControlGroup>

  const minControls = <>
    <SourceSelect onItemSelect={async (value) => {
      await setSelect({ ...select, valOrMinSource: value });
    }} value={select.valOrMinSource} />
    {(select.valOrMinSource === SourceSelection.SetValue) ? <>
      <ValueSlider min={minValue} max={maxValue} labelRenderer={valueLabelRenderer} getter={channelVariable.getMin} setter={channelVariable.setMin} />
    </> : <>
      <Switch label="Invert" checked={select.invertValOrMin} onChange={async (ev) => {
        await setSelect({ ...select, invertValOrMin: ev.target.checked });
      }} alignIndicator="right" />
    </>}
    <Label>Action</Label>
    <TimerActionSelect getter={channelVariable.getActionAtMin} setter={channelVariable.setActionAtMin} />
  </>;

  const maxControls = <>
    <ValueSlider min={minValue} max={maxValue} labelRenderer={valueLabelRenderer} getter={channelVariable.getMax} setter={channelVariable.setMax} />
    <Label>Action</Label>
    <TimerActionSelect getter={channelVariable.getActionAtMax} setter={channelVariable.setActionAtMax} />
  </>;

  return <PanelCard label={label} rightLabel={headerButtons} className="channel-card" style={{ paddingBottom: 0, ...style }}>
    <FormGroup label="Timer">
      <TimerSelect onItemSelect={async (value) => {
        await setSelect({ ...select, timerSelection: value });
      }} value={select.timerSelection} />
    </FormGroup>
    {(select.timerSelection === TimerSelection.None) ? <>
      <FormGroup label="Value">
        <SourceSelect onItemSelect={async (value) => {
          await setSelect({ ...select, valOrMinSource: value });
        }} value={select.valOrMinSource} />
        {(select.valOrMinSource === SourceSelection.SetValue) ? <>
          <ValueSlider min={minValue} max={maxValue} labelRenderer={valueLabelRenderer} getter={channelVariable.getValue} setter={channelVariable.setValue} />
        </> : <>
          <Switch label="Invert" checked={select.invertValOrMin} onChange={async (ev) => {
            await setSelect({ ...select, invertValOrMin: ev.target.checked });
          }} alignIndicator="right" />
        </>}
      </FormGroup>
    </> : <>
      <FormGroup label="Min">
        {(minValue <= maxValue) ? minControls : maxControls}
      </FormGroup>
      <FormGroup label="Max">
        {(minValue <= maxValue) ? maxControls : minControls}
      </FormGroup>
      <FormGroup label="Rate">
        <SourceSelect onItemSelect={async (value) => {
          await setSelect({ ...select, rateSource: value });
        }} value={select.rateSource} />
        {(select.rateSource === SourceSelection.SetValue) ? <>
          <TimerSlider timer={select.timerSelection} getter={channelVariable.getRate} setter={channelVariable.setRate} />
        </> : <>
          <Switch label="Invert" checked={select.invertRate} onChange={async (ev) => {
            await setSelect({ ...select, invertRate: ev.target.checked });
          }} alignIndicator="right" />
        </>}
      </FormGroup>
      <FormGroup label="Step">
        <ValueSlider min={1} max={127} getter={getStep} setter={setStep} />
      </FormGroup>
    </>}
  </PanelCard>;
}

function ChannelControls(props: { device: DeviceApi, channel: "A" | "B", gridColumn: number }) {
  const [
    channel,
    otherChannel,
    syncLeftIcon,
    syncRightIcon,
  ] = props.channel === "A" ? [
    props.device.channelA,
    props.device.channelB,
    "time" as const,
    "arrow-right" as const,
  ] : [
    props.device.channelB,
    props.device.channelA,
    "arrow-left" as const,
    "time" as const,
  ];

  const syncIconProps = { syncLeftIcon, syncRightIcon };

  return <>
    <H5 style={{ margin: 0, padding: "0 20px", gridColumn: props.gridColumn }}>
      Channel {props.channel}
    </H5>
    <GateControlsCard channel={channel} otherChannel={otherChannel} {...syncIconProps} style={{ gridColumn: props.gridColumn }} />
    <VariableControlsCard label="Intensity" valueLabelRenderer={v => `${((v / 255) * 100).toFixed(0)}%`} channelVariable={channel.intensity} otherChannelVariable={otherChannel.intensity} {...syncIconProps} style={{ gridColumn: props.gridColumn }} />
    <VariableControlsCard label="Frequency" minValue={250} maxValue={15} valueLabelRenderer={v => `${(3750 / (v & 0xFF)) & 0xFF}\u00a0Hz`} channelVariable={channel.frequency} otherChannelVariable={otherChannel.frequency} {...syncIconProps} style={{ gridColumn: props.gridColumn }} />
    <VariableControlsCard label="Width" minValue={50} maxValue={250 /* Can actually reach 255, but this looks nicer. */} valueLabelRenderer={v => `${v}\u00b5s`} channelVariable={channel.width} otherChannelVariable={otherChannel.width} {...syncIconProps} style={{ gridColumn: props.gridColumn }} />
  </>;
}

export function AdvancedControls({ device }: { device: DeviceApi }) {
  // TODO: Having to pass the grid column into the child cards explicitly and use the dense auto flow algorithm is unpleasant.
  const bodyStyle: React.CSSProperties = {
    marginTop: 30,
    marginBottom: 20,
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)", // TODO: Don't do this for mobile.
    gridAutoFlow: "row dense",
    gap: 30,
  };

  return <div>
    <div style={{ margin: 20, display: "flex" }}>
      <H3 style={{ marginBottom: 0 }}>
        Advanced Controls
      </H3>
      <TabsExpander />
      <Button intent="primary" onClick={async () => {
        await device.executeInstructions([]);

        // Cancel the ramp and set the value to 100% to clean up the UI
        // const rampVariable = device.channelA.ramp;
        // const selectFlags = await rampVariable.getSelect();
        // await rampVariable.setSelect({ ...selectFlags, timerSelection: TimerSelection.None });
        // await rampVariable.setValue(255);
      }}>New Mode</Button>
    </div>
    <div style={bodyStyle}>
      <ChannelControls device={device} channel="A" gridColumn={1} />
      <ChannelControls device={device} channel="B" gridColumn={2} />
      <VariableControlsCard
        label="Ramp"
        minValue={155}
        valueLabelRenderer={v => `${v - 155}%`}
        channelVariable={device.channelA.ramp}
        style={{ gridColumn: "span 2" }}
      />
    </div>
  </div>;
}
