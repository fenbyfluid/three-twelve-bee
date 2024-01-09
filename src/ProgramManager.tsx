import { Button, H3, H4, H6, Pre } from "@blueprintjs/core";
import React, { useEffect, useState } from "react";
import { Mode } from "./DeviceApi";
import { DeviceConnection } from "./DeviceConnection";
import { MODULES, RAM_VARIABLES } from "./MemoryVariables";
import { decodeInstruction, Instruction, parseModuleAsync } from "./Module";

// TODO: It seems like we probably want our higher level interface to output a dumb series of simple instructions,
//       which we then pass through various optimiser stages to minimise size. It's a hunch, but it feels like this will
//       be able to produce more compact programs more easily than if we were trying to implement state tracking through
//       the entire initial codegen pipeline, and interop tools will be easier.
//       Here are some obvious optimisation pass ideas, all of these should probably be configurable just in case:
//       1. (Per module) Decompose copy instructions into a series of set instructions (this only matters if we allow
//          importing assembly directly). This helps later optimisations have more to work with.
//       2. (Whole program) Keep track of all possible memory states at the entry to each module, elide instructions
//          that would be no-ops. Account for both the initial copied state and module 1.
//       3. (Per module) Can we convert math operations to sets if we're sure about the initial state?
//       4. (Per module) Re-order instructions so that sets to adjacent addresses are next to each other where possible.
//          This should be completely safe as long as we dont reorder before or after any other math operations on the
//          same addresses.
//          Actually, some addresses can affect later operations within the same module - particularly 0x85 will affect
//          most instructions, and 0x8D and 0x8E will affect the rand instruction.
//       5. (Per module) Collapse multiple sets to adjacent addresses into a single copy instruction.
//       6. (Multi program) Probably a bit too insane, but during routine write we could de-duplicate instructions
//          across multiple programs into a larger shared module and smaller dispatch modules (responsible for setting
//          the correct next module numbers). This is unlikely to be worth the effort and extra module usage in most
//          cases, but is worth a brief investigation, as instruction space seems to be tighter than module space.

// TODO: It seems that a lot of junk inaccessible module data can be left behind in the EEPROM that ErosLink doesn't
//       handle (requiring a full erase), we should. Our write algorithm should consider the entire space available in
//       memory and what is actually in use by programs. We probably want two modes, a fast one that is used initially,
//       and a slow mode that is used as a fallback if that fails.
//       Fast: Write the instructions to the first large enough free space in the module area.
//       Slow: Download all instruction data for all reachable user modules for all user modes, re-pack and re-encode
//             into the most space efficient order, then write everything back to the device.
//             The packing is complicated by the dual module banks.
//       We should never actually need a full erase in this case, although Slow will need to be able to give up as well.
// TODO: We need to investigate if it is safe to re-order modules - this will depend on if a program uses math
//       operations to reference them. It's probably a safe bet that ErosLink is the only other assembler we need to
//       deal with, but to be generic this could be handled as an analysis step and kept as a program flag.

type ModuleInfo = {
  index: number,
  instructions: Instruction[],
  referencedModules: number[],
};

async function LoadModule(device: DeviceConnection, moduleIdx: number): Promise<ModuleInfo> {
  let bankBase = null;
  let bankOffsetPtr = null;
  if (moduleIdx >= 0xE0) {
    throw new Error("Module index out of bounds");
  } else if (moduleIdx >= 0xC0) {
    // Scratchpad
    bankBase = 0x40C0;
    bankOffsetPtr = 0x41D0 + (moduleIdx - 0xC0);
  } else if (moduleIdx >= 0xA0) {
    // Upper User Bank
    bankBase = 0x8120;
    bankOffsetPtr = 0x8100 + (moduleIdx - 0xA0);
  } else if (moduleIdx >= 0x80) {
    // Lower User Bank
    bankBase = 0x8040;
    bankOffsetPtr = 0x8020 + (moduleIdx - 0x80);
  } else {
    throw new Error("Expected a User Module index");
  }

  // console.log(moduleIdx.toString(16), bankBase.toString(16), bankOffsetPtr.toString(16));
  const moduleBase = bankBase + await device.peek(bankOffsetPtr);
  // console.log(moduleIdx.toString(16), moduleBase.toString(16));

  const parsedModule = [];
  for await (const instruction of parseModuleAsync(device.iterBytes(moduleBase))) {
    parsedModule.push(decodeInstruction(instruction));
  }

  // console.log(moduleIdx.toString(16), parsedModule);

  const referencedModules = [];

  const addressesWithModuleReferences = new Set([
    0x84, // Cond exec
    0x8F, // Audio trigger
    0x97, // Module timer
    0xA1, 0xA2, // Ramp action
    0xAA, 0xAB, // Intensity action
    0xB3, 0xB4, // Frequency action
    0xBC, 0xBD, // Width action
  ]);

  // This isn't amazing, but it seems to do the job.
  for (const instruction of parsedModule) {
    switch (instruction.operation) {
      case "set":
        if (addressesWithModuleReferences.has(instruction.address & 0xFF) && instruction.value < 224) {
          referencedModules.push(instruction.value);
        }

        break;
      case "copy":
        for (let i = 0; i < instruction.values.length; ++i) {
          if (addressesWithModuleReferences.has((instruction.address + i) & 0xFF) && instruction.values[i] < 224) {
            referencedModules.push(instruction.values[i]);
          }
        }

        break;
      default:
        // TODO: Temporary hack.
        if (addressesWithModuleReferences.has(instruction.address & 0xFF)) {
          throw new Error("Unexpected interaction with module reference address");
        }
    }
  }

  return {
    index: moduleIdx,
    instructions: parsedModule,
    referencedModules: referencedModules,
  };
}

type ModeInfo = {
  index: number,
  modules: ModuleInfo[],
};

async function LoadUserMode(device: DeviceConnection, userModeIdx: number): Promise<ModeInfo> {
  // console.log(`Loading User ${userModeIdx + 1}`);

  const startModule = await device.peek(0x8018 + userModeIdx);
  // console.log(`Got start vector: ${startModule}`);

  const loadedModules: ModuleInfo[] = [];
  const modulesToLoad = [startModule];

  while (modulesToLoad.length > 0) {
    const moduleIndex = modulesToLoad.shift()!;
    const moduleInfo = await LoadModule(device, moduleIndex);

    loadedModules.push(moduleInfo);

    modulesToLoad.push(...moduleInfo.referencedModules.filter(i => !loadedModules.some(m => m.index === i)));
  }

  // TODO: If we're re-creating execution here, don't forget to load the initial state and execute module 1 first.
  return {
    index: userModeIdx,
    modules: loadedModules,
  };
}

function InstructionPrettyDisplay({ instruction }: { instruction: Exclude<Instruction, { operation: "copy" }> }) {
  // TODO: Handle Channel B stuff.
  const address = 0x4000 + instruction.address;
  const info = RAM_VARIABLES.find(info => info.address === address);

  let valueDescription = "";
  if ("value" in instruction) {
    valueDescription = `${instruction.value} (0x${instruction.value.toString(16).toUpperCase().padStart(2, "0")}) (0b${instruction.value.toString(2).padStart(8, "0")})`;

    if (info?.values) {
      valueDescription += ` (${info.values[instruction.value] ?? "Unknown"})`
    }

    if (info?.flags) {
      // TODO
      valueDescription += " (Has Flags)";
    }
  }

  let operationDescription = null;
  switch (instruction.operation) {
    case "store":
      break;
    case "load":
      break;
    case "div2":
      // TODO: Really this is "ROR – Rotate Right through Carry".
      //       https://ww1.microchip.com/downloads/en/devicedoc/atmel-0856-avr-instruction-set-manual.pdf 96.
      //       The C flag is cleared before it is executed.
      //       The distinction might be useful for comparing flags?
      operationDescription = "/= 2";
      break;
    case "rand":
      operationDescription = "= <random value>"
      break;
    case "condexec":
      break;
    case "set":
      operationDescription = `= ${valueDescription}`;
      break;
    case "add":
      operationDescription = `+= ${valueDescription}`;
      break;
    case "and":
      operationDescription = `&= ${valueDescription}`;
      break;
    case "or":
      operationDescription = `|= ${valueDescription}`;
      break;
    case "xor":
      operationDescription = `^= ${valueDescription}`;
      break;
  }

  return <div>
    <span>{info?.name ?? `0x${address.toString(16).toUpperCase().padStart(4, "0")}`}</span>
    {" "}
    <span>{info?.description ?? "Unknown"}</span>
    {" "}
    {operationDescription ? <span>{operationDescription}</span> : <span style={{ fontWeight: "bold", color: "firebrick" }}>Not Implemented</span>}
  </div>;
}

function InstructionDisplay({ instruction }: { instruction: Instruction }) {
  let pretty = [];
  if (instruction.operation === "copy") {
    pretty = instruction.values.map((value, i) => <InstructionPrettyDisplay key={i} instruction={{
      operation: "set",
      address: instruction.address + i,
      value,
    }} />);
  } else {
    pretty = [
      <InstructionPrettyDisplay key={0} instruction={instruction} />
    ];
  }

  return <div style={{ marginBottom: 20 }}>
    <Pre>{ JSON.stringify(instruction, null, 1).replace(/\n */g, " ") }</Pre>
    {pretty}
  </div>;
}

function ModuleDisplay({ index, instructions, referencedModules }: ModuleInfo) {
  return <div>
    <H6>{MODULES[index] ?? `0x${index.toString(16).toUpperCase().padStart(2, "0")}`} ({index}) =&gt; [{
      referencedModules.map(index => `${MODULES[index] ?? `0x${index.toString(16).toUpperCase().padStart(2, "0")}`} (${index})`).join(", ")
    }]</H6>
    {instructions.map((instruction, i) => <InstructionDisplay key={i} instruction={instruction} />)}
  </div>;
}

function ModeDisplay({ index, modules }: ModeInfo) {
  return <div>
    <H4>User {index + 1}</H4>
    {modules.map(module => <ModuleDisplay key={module.index} {...module} />)}
  </div>;
}

export function ProgramManager(props: { device: DeviceConnection }) {
  const [epoch, setEpoch] = useState(0);
  const [modes, setModes] = useState<ModeInfo[]>([]);

  useEffect(() => {
    console.log(`Reloading (${epoch})`);

    // Use 0x41F3 (RAM) instead of 0x8008 (EEPROM) to include scratchpad routine.
    props.device.peek(0x41F3).then(topMode => {
      const userModeCount = topMode - Mode.Phase3;

      // First, remove any modes that don't exist anymore.
      setModes(modes => modes.slice(0, userModeCount));

      for (let i = 0; i < userModeCount; ++i) {
        LoadUserMode(props.device, i).then(newMode => {
          // console.log(i, newMode);

          setModes(modes => [
            ...modes.filter(mode => mode.index !== newMode.index),
            newMode,
          ].sort((a , b) => a.index - b.index));
        })
      }
    });
  }, [props.device, epoch]);

  return <div>
    <H3 style={{ margin: 20, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
      Manage User Programs
      <Button onClick={() => setEpoch(n => n + 1)}>Reload</Button>
    </H3>
    {modes.map(mode => <ModeDisplay key={mode.index} {...mode} />)}
  </div>;
}
