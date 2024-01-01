import { Card, CardProps } from "@blueprintjs/core";
import React from "react";
import "./PanelCard.css"

type PanelCardProps = {
  label?: React.ReactNode,
  labelPosition?: "left" | "center" | "right",
  rightLabel?: React.ReactNode,
};

export function PanelCard({ label, labelPosition, rightLabel, className, children, ...props }: PanelCardProps & CardProps) {
  if (typeof label === "string") {
    label = <span style={{ fontWeight: 600 }}>{label}</span>;
  }

  if (typeof rightLabel === "string") {
    rightLabel = <span style={{ fontWeight: 600 }}>{rightLabel}</span>;
  }

  return <Card className={`${className ?? ""} panel-card`} {...props}>
    {label && <div className={`panel-card-label panel-card-label-align-${labelPosition ?? "left"}`}>{
      label
    }</div>}
    {rightLabel && <div className="panel-card-label panel-card-label-align-right">{
      rightLabel
    }</div>}
    {children}
  </Card>;
}