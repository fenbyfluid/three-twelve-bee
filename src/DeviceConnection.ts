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
  private readonly port: SerialPort;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private readQueue: Promise<any> = Promise.resolve();
  private pendingRead: Promise<ReadableStreamReadResult<Uint8Array>> | null = null;
  private readBuffer: Uint8Array | null = null;
  private deviceKey: number | null = null;

  constructor(port: SerialPort) {
    super();

    this.port = port;

    this.port.addEventListener("disconnect", () => {
      this.dispatchEvent(new Event("close"));
    });

    // TODO: For debugging.
    if (process.env.NODE_ENV === "development") {
      // @ts-ignore
      window.connection = this;
    }
  }

  async open(): Promise<void> {
    await this.port.open({
      baudRate: 19200,
    });

    try {
      await this.flush();
      await this.sync();

      this.deviceKey = await this.setupKeys();
    } catch (ex) {
      await this.close();

      throw ex;
    }
  }

  async close(): Promise<void> {
    // Reset the device's encryption key if set.
    if (this.deviceKey !== null) {
      await this.poke(0x4213, 0x00);
    }

    if (this.writer) {
      await this.writer.close();
      this.writer = null;
    }

    if (this.reader) {
      await this.reader.cancel();
      this.reader = null;
    }

    await this.port.close();
  }

  async peek(address: number): Promise<number> {
    await this.write([0x3C, (address >> 8) & 0xFF, address & 0xFF], true);

    const response = await this.read(3, true);
    if (response[0] !== 0x22) {
      throw new Error("Wrong response received from read message.");
    }

    return response[1];
  }

  async poke(address: number, data: number | number[]): Promise<void> {
    if (!Array.isArray(data)) {
      data = [data];
    }

    await this.write([0x3D + (data.length << 4), (address >> 8) & 0xFF, address & 0xFF, ...data], true);

    const response = await this.read(1, false);

    if (response[0] === 0x07) {
      throw new Error("Write rejected, check key setup.");
    }

    if (response[0] !== 0x06) {
      throw new Error("Wrong response received from write message.");
    }
  }

  private async setupKeys(): Promise<number> {
    await this.write([0x2F, 0x00], true);

    const response = await this.read(3, true, 1000);

    if (response === null) {
      // Set the key to explicitly 0x00 and try again.
      // The MK312 patched firmware has a fixed XOR key, and this lets us reconnect without rebooting.
      if (this.deviceKey === null) {
        this.deviceKey = 0x00;

        await this.flush();
        await this.sync();

        return this.setupKeys();
      }

      throw new Error("Timeout during key setup, reboot device.");
    }

    if (response[0] !== 0x21) {
      throw new Error("Wrong response received from key setup message.");
    }

    return response[1];
  }

  private read(length: number, checksum: boolean): Promise<Uint8Array>;
  private read(length: number, checksum: boolean, timeout: number): Promise<Uint8Array | null>;
  private read(length: number, checksum: boolean = false, timeout: number = -1): Promise<Uint8Array | null> {
    return this.readQueue = this.readQueue
      .then(() => this.readInternal(length, checksum, timeout));
  }

  private async readInternal(length: number, checksum: boolean, timeout: number): Promise<Uint8Array | null> {
    if (timeout < 0) {
      await this.buffer(length);
    } else {
      await Promise.race([
        this.buffer(length),
        new Promise<void>(resolve => setTimeout(() => resolve(), timeout)),
      ]);
    }

    if (!this.readBuffer || this.readBuffer.byteLength < length) {
      if (timeout < 0) {
        throw new Error("Failed to buffer response data.");
      }

      return null;
    }

    let bytes = this.readBuffer;

    if (length === this.readBuffer.byteLength) {
      this.readBuffer = null;
    } else {
      bytes = this.readBuffer.subarray(0, length);

      this.readBuffer = this.readBuffer.subarray(length);
    }

    if (process.env.NODE_ENV === "development") {
      console.log("read", Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join(" "));
    }

    if (checksum) {
      let sum = 0;
      for (let i = 0; i < (bytes.length - 1); ++i) {
        sum = (sum + bytes[i]) & 0xFF;
      }

      if (bytes[bytes.length - 1] !== sum) {
        throw new Error("Response checksum was incorrect.");
      }
    }

    return bytes;
  }

  private async buffer(length: number): Promise<void> {
    if (!this.reader) {
      this.reader = this.port.readable.getReader();
    }

    while (!this.readBuffer || length > this.readBuffer.byteLength) {
      let pendingRead: Promise<ReadableStreamReadResult<Uint8Array>> | null = null;

      if (!this.pendingRead) {
        // Read more bytes from the serial port.
        this.pendingRead = pendingRead = this.reader.read()
          .then(result => {
            this.pendingRead = null;
            return result;
          });
      } else {
        // Queue up after the pending read, but throw away the data.
        pendingRead = this.pendingRead
          .then(({ value, done }) => {
            if (done) {
              return { value, done };
            }

            return {
              value: new Uint8Array(),
              done: false,
            };
          });
      }

      const { value, done } = await pendingRead;

      if (done || !value) {
        throw new Error("Device disconnected.");
      }

      if (value.byteLength === 0) {
        continue;
      }

      if (!this.readBuffer) {
        this.readBuffer = value;
        continue;
      }

      const buffer = new Uint8Array(this.readBuffer.byteLength + value.byteLength);
      buffer.set(this.readBuffer);
      buffer.set(value, this.readBuffer.byteLength);

      this.readBuffer = buffer;
    }
  }

  private async flush(window: number = 1000): Promise<void> {
    this.readBuffer = null;

    while (true) {
      const bytes = await this.read(1, false, window);
      if (bytes === null) {
        break;
      }
    }
  }

  private async write(data: number[], checksum: boolean): Promise<void> {
    if (!this.writer) {
      this.writer = this.port.writable.getWriter();
    }
    const buffer = new Uint8Array(data.length + (checksum ? 1 : 0));
    buffer.set(data);

    if (checksum) {
      let sum = 0;
      for (const byte of data) {
        sum = (sum + byte) & 0xFF;
      }

      buffer[data.length] = sum;
    }

    // If encryption has been negotiated, encrypt the message.
    if (this.deviceKey !== null) {
      for (let i = 0; i < buffer.length; ++i) {
        buffer[i] ^= this.deviceKey ^ 0x55;
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.log("write", Array.from(buffer).map(b => b.toString(16).padStart(2, "0")).join(" "));
    }

    await this.writer.write(buffer);
  }

  private async sync(): Promise<void> {
    for (let i = 0; i < 11; ++i) {
      await this.write([0x00], false);

      const response = await this.read(1, false, 100);
      if (!response) {
        continue;
      }

      if (response[0] !== 0x07) {
        throw new Error("Wrong response received during synchronisation.");
      }

      return;
    }

    throw new Error("Synchronisation failed, check device connection.");
  }
}