import { Button, Classes, Icon, Navbar, Tab, Tabs, TabsExpander } from "@blueprintjs/core";
import React, { useEffect, useMemo, useState } from "react";
import { AdvancedControls } from "./AdvancedControls";
import { AdvancedDesigner } from "./AdvancedDesigner";
import { DeviceSettings } from "./DeviceSettings";
import { DeviceApi } from "./DeviceApi";
import { DeviceConnection } from "./DeviceConnection";
import { EroslinkRoutineViewer } from "./EroslinkRoutineViewer";
import { FirmwareUpdate } from "./FirmwareUpdate";
import { InstructionTester } from "./InstructionTester";
import { InteractiveControls } from "./InteractiveControls";
import { MainMenu } from "./MainMenu";
import { MemoryView } from "./MemoryView";
import { ProgramManager } from "./ProgramManager";

export function App() {
  const [currentPage, setPage] = useState("menu");
  const [backAction, setBackAction] = useState<(() => void) | null>(null);
  const [connection, setConnection] = useState<DeviceConnection | null>(null);
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    if (connection === null) {
      setPage(prevPage => {
        if (prevPage === "menu" || prevPage === "designer") {
          return prevPage;
        }

        return "menu";
      });
    }
  }, [connection]);

  // Use this if we're in devMode and not connected.
  const mockDevice = useMemo(() => {
    if (!devMode) {
      return null;
    }

    const mockConnection = {
      mockMemory: [] as number[],
      async peek(address: number): Promise<number> {
        // A delay is required to let usePolledGetter function.
        await new Promise<void>(resolve => setTimeout(() => resolve(), 18));

        return this.mockMemory[address] ?? 0;
      },
      async poke(address: number, data: number | number[]): Promise<void> {
        // A delay is required to let usePolledGetter function.
        await new Promise<void>(resolve => setTimeout(() => resolve(), 18));

        if (!Array.isArray(data)) {
          data = [data];
        }

        for (let i = 0; i < data.length; ++i) {
          this.mockMemory[address + i] = data[i];
        }
      },
    };

    return new DeviceApi(mockConnection);
  }, [devMode]);

  const device = useMemo(() => connection ? new DeviceApi(connection) : mockDevice, [connection, mockDevice]);

  let page = undefined;
  switch (currentPage) {
    case "menu":
      page = <MainMenu onClick={setPage} connection={connection} setConnection={setConnection} device={device} devMode={devMode} setDevMode={setDevMode} />;
      break;
    case "controls":
      page = device && <AdvancedControls device={device} />;
      break;
    case "controls-legacy":
      page = device && <InteractiveControls device={device} />;
      break;
    case "settings":
      page = device && <DeviceSettings device={device} />;
      break;
    case "designer":
      page = <AdvancedDesigner setBackAction={setBackAction} />;
      break;
    case "programs":
      page = connection && <ProgramManager device={connection} />;
      break;
    case "firmware":
      page = <FirmwareUpdate />;
      break;
    case "memory":
      page = connection && <MemoryView device={connection} />;
      break;
    case "tester":
      page = connection && <InstructionTester device={connection} />;
      break;
    case "viewer":
      page = <EroslinkRoutineViewer />;
      break;
  }

  return <>
    {currentPage !== "menu" && <Navbar fixedToTop={true}>
      <div className="container">
        <Navbar.Group align="left">
          <Button icon={<Icon icon="chevron-left" size={20} />} className={Classes.MINIMAL} large={true} onClick={() => backAction ? backAction() : setPage("menu")}>
            {backAction ? "Back" : "Menu"}
          </Button>
        </Navbar.Group>
        {device && <Navbar.Group align="right" style={{ paddingRight: 20 }}>
          <Tabs id="navbar" large={true} selectedTabId={currentPage} onChange={tab => setPage(tab.toString())} renderActiveTabPanelOnly={true}>
            <Tab id="controls" title="Controls" />
            <Tab id="designer" title="Designer" />
            <Tab id="programs" title="Programs" />
          </Tabs>
        </Navbar.Group>}
      </div>
    </Navbar>}

    <div className="container flex-container" style={{ paddingTop: (currentPage !== "menu") ? 50 : 0 }}>
      <div>{page}</div>
      <TabsExpander />
      <div className={`footer ${Classes.TEXT_SMALL} ${Classes.TEXT_MUTED}`}>
        <p>
          Created with{" "}
          <a target="_blank" rel="noreferrer" href="https://blueprintjs.com">Blueprint</a>
          {", "}
          <a target="_blank" rel="noreferrer" href="https://reactjs.org">React</a>
          {", and "}
          <a target="_blank" rel="noreferrer" href="https://reactflow.dev">React Flow</a>
        </p>
        {(process.env.REACT_APP_GITHUB_REPO ?? "").length > 0 && <p>
          {/* eslint-disable-next-line */}
            <a target="_blank" rel="noopener" href={`https://github.com/${process.env.REACT_APP_GITHUB_REPO}`}>Contribute on GitHub</a>
        </p>}
      </div>
    </div>
  </>;
}
