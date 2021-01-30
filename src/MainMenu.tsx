import React from "react";
import logo from "./logo.png";
import { Card, Classes } from "@blueprintjs/core";

interface MenuCardProps {
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  children?: React.ReactNode;
}

function MenuCard(props: MenuCardProps) {
  const style: React.CSSProperties = {
    margin: "0 0.5em",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  };

  return <Card interactive={true} onClick={props.onClick} style={style} className={Classes.TEXT_LARGE}>
    {props.children}
  </Card>;
}

interface MainMenuProps {
  onClick?: (id: string) => void;
}

export function MainMenu(props: MainMenuProps) {
  const logoWidth = 256;

  const listStyle: React.CSSProperties = {
    margin: "1em 0",
    width: "100%",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  };

  return <div style={{ textAlign: "center" }}>
    <img src={logo} alt="Three Twelve Bee Logo" width={logoWidth} height={logoWidth / 2} style={{ margin: "2em" }} />
    <div style={{ ...listStyle, height: 125 }}>
      <MenuCard onClick={() => props.onClick && props.onClick("controls")}>Interactive Controls</MenuCard>
      <MenuCard onClick={() => props.onClick && props.onClick("designer")}>Advanced Designer</MenuCard>
    </div>
    <div style={{ ...listStyle, height: 100 }}>
      <MenuCard onClick={() => props.onClick && props.onClick("programs")}>Manage User Programs</MenuCard>
      <MenuCard onClick={() => props.onClick && props.onClick("firmware")}>Firmware Update</MenuCard>
      <MenuCard onClick={() => props.onClick && props.onClick("memory")}>Memory View</MenuCard>
    </div>
  </div>;
}