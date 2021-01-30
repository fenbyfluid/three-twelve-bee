// @types/dom-serial is currently missing this
declare global {
  interface SerialPort {
    close(): Promise<void>;
  }
}

/**
 * https://metafetish.gitbooks.io/stpihkal/content/hardware/erostek-et312b.html
 */
export class DeviceConnection extends EventTarget {
  private port: SerialPort;

  constructor(port: SerialPort) {
    super();

    this.port = port;
  }

  async open() {
    this.port.addEventListener("disconnect", () => {
      this.dispatchEvent(new Event("close"));
    });

    await this.port.open({
      baudRate: 19200,
    });

    this.dispatchEvent(new Event("open"));
  }

  async close() {
    await this.port.close();

    this.dispatchEvent(new Event("close"));
  }
}