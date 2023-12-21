import { Card, Classes } from "@blueprintjs/core";
import React from "react";
import { ConnectionBar } from "./ConnectionBar";
import { DeviceConnection } from "./DeviceConnection";
import logo from "./logo.png";

interface MenuCardProps {
  disabled?: boolean,
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  children?: React.ReactNode;
}

function MenuCard(props: MenuCardProps) {
  const style: React.CSSProperties = {
    margin: "0 10px",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  };

  const classes = [
    Classes.TEXT_LARGE,
  ];

  if (props.disabled) {
    classes.push(Classes.TEXT_DISABLED);
  }

  return <Card interactive={!props.disabled}
               aria-disabled={props.disabled}
               elevation={props.disabled ? 1 : 2}
               onClick={!props.disabled ? props.onClick : undefined}
               style={style}
               className={classes.join(" ")}>{props.children}</Card>;
}

interface MainMenuProps {
  device: DeviceConnection | null;
  setDevice: React.Dispatch<React.SetStateAction<DeviceConnection | null>>;
  onClick?: (id: string) => void;
}

export function MainMenu(props: MainMenuProps) {
  const logoWidth = 256;

  const logoStyle: React.CSSProperties = {
    margin: "2em",
    filter: "drop-shadow(0px 0px 15px white)",
  };

  const listStyle: React.CSSProperties = {
    margin: "20px 0",
    width: "100%",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  };

  return <div style={{ textAlign: "center" }}>
    <img src={logo} alt="Three Twelve Bee Logo" width={logoWidth} height={logoWidth / 2} style={logoStyle} />
    <div style={{ padding: "0 10px", textAlign: "initial" }}>
      <ConnectionBar device={props.device} setDevice={props.setDevice} />
    </div>
    <div style={{ ...listStyle, height: 125 }}>
      <MenuCard disabled={!props.device} onClick={() => props.onClick && props.onClick("controls")}>
        Interactive Controls
      </MenuCard>
      <MenuCard onClick={() => props.onClick && props.onClick("designer")}>
        Advanced Designer
      </MenuCard>
    </div>
    <div style={{ ...listStyle, height: 100 }}>
      <MenuCard disabled={!props.device} onClick={() => props.onClick && props.onClick("programs")}>
        Manage User Programs
      </MenuCard>
      <MenuCard disabled={props.device !== null || !navigator.serial} onClick={() => props.onClick && props.onClick("firmware")}>
        Firmware Update
      </MenuCard>
      <MenuCard disabled={!props.device} onClick={() => props.onClick && props.onClick("memory")}>
        Memory View
      </MenuCard>
    </div>
    {(process.env.NODE_ENV === "development") && <div style={{ ...listStyle, height: 75 }}>
      <MenuCard disabled={!props.device} onClick={() => props.onClick && props.onClick("tester")}>
        Instruction Tester
      </MenuCard>
      <MenuCard onClick={() => props.onClick && props.onClick("viewer")}>
        ErosLink Viewer
      </MenuCard>
    </div>}
  </div>;
}
