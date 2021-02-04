import { DeviceConnection } from "./DeviceConnection";
import { Button, Callout, FileInput, FormGroup, InputGroup } from "@blueprintjs/core";
import React, { useState } from "react";
import { FirmwareImage } from "./FirmwareImage";

export function FirmwareUpdate() {
  const [file, setFile] = useState<{ name: string, image: FirmwareImage } | null>(null);
  const [splashMessage, setSplashMessage] = useState<string | null>(null);
  const [state, setState] = useState({
    running: false,
    error: false,
    message: "",
  });

  const onClick = async () => {
    if (!file) {
      return;
    }

    setState({
      running: true,
      error: false,
      message: "Connecting...",
    });

    let device = null;

    try {
      const port = await navigator.serial.requestPort();

      device = new DeviceConnection(port);

      await device.open(true);

      const newImage = file.image.clone();

      if (splashMessage !== null) {
        newImage.setSplashMessage(splashMessage);
      }

      const data = newImage.prepareForDevice();

      await device.sendFile(data, (progress: number) => {
        setState({
          running: true,
          error: false,
          message: `Writing... ${(progress * 100).toFixed(0)}%`,
        });
      });

      setState({
        running: false,
        error: false,
        message: "Firmware written.",
      });
    } catch (ex) {
      setState({
        running: false,
        error: true,
        message: ex.message,
      });
    } finally {
      if (device) {
        await device.close();
      }
    }
  };

  const selectFile = (ev: React.FormEvent<HTMLInputElement>) => {
    const file = ev.currentTarget.files && ev.currentTarget.files.item(0);
    if (!file) {
      setFile(null);
      setSplashMessage(null);
      setState({
        running: false,
        error: false,
        message: "",
      });

      return;
    }

    FirmwareImage.FromBlob(file).then(image => {
      if (!image.isChecksumValid()) {
        throw new Error("Firmware checksum is not valid.");
      }

      setFile({
        name: file.name,
        image,
      });

      setSplashMessage(image.getSplashMessage());

      setState({
        running: false,
        error: false,
        message: "",
      });
    }).catch(ex => {
      setFile(null);
      setSplashMessage(null);
      setState({
        running: false,
        error: true,
        message: ex.message,
      });
    });
  };

  return <div style={{ maxWidth: 320, margin: "40px auto" }}>
    {state.message && <FormGroup>
      <Callout intent={state.error ? "danger" : state.running ? "primary" : "success"}>
        {state.message}
      </Callout>
    </FormGroup>}

    <FormGroup label="Select Firmware Image" disabled={state.running}>
      <FileInput disabled={state.running} fill={true} hasSelection={file !== null} text={file !== null ? file.name : undefined} onInputChange={selectFile} />
    </FormGroup>

    <FormGroup label="Custom Splash Message" disabled={state.running}>
      <InputGroup disabled={state.running || splashMessage === null} fill={true} maxLength={16} value={splashMessage || ""} onChange={ev => setSplashMessage(ev.target.value)} />
    </FormGroup>

    {file !== null && !state.running && <FormGroup>
      <Callout intent="primary">
        Enter firmware update mode first by turning the device on while holding both
        the <kbd>Menu</kbd> and <kbd>Up</kbd> buttons.
      </Callout>
    </FormGroup>}

    <Button disabled={state.running || file === null} fill={true} intent="primary" onClick={onClick}>
      Write Firmware
    </Button>
  </div>;
}