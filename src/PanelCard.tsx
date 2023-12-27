import { Card, CardProps, H6 } from "@blueprintjs/core";
import React from "react";

type PanelCardProps = {
  label?: React.ReactNode,
  labelPosition?: "left" | "center" | "right",
};

export function PanelCard({ label, labelPosition, style, children, ...props }: PanelCardProps & CardProps) {
  const labelStyle: React.CSSProperties = {
    position: "absolute",
    padding: "2px 10px",
    backgroundColor: "white",
    width: "fit-content",
    top: -11,
  };

  switch (labelPosition ?? "left") {
    case "left":
      labelStyle.left = 10;
      break;
    case "center":
      labelStyle.left = "50%";
      labelStyle.transform = "translateX(-50%)";
      break;
    case "right":
      labelStyle.right = 10;
      break;
  }

  return <Card style={{ ...style, position: "relative" }} {...props}>
    {label && <H6 style={labelStyle}>{label}</H6>}
    {children}
  </Card>;
}