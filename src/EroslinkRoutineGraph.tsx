import React, { useEffect, useState } from "react";
import ReactFlow, {
  ArrowHeadType,
  ConnectionLineComponentProps,
  EdgeProps,
  Elements,
  getBezierPath,
  getMarkerEnd,
  isNode,
  Position,
  useStoreState,
  useZoomPanHelper,
} from "react-flow-renderer";
import dagre from "dagre";
import {
  ChannelIngredient,
  Ingredient, RampIngredient,
  RawIngredient,
  Routine,
  SetValueIngredient,
  TimeGotoIngredient,
} from "eroslink-file";
import { Button, Checkbox, Classes } from "@blueprintjs/core";

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
      <AutoLayout elements={elements} setElements={setElements} />
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

function AutoLayout(props: { elements: Elements, setElements: React.Dispatch<React.SetStateAction<Elements>> }) {
  const zoomPanHelper = useZoomPanHelper();
  const { nodes, edges } = useStoreState(({ nodes, edges }) => ({ nodes, edges }));

  useEffect(() => {
    const needsLayout = props.elements.some(el => isNode(el) && el.position.x === 0);
    if (!needsLayout) {
      return;
    }

    const graph = new dagre.graphlib.Graph();

    graph.setGraph({
      rankdir: "LR",
      nodesep: 40,
      ranksep: 40,
      marginx: 40,
      marginy: 40,
    });

    graph.setDefaultEdgeLabel(() => ({}));

    const done = new Set();

    for (const node of nodes) {
      if (!node.__rf.width || !node.__rf.height) {
        continue;
      }

      graph.setNode(node.id, { width: node.__rf.width, height: node.__rf.height });

      done.add(node.id);
    }

    for (const edge of edges) {
      if (!done.has(edge.source) || !done.has(edge.target)) {
        continue;
      }

      graph.setEdge(edge.source, edge.target);
    }

    dagre.layout(graph);

    props.setElements(elements => elements.map(el => {
      if (!isNode(el)) {
        return el;
      }

      const nodeWithPosition = graph.node(el.id);
      if (!nodeWithPosition) {
        return el;
      }

      el.position = {
        x: nodeWithPosition.x - (nodeWithPosition.width / 2),
        y: nodeWithPosition.y - (nodeWithPosition.height / 2),
      };

      return el;
    }));

    setTimeout(() => {
      zoomPanHelper.fitView({ padding: 0.1 });
    }, 100);
  }, [zoomPanHelper, nodes, edges, props]);

  const resetLayout = () => {
    props.setElements(elements => elements.map(el => {
      if (!isNode(el)) {
        return el;
      }

      el.position = { x: 0, y: 0 };

      return el;
    }));
  };

  return <Button
    minimal={true}
    icon="layout-hierarchy"
    style={{ position: "absolute", top: 5, right: 5, zIndex: 5, transform: "rotate(-90deg)" }}
    onClick={resetLayout}
  />;
}
