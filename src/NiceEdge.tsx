import React from "react";
import { ConnectionLineComponentProps, EdgeProps, getBezierPath, BaseEdge } from "reactflow";

function getNiceBezierPath(sourceX: number, targetX: number, sourceY: number, targetY: number) {
  const distanceX = Math.abs(sourceX - targetX);
  const bendiness = Math.log(distanceX + 1) ** 2.5;

  const sourceYOffset = (sourceY > targetY && sourceX < targetX) ? -1 : 1;
  const targetYOffset = (sourceY <= targetY) ? -1 : 1;

  return `M${sourceX},${sourceY} C${sourceX + (1.25 * bendiness)},${sourceY + (sourceYOffset * bendiness)} ${targetX - (1.25 * bendiness)},${targetY + (targetYOffset * bendiness)} ${targetX},${targetY}`;
}

export function NiceConnectionLine(props: ConnectionLineComponentProps) {
  let edgePath;
  if (props.toX > props.fromX) {
    [edgePath] = getBezierPath({
      sourceX: props.fromX,
      sourceY: props.fromY,
      sourcePosition: props.fromPosition,
      targetX: props.toX,
      targetY: props.toY,
      targetPosition: props.toPosition,
    });
  } else if (props.fromPosition === "right") {
    edgePath = getNiceBezierPath(props.fromX, props.toX, props.fromY, props.toY);
  } else {
    edgePath = getNiceBezierPath(props.toX, props.fromX, props.toY, props.fromY);
  }

  return (
    <path d={edgePath} className="react-flow__connection-path" style={props.connectionLineStyle} />
  );
}

export function NiceEdge(props: EdgeProps) {
  let edgePath;
  if (props.targetX > props.sourceX) {
    [edgePath] = getBezierPath(props);
  } else {
    edgePath = getNiceBezierPath(props.sourceX, props.targetX, props.sourceY, props.targetY);
  }

  return (
    <BaseEdge path={edgePath} {...props} />
  );
}
