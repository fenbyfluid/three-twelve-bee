import { DeviceConnection } from "./DeviceConnection";
import { Card, Checkbox, H3, H5, H6, Slider, Tag } from "@blueprintjs/core";
import React, { useState } from "react";
import "./InteractiveControls.css";

interface ChannelControlProps {
  label: string,
  multiAdjust?: boolean,
  source?: "Effect" | "Tempo" | "Depth" | "Freq" | "Width" | "Pace",
  sourceChecked?: boolean,
}

function ChannelControl(props: ChannelControlProps) {
  const [value, setValue] = useState(0);

  return <div className="channel-control">
    <span>{props.label}</span>
    <Slider max={100} labelRenderer={false} value={value} onChange={setValue} />
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
  return <div style={{ flex: 1, [props.channel === "A" ? "paddingRight": "paddingLeft"]: 10 }}>
    <H5 style={{ padding: "0 20px" }}>
      Channel {props.channel}
      {props.splitMode && <Tag minimal={true} style={{ float: "right" }}>{props.splitMode}</Tag>}
    </H5>
    <Card className="channel-control-group">
      <H6 className="channel-control-group-label">Timing</H6>
      <ChannelControl label="On" multiAdjust={false} source="Tempo" sourceChecked={false} />
      <ChannelControl label="Off" multiAdjust={false} source="Effect" sourceChecked={false} />
    </Card>
    <Card className="channel-control-group">
      <H6 className="channel-control-group-label">Level</H6>
      <ChannelControl label="Val" />
      <ChannelControl label="Min" source="Depth" sourceChecked={false} />
      <ChannelControl label="Max" />
      <ChannelControl label="Rate" multiAdjust={false} source="Tempo" sourceChecked={false} />
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

export function InteractiveControls(props: { device: DeviceConnection }) {
  // TODO
  const [currentMode, ] = useState();

  const style: React.CSSProperties = {
    display: "flex",
    flexDirection: "row",
    marginBottom: 20,
  };

  return <div>
    <H3 style={{ margin: 20 }}>
      Interactive Controls
      {currentMode && <Tag minimal={true} large={true} style={{ float: "right" }}>{currentMode}</Tag>}
    </H3>
    <div style={style}>
      <ChannelControls device={props.device} channel="A" />
      <ChannelControls device={props.device} channel="B" />
    </div>
  </div>;
}
