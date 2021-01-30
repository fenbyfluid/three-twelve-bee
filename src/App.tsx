import React, { useState } from "react";
import { Button, Classes, Navbar, Tab, Tabs } from "@blueprintjs/core";
import { MainMenu } from "./MainMenu";

function App() {
  const [currentPage, setPage] = useState("menu");

  const pages: { [key: string]: React.ReactElement } = {
    menu: <MainMenu onClick={setPage} />,
  };

  const menuButton = <Button icon="arrow-left" className={Classes.MINIMAL} large={true} onClick={() => setPage("menu")}>
    Menu
  </Button>;

  return <>
    <Navbar>
      <div className="container">
        <Navbar.Group align="left">
          {currentPage !== "menu" && menuButton}
        </Navbar.Group>
        <Navbar.Group align="right">
          <Tabs id="navbar" large={true} selectedTabId={currentPage} onChange={tab => setPage(tab.toString())}>
            <Tab id="controls" title="Controls" />
            <Tab id="designer" title="Designer" />
            <Tab id="programs" title="Programs" />
          </Tabs>
        </Navbar.Group>
      </div>
    </Navbar>

    <div className="container">
      {pages[currentPage]}
    </div>
  </>;
}

export default App;
