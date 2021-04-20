import { ConnectionLineComponentProps, EdgeProps, getBezierPath, getMarkerEnd } from "react-flow-renderer";
import React from "react";

function getNiceBezierPath(sourceX: number, targetX: number, sourceY: number, targetY: number) {
  const distanceX = Math.abs(sourceX - targetX);
  const bendiness = Math.log(distanceX + 1) ** 2.5;

  const sourceYOffset = (sourceY > targetY) ? -1 : 1;
  const targetYOffset = (sourceY <= targetY) ? -1 : 1;

  return `M${sourceX},${sourceY} C${sourceX + (1.25 * bendiness)},${sourceY + (sourceYOffset * bendiness)} ${targetX - (1.25 * bendiness)},${targetY + (targetYOffset * bendiness)} ${targetX},${targetY}`;
}

export function NiceConnectionLine(props: ConnectionLineComponentProps) {
  let edgePath;
  if (props.targetX > props.sourceX) {
    edgePath = getBezierPath(props);
  } else if (props.sourcePosition === "right") {
    edgePath = getNiceBezierPath(props.sourceX, props.targetX, props.sourceY, props.targetY);
  } else {
    edgePath = getNiceBezierPath(props.targetX, props.sourceX, props.targetY, props.sourceY);
  }

  return (
    <path d={edgePath} className="react-flow__connection-path" style={props.connectionLineStyle} />
  );
}

export function NiceEdge(props: EdgeProps) {
  let edgePath;
  if (props.targetX > props.sourceX) {
    edgePath = getBezierPath(props);
  } else {
    edgePath = getNiceBezierPath(props.sourceX, props.targetX, props.sourceY, props.targetY);
  }

  const markerEnd = getMarkerEnd(props.arrowHeadType, props.markerEndId);

  return (
    <path id={props.id} style={props.style} className="react-flow__edge-path" d={edgePath} markerEnd={markerEnd} />
  );
}
