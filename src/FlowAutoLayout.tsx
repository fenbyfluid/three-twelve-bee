import { Elements, isNode, useStoreState, useZoomPanHelper } from "react-flow-renderer";
import React, { useEffect } from "react";
import dagre from "dagre";
import { Button } from "@blueprintjs/core";

export function FlowAutoLayout(props: { elements: Elements, setElements: React.Dispatch<React.SetStateAction<Elements>> }) {
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
