import React from "react";
import { Button, Callout, Icon } from "@blueprintjs/core";
import { DeviceConnection } from "./DeviceConnection";

interface ConnectionBarProps {
  device: DeviceConnection | null;
  setDevice: React.Dispatch<React.SetStateAction<DeviceConnection | null>>;
}

// @types/dom-serial is currently missing these
declare global {
  interface SerialPort extends EventTarget {
    onconnect: EventHandler;
    ondisconnect: EventHandler;
  }
}

export function ConnectionBar(props: ConnectionBarProps) {
  const style: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  if (!navigator.serial) {
    return <Callout intent="danger" icon={null} style={style}>
      <span>
        <Icon icon="error" intent="danger" style={{ marginRight: 8 }} />
        Your browser does not support the Web Serial API
      </span>
      <Button intent="danger" outlined={true} onClick={() => window.open("https://web.dev/serial/", "_blank", "noopener")}>
        More Info
      </Button>
    </Callout>;
  }

  if (props.device) {
    return <Callout intent="success" icon={null} style={style}>
      <span>
        <Icon icon="tick-circle" intent="success" style={{ marginRight: 8 }} />
        Device connected!
      </span>
      <Button intent="success" outlined={true} onClick={() => props.device && props.device.close()}>
        Disconnect
      </Button>
    </Callout>;
  }

  async function connect() {
    let port = null;
    try {
      port = await navigator.serial.requestPort();
    } catch (ex) {
      console.error(ex);
      return;
    }

    const connection = new DeviceConnection(port);

    connection.addEventListener("close", () => {
      props.setDevice((prevConnection) => {
        return prevConnection === connection ? null : prevConnection;
      });
    });

    await connection.open();

    props.setDevice(connection);
  }

  return <Callout intent="primary" icon={null} style={style}>
    <span>
      <Icon icon="info-sign" intent="primary" style={{ marginRight: 8 }} />
      Connect to a ET312-based device over serial for full functionality
    </span>
    <Button intent="primary" outlined={true} onClick={connect}>Connect</Button>
  </Callout>;
}