import React from "react";
import { H1 } from "@blueprintjs/core";
import logo from "./logo.png";

function App() {
  const styles: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  };

  return <div style={styles}>
    <img src={logo} alt="Three Twelve Bee Logo" width={512} height={256} />
    <H1>Hi there.</H1>
  </div>;
}

export default App;
