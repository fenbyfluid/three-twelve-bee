import { FileInput, FormGroup, H3, HTMLSelect } from "@blueprintjs/core";
import { DesignerFile, Routine } from "eroslink-file";
import React, { useState } from "react";
import { EroslinkRoutineGraph } from "./EroslinkRoutineGraph";

export function EroslinkRoutineViewer() {
  const [fileError, setFileError] = useState<string | null>(null);
  const [file, setFile] = useState<{ name: string, context: DesignerFile } | null>(null);
  const [selectedRoutineIdx, setSelectedRoutineIdx] = useState(-1);
  const [routine, setRoutine] = useState<Routine | null>(null);

  const selectFile = (ev: React.FormEvent<HTMLInputElement>) => {
    const file = ev.currentTarget.files && ev.currentTarget.files.item(0);

    if (!file) {
      setFile(null);
      setSelectedRoutineIdx(-1);
      setRoutine(null);

      return;
    }

    file.arrayBuffer().then(serialized => {
      try {
        const context = new DesignerFile(new Uint8Array(serialized));
        setFileError(null);

        setFile({
          name: file.name,
          context,
        });

        if (context.routines.length > 0) {
          setSelectedRoutineIdx(0);
          setRoutine(context.routines[0]);
        }
      } catch (err) {
        setFileError(err instanceof Error ? err.message : "Unknown Error");
      }
    });
  };

  const selectRoutine = (ev: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = +ev.target.value;
    const routine = idx >= 0 && file?.context.routines.at(idx);

    setSelectedRoutineIdx(idx)
    setRoutine(routine || null);
  };

  return <div style={{ margin: "0 20px" }}>
    <H3 style={{ margin: "20px 0" }}>
      {routine ? `Viewing ${routine.name}` : "Select Routine"}
    </H3>
    <FormGroup label="Select File" helperText={fileError} intent={fileError ? "danger" : undefined}>
      <FileInput
        fill={true}
        hasSelection={file !== null}
        text={file !== null ? file.name : undefined}
        onInputChange={selectFile}
        inputProps={{ accept: ".elk" }}
      />
    </FormGroup>
    <FormGroup label="Select Routine" disabled={!file} helperText={routine?.description}>
      <HTMLSelect
        fill={true}
        value={selectedRoutineIdx}
        disabled={(file?.context.routines.length ?? 0) <= 1}
        onChange={selectRoutine}
      >
        <option disabled={true} value={-1}>Please Select...</option>
        {file?.context.routines.map((routine, i) =>
          <option key={i} value={i}>{routine.name}</option>)}
      </HTMLSelect>
    </FormGroup>
    <FormGroup label="Ingredient Graph" disabled={!routine}>
      <EroslinkRoutineGraph key={routine?.name || ""} routine={routine} />
    </FormGroup>
  </div>;
}
