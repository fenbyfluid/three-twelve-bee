import {
  Button,
  ButtonProps,
  ControlGroup,
  FormGroup,
  H3,
  SegmentedControl,
  Switch,
  TabsExpander,
} from "@blueprintjs/core";
import React, { useCallback, useEffect, useState } from "react";
import { ParameterSlider } from "./ParameterSlider";
import {
  DEFAULT_SETTINGS,
  DeviceApi,
  Mode,
  PowerLevel,
  ReadonlySettings,
  Settings,
  useDeviceState,
  usePolledGetter,
} from "./DeviceApi";
import { ModeSelect } from "./ModeSelect";
import { PanelCard } from "./PanelCard";

function AdvancedParametersPanel({ settings, style }: { settings: Settings, style?: React.CSSProperties }) {
  const rampLevelValue = usePolledGetter(settings.getRampLevelParameter);
  const rampTimeValue = usePolledGetter(settings.getRampTimeParameter);
  const depthValue = usePolledGetter(settings.getDepthParameter);
  const tempoValue = usePolledGetter(settings.getTempoParameter);
  const frequencyValue = usePolledGetter(settings.getFrequencyParameter);
  const effectValue = usePolledGetter(settings.getEffectParameter);
  const widthValue = usePolledGetter(settings.getWidthParameter);
  const paceValue = usePolledGetter(settings.getPaceParameter);

  const cardStyle: React.CSSProperties = {
    paddingBottom: 0,
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)", // TODO: Don't do this for mobile.
    columnGap: 20,
    ...style,
  };

  return <PanelCard label="Advanced Parameters" style={cardStyle}>
    <FormGroup label="Ramp Level" style={{ marginBottom: 10 }}>
      <ParameterSlider value={rampLevelValue} onRelease={value => settings.setRampLevelParameter(value)} min={205} max={255} labelRenderer={v => `${v - 155}%`} />
    </FormGroup>
    <FormGroup label="Ramp Time" style={{ marginBottom: 10 }}>
      <ParameterSlider value={rampTimeValue} onRelease={value => settings.setRampTimeParameter(value)} min={1} max={120} labelRenderer={v => `${v}s`} />
    </FormGroup>
    <FormGroup label="Depth" style={{ marginBottom: 10 }}>
      <ParameterSlider value={depthValue} onRelease={value => settings.setDepthParameter(value)} min={165} max={255} labelRenderer={v => `${v - 155}`} />
    </FormGroup>
    <FormGroup label="Tempo" style={{ marginBottom: 10 }}>
      <ParameterSlider value={tempoValue} onRelease={value => settings.setTempoParameter(value)} min={1} max={100} />
    </FormGroup>
    <FormGroup label="Frequency" style={{ marginBottom: 10 }}>
      <ParameterSlider value={frequencyValue} onRelease={value => settings.setFrequencyParameter(value)} min={250} max={15} labelRenderer={v => `${(3750 / (v & 0xFF)) & 0xFF}\u00a0Hz`} />
    </FormGroup>
    <FormGroup label="Effect" style={{ marginBottom: 10 }}>
      <ParameterSlider value={effectValue} onRelease={value => settings.setEffectParameter(value)} min={1} max={100} />
    </FormGroup>
    <FormGroup label="Width" style={{ marginBottom: 10 }}>
      <ParameterSlider value={widthValue} onRelease={value => settings.setWidthParameter(value)} min={70} max={250} labelRenderer={v => `${v}\u00b5s`} />
    </FormGroup>
    <FormGroup label="Pace" style={{ marginBottom: 10 }}>
      <ParameterSlider value={paceValue} onRelease={value => settings.setPaceParameter(value)} min={1} max={100} />
    </FormGroup>
  </PanelCard>;
}

function PowerLevelControl({ powerLevel, onPowerLevelChanged }: { powerLevel?: PowerLevel, onPowerLevelChanged?: (value: PowerLevel) => void }) {
  const [cachedPowerLevel, setCachedPowerLevel] = useState("");

  useEffect(() => {
    setCachedPowerLevel(powerLevel !== undefined ? PowerLevel[powerLevel] : "");
  }, [powerLevel]);

  const onValueChange = useCallback((value: string) => {
    setCachedPowerLevel(value);

    onPowerLevelChanged && onPowerLevelChanged(PowerLevel[value as keyof typeof PowerLevel]);
  }, [onPowerLevelChanged]);

  return <SegmentedControl fill={true} options={[
    { label: "Low", value: "Low" },
    { label: "Normal", value: "Normal" },
    { label: "High", value: "High" },
  ]} value={cachedPowerLevel} onValueChange={onValueChange} intent="primary" small={true} />;
}

function CopySettingsButton({ from, to, disabled, ...props }: { from: ReadonlySettings, to: Settings } & Omit<ButtonProps, "onClick">) {
  const [isCopying, setIsCopying] = useState(false);

  const copySettings = useCallback(async () => {
    setIsCopying(true);

    // Re-get each value to ensure that it is up to date.
    await Promise.all([
      from.getPowerLevel().then(to.setPowerLevel),
      from.getSplitModeA().then(to.setSplitModeA),
      from.getSplitModeB().then(to.setSplitModeB),
      from.getFavouriteMode().then(to.setFavouriteMode),

      // TODO: We could offer a bulk setter for these to do it in a single command.
      from.getRampLevelParameter().then(to.setRampLevelParameter),
      from.getRampTimeParameter().then(to.setRampTimeParameter),
      from.getDepthParameter().then(to.setDepthParameter),
      from.getTempoParameter().then(to.setTempoParameter),
      from.getFrequencyParameter().then(to.setFrequencyParameter),
      from.getEffectParameter().then(to.setEffectParameter),
      from.getWidthParameter().then(to.setWidthParameter),
      from.getPaceParameter().then(to.setPaceParameter),
    ]);

    setIsCopying(false);
  }, [from, to]);

  return <Button disabled={disabled || isCopying} onClick={copySettings} {...props} />
}

export function DeviceSettings({ device, devMode = false }: { device: DeviceApi, devMode?: boolean }) {
  const settings = device.currentSettings;
  const savedSettings = device.savedSettings;

  const topMode = usePolledGetter(savedSettings.getTopMode);
  const powerLevel = usePolledGetter(settings.getPowerLevel);
  const splitModeA = usePolledGetter(settings.getSplitModeA);
  const splitModeB = usePolledGetter(settings.getSplitModeB);
  const favouriteMode = usePolledGetter(settings.getFavouriteMode);
  const [debugMode, setDebugMode] = useDeviceState(devMode && device.getDebugMode, device.setDebugMode, false);

  const bodyStyle: React.CSSProperties = {
    marginTop: 30,
    marginBottom: 20,
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)", // TODO: Don't do this for mobile.
    gap: 30,
  };

  const panelInnerStyle: React.CSSProperties = {
    paddingTop: 5,
    display: "flex",
    flexDirection: "column",
  };

  const splitModePanelStyle = {
    paddingBottom: 5,
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    columnGap: 20,
    gridColumn: "span 2", // TODO: Find something else for 2nd column
  };

  return <div>
    <div style={{ margin: 20, display: "flex" }}>
      <H3 style={{ marginBottom: 0 }}>
        Device Settings
      </H3>
      <TabsExpander />
      <ControlGroup>
        {/* TODO: Disable these buttons if they would be a no-op. */}
        {/* TODO: Disable all controls on the page while these are running. */}
        <CopySettingsButton from={settings} to={savedSettings} icon="floppy-disk" intent="primary">Save</CopySettingsButton>
        <CopySettingsButton from={savedSettings} to={settings} icon="reset" intent="none">Restore</CopySettingsButton>
        <CopySettingsButton from={DEFAULT_SETTINGS} to={settings} icon="clean" intent="danger">Reset</CopySettingsButton>
      </ControlGroup>
    </div>
    <div style={bodyStyle}>
      <PanelCard label="Favourite Mode">
        <div style={panelInnerStyle}>
          <ModeSelect mode={favouriteMode} topMode={topMode} onModeChanged={settings.setFavouriteMode} />
        </div>
      </PanelCard>
      <PanelCard label="Power Level">
        <div style={panelInnerStyle}>
          <PowerLevelControl powerLevel={powerLevel} onPowerLevelChanged={settings.setPowerLevel} />
        </div>
      </PanelCard>
      <PanelCard label="Split Modes" style={splitModePanelStyle}>
        <FormGroup label="Channel A">
          <ModeSelect mode={splitModeA} topMode={Mode.Audio3} onModeChanged={settings.setSplitModeA} />
        </FormGroup>
        <FormGroup label="Channel B">
          <ModeSelect mode={splitModeB} topMode={Mode.Audio3} onModeChanged={settings.setSplitModeB} />
        </FormGroup>
      </PanelCard>
      <AdvancedParametersPanel settings={settings} style={{ gridColumn: "span 2" }} />
      {devMode && <PanelCard label="Developer Settings">
          <Switch label="Show Module Number" checked={debugMode} onChange={ev => setDebugMode(ev.target.checked)} />
      </PanelCard>}
    </div>
  </div>;
}
