import { Card, CardProps, H6 } from "@blueprintjs/core";
import React from "react";
import "./PanelCard.css"

type PanelCardProps = {
  label?: React.ReactNode,
  labelPosition?: "left" | "center" | "right",
};

export function PanelCard({ label, labelPosition, className, children, ...props }: PanelCardProps & CardProps) {
  return <Card className={`${className} panel-card`} {...props}>
    {label && <H6 className={`panel-card-label panel-card-label-align-${labelPosition ?? "left"}`}>{
      label
    }</H6>}
    {children}
  </Card>;
}