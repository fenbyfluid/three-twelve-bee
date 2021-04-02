import React, { useState } from "react";
import { FileInput, FormGroup, H3, HTMLSelect } from "@blueprintjs/core";
import { DesignerGraph } from "./DesignerGraph";
import { DesignerFile, Routine } from "eroslink-file";

export function DesignerEditor() {
  const [fileError, setFileError] = useState<string | null>(null);
  const [file, setFile] = useState<{ name: string, context: DesignerFile } | null>(null);
  const [routine, setRoutine] = useState<Routine | null>(null);

  const selectFile = (ev: React.FormEvent<HTMLInputElement>) => {
    const file = ev.currentTarget.files && ev.currentTarget.files.item(0);

    if (!file) {
      setFile(null);
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

        if (context.routines.length === 1) {
          setRoutine(context.routines[0]);
        }
      } catch (err) {
        setFileError(err.message);
      }
    });
  };

  const selectRoutine = (ev: React.ChangeEvent<HTMLSelectElement>) => {
    const routine = file?.context.routines.find(routine => routine.name === ev.target.value);

    setRoutine(routine || null);
  };

  return <div style={{ margin: "0 20px" }}>
    <H3 style={{ margin: "20px 0" }}>
      Editing {routine?.name}
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
        value={routine?.name || ""}
        disabled={!file}
        onChange={selectRoutine}
      >
        <option disabled={true} value="">Please Select...</option>
        {file?.context.routines.map(routine =>
          <option key={routine.name} value={routine.name!}>{routine.name}</option>)}
      </HTMLSelect>
    </FormGroup>
    <FormGroup label="Ingredient Graph" disabled={!routine}>
      <DesignerGraph key={routine?.name} routine={routine} />
    </FormGroup>
  </div>;
}
