import { FormGroup, H3, SegmentedControl } from "@blueprintjs/core";
import React from "react";
import { AdvancedParameterSlider } from "./AdvancedParameterSlider";
import { DeviceApi } from "./DeviceApi";
import { ModeSelect } from "./ModeSelect";
import { PanelCard } from "./PanelCard";

function AdvancedParametersPanel({ device, style }: { device: DeviceApi, style?: React.CSSProperties }) {
  const cardStyle: React.CSSProperties = {
    paddingBottom: 0,
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)", // TODO: Don't do this for mobile.
    columnGap: 20,
    ...style,
  };

  return <PanelCard label="Advanced Parameters" style={cardStyle}>
    <FormGroup label="Ramp Level" style={{ marginBottom: 10 }}>
      <AdvancedParameterSlider value={215} min={205} max={255} /*initialValue={225}*/ labelRenderer={v => `${v - 155}%`} />
    </FormGroup>
    <FormGroup label="Ramp Time" style={{ marginBottom: 10 }}>
      <AdvancedParameterSlider value={60} min={1} max={120} /*initialValue={20}*/ labelRenderer={v => `${v}s`} />
    </FormGroup>
    <FormGroup label="Depth" style={{ marginBottom: 10 }}>
      <AdvancedParameterSlider value={215} min={165} max={255} /*initialValue={215}*/ labelRenderer={v => `${v - 155}`} />
    </FormGroup>
    <FormGroup label="Tempo" style={{ marginBottom: 10 }}>
      <AdvancedParameterSlider value={1} min={1} max={100} /*initialValue={10}*/ />
    </FormGroup>
    <FormGroup label="Frequency" style={{ marginBottom: 10 }}>
      <AdvancedParameterSlider value={20} min={250} max={15} /*initialValue={25}*/ labelRenderer={v => `${(3750 / (v & 0xFF)) & 0xFF}\u00a0Hz`} />
    </FormGroup>
    <FormGroup label="Effect" style={{ marginBottom: 10 }}>
      <AdvancedParameterSlider value={5} min={1} max={100} /*initialValue={5}*/ />
    </FormGroup>
    <FormGroup label="Width" style={{ marginBottom: 10 }}>
      <AdvancedParameterSlider value={80} min={70} max={250} /*initialValue={130}*/ labelRenderer={v => `${v}ms`} />
    </FormGroup>
    <FormGroup label="Pace" style={{ marginBottom: 10 }}>
      <AdvancedParameterSlider value={5} min={1} max={100} /*initialValue={5}*/ />
    </FormGroup>
  </PanelCard>;
}

export function DeviceSettings({ device }: { device: DeviceApi }) {
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
          <ModeSelect onItemSelect={() => {}} />
        </div>
      </PanelCard>
      <PanelCard label="Power Level">
        <div style={panelInnerStyle}>
          <SegmentedControl fill={true} options={[
            { label: "Low", value: "Low" },
            { label: "Normal", value: "Normal" },
            { label: "High", value: "High" },
          ]} value={""} intent="primary" small={true} />
        </div>
      </PanelCard>
      <PanelCard label="Split Modes" style={splitModePanelStyle}>
        <FormGroup label="Channel A">
          <ModeSelect onItemSelect={() => {}} />
        </FormGroup>
        <FormGroup label="Channel B">
          <ModeSelect onItemSelect={() => {}} />
        </FormGroup>
      </PanelCard>
      <AdvancedParametersPanel device={device} style={{ gridColumn: "span 2" }} />
    </div>
  </div>;
}
