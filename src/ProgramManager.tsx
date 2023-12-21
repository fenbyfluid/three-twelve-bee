import { H3 } from "@blueprintjs/core";
import React, { useEffect } from "react";
import { DeviceConnection } from "./DeviceConnection";
import { decodeInstruction, parseModuleAsync } from "./Module";

async function LoadModule(device: DeviceConnection, moduleIdx: number): Promise<void> {
  let bankBase = null;
  let bankOffsetPtr = null;
  if (moduleIdx >= 0xE0) {
    throw new Error("Module index out of bounds");
  } else if (moduleIdx >= 0xC0) {
    bankBase = 0x40C0;
    bankOffsetPtr = 0x41D0 + (moduleIdx - 0xC0);
  } else if (moduleIdx >= 0xA0) {
    bankBase = 0x8120;
    bankOffsetPtr = 0x8100 + (moduleIdx - 0xA0);
  } else if (moduleIdx >= 0x80) {
    bankBase = 0x8040;
    bankOffsetPtr = 0x8020 + (moduleIdx - 0x80);
  } else {
    throw new Error("Expected a User Module index");
  }

  console.log(moduleIdx.toString(16), bankBase.toString(16), bankOffsetPtr.toString(16));

  const moduleBase = bankBase + await device.peek(bankOffsetPtr);

  console.log(moduleIdx.toString(16), moduleBase.toString(16));

  const parsedModule = [];
  for await (let instruction of parseModuleAsync(device.iterBytes(moduleBase))) {
    parsedModule.push(decodeInstruction(instruction));
  }

  console.log(moduleIdx.toString(16), parsedModule);
}

async function LoadUserMode(device: DeviceConnection, userModeIdx: number): Promise<void> {
  console.log(`Loading User ${userModeIdx + 1}`);

  const startModule = await device.peek(0x8018 + userModeIdx);
  console.log(`Got start vector: ${startModule}`);

  // TODO: If we're re-creating execution here, don't forget to load the initial state and execute module 1 first.
  await LoadModule(device, startModule);
}

export function ProgramManager(props: { device: DeviceConnection }) {
  useEffect(() => {
    // Use 0x41F3 (RAM) instead of 0x8008 (EEPROM) to include scratchpad routine.
    props.device.peek(0x41F3).then(topMode => {
      // TODO: Use a constant for "Phase 3" mode here.
      const userModeCount = topMode - 135;
      for (let i = 0; i < userModeCount; ++i) {
        // TODO
        // if (i !== 1) continue;

        LoadUserMode(props.device, i).then(_ => {
          // TODO: Update component state.
        })
      }
    });
  }, [props.device]);

  return <div>
    <H3 style={{ margin: 20 }}>
      Manage User Programs
    </H3>
  </div>;
}
