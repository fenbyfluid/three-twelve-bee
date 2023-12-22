import { Button, Classes, Icon, Navbar, Tab, Tabs, TabsExpander } from "@blueprintjs/core";
import React, { useEffect, useState } from "react";
import { AdvancedDesigner } from "./AdvancedDesigner";
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
      page = device && <InteractiveControls connection={device} />;
      break;
    case "designer":
      page = <AdvancedDesigner setBackAction={setBackAction} />;
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
        {device && <Navbar.Group align="right">
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
