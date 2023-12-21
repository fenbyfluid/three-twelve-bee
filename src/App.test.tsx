import { render, screen } from "@testing-library/react";
import React from "react";
import { App } from "./App";

test("renders logo", () => {
  render(<App />);
  const headerElement = screen.getByAltText(/logo/i);
  expect(headerElement).toBeInTheDocument();
});
