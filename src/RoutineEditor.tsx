import { Button, Classes, EditableText, FormGroup, H3, Icon, InputGroup } from "@blueprintjs/core";
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Connection,
  Edge,
  Elements,
  Handle,
  NodeProps,
  Position,
  ReactFlowProvider,
  useUpdateNodeInternals,
  XYPosition,
} from "react-flow-renderer";
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

export function RoutineEditor() {
  const [routine, setRoutine] = useState<Routine>({
    name: "New Routine",
    modules: [
      {
        id: "1",
        name: "Module 1",
        ingredients: [
          {
            id: "1",
            type: "affect-channels",
            channels: "both",
          },
          {
            id: "2",
            type: "set-value",
            parameter: "intensity",
            value: 50,
          },
          {
            id: "3",
            type: "delay-exec",
            delay: 5,
            target: "2",
          },
        ],
      },
      {
        id: "2",
        name: "Module 2",
        ingredients: [
          {
            id: "1",
            type: "set-value",
            parameter: "intensity",
            value: 0,
          },
          {
            id: "2",
            type: "delay-exec",
            delay: 5,
            target: "1",
          },
        ],
      },
    ],
  });

  return <div style={{ margin: "0 20px" }}>
    <H3 style={{ margin: "20px 0" }}>
      Create New Routine
    </H3>
    <FormGroup label="Name">
      <InputGroup value={routine.name} onChange={event => setRoutine(routine => ({
        ...routine,
        name: event.target.value,
      }))} />
    </FormGroup>
    <FormGroup label="Modules">
      <RoutineModuleEditor routine={routine} setRoutine={setRoutine} />
    </FormGroup>
  </div>;
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
  const elements = useMemo(() => {
    const elements = [];

    elements.push({
      id: "start",
      type: "start",
      position: routine.startPosition || { x: 0, y: 0 },
      selectable: false,
    });

    if (routine.modules.length > 0) {
      const firstModuleId = routine.modules[0].id;

      elements.push({
        id: `start-${firstModuleId}`,
        source: "start",
        target: firstModuleId,
      });
    }

    for (const module of routine.modules) {
      elements.push({
        id: module.id,
        type: "module",
        position: module.position || { x: 0, y: 0 },
        data: module,
      });

      for (const ingredient of module.ingredients) {
        if ("target" in ingredient && ingredient.target !== null) {
          elements.push({
            id: `${module.id}.${ingredient.id}-${ingredient.target}`,
            source: module.id,
            sourceHandle: ingredient.id,
            target: ingredient.target,
          });
        }
      }
    }

    return elements;
  }, [routine]);

  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    for (const element of elements) {
      if (element.type !== "module") {
        continue;
      }

      // Update every module node in case the ingredients were modified.
      // We're not expecting the graphs to be huge, so the performance should be fine.
      // If we need to reduce the overhead here, we should be able to add an
      // epoch to each Module that is updated when they're modified.
      updateNodeInternals(element.id);
    }
  }, [elements, updateNodeInternals]);

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

  const onConnectStart = useCallback((event: React.MouseEvent, { nodeId, handleId, handleType }) => {
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

    addModule(position, connection.source, connection.sourceHandle);
  }, [addModule]);

  const onElementsRemove = useCallback((removedElements: Elements) => {
    for (const element of removedElements) {
      if (element.type === "module") {
        removeModule(element.id);

        continue;
      }

      if (!("source" in element)) {
        continue;
      }

      if (element.source === "start") {
        // We don't support removing the start edge.
        // setStartModule(null);

        continue;
      }

      if (!element.sourceHandle) {
        throw new Error("missing source handle id");
      }

      setModuleIngredientTarget(element.source, element.sourceHandle, null);
    }
  }, [removeModule, setModuleIngredientTarget]);

  const setNodePosition = useCallback((id: string, newPosition: XYPosition) => {
    if (id === "start") {
      setStartPosition(newPosition);
    } else {
      setModulePosition(id, newPosition);
    }
  }, [setStartPosition, setModulePosition]);

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
      edgeTypes={{ default: NiceEdge }}
      connectionLineComponent={NiceConnectionLine}
      onConnectStart={onConnectStart}
      onConnect={onConnect}
      onConnectEnd={onConnectEnd}
      onElementsRemove={onElementsRemove}
      onNodeDragStop={(event, node) => setNodePosition(node.id, node.position)}
    >
      <FlowAutoLayout elements={elements} setNodePosition={setNodePosition} />
    </ReactFlow>
  </div>;
}

function StartNode({ isConnectable, sourcePosition = Position.Right }: NodeProps<undefined>) {
  return <>
    Start
    <Handle type="source" position={sourcePosition} isConnectable={isConnectable} />
  </>;
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

  const {
    setModuleName,
    removeModule,
    addModuleIngredient,
    moveModuleIngredient,
    replaceModuleIngredient,
    removeModuleIngredient,
  } = context;

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

    moveModuleIngredient(id, dragState.id, offset > 0 ? 1 : -1);
  };

  return <div onMouseUp={() => setDragState(null)} onMouseMove={onMouseMove}>
    <div className="react-flow__node-module__row react-flow__node-module__header">
      <EditableText defaultValue={data.name} onConfirm={value => setModuleName(id, value)} className="nodrag" minWidth={100} />
      <Icon className={`react-flow__node-module__header__remove nodrag ${Classes.TEXT_MUTED}`} icon="small-cross" onClick={() => removeModule(id)} />
      <Handle type="target" position={targetPosition} isConnectable={isConnectable} />
    </div>
    {data.ingredients.map(ingredient =>
      <div key={ingredient.id} className="react-flow__node-module__row react-flow__node-module__child nodrag">
        <div className="react-flow__node-module__child__label">
          <RoutineModuleIngredientEditor ingredient={ingredient} onChange={newIngredient => replaceModuleIngredient(id, newIngredient)} />
        </div>
        <Icon className={`react-flow__node-module__child__icon ${Classes.TEXT_MUTED}`} icon="drag-handle-vertical" onMouseDown={ev => setDragState({
          id: ingredient.id,
          el: ev.currentTarget,
        })} />
        <Icon className={`react-flow__node-module__child__icon ${Classes.TEXT_MUTED}`} icon="small-cross" onClick={() => removeModuleIngredient(id, ingredient.id)} />
        {("target" in ingredient) && <Handle type="source" position={sourcePosition} isConnectable={isConnectable} id={ingredient.id} />}
      </div>)}
    <div className="react-flow__node-module__row">
      <Button icon="add" minimal={true} small={true} fill={true} className="nodrag" onClick={() => addModuleIngredient(id, { id: "", type: "delay-exec", delay: 5, target: null })} />
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
