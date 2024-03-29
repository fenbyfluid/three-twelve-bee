import {
  Button,
  Card,
  CardList,
  Classes,
  ControlGroup,
  H3,
  Icon,
  NonIdealState,
  TabsExpander,
} from "@blueprintjs/core";
import { useLiveQuery } from "dexie-react-hooks";
import React, { useEffect, useState } from "react";
import { db } from "./Database";
import { Routine } from "./Routine";
import { RoutineEditor } from "./RoutineEditor";

interface AdvancedDesignerProps {
  setBackAction: React.Dispatch<React.SetStateAction<(() => void) | null>>;
}

export function AdvancedDesigner({ setBackAction }: AdvancedDesignerProps) {
  // TODO: Pagination? Search?
  // TODO: Avoid loading this if we're editing a routine?
  const routines = useLiveQuery(() => db.routines.toArray());

  // We have to be careful to always use selectedRoutine, not selectedRoutineId, elsewhere as
  // otherwise the state could get mismatched if another browser tab deleted the selected routine.
  // TODO: It would probably be nice to hold the currently selected routine in separate state and
  //       only commit on an explicit save, that would let us cancel, and even implement an undo stack.
  const [selectedRoutineId, setSelectedRoutineId] = useState<number | undefined>(undefined);
  const selectedRoutine = useLiveQuery(() => selectedRoutineId ? db.routines.get(selectedRoutineId) : undefined, [selectedRoutineId]);

  useEffect(() => {
    if (selectedRoutine) {
      // We're trying to set the state to a function, so need to wrap it in another function to compute the new state.
      setBackAction(() => () => setSelectedRoutineId(undefined));
    } else {
      setBackAction(null);
    }

    return () => {
      setBackAction(null);
    };
  }, [setBackAction, selectedRoutine]);

  const onRoutineChange = (routine: Routine) => {
    if (!selectedRoutine?.id) {
      return;
    }

    db.routines.update(selectedRoutine.id, {
      routine,
    });
  };

  const onClickCreateButton = () => {
    db.routines.add({
      routine: { name: "New Routine", modules: [] },
    }).then(id => {
      setSelectedRoutineId(id);
    });
  };

  return <div style={{ margin: "0 20px" }}>
    <div style={{ margin: "20px 0", display: "flex" }}>
      <H3 style={{ marginBottom: 0 }}>
        {selectedRoutine ? `Editing ${selectedRoutine.routine.name}` : "Advanced Designer"}
      </H3>
      <TabsExpander />
      {selectedRoutine ? <ControlGroup>
        <Button intent="danger" onClick={() => {
          if (!selectedRoutine?.id) {
            return;
          }

          db.routines.delete(selectedRoutine.id).then(() => {
            setSelectedRoutineId(undefined);
          });
        }}>Delete</Button>
      </ControlGroup> : ((routines && routines.length > 0) ?
          <Button intent="primary" onClick={onClickCreateButton}>Create</Button> :
          undefined)}
    </div>
    {selectedRoutine ? <RoutineEditor routine={selectedRoutine.routine} onChange={onRoutineChange} /> :
        ((routines && routines.length > 0) ? <CardList bordered={true} className={Classes.ELEVATION_1}>
          {routines.map(routine => <Card
              key={routine.id}
              interactive={true}
              onClick={() => setSelectedRoutineId(routine.id)}
              style={{ justifyContent: "space-between" }}
          >
            <span>{routine.routine.name}</span>
            <Icon icon="chevron-right" className={Classes.TEXT_MUTED} />
          </Card>)}
        </CardList> : <div style={{ margin: "100px 0" }}>
          <NonIdealState
              title="No Routines"
              description="Create a new routine to get started."
              action={<Button intent="primary" onClick={onClickCreateButton}>Create</Button>}
          />
        </div>)}
  </div>;
}
