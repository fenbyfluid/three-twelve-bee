import { Elements, isNode, useStoreState, useZoomPanHelper, XYPosition } from "react-flow-renderer";
import React, { useCallback, useEffect } from "react";
import dagre from "dagre";
import { Button } from "@blueprintjs/core";

interface FlowAutoLayoutProps {
  elements: Elements,
  setNodePosition: (id: string, newPosition: XYPosition) => void,
}

export function FlowAutoLayout({ elements, setNodePosition }: FlowAutoLayoutProps) {
  const zoomPanHelper = useZoomPanHelper();
  const { nodes, edges } = useStoreState(({ nodes, edges }) => ({ nodes, edges }));

  useEffect(() => {
    const needsLayout = elements.some(el => isNode(el) && el.position.x === 0);
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

    const done = new Set<string>();

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

    for (const id of done) {
      const node = graph.node(id);

      setNodePosition(id, {
        x: node.x - (node.width / 2),
        y: node.y - (node.height / 2),
      });
    }

    setTimeout(() => {
      zoomPanHelper.fitView({ padding: 0.1 });
    }, 100);
  }, [zoomPanHelper, nodes, edges, elements, setNodePosition]);

  const resetLayout = useCallback(() => {
    for (const element of elements) {
      if (!isNode(element)) {
        continue;
      }

      setNodePosition(element.id, { x: 0, y: 0 });
    }
  }, [elements, setNodePosition]);

  return <Button
    minimal={true}
    icon="layout-hierarchy"
    style={{ position: "absolute", top: 5, right: 5, zIndex: 5, transform: "rotate(-90deg)" }}
    onClick={resetLayout}
  />;
}
