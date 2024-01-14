import {
  Button,
  ControlGroup,
  FormGroup,
  H3,
  H5,
  Label,
  MenuItem,
  Switch,
  TabsExpander,
  IconName,
  MaybeElement,
  Icon, Classes,
} from "@blueprintjs/core";
import { ItemRenderer, Select, SelectProps } from "@blueprintjs/select";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Channel,
  ChannelVariable,
  ControlFlags,
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
import { ModeSelect } from "./ModeSelect";
import { PanelCard } from "./PanelCard";
import { ParameterSlider } from "./ParameterSlider";
import "./AdvancedControls.css";

type SimpleSelectItem<T> = { label: String, value: T, icon?: IconName | MaybeElement };

interface SimpleSelectProps<T> {
  value?: T,
}

function SimpleSelect<T extends React.Key>({ value, items, ...props }: SimpleSelectProps<T> & Omit<SelectProps<SimpleSelectItem<T>>, "itemRenderer" | "filterable" | "popoverProps">) {
  const itemRenderer: ItemRenderer<SimpleSelectItem<T>> = useCallback(({ label, value, icon }, {ref, handleClick, handleFocus, modifiers}) => {
    const labelElement = icon && ((typeof icon === "string") ? <Icon icon={icon} /> : <span aria-hidden={true} className={Classes.ICON}>
      {icon}
    </span>);

    return <MenuItem
      key={value} text={label} labelElement={labelElement} ref={ref} onClick={handleClick} onFocus={handleFocus} active={modifiers.active} disabled={modifiers.disabled}
    />;
  }, []);

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

type AdvancedParameterName = "Ramp Level" | "Ramp Time" | "Depth" | "Tempo" | "Frequency" | "Effect" | "Width" | "Pace";

function SourceSelect({ value, onItemSelect, advancedParameterName, includeOtherChannel }: { value?: SourceSelection, onItemSelect?: (value: SourceSelection) => void, advancedParameterName?: AdvancedParameterName, includeOtherChannel?: boolean }) {
  const items = useMemo(() => [
    { label: "Set Value", value: SourceSelection.SetValue },
    { label: `${advancedParameterName ?? ""} Advanced Parameter`.trimStart(), value: SourceSelection.AdvancedParameter },
    { label: "Multi Adjust", value: SourceSelection.MultiAdjust },
    ...((includeOtherChannel ?? true) ? [
      { label: "Other Channel", value: SourceSelection.OtherChannel },
    ] : []),
  ], [advancedParameterName, includeOtherChannel]);

  return <SimpleSelect items={items} onItemSelect={({ value }) => onItemSelect && onItemSelect(value)} value={value} />
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
  disabled?: boolean;
  getter: () => Promise<number>;
  setter: (value: number) => Promise<void>;
}

function ValueSlider({ min, max, labelRenderer, disabled, getter, setter }: ValueSliderProps) {
  const [value, setValue] = useDeviceState(getter, setter, 0);

  return <ParameterSlider
    min={min ?? 0} max={max ?? 255} value={value}
    labelRenderer={labelRenderer} disabled={disabled}
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
        }} value={gateSelect.onSource} includeOtherChannel={false} advancedParameterName="Effect" />
        {(gateSelect.onSource === SourceSelection.SetValue) && <>
            <TimerSlider timer={gateSelect.timerSelection} getter={channel.getGateOnTime} setter={channel.setGateOnTime} />
        </>}
      </FormGroup>
      <FormGroup label="Gate Off Time">
        <SourceSelect onItemSelect={async (value) => {
          await setGateSelect({ ...gateSelect, offSource: value });
        }} value={gateSelect.offSource} includeOtherChannel={false} advancedParameterName="Tempo" />
        {(gateSelect.offSource === SourceSelection.SetValue) && <>
            <TimerSlider min={1} timer={gateSelect.timerSelection} getter={channel.getGateOffTime} setter={channel.setGateOffTime} />
        </>}
      </FormGroup>
    </>}
    <FormGroup label="Pulse Polarity">
      {/* We fake the alternate polarity flag as an option here, as it overrides what the bits are set to.
          We can't just have it as an option in the GatePulsePolarity enum, as the Reverse and Toggle Polarity timer
          action acts only on the pulsePolarity bits. */}
      {/* TODO: We should warn that the intensity can change significantly between these. */}
      <SimpleSelect items={[
        { label: "None", value: GatePulsePolarity.None, icon: <svg width={16} height={16} viewBox="0 0 16 16">
            <path d="M2 7a1 1 0 0 0-1 1 1 1 0 0 0 1 1h12a1 1 0 0 0 1-1 1 1 0 0 0-1-1z" />
          </svg> },
        { label: "Positive", value: GatePulsePolarity.Positive, icon: <svg width={16} height={16} viewBox="0 0 16 16">
            <path d="M5 3a1 1 0 0 0-1 1v3H2a1 1 0 0 0-1 1 1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V5h1v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1 1 1 0 0 0-1-1H9V4a1 1 0 0 0-1-1z" />
          </svg> },
        { label: "Negative", value: GatePulsePolarity.Negative, icon: <svg width={16} height={16} viewBox="0 0 16 16">
            <path d="M2 7a1 1 0 0 0-1 1 1 1 0 0 0 1 1h5v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V9h2a1 1 0 0 0 1-1 1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1v3H9V8a1 1 0 0 0-1-1H5z" />
          </svg> },
        { label: "Biphasic", value: GatePulsePolarity.Biphasic, icon: <svg width={16} height={16} viewBox="0 0 16 16">
            <path d="M5 3a1 1 0 0 0-1 1v3H2a1 1 0 0 0-1 1 1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V5h1v7a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V9h2a1 1 0 0 0 1-1 1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1v3H9V4a1 1 0 0 0-1-1z" />
          </svg> },
        { label: "Alternate", value: -1, icon: <svg width={16} height={16} viewBox="0 0 16 16">
            <path d="M4 3a1 1 0 0 0-1 1v3a1 1 0 0 0-1 1 1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V5h1v3a1 1 0 0 0 1 1h3v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V9a1 1 0 0 0 1-1 1 1 0 0 0-1-1h-1a1 1 0 0 0-1 1v3h-1V8a1 1 0 0 0-1-1H8V4a1 1 0 0 0-1-1z" />
          </svg> },
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
  advancedParameterName?: AdvancedParameterName,
  minValue?: number;
  maxValue?: number;
  valueLabelRenderer?: (v: number) => string;
  channelVariable: ChannelVariable;
  otherChannelVariable?: ChannelVariable;
  syncLeftIcon?: IconName;
  syncRightIcon?: IconName;
  style?: React.CSSProperties;
}

function VariableControlsCard({ label, minValue = 0, maxValue = 255, valueLabelRenderer, advancedParameterName, channelVariable, otherChannelVariable, syncLeftIcon, syncRightIcon, style }: VariableControlsCardProps) {
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
    }} value={select.valOrMinSource} advancedParameterName={advancedParameterName} />
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
        }} value={select.valOrMinSource} advancedParameterName={advancedParameterName} />
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
        }} value={select.rateSource} advancedParameterName="Tempo" />
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

function ChanelLevelSlider(props: { channel: Channel, disabled?: boolean }) {
  function map(x: number, in_min: number, in_max: number, out_min: number, out_max: number) {
    // This is the implementation from the reference page, but it is wrong.
    // return Math.trunc((x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min);

    const dividend = out_max - out_min;
    const divisor = in_max - in_min;
    const delta = x - in_min;

    return (((delta * dividend + ((divisor / 2) | 0)) / divisor) | 0) + out_min;
  }

  // TODO: This is one that would be much nicer if it updated live when changing the value.
  return <ValueSlider
    labelRenderer={v => map(v, 0, 255, 0, 99).toString().padStart(2, "0")} disabled={props.disabled}
    getter={props.channel.getLevel} setter={props.channel.setLevel}
  />;
}

function ChannelControls(props: { device: DeviceApi, channel: "A" | "B", levelControlDisabled?: boolean, gridColumn: number }) {
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
    <PanelCard label="Level" className="channel-card" style={{ paddingBottom: 10, gridColumn: props.gridColumn }}>
      <ChanelLevelSlider channel={channel} disabled={props.levelControlDisabled} />
    </PanelCard>
    <GateControlsCard channel={channel} otherChannel={otherChannel} {...syncIconProps}
      style={{ gridColumn: props.gridColumn }} />
    <VariableControlsCard
      label="Intensity" advancedParameterName="Depth"
      valueLabelRenderer={v => `${((v / 255) * 100).toFixed(0)}%`}
      channelVariable={channel.intensity} otherChannelVariable={otherChannel.intensity} {...syncIconProps}
      style={{ gridColumn: props.gridColumn }} />
    <VariableControlsCard
      label="Frequency" advancedParameterName="Frequency"
      minValue={250} maxValue={15}
      valueLabelRenderer={v => `${(3750 / (v & 0xFF)) & 0xFF}\u00a0Hz`} channelVariable={channel.frequency}
      otherChannelVariable={otherChannel.frequency} {...syncIconProps} style={{ gridColumn: props.gridColumn }} />
    <VariableControlsCard
      label="Width" advancedParameterName="Width"
      minValue={50} maxValue={250 /* Can actually reach 255, but this looks nicer. */}
      valueLabelRenderer={v => `${v}\u00b5s`} channelVariable={channel.width}
      otherChannelVariable={otherChannel.width} {...syncIconProps} style={{ gridColumn: props.gridColumn }} />
  </>;
}

function FrontPanelButtonsDisableSwitch({ label, device }: { label: string, device: DeviceApi }) {
  const [checked, setChecked] = useState(false);

  const [buttonActions, setButtonActions] = useDeviceState(device.getButtonActions, device.setButtonActions, { up: 0, down: 0, menu: 0, ok: 0 });

  const areButtonActionsDisabled = buttonActions.up === 1 && buttonActions.down === 1 && buttonActions.menu === 1 && buttonActions.ok === 1;
  const areButtonActionsDefault = buttonActions.up === 16 && buttonActions.down === 17 && buttonActions.menu === 10 && buttonActions.ok === 1;
  const areButtonActionsDisabledOrDefault = (buttonActions.up === 1 || buttonActions.up === 16) && (buttonActions.down === 1 || buttonActions.down === 17) && (buttonActions.menu === 1 || buttonActions.menu === 10) && (buttonActions.ok === 1);

  useEffect(() => {
    if (!checked || areButtonActionsDisabled) {
      return;
    }

    if (!areButtonActionsDefault) {
      return;
    }

    setButtonActions({ up: 1, down: 1, menu: 1, ok: 1 }).then();
  }, [checked, buttonActions, setButtonActions, areButtonActionsDisabled, areButtonActionsDefault]);

  const onChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(async (ev) => {
    setChecked(ev.target.checked);

    if (ev.target.checked) {
      await setButtonActions({ up: 1, down: 1, menu: 1, ok: 1 });
    } else {
      await setButtonActions({ up: 16, down: 17, menu: 10, ok: 1 });
    }
  }, [setButtonActions]);

  // Use checked instead of areButtonActionsDisabled to make the UI responsive, but currently everything else waits for the device to ack.
  return <Switch label={label} alignIndicator="right" checked={areButtonActionsDisabled} disabled={!areButtonActionsDisabledOrDefault} onChange={onChange} />
}

function MultiAdjustControls({ device, disabled = false, showMinMax = false }: { device: DeviceApi, disabled?: boolean, showMinMax?: boolean }) {
  // showMinMax is disabled by default because:
  // TODO: It is very important that max is higher than min, otherwise we trigger a Failure 15.
  // TODO: When changing min or max we need to re-scale value ourselves if control is enabled.
  const [min, setMin] = useDeviceState(device.getMultiAdjustMin, device.setMultiAdjustMin, 0);
  const [max, setMax] = useDeviceState(device.getMultiAdjustMax, device.setMultiAdjustMax, 255);
  const [value, setValue] = useDeviceState(device.getMultiAdjustValue, device.setMultiAdjustValue, undefined);

  const minMaxControls = showMinMax ? <>
    <FormGroup label="Multi Adjust Min">
      <ParameterSlider min={255} max={0} value={max} labelRenderer={v => `${((1 - (v / 255)) * 100).toFixed()}%`} onRelease={value => setMax(value)} />
    </FormGroup>
    <FormGroup label="Multi Adjust Max">
      <ParameterSlider min={255} max={0} value={min} labelRenderer={v => `${((1 - (v / 255)) * 100).toFixed()}%`} onRelease={value => setMin(value)} />
    </FormGroup>
  </> : undefined;

  return <div>
    <FormGroup label={showMinMax ? "Multi Adjust Value" : "Multi Adjust"}>
      {/* TODO: We should warn the user that this (and the disable switch) doesn't affect the audio attenuation. */}
      <ParameterSlider
        disabled={disabled}
        min={max} max={min}
        value={value} onRelease={v => setValue(v)}
        labelRenderer={v => `${((1 - (v - min) / (max - min)) * 100).toFixed(0)}%`}
      />
    </FormGroup>
    {minMaxControls}
  </div>;
}

function SharedControlsCard({ device, style, controlFlags, setControlFlags }: { device: DeviceApi, style?: React.CSSProperties, controlFlags: ControlFlags, setControlFlags: (flags: ControlFlags) => Promise<void> }) {
  const [topMode] = useDeviceState(device.currentSettings.getTopMode, undefined, undefined);
  const [currentMode, setCurrentMode] = useDeviceState(device.getCurrentMode, device.switchToMode, undefined);

  // TODO: No grid for mobile.
  const panelStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 2.4fr 1fr",
    gap: 30,
    paddingBottom: 0,
    ...style,
  };

  return <PanelCard style={panelStyle}>
    <FormGroup label="Current Mode">
      <ModeSelect mode={currentMode} topMode={topMode} onModeChanged={setCurrentMode} />
    </FormGroup>
    <MultiAdjustControls device={device} disabled={!controlFlags.disableKnobs} />
    <FormGroup>
      {/* TODO: We could do with a warning when turning this off that it'll jump to the physical level. */}
      <Switch label="Disable Controls" alignIndicator="right" checked={controlFlags.disableKnobs} onChange={async (ev) => {
        await setControlFlags({ ...controlFlags, disableKnobs: ev.target.checked });
      }} />
      <FrontPanelButtonsDisableSwitch label="Disable Buttons" device={device} />
    </FormGroup>
  </PanelCard>
}

export function AdvancedControls({ device }: { device: DeviceApi }) {
  const [controlFlags, setControlFlags] = useDeviceState(device.getControlFlags, device.setControlFlags, ControlFlags.fromValue(0));

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
        // Reset 0x4080-0x4087, 0x4088-0x40BF, and 0x4188-0x41BF to default values.
        await device.executeScratchpadMode([]);

        // Cancel the ramp and set the value to 100% to clean up the UI
        // const rampVariable = device.channelA.ramp;
        // const selectFlags = await rampVariable.getSelect();
        // await rampVariable.setSelect({ ...selectFlags, timerSelection: TimerSelection.None });
        // await rampVariable.setValue(255);
      }}>New Routine</Button>
    </div>
    <div style={bodyStyle}>
      <SharedControlsCard device={device} controlFlags={controlFlags} setControlFlags={setControlFlags} style={{ gridColumn: "span 2" }} />
      <ChannelControls device={device} channel="A" levelControlDisabled={!controlFlags.disableKnobs} gridColumn={1} />
      <ChannelControls device={device} channel="B" levelControlDisabled={!controlFlags.disableKnobs} gridColumn={2} />
      <VariableControlsCard
        label="Ramp"
        advancedParameterName="Ramp Level"
        minValue={155}
        valueLabelRenderer={v => `${v - 155}%`}
        channelVariable={device.channelA.ramp}
        style={{ gridColumn: "span 2" }}
      />
    </div>
  </div>;
}
