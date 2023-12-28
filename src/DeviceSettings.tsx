import { FormGroup, H3, SegmentedControl } from "@blueprintjs/core";
import React, { useCallback, useEffect, useState } from "react";
import { AdvancedParameterSlider } from "./AdvancedParameterSlider";
import { DeviceApi, Mode, PowerLevel, Settings, usePolledGetter } from "./DeviceApi";
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
      <AdvancedParameterSlider value={rampLevelValue} onRelease={value => settings.setRampLevelParameter(value)} min={205} max={255} /*initialValue={225}*/ labelRenderer={v => `${v - 155}%`} />
    </FormGroup>
    <FormGroup label="Ramp Time" style={{ marginBottom: 10 }}>
      <AdvancedParameterSlider value={rampTimeValue} onRelease={value => settings.setRampTimeParameter(value)} min={1} max={120} /*initialValue={20}*/ labelRenderer={v => `${v}s`} />
    </FormGroup>
    <FormGroup label="Depth" style={{ marginBottom: 10 }}>
      <AdvancedParameterSlider value={depthValue} onRelease={value => settings.setDepthParameter(value)} min={165} max={255} /*initialValue={215}*/ labelRenderer={v => `${v - 155}`} />
    </FormGroup>
    <FormGroup label="Tempo" style={{ marginBottom: 10 }}>
      <AdvancedParameterSlider value={tempoValue} onRelease={value => settings.setTempoParameter(value)} min={1} max={100} /*initialValue={10}*/ />
    </FormGroup>
    <FormGroup label="Frequency" style={{ marginBottom: 10 }}>
      <AdvancedParameterSlider value={frequencyValue} onRelease={value => settings.setFrequencyParameter(value)} min={250} max={15} /*initialValue={25}*/ labelRenderer={v => `${(3750 / (v & 0xFF)) & 0xFF}\u00a0Hz`} />
    </FormGroup>
    <FormGroup label="Effect" style={{ marginBottom: 10 }}>
      <AdvancedParameterSlider value={effectValue} onRelease={value => settings.setEffectParameter(value)} min={1} max={100} /*initialValue={5}*/ />
    </FormGroup>
    <FormGroup label="Width" style={{ marginBottom: 10 }}>
      <AdvancedParameterSlider value={widthValue} onRelease={value => settings.setWidthParameter(value)} min={70} max={250} /*initialValue={130}*/ labelRenderer={v => `${v}ms`} />
    </FormGroup>
    <FormGroup label="Pace" style={{ marginBottom: 10 }}>
      <AdvancedParameterSlider value={paceValue} onRelease={value => settings.setPaceParameter(value)} min={1} max={100} /*initialValue={5}*/ />
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

export function DeviceSettings({ device }: { device: DeviceApi }) {
  const settings = device.currentSettings;
  const topMode = usePolledGetter(settings.getTopMode);
  const powerLevel = usePolledGetter(settings.getPowerLevel);
  const splitModeA = usePolledGetter(settings.getSplitModeA);
  const splitModeB = usePolledGetter(settings.getSplitModeB);
  const favouriteMode = usePolledGetter(settings.getFavouriteMode);

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
    <H3 style={{ margin: 20 }}>
      Device Settings
    </H3>
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
    </div>
  </div>;
}
