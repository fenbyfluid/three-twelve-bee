import { Button, Classes, EditableText, FormGroup, H3, Icon } from "@blueprintjs/core";
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import ReactFlow, {
  Connection,
  Edge,
  Elements,
  FlowElement,
  Handle,
  isEdge,
  isNode,
  Node,
  NodeProps,
  Position,
  ReactFlowProvider,
  removeElements,
  useUpdateNodeInternals,
} from "react-flow-renderer";
import { FlowAutoLayout } from "./FlowAutoLayout";
import "./RoutineEditor.css";

export function RoutineEditor() {
  return <div style={{ margin: "0 20px" }}>
    <H3 style={{ margin: "20px 0" }}>
      Create New Routine
    </H3>
    <FormGroup label="Modules">
      <ReactFlowProvider>
        <RoutineEditorGraph />
      </ReactFlowProvider>
    </FormGroup>
  </div>;
}

const RoutineEditorGraphContext = React.createContext<{
  onRemoveButtonClick?: (nodeId: string) => void,
  onAddChildButtonClick?: (nodeId: string) => void,
  onMoveChild?: (nodeId: string, childId: string, offset: -1|1) => void,
  onRemoveChild?: (nodeId: string, childId: string) => void,
}>({});

function RoutineEditorGraph() {
  const updateNodeInternals = useUpdateNodeInternals();
  const [pendingUpdateId, setPendingUpdateId] = useState<string | null>(null);
  useEffect(() => {
    if (pendingUpdateId !== null) {
      updateNodeInternals(pendingUpdateId);
      setPendingUpdateId(null);
    }
  }, [updateNodeInternals, pendingUpdateId]);

  const [elements, setElements] = useState<Elements>([
    {
      id: "start", type: "start", position: { x: 0, y: 0 }, data: {
        label: "Start",
      }, selectable: false,
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

  const onRemoveButtonClick = useCallback((nodeId: string) => {
    setElements(elements => elements.filter(element => {
      if (isNode(element)) {
        return element.id !== nodeId;
      }

      return element.source !== nodeId && element.target !== nodeId;
    }));
  }, [setElements]);

  const onAddChildButtonClick = useCallback((nodeId: string) => {
    setElements(elements => {
      return elements.map(element => {
        if (isModuleNode(element) && element.id === nodeId) {
          const nextId = getNextId(element.data.children);

          element.data = {
            ...element.data,
            children: [
              ...element.data.children,
              { id: nextId, label: "New", connection: true },
            ],
          };
        }

        return element;
      });
    });
  }, [setElements]);

  const onMoveChild = useCallback((nodeId, childId, offset) => {
    setElements(elements => {
      return elements.map(element => {
        if (isModuleNode(element) && element.id === nodeId) {
          const fromIndex = element.data.children.findIndex(c => c.id === childId);
          const toIndex = fromIndex + offset;
          if (toIndex < 0 || toIndex >= element.data.children.length) {
            return element;
          }

          const movedChild = element.data.children.splice(fromIndex, 1);
          element.data.children.splice(toIndex, 0, ...movedChild);

          element.data = {
            ...element.data,
            children: [
              ...element.data.children,
            ],
          };
        }

        return element;
      });
    });

    setPendingUpdateId(nodeId);
  }, [setElements, setPendingUpdateId]);

  const onRemoveChild = useCallback((nodeId, childId) => {
    setElements(elements => {
      return elements.map(element => {
        if (isModuleNode(element) && element.id === nodeId) {
          element.data = {
            ...element.data,
            children: element.data.children.filter(c => c.id !== childId),
          };
        }

        return element;
      }).filter(element => {
        return !isEdge(element) || element.source !== nodeId || element.sourceHandle !== childId;
      });
    });
  }, [setElements]);

  const createNodeOnConnectEnd = useRef<{ source: string, sourceHandle: string | null } | null>(null);

  const onConnectStart = useCallback((event: React.MouseEvent, { nodeId, handleId, handleType }) => {
    if (nodeId === null) {
      return;
    }

    setElements(elements => {
      const prevLength = elements.length;
      const newElements = elements.filter(element => {
        return !isEdge(element) || element.source !== nodeId || (element.sourceHandle || null) !== handleId;
      });

      if (handleType === "source" && prevLength === newElements.length) {
        createNodeOnConnectEnd.current = { source: nodeId, sourceHandle: handleId };
      }

      return newElements;
    });
  }, [setElements]);

  const onConnect = useCallback((connection: Edge | Connection) => {
    createNodeOnConnectEnd.current = null;

    if (connection.source === connection.target) {
      return;
    }

    const newEdge: Edge = {
      id: `${connection.source}${connection.sourceHandle ? `.${connection.sourceHandle}` : ''}-${connection.target}`,
      source: connection.source!,
      sourceHandle: connection.sourceHandle || null,
      target: connection.target!,
    };

    setElements(elements => [
      ...elements.filter(element => !isEdge(element) || element.source !== newEdge.source || (element.sourceHandle || null) !== newEdge.sourceHandle),
      newEdge,
    ]);
  }, [setElements]);

  const onConnectEnd = useCallback((event: MouseEvent) => {
    if (createNodeOnConnectEnd.current === null) {
      return;
    }

    // Modified from react-flow, Handle.onMouseDown
    const reactFlowNode = (event.target as Element)
      .closest(".react-flow")
      ?.querySelector(".react-flow__nodes") as HTMLElement;

    if (!reactFlowNode) {
      return;
    }

    // This is offsetTop on our "module" node target handle, it would be nice
    // not to have to hardcode it, but I can't think of any way to get it
    // sanely. Detect and change the position after the new node is rendered?
    const handleTopOffset = 18;

    const containerBounds = reactFlowNode.getBoundingClientRect();
    const containerScale = containerBounds.width / reactFlowNode.offsetWidth;

    // We should be using the state instead, connectionPosition, but will that re-render us?
    // Would it even be correct, given we've had to modify the position calculation node?
    const position = {
      x: (event.clientX - containerBounds.left) / containerScale,
      y: ((event.clientY - containerBounds.top) / containerScale) - handleTopOffset,
    };

    const connection = createNodeOnConnectEnd.current;
    createNodeOnConnectEnd.current = null;

    setElements(elements => {
      const nextId = getNextId(elements);

      const newNode: Node<ModuleNodeData> = {
        id: nextId,
        type: "module",
        position,
        data: {
          label: `Module ${nextId}`,
          children: [],
        },
      };

      const newEdge: Edge = {
        id: `${connection.source}${connection.sourceHandle ? `.${connection.sourceHandle}` : ''}-${newNode.id}`,
        source: connection.source,
        sourceHandle: connection.sourceHandle,
        target: newNode.id,
      };

      return [
        ...elements,
        newNode,
        newEdge,
      ];
    });
  }, [setElements]);

  return <div style={{
    width: "100%",
    height: 400,
    borderRadius: 3,
    boxShadow: "0 0 0 1px rgb(16 22 26 / 10%), 0 0 0 rgb(16 22 26 / 0%), 0 1px 1px rgb(16 22 26 / 20%)",
  }}>
    <RoutineEditorGraphContext.Provider value={{ onRemoveButtonClick, onAddChildButtonClick, onMoveChild, onRemoveChild }}>
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
        onConnectStart={onConnectStart}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        onElementsRemove={removedElements => { setElements(elements => removeElements(removedElements, elements)); }}
      >
        <FlowAutoLayout elements={elements} setElements={setElements} />
      </ReactFlow>
    </RoutineEditorGraphContext.Provider>
  </div>;
}

function StartNode({ data, isConnectable, sourcePosition = Position.Right }: NodeProps<{ label: string }>) {
  return <>
    {data.label}
    <Handle type="source" position={sourcePosition} isConnectable={isConnectable} />
  </>
}

interface ModuleNodeData {
  label: string,
  children: {
    id: string,
    label: string,
    connection: boolean,
  }[],
}

function ModuleNode({
  id,
  data,
  isConnectable,
  targetPosition = Position.Left,
}: NodeProps<ModuleNodeData>) {
  const {
    onRemoveButtonClick,
    onAddChildButtonClick,
    onMoveChild,
    onRemoveChild,
  } = useContext(RoutineEditorGraphContext);

  const [dragState, setDragState] = useState<{ id: string, el: HTMLElement } | null>(null);

  const onMouseMove = (ev: React.MouseEvent<HTMLElement>) => {
    if (dragState === null) {
      return;
    }

    const boundingClientRect = dragState.el.getBoundingClientRect();
    const offset = ev.clientY - (boundingClientRect.y + (boundingClientRect.height / 2));

    if (Math.abs(offset) < (boundingClientRect.height * 0.75)) {
      return;
    }

    onMoveChild!(id, dragState.id, offset > 0 ? 1 : -1);
  };

  return <div onMouseUp={() => setDragState(null)} onMouseMove={onMoveChild && onMouseMove}>
    <div className="react-flow__node-module__row react-flow__node-module__header">
      <EditableText value={data.label} className="nodrag" minWidth={100} />
      <Icon className={`react-flow__node-module__header__remove nodrag ${Classes.TEXT_MUTED}`} icon="small-cross" onClick={() => onRemoveButtonClick && onRemoveButtonClick(id)} />
      <Handle type="target" position={targetPosition} isConnectable={isConnectable} />
    </div>
    {data.children.map(c => <div key={c.id} className="react-flow__node-module__row react-flow__node-module__child">
      <span className="react-flow__node-module__child__label">{c.label}</span>
      <Icon className={`react-flow__node-module__child__icon nodrag ${Classes.TEXT_MUTED}`} icon="drag-handle-vertical" onMouseDown={ev => setDragState({ id: c.id, el: ev.currentTarget })} />
      <Icon className={`react-flow__node-module__child__icon nodrag ${Classes.TEXT_MUTED}`} icon="small-cross" onClick={() => onRemoveChild && onRemoveChild(id, c.id)} />
      {c.connection && <Handle type="source" position={Position.Right} isConnectable={isConnectable} id={c.id} />}
    </div>)}
    <div className="react-flow__node-module__row">
      <Button icon="add" minimal={true} small={true} fill={true} className="nodrag" onClick={() => onAddChildButtonClick && onAddChildButtonClick(id)} />
    </div>
  </div>
}

function isModuleNode(element: FlowElement): element is Node<ModuleNodeData> & { data: ModuleNodeData } {
  return isNode(element) && element.type === "module";
}

function getNextId(elements: { id: string }[]): string {
  const nextId = elements.reduceRight((prev, cur) => {
    if (+cur.id > prev) {
      return +cur.id;
    } else {
      return prev;
    }
  }, 0) + 1;

  return nextId.toString();
}
