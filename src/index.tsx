import { Classes, FocusStyleManager } from "@blueprintjs/core";
import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";

const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");

if (prefersDarkScheme.matches) {
    document.body.classList.add(Classes.DARK);
}

prefersDarkScheme.addEventListener("change", ev => {
    document.body.classList.toggle(Classes.DARK, ev.matches);
});

FocusStyleManager.onlyShowFocusOnTabs();

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
