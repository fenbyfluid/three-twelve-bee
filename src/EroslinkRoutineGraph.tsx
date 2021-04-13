import React, { useEffect, useState } from "react";
import ReactFlow, {
  ArrowHeadType,
  ConnectionLineComponentProps,
  EdgeProps,
  Elements,
  getBezierPath,
  getMarkerEnd,
  Position,
} from "react-flow-renderer";
import {
  ChannelIngredient,
  Ingredient,
  RampIngredient,
  RawIngredient,
  Routine,
  SetValueIngredient,
  TimeGotoIngredient,
} from "eroslink-file";
import { Checkbox, Classes } from "@blueprintjs/core";
import { FlowAutoLayout } from "./FlowAutoLayout";

export function EroslinkRoutineGraph(props: { routine: Routine | null }) {
  const [elements, setElements] = useState<Elements>([]);

  useEffect(() => {
    setElements([]);

    if (!props.routine) {
      return;
    }

    const nodeDefaults = {
      position: { x: 0, y: 0 },
      style: { width: "initial" },
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
    };

    const edgeDefaults = {
      arrowHeadType: ArrowHeadType.ArrowClosed,
    };

    const newElements: Elements = [];
    for (const ingredient of props.routine.ingredients) {
      const id = ingredient.instanceName!;
      const backgroundColor = colorToCssString(ingredient.useDefaultBackgroundColor ? 0xFFFFFFFF : ingredient.backgroundColor);

      newElements.push({
        id,
        data: { label: <IngredientLabel ingredient={ingredient} /> },
        ...nodeDefaults,
        style: { backgroundColor, ...nodeDefaults.style },
      });

      if (id === "1") {
        newElements.push({
          id: "start",
          type: "input",
          data: { label: "Start" },
          ...nodeDefaults,
        });

        newElements.push({
          id: `estart-${id}`,
          source: "start",
          target: id,
          ...edgeDefaults,
        });
      }

      if (ingredient.alsoDoIngredientName && ingredient.alsoDoIngredientName !== "<Nothing Else>") {
        const otherId = ingredient.alsoDoIngredientName;

        newElements.push({
          id: `e${id}-${otherId}`,
          source: id,
          target: otherId,
          ...edgeDefaults,
        });
      }

      if ("andThen" in ingredient) {
        const otherId = ingredient.andThen!;

        if (!otherId.startsWith("<")) {
          newElements.push({
            id: `e${id}-${otherId}`,
            source: id,
            target: otherId,
            animated: true,
            ...edgeDefaults,
          });
        }
      }

      if (ingredient instanceof RawIngredient) {
        const isString = (v: any): v is string => typeof v === "string";
        const triggers = ingredient.toArray()?.filter(isString) || [];

        for (const trigger of triggers) {
          newElements.push({
            id: `e${id}-${trigger}`,
            source: id,
            target: trigger,
            animated: true,
            ...edgeDefaults,
          });
        }
      }
    }

    setElements(newElements);
  }, [props]);

  return <div style={{
    width: "100%",
    height: 400,
    borderRadius: 3,
    boxShadow: "0 0 0 1px rgb(16 22 26 / 10%), 0 0 0 rgb(16 22 26 / 0%), 0 1px 1px rgb(16 22 26 / 20%)",
  }}>
    <ReactFlow
      elements={elements}
      zoomOnDoubleClick={false}
      zoomOnScroll={false}
      panOnScroll={true}
      minZoom={0.25}
      maxZoom={1}
      edgeTypes={{ default: CustomEdge }}
      connectionLineComponent={CustomConnectionLine}
      elementsSelectable={false}
      nodesConnectable={false}
    >
      <FlowAutoLayout elements={elements} setElements={setElements} />
    </ReactFlow>
  </div>;
}

function colorToCssString(color: number): string {
  const a = (color >>> 24) & 0xFF;
  const r = (color >>> 16) & 0xFF;
  const g = (color >>> 8) & 0xFF;
  const b = color & 0xFF;

  return `rgba(${r},${g},${b},${a})`;
}

function IngredientLabel({ ingredient }: { ingredient: Ingredient }) {
  let body = null;
  if (ingredient instanceof ChannelIngredient) {
    body = <>
      <div>Channels: {ingredient.channel}</div>
    </>;
  } else if (ingredient instanceof SetValueIngredient) {
    body = <>
      <div>Value: {ingredient.value}</div>
      <div><Checkbox readOnly={true} label="Set Intensity" checked={ingredient.setIntensity} /></div>
      <div><Checkbox readOnly={true} label="Set Frequency" checked={ingredient.setFrequency} /></div>
      <div><Checkbox readOnly={true} label="Set Pulse Width" checked={ingredient.setPulseWidth} /></div>
    </>;
  } else if (ingredient instanceof RampIngredient) {
    body = <>
      <div>Value: {ingredient.startPercent} to {ingredient.endPercent}</div>
      <div>Over: {ingredient.timeSeconds} seconds</div>
      <div><Checkbox readOnly={true} label="Set Intensity" checked={ingredient.setIntensity} /></div>
      <div><Checkbox readOnly={true} label="Set Frequency" checked={ingredient.setFrequency} /></div>
      <div><Checkbox readOnly={true} label="Set Pulse Width" checked={ingredient.setPulseWidth} /></div>
    </>;
  } else if (ingredient instanceof TimeGotoIngredient) {
    body = <>
      <div>Delay: {ingredient.timeSeconds} seconds</div>
    </>;
  }

  return <div>
    <p>{ingredient.instanceName}</p>
    <div className={Classes.MONOSPACE_TEXT}>{ingredient.constructor.name}</div>
    {body && <div style={{ marginTop: 10, textAlign: "left" }}>{body}</div>}
  </div>
}

function getNiceBezierPath(sourceX: number, targetX: number, sourceY: number, targetY: number) {
  const distanceX = sourceX - targetX;
  const bendiness = Math.log(distanceX) ** 2.5;

  const centerY = (sourceY + targetY) / 2;
  const sourceYOffset = (sourceY < centerY) ? -1 : 1;
  const targetYOffset = (targetY > centerY) ? -1 : 1;

  return `M${sourceX},${sourceY} C${sourceX + (1.25 * bendiness)},${sourceY + (sourceYOffset * bendiness)} ${targetX - (1.25 * bendiness)},${targetY + (targetYOffset * bendiness)} ${targetX},${targetY}`;
}

function CustomConnectionLine(props: ConnectionLineComponentProps) {
  // TODO: This doesn't work when drawn from the "end" point
  let edgePath;
  if (props.targetX > props.sourceX) {
    edgePath = getBezierPath(props);
  } else {
    edgePath = getNiceBezierPath(props.sourceX, props.targetX, props.sourceY, props.targetY);
  }

  return (
    <path d={edgePath} className="react-flow__connection-path" style={props.connectionLineStyle} />
  );
}

function CustomEdge(props: EdgeProps) {
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

