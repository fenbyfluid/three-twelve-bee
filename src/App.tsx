import React, { useEffect, useState } from "react";
import { Button, Classes, Navbar, Tab, Tabs } from "@blueprintjs/core";
import { MainMenu } from "./MainMenu";
import { DeviceConnection } from "./DeviceConnection";
import { MemoryView } from "./MemoryView";
import { FirmwareUpdate } from "./FirmwareUpdate";
import { InteractiveControls } from "./InteractiveControls";
import { ProgramManager } from "./ProgramManager";
import { InstructionTester } from "./InstructionTester";
import { DesignerEditor } from "./DesignerEditor";

export function App() {
  const [currentPage, setPage] = useState("menu");
  const [device, setDevice] = useState<DeviceConnection | null>(null);

  useEffect(() => {
    if (device === null) {
      setPage(prevPage => {
        if (prevPage === "menu" || prevPage === "designer") {
          return prevPage;
        }

        return "menu";
      });
    }
  }, [device]);

  let page = undefined;
  switch (currentPage) {
    case "menu":
      page = <MainMenu onClick={setPage} device={device} setDevice={setDevice} />;
      break;
    case "controls":
      page = device && <InteractiveControls device={device} />;
      break;
    case "designer":
      page = <DesignerEditor />;
      break;
    case "programs":
      page = device && <ProgramManager device={device} />;
      break;
    case "firmware":
      page = <FirmwareUpdate />;
      break;
    case "memory":
      page = device && <MemoryView device={device} />;
      break;
    case "tester":
      page = device && <InstructionTester device={device} />;
      break;
  }

  return <>
    {currentPage !== "menu" && <Navbar>
      <div className="container">
        <Navbar.Group align="left">
          <Button icon="chevron-left" className={Classes.MINIMAL} large={true} onClick={() => setPage("menu")}>
            Menu
          </Button>
        </Navbar.Group>
        {device && <Navbar.Group align="right">
          <Tabs id="navbar" large={true} selectedTabId={currentPage} onChange={tab => setPage(tab.toString())} renderActiveTabPanelOnly={true}>
            <Tab id="controls" title="Controls" />
            <Tab id="designer" title="Designer" />
            <Tab id="programs" title="Programs" />
          </Tabs>
        </Navbar.Group>}
      </div>
    </Navbar>}

    <div className="container">
      {page}
    </div>
  </>;
}
