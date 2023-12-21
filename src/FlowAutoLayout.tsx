import { Button } from "@blueprintjs/core";
import dagre from "dagre";
import React, { useCallback, useEffect } from "react";
import { useEdges, useNodes, useNodesInitialized, useReactFlow, XYPosition } from "reactflow";

interface FlowAutoLayoutProps {
  setNodePosition: (id: string, newPosition: XYPosition) => void,
}

export function FlowAutoLayout({ setNodePosition }: FlowAutoLayoutProps) {
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const nodes = useNodes();
  const edges = useEdges();

  useEffect(() => {
    if (!nodesInitialized) {
      return;
    }

    const needsLayout = nodes.some(node => node.id !== "start" && node.position.x === 0 && node.position.y === 0);
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
      if (!node.width || !node.height) {
        continue;
      }

      graph.setNode(node.id, { width: node.width, height: node.height });

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
      fitView({ padding: 0.1 });
    }, 200);
  }, [fitView, nodesInitialized, nodes, edges, setNodePosition]);

  useEffect(() => {
    setTimeout(() => {
      fitView({ padding: 0.1 });
    }, 200);
  }, [fitView]);

  const resetLayout = useCallback(() => {
    for (const node of nodes) {
      setNodePosition(node.id, { x: 0, y: 0 });
    }
  }, [nodes, setNodePosition]);

  return <Button
    minimal={true}
    icon="layout-hierarchy"
    style={{ position: "absolute", top: 5, right: 5, zIndex: 5, transform: "rotate(-90deg)" }}
    onClick={resetLayout}
  />;
}
