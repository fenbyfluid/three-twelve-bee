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
import { RawIngredient, Routine } from "eroslink-file";

export function DesignerGraph(props: { routine: Routine | null }) {
  const [elements, setElements] = useState<Elements>([]);

  useEffect(() => {
    setElements([]);

    if (!props.routine) {
      return;
    }

    const newElements: Elements = [];
    for (const ingredient of props.routine.ingredients) {
      const id = ingredient.instanceName!;

      newElements.push({
        id,
        data: { label: ingredient.constructor.name },
        position: { x: 0, y: 0 },
        style: { width: "initial" },
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
      });

      if (id === "1") {
        newElements.push({
          id: "start",
          type: "input",
          data: { label: "Start" },
          position: { x: 0, y: 0 },
          style: { width: "initial" },
          targetPosition: Position.Left,
          sourcePosition: Position.Right,
        });

        newElements.push({
          id: `estart-${id}`,
          source: "start",
          target: id,
          arrowHeadType: ArrowHeadType.ArrowClosed,
        });
      }

      if (ingredient.alsoDoIngredientName && ingredient.alsoDoIngredientName !== "<Nothing Else>") {
        const otherId = ingredient.alsoDoIngredientName;

        newElements.push({
          id: `e${id}-${otherId}`,
          source: id,
          target: otherId,
          arrowHeadType: ArrowHeadType.ArrowClosed,
        });
      }

      if ("andThen" in ingredient) {
        const otherId = ingredient.andThen!;

        if (!otherId.startsWith("<")) {
          newElements.push({
            id: `e${id}-${otherId}`,
            source: id,
            target: otherId,
            arrowHeadType: ArrowHeadType.ArrowClosed,
            animated: true,
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
            arrowHeadType: ArrowHeadType.ArrowClosed,
            animated: true,
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

function getNiceBezierPath(sourceX: number, targetX: number, sourceY: number, targetY: number) {
  const distanceX = sourceX - targetX;
  const bendiness = Math.log(distanceX) ** 2.5;

  const centerY = (sourceY + targetY) / 2;
  const sourceYOffset = (sourceY < centerY) ? -1 : 1;
  const targetYOffset = (targetY > centerY) ? -1 : 1;

  return `M${sourceX},${sourceY} C${sourceX + bendiness},${sourceY + (sourceYOffset * bendiness)} ${targetX - bendiness},${targetY + (targetYOffset * bendiness)} ${targetX},${targetY}`;
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
    const needsLayout = props.elements.filter(isNode).some(element => element.position.x === 0);

    if (!needsLayout || nodes.length === 0 || nodes[0].__rf.width <= 0) {
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

    for (const node of nodes) {
      graph.setNode(node.id, { width: node.__rf.width, height: node.__rf.height });
    }

    for (const edge of edges) {
      graph.setEdge(edge.source, edge.target);
    }

    dagre.layout(graph);

    props.setElements(elements => elements.map(el => {
      if (!isNode(el)) {
        return el;
      }

      const nodeWithPosition = graph.node(el.id);
      if (!nodeWithPosition || !nodeWithPosition.width || !nodeWithPosition.height) {
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

  return <></>;
}
