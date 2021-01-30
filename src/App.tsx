import React, { useEffect, useState } from "react";
import { Button, Classes, Navbar, Tab, Tabs } from "@blueprintjs/core";
import { MainMenu } from "./MainMenu";
import { DeviceConnection } from "./DeviceConnection";

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
  }

  return <>
    {currentPage !== "menu" && <Navbar>
      <div className="container">
        <Navbar.Group align="left">
          <Button icon="chevron-left" className={Classes.MINIMAL} large={true} onClick={() => setPage("menu")}>
            Menu
          </Button>
        </Navbar.Group>
        <Navbar.Group align="right">
          <Tabs id="navbar" large={true} selectedTabId={currentPage} onChange={tab => setPage(tab.toString())}>
            <Tab id="controls" title="Controls" disabled={!device} />
            <Tab id="designer" title="Designer" />
            <Tab id="programs" title="Programs" disabled={!device} />
          </Tabs>
        </Navbar.Group>
      </div>
    </Navbar>}

    <div className="container">
      {page}
    </div>
  </>;
}
