import { Button, Classes, EditableText, FormGroup, Icon, InputGroup, MenuItem } from "@blueprintjs/core";
import { ItemRenderer, Select } from "@blueprintjs/select";
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Connection,
  Edge,
  Handle,
  Node,
  NodeProps,
  Position,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  XYPosition,
} from "reactflow";
import "reactflow/dist/style.css";
import { FlowAutoLayout } from "./FlowAutoLayout";
import "./RoutineEditor.css";
import { NiceConnectionLine, NiceEdge } from "./NiceEdge";
import { Ingredient, Module, Routine } from "./Routine";
import { RoutineModuleIngredientEditor } from "./RoutineModuleIngredientEditor";

const RoutineModuleEditorGraphContext = React.createContext<{
  setStartPosition: (newPosition: XYPosition) => void,
  setStartModule: (moduleId: string) => void,
  addModule: (position: XYPosition, sourceModuleId: string, sourceIngredientId?: string | null) => void,
  setModuleName: (moduleId: string, newName: string) => void,
  setModulePosition: (moduleId: string, newPosition: XYPosition) => void,
  removeModule: (moduleId: string) => void,
  addModuleIngredient: (moduleId: string, newIngredient: Ingredient) => void,
  moveModuleIngredient: (moduleId: string, ingredientId: string, offset: -1 | 1) => void,
  setModuleIngredientTarget: (moduleId: string, ingredientId: string, targetModuleId: string | null) => void,
  replaceModuleIngredient: (moduleId: string, newIngredient: Ingredient) => void,
  removeModuleIngredient: (moduleId: string, ingredientId: string) => void,
} | null>(null);

interface RoutineEditorProps {
  routine: Routine;
  onChange: (routine: Routine) => void;
}

export function RoutineEditor({ routine, onChange }: RoutineEditorProps) {
  // TODO: We might want to cache `routine` in state and debounce calls up to `onChange`.
  //       That'll also be required if we want to maintain an undo stack (reordering ingredients causes a lot of changes).
  // TODO: Mainly that is to improve FlowAutoLayout's behaviour, so we may be able to address it in there instead.
  const setRoutine = (newValue: Routine | ((routine: Routine) => Routine)) => {
    if (typeof newValue === "function") {
      newValue = newValue(routine);
    }

    // Cache the value for the next update in the same render.
    routine = newValue;

    onChange(newValue);
  };

  return <>
    <FormGroup label="Name">
      <InputGroup value={routine.name} onChange={event => setRoutine(routine => ({
        ...routine,
        name: event.target.value,
      }))} />
    </FormGroup>
    <FormGroup label="Modules">
      <RoutineModuleEditor routine={routine} setRoutine={setRoutine} />
    </FormGroup>
  </>;
}

function RoutineModuleEditor({
  routine,
  setRoutine,
}: { routine: Routine, setRoutine: React.Dispatch<React.SetStateAction<Routine>> }) {
  const setStartPosition = useCallback((newPosition: XYPosition) => {
    setRoutine(routine => ({
      ...routine,
      startPosition: newPosition,
    }));
  }, [setRoutine]);

  const setStartModule = useCallback((moduleId: string) => {
    setRoutine(routine => {
      const startModuleIndex = routine.modules.findIndex(module => module.id === moduleId);
      if (startModuleIndex === -1) {
        return routine;
      }

      const startModules = routine.modules.splice(startModuleIndex, 1);

      return {
        ...routine,
        modules: [
          ...startModules,
          ...routine.modules,
        ],
      };
    });
  }, [setRoutine]);

  const addModule = useCallback((position: XYPosition, sourceModuleId: string, sourceIngredientId?: string | null) => {
    setRoutine(routine => {
      const id = getNextId(routine.modules);

      const newModule = {
        id,
        name: `Module ${id}`,
        position,
        ingredients: [],
      };

      if (sourceModuleId === "start") {
        return {
          ...routine,
          modules: [
            newModule,
            ...routine.modules,
          ],
        };
      }

      if (!sourceIngredientId) {
        throw new Error("missing source ingredient id");
      }

      return {
        ...routine,
        modules: [
          ...(routine.modules.map(module => {
            if (module.id !== sourceModuleId) {
              return module;
            }

            return {
              ...module,
              ingredients: module.ingredients.map(ingredient => {
                if (ingredient.id !== sourceIngredientId) {
                  return ingredient;
                }

                if (!("target" in ingredient)) {
                  throw new Error(`ingredient type ${ingredient.type} does not have target`);
                }

                return {
                  ...ingredient,
                  target: id,
                };
              }),
            };
          })),
          newModule,
        ],
      };
    });
  }, [setRoutine]);

  const setModuleName = useCallback((moduleId: string, newName: string) => {
    setRoutine(routine => ({
      ...routine,
      modules: routine.modules.map(module => {
        if (module.id !== moduleId) {
          return module;
        }

        return {
          ...module,
          name: newName,
        };
      }),
    }));
  }, [setRoutine]);

  const setModulePosition = useCallback((moduleId: string, newPosition: XYPosition) => {
    setRoutine(routine => ({
      ...routine,
      modules: routine.modules.map(module => {
        if (module.id !== moduleId) {
          return module;
        }

        return {
          ...module,
          position: newPosition,
        };
      }),
    }));
  }, [setRoutine]);

  const removeModule = useCallback((moduleId: string) => {
    setRoutine(routine => ({
      ...routine,
      modules: routine.modules
        .filter(module => module.id !== moduleId)
        .map(module => ({
          ...module,
          ingredients: module.ingredients.map(ingredient => {
            if (!("target" in ingredient) || ingredient.target !== moduleId) {
              return ingredient;
            }

            return {
              ...ingredient,
              target: null,
            };
          }),
        })),
    }));
  }, [setRoutine]);

  const addModuleIngredient = useCallback((moduleId: string, newIngredient: Ingredient) => {
    setRoutine(routine => ({
      ...routine,
      modules: routine.modules.map(module => {
        if (module.id !== moduleId) {
          return module;
        }

        const id = getNextId(module.ingredients);

        return {
          ...module,
          ingredients: [
            ...module.ingredients,
            {
              ...newIngredient,
              id,
            },
          ],
        };
      }),
    }));
  }, [setRoutine]);

  const moveModuleIngredient = useCallback((moduleId: string, ingredientId: string, offset: -1 | 1) => {
    setRoutine(routine => ({
      ...routine,
      modules: routine.modules.map(module => {
        if (module.id !== moduleId) {
          return module;
        }

        const fromIndex = module.ingredients.findIndex(ingredient => ingredient.id === ingredientId);
        if (fromIndex === -1) {
          return module;
        }

        const toIndex = fromIndex + offset;
        if (toIndex < 0 || toIndex >= module.ingredients.length) {
          return module;
        }

        const movedIngredients = module.ingredients.splice(fromIndex, 1);
        module.ingredients.splice(toIndex, 0, ...movedIngredients);

        return {
          ...module,
          ingredients: [
            ...module.ingredients,
          ],
        };
      }),
    }));
  }, [setRoutine]);

  const setModuleIngredientTarget = useCallback((moduleId: string, ingredientId: string, targetModuleId: string | null) => {
    setRoutine(routine => ({
      ...routine,
      modules: routine.modules.map(module => {
        if (module.id !== moduleId) {
          return module;
        }

        return {
          ...module,
          ingredients: module.ingredients.map(ingredient => {
            if (ingredient.id !== ingredientId) {
              return ingredient;
            }

            if (!("target" in ingredient)) {
              throw new Error(`ingredient type ${ingredient.type} does not have target`);
            }

            return {
              ...ingredient,
              target: targetModuleId,
            };
          }),
        };
      }),
    }));
  }, [setRoutine]);

  const replaceModuleIngredient = useCallback((moduleId: string, newIngredient: Ingredient) => {
    setRoutine(routine => ({
      ...routine,
      modules: routine.modules.map(module => {
        if (module.id !== moduleId) {
          return module;
        }

        return {
          ...module,
          ingredients: module.ingredients.map(ingredient => {
            if (ingredient.id !== newIngredient.id) {
              return ingredient;
            }

            return newIngredient;
          }),
        };
      }),
    }));
  }, [setRoutine]);

  const removeModuleIngredient = useCallback((moduleId: string, ingredientId: string) => {
    setRoutine(routine => ({
      ...routine,
      modules: routine.modules.map(module => {
        if (module.id !== moduleId) {
          return module;
        }

        return {
          ...module,
          ingredients: module.ingredients.filter(ingredient => ingredient.id !== ingredientId),
        };
      }),
    }));
  }, [setRoutine]);

  const providerFunctions = useMemo(() => ({
    setStartPosition,
    setStartModule,
    addModule,
    setModuleName,
    setModulePosition,
    removeModule,
    addModuleIngredient,
    moveModuleIngredient,
    setModuleIngredientTarget,
    replaceModuleIngredient,
    removeModuleIngredient,
  }), [
    setStartPosition,
    setStartModule,
    addModule,
    setModuleName,
    setModulePosition,
    removeModule,
    addModuleIngredient,
    moveModuleIngredient,
    setModuleIngredientTarget,
    replaceModuleIngredient,
    removeModuleIngredient,
  ]);

  return <RoutineModuleEditorGraphContext.Provider value={providerFunctions}>
    <ReactFlowProvider>
      <RoutineModuleEditorGraph routine={routine} />
    </ReactFlowProvider>
  </RoutineModuleEditorGraphContext.Provider>;
}

function RoutineModuleEditorGraph({ routine }: { routine: Routine }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Module | undefined>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<undefined>([]);

  useEffect(() => {
    const nodes: Node<Module | undefined>[] = [];
    const edges: Edge<undefined>[] = [];

    nodes.push({
      id: "start",
      type: "start",
      position: routine.startPosition || { x: 0, y: 0 },
      data: undefined,
    });

    if (routine.modules.length > 0) {
      const firstModuleId = routine.modules[0].id;

      edges.push({
        id: `start-${firstModuleId}`,
        source: "start",
        target: firstModuleId,
        deletable: false,
      });
    }

    for (const module of routine.modules) {
      nodes.push({
        id: module.id,
        type: "module",
        position: module.position || { x: 0, y: 0 },
        data: module,
      });

      for (const ingredient of module.ingredients) {
        if ("target" in ingredient && ingredient.target !== null) {
          edges.push({
            id: `${module.id}.${ingredient.id}-${ingredient.target}`,
            source: module.id,
            sourceHandle: ingredient.id,
            target: ingredient.target,
          });
        }
      }
    }

    setNodes(nodes);
    setEdges(edges);
  }, [routine, setNodes, setEdges]);

  const context = useContext(RoutineModuleEditorGraphContext);
  if (!context) {
    throw new Error("missing context");
  }

  const {
    setStartModule,
    setStartPosition,
    addModule,
    setModulePosition,
    removeModule,
    setModuleIngredientTarget,
  } = context;

  const createNodeOnConnectEnd = useRef<{ source: string, sourceHandle: string | null } | null>(null);

  const onConnectStart = useCallback((event: React.MouseEvent | React.TouchEvent, { nodeId, handleId, handleType }) => {
    if (nodeId === null || handleType !== "source") {
      return;
    }

    if (nodeId === "start") {
      createNodeOnConnectEnd.current = { source: nodeId, sourceHandle: null };

      return;
    }

    if (!handleId) {
      throw new Error("missing handle id");
    }

    if (handleType === "source") {
      createNodeOnConnectEnd.current = { source: nodeId, sourceHandle: handleId };
    }
  }, []);

  const onConnect = useCallback((connection: Edge | Connection) => {
    createNodeOnConnectEnd.current = null;

    if (connection.source === null || connection.target === null) {
      return;
    }

    if (connection.source === "start") {
      setStartModule(connection.target);

      return;
    }

    if (!connection.sourceHandle) {
      throw new Error("missing source handle id");
    }

    if (connection.source === connection.target) {
      return;
    }

    setModuleIngredientTarget(connection.source, connection.sourceHandle, connection.target);
  }, [setStartModule, setModuleIngredientTarget]);

  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
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
    const positionSource = ("touches" in event) ? event.touches[0] : event;
    const position = {
      x: ((positionSource.clientX) - containerBounds.left) / containerScale,
      y: ((positionSource.clientY - containerBounds.top) / containerScale) - handleTopOffset,
    };

    const connection = createNodeOnConnectEnd.current;
    createNodeOnConnectEnd.current = null;

    addModule(position, connection.source, connection.sourceHandle);
  }, [addModule]);

  const onNodesDelete = useCallback((removedNodes: Node<unknown>[]) => {
    for (const node of removedNodes) {
      if (node.type === "module") {
        removeModule(node.id);
      }
    }
  }, [removeModule]);

  const onEdgesDelete = useCallback((removedEdges: Edge<unknown>[]) => {
    for (const edge of removedEdges) {
      if (edge.source === "start") {
        // We don't support removing the start edge.
        // setStartModule(null);

        continue;
      }

      if (!edge.sourceHandle) {
        throw new Error("missing source handle id");
      }

      setModuleIngredientTarget(edge.source, edge.sourceHandle, null);
    }
  }, [setModuleIngredientTarget]);

  const setNodePosition = useCallback((id: string, newPosition: XYPosition) => {
    if (id === "start") {
      setStartPosition(newPosition);
    } else {
      setModulePosition(id, newPosition);
    }
  }, [setStartPosition, setModulePosition]);

  const nodeTypes = useMemo(() => ({
    start: StartNode,
    module: ModuleNode,
  }), []);

  const edgeTypes = useMemo(() => ({
    default: NiceEdge,
  }), []);

  return <div style={{
    width: "100%",
    height: 400,
    borderRadius: 3,
    boxShadow: "0 0 0 1px rgb(16 22 26 / 10%), 0 0 0 rgb(16 22 26 / 0%), 0 1px 1px rgb(16 22 26 / 20%)",
  }}>
    <ReactFlow
      nodes={nodes}
      edges={edges}
      zoomOnDoubleClick={false}
      zoomOnScroll={false}
      panOnScroll={true}
      minZoom={0.25}
      maxZoom={1}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      connectionLineComponent={NiceConnectionLine}
      onConnectStart={onConnectStart}
      onConnect={onConnect}
      onConnectEnd={onConnectEnd}
      onNodeDragStop={(event, node) => node && setNodePosition(node.id, node.position)}
      onNodesChange={onNodesChange}
      onNodesDelete={onNodesDelete}
      onEdgesChange={onEdgesChange}
      onEdgesDelete={onEdgesDelete}
    >
      <FlowAutoLayout setNodePosition={setNodePosition} />
    </ReactFlow>
  </div>;
}

function StartNode({ isConnectable, sourcePosition = Position.Right }: NodeProps<undefined>) {
  // TODO: This is getting overridden from somewhere since updating to v10
  sourcePosition = Position.Right;

  return <>
    Start
    <Handle type="source" position={sourcePosition} isConnectable={isConnectable} />
  </>;
}

function AddIngredientButton({
  moduleId,
  addModuleIngredient,
}: { moduleId: string, addModuleIngredient: (moduleId: string, newIngredient: Ingredient) => void }) {
  const items: Ingredient[] = [
    { id: "", type: "affect-channels", channels: "both" },
    { id: "", type: "delay-exec", delay: 5, target: null },
    { id: "", type: "set-value", parameter: "intensity", value: 50 },
    // { id: "", type: "raw-cond-exec", address: 0, target: null },
    // { id: "", type: "raw-set-value", address: 0, value: 0 },
  ];

  const ingredientNames: { [key in Ingredient["type"]]: string } = {
    "affect-channels": "Affects Channels",
    "delay-exec": "Delay Exec",
    "set-value": "Set Value",
    "raw-cond-exec": "Raw Cond Exec",
    "raw-set-value": "Raw Set Value",
  } as const;

  const itemRenderer: ItemRenderer<Ingredient> = (item, { handleClick, handleFocus, modifiers }) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }

    return <MenuItem
      selected={modifiers.active}
      onClick={handleClick}
      onFocus={handleFocus}
      key={item.type}
      text={ingredientNames[item.type]}
    />;
  };

  const onItemSelect = (item: Ingredient) => {
    addModuleIngredient(moduleId, item);
  };

  return <Select items={items} itemRenderer={itemRenderer} onItemSelect={onItemSelect} filterable={false} popoverProps={{
    hasBackdrop: true,
    matchTargetWidth: true,
  }} popoverContentProps={{
    className: "add-ingredient-menu",
  }}>
    <Button icon="add" minimal={true} small={true} fill={true} className="nodrag" />
  </Select>;
}

function ModuleNode({
  id,
  data,
  isConnectable,
  targetPosition = Position.Left,
  sourcePosition = Position.Right,
}: NodeProps<Module>) {
  const context = useContext(RoutineModuleEditorGraphContext);
  if (!context) {
    throw new Error("missing context");
  }

  // TODO: These are getting overridden from somewhere since updating to v10
  targetPosition = Position.Left;
  sourcePosition = Position.Right;

  const {
    setModuleName,
    removeModule,
    addModuleIngredient,
    moveModuleIngredient,
    replaceModuleIngredient,
    removeModuleIngredient,
  } = context;

  const [dragState, setDragState] = useState<{ id: string, el: Element } | null>(null);

  const onMouseMove = (ev: React.MouseEvent) => {
    if (dragState === null) {
      return;
    }

    const boundingClientRect = dragState.el.getBoundingClientRect();
    const offset = ev.clientY - (boundingClientRect.y + (boundingClientRect.height / 2));

    if (Math.abs(offset) < (boundingClientRect.height * 0.75)) {
      return;
    }

    moveModuleIngredient(id, dragState.id, offset > 0 ? 1 : -1);
  };

  return <div onMouseUp={() => setDragState(null)} onMouseMove={onMouseMove}>
    <div className="react-flow__node-module__row react-flow__node-module__header">
      <EditableText value={data.name} onChange={value => setModuleName(id, value)} className="nodrag" minWidth={100} />
      <Icon className={`react-flow__node-module__header__remove nodrag ${Classes.TEXT_MUTED}`} icon="small-cross" onClick={() => removeModule(id)} />
      <Handle type="target" position={targetPosition} isConnectable={isConnectable} />
    </div>
    {data.ingredients.map(ingredient =>
      <div key={ingredient.id} className="react-flow__node-module__row react-flow__node-module__child nodrag">
        <Icon className={`react-flow__node-module__child__icon ${Classes.TEXT_MUTED}`} icon="drag-handle-vertical" onMouseDown={ev => setDragState({
          id: ingredient.id,
          el: ev.currentTarget,
        })} />
        <div className="react-flow__node-module__child__label">
          <RoutineModuleIngredientEditor ingredient={ingredient} onChange={newIngredient => replaceModuleIngredient(id, newIngredient)} />
        </div>
        <Icon className={`react-flow__node-module__child__icon ${Classes.TEXT_MUTED}`} icon="small-cross" onClick={() => removeModuleIngredient(id, ingredient.id)} />
        {("target" in ingredient) &&
            <Handle type="source" position={sourcePosition} isConnectable={isConnectable} id={ingredient.id} />}
      </div>)}
    <div className="react-flow__node-module__row">
      <AddIngredientButton moduleId={id} addModuleIngredient={addModuleIngredient} />
    </div>
  </div>;
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
