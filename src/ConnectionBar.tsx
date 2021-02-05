import React, { useEffect, useState } from "react";
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
  const [connecting, setConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (connecting) {
      setErrorMessage(null);
    }
  }, [connecting]);

  useEffect(() => {
    if (props.device || errorMessage) {
      setConnecting(false);
    }
  }, [props.device, errorMessage]);

  const style: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 50,
  };

  if (connecting) {
    return <Callout intent="primary" icon={null} style={style}>
      <span>
        <Icon icon="feed" intent="primary" style={{ marginRight: 8 }} />
        Connecting...
      </span>
    </Callout>;
  }

  if (!navigator.serial) {
    return <Callout intent="danger" icon={null} style={style}>
      <span>
        <Icon icon="error" intent="danger" style={{ marginRight: 8 }} />
        Your browser does not support the Web Serial API.
      </span>
      <Button intent="danger" outlined={true} onClick={() => window.open("https://web.dev/serial/", "_blank", "noopener")}>
        More Info
      </Button>
    </Callout>;
  }

  if (props.device) {
    const disconnect = async function disconnect() {
      const device = props.device;

      if (device) {
        await device.close();
      }

      props.setDevice((prevConnection) => {
        return prevConnection === device ? null : prevConnection;
      });
    };

    return <Callout intent="success" icon={null} style={style}>
      <span>
        <Icon icon="tick-circle" intent="success" style={{ marginRight: 8 }} />
        Device connected!
      </span>
      <Button intent="success" outlined={true} onClick={disconnect}>
        Disconnect
      </Button>
    </Callout>;
  }

  const connect = async function connect() {
    setConnecting(true);

    let port = null;
    try {
      port = await navigator.serial.requestPort();
    } catch (ex) {
      if (ex.name === "SecurityError") {
        setErrorMessage("Serial port API access is not allowed.");
        return;
      }

      if (ex.name === "AbortError" || ex.name === "NotFoundError") {
        setErrorMessage("No serial port was selected.");
        return;
      }

      setErrorMessage(ex.message);
      return;
    }

    const connection = new DeviceConnection(port);

    connection.addEventListener("close", () => {
      props.setDevice((prevConnection) => {
        return prevConnection === connection ? null : prevConnection;
      });
    });

    try {
      await connection.open();
    } catch (ex) {
      setErrorMessage(ex.message);
      return;
    }

    props.setDevice(connection);
  };

  if (errorMessage) {
    return <Callout intent="danger" icon={null} style={style}>
      <Icon icon="error" intent="danger" style={{ marginRight: 8 }} />
      <span style={{ flex: 1 }}>{errorMessage}</span>
      <Button intent="danger" outlined={true} onClick={connect}>Try Again</Button>
    </Callout>;
  }

  return <Callout intent="primary" icon={null} style={style}>
    <Icon icon="info-sign" intent="primary" style={{ marginRight: 8 }} />
    <span style={{ flex: 1 }}>Connect to a ET312-based device over serial for full functionality.</span>
    <Button intent="primary" outlined={true} onClick={connect}>Connect</Button>
  </Callout>;
}
