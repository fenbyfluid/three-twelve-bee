import { Callout, Card, Classes } from "@blueprintjs/core";
import React, { useEffect, useState } from "react";
import { ConnectionBar } from "./ConnectionBar";
import { DeviceApi } from "./DeviceApi";
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
  connection: DeviceConnection | null;
  setConnection: React.Dispatch<React.SetStateAction<DeviceConnection | null>>;
  device: DeviceApi | null;
  onClick?: (id: string) => void;
  devMode: boolean,
  setDevMode: React.Dispatch<React.SetStateAction<boolean>>;
}

export function MainMenu(props: MainMenuProps) {
  const [logoClicks, setLogoClicks] = useState(0);

  const setDevMode = props.setDevMode;
  useEffect(() => {
    if (logoClicks >= 5) {
      setDevMode(enabled => !enabled);
      setLogoClicks(0);
    }
  }, [logoClicks, setDevMode]);

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
    <img
      src={logo} alt="Three Twelve Bee Logo"
      width={logoWidth} height={logoWidth / 2}
      style={logoStyle}
      onClick={() => setLogoClicks(n => n + 1)}
    />
    <div style={{ padding: "0 10px", textAlign: "initial" }}>
      <ConnectionBar connection={props.connection} setConnection={props.setConnection} />
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
      <MenuCard disabled={!props.connection} onClick={() => props.onClick && props.onClick("programs")}>
        Manage User Programs
      </MenuCard>
      <MenuCard disabled={props.connection !== null || !navigator.serial}
        onClick={() => props.onClick && props.onClick("firmware")}>
        Firmware Update
      </MenuCard>
    </div>
    {props.devMode && <div style={{ ...listStyle, height: 75 }}>
        <MenuCard disabled={!props.connection} onClick={() => props.onClick && props.onClick("tester")}>
            Instruction Tester
        </MenuCard>
        <MenuCard onClick={() => props.onClick && props.onClick("viewer")}>
            ErosLink Viewer
        </MenuCard>
        <MenuCard disabled={!props.connection} onClick={() => props.onClick && props.onClick("memory")}>
            Memory View
        </MenuCard>
    </div>}
    <div style={{ padding: "0 10px", margin: "20px 0", textAlign: "initial" }}>
      <Callout intent="warning" icon="warning-sign">
        <span style={{ fontWeight: "bold" }}>
          Three Twelve Bee is in development and is largely in an experimental state.
        </span> It is currently a playground working towards developing a functional replacement for ErosLink, but it
        is not there yet. The firmware updater works great, but the rest is primarily development tools at the moment.
      </Callout>
    </div>
  </div>;
}
