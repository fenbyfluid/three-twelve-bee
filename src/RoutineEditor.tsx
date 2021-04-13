import { Button, FormGroup, H3 } from "@blueprintjs/core";
import React, { useState } from "react";
import ReactFlow, { Elements, Handle, NodeProps, Position } from "react-flow-renderer";
import { FlowAutoLayout } from "./FlowAutoLayout";
import "./RoutineEditor.css";

export function RoutineEditor() {
  return <div style={{ margin: "0 20px" }}>
    <H3 style={{ margin: "20px 0" }}>
      Create New Routine
    </H3>
    <FormGroup label="Modules">
      <RoutineEditorGraph />
    </FormGroup>
  </div>;
}

function RoutineEditorGraph() {
  const [elements, setElements] = useState<Elements>([
    {
      id: "start", type: "start", position: { x: 0, y: 0 }, data: {
        label: "Start",
      },
    },
    {
      id: "1", type: "module", position: { x: 0, y: 0 }, data: {
        label: "Module 1",
        children: [
          { id: "1", label: "One", connection: false },
          { id: "2", label: "Two", connection: false },
          { id: "3", label: "Three", connection: true },
          { id: "4", label: "Four", connection: false },
          { id: "5", label: "Five", connection: true },
        ],
      },
    },
    {
      id: "2", type: "module", position: { x: 0, y: 0 }, data: {
        label: "Module 2",
        children: [],
      },
    },
    {
      id: "3", type: "module", position: { x: 0, y: 0 }, data: {
        label: "Module 3",
        children: [
          { id: "1", label: "One", connection: true },
        ],
      },
    },
    { id: "start-1", source: "start", target: "1" },
    { id: "1.3-2", source: "1", sourceHandle: "3", target: "2" },
    { id: "1.5-2", source: "1", sourceHandle: "5", target: "3" },
  ]);

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
      nodeTypes={{ start: StartNode, module: ModuleNode }}
      edgeTypes={{ default: undefined }}
      connectionLineComponent={undefined}
    >
      <FlowAutoLayout elements={elements} setElements={setElements} />
    </ReactFlow>
  </div>;
}

function StartNode({ data, isConnectable, sourcePosition = Position.Right }: NodeProps<{ label: string }>) {
  return <>
    {data.label}
    <Handle type="source" position={sourcePosition} isConnectable={isConnectable} />
  </>
}

type ModuleNodeData = {
  label: string,
  children: {
    id: string,
    label: string,
    connection: boolean,
  }[],
};

function ModuleNode({ data, isConnectable, targetPosition = Position.Left }: NodeProps<ModuleNodeData>) {
  return <>
    <div className="react-flow__node-module__row react-flow__node-module__header">
      {data.label}
      <Handle type="target" position={targetPosition} isConnectable={isConnectable} />
    </div>
    {data.children.map(c => <div key={c.id} className="react-flow__node-module__row">
      {c.label}
      {c.connection && <Handle type="source" position={Position.Right} isConnectable={isConnectable} id={c.id} />}
    </div>)}
    <div className="react-flow__node-module__row">
      <Button icon="add" minimal={true} small={true} fill={true} />
    </div>
  </>
}
