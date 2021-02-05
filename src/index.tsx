import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { App } from "./App";
import { Classes, FocusStyleManager } from "@blueprintjs/core";

const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");

if (prefersDarkScheme.matches) {
    document.body.classList.add(Classes.DARK);
}

prefersDarkScheme.addEventListener("change", ev => {
    document.body.classList.toggle(Classes.DARK, ev.matches);
});

FocusStyleManager.onlyShowFocusOnTabs();

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root"),
);
