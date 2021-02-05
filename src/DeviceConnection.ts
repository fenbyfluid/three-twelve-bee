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

  async open(options?: { raw?: boolean }): Promise<void> {
    await this.port.open({
      baudRate: 19200,
    });

    if (options && options.raw) {
      return;
    }

    // TODO: It might be an idea to detect firmware update mode here.

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

  async sendFile(data: Uint8Array, progressCallback?: (n: number) => void): Promise<void> {
    if ((data.byteLength % 128) !== 0) {
      throw new Error("File padding is not implemented.");
    }

    await this.flush();

    let ready = false;
    for (let i = 0; i < 10; ++i) {
      const marker = await this.read(1, false, 5000);

      if (marker === null) {
        throw new Error("Timeout waiting for file transfer mode.");
      }

      if (marker[0] === 0x43) {
        ready = true;
        break;
      }
    }

    if (!ready) {
      throw new Error("Unexpected response while waiting for file transfer mode.");
    }

    // We're now ready to encode and send the first file chunk.

    if (progressCallback) {
      progressCallback(0);
    }

    let retries = 0;
    const chunks = data.byteLength / 128;
    for (let i = 0; i < chunks;) {
      const idx = (i + 1) & 0xFF;
      const header = new Uint8Array([0x01, idx, 255 - idx]);
      await this.writeRaw(header);

      const window = data.subarray(128 * i, 128 * (i + 1));
      await this.writeRaw(window);

      const crc = DeviceConnection.CalculateXmodemCrc(window);
      await this.writeRaw(crc);

      const response = await this.read(1, false, 5000);

      if (response === null) {
        throw new Error("Device did not acknowledge file chunk.");
      }

      if (response[0] === 0x06) {
        retries = 0;
        i += 1;

        if (progressCallback) {
          progressCallback(i / chunks);
        }

        continue;
      }

      if (response[0] === 0x15) {
        retries += 1;
        if (retries >= 10) {
          throw new Error("Device rejected file chunk too many times.");
        }

        continue;
      }

      throw new Error("Unexpected response from device.");
    }

    let acknowledged = false;

    for (let retries = 0; retries < 10; ++retries) {
      await this.writeRaw(new Uint8Array([0x04]));

      const response = await this.read(1, false, 5000);

      if (response && response[0] === 0x06) {
        acknowledged = true;
        break;
      }
    }

    if (!acknowledged) {
      throw new Error("Device did not acknowledge transfer completion.");
    }

    if (progressCallback) {
      progressCallback(1);
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

    await this.writeRaw(buffer);
  }

  private async writeRaw(buffer: Uint8Array): Promise<void> {
    if (!this.writer) {
      this.writer = this.port.writable.getWriter();
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

    throw new Error("Synchronisation failed, check device connection and power.");
  }

  private static CalculateXmodemCrc(buffer: Uint8Array): Uint8Array {
    let crc = 0x0000;
    for (let i = 0; i < buffer.length; i++) {
      let c = buffer[i];
      const j = (c ^ (crc >> 8)) & 0xFF;
      crc = CRC_TABLE[j] ^ (crc << 8);
    }

    return new Uint8Array([(crc >> 8) & 0xFF, crc & 0xFF]);
  }
}

const CRC_TABLE = [
  0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5,
  0x60c6, 0x70e7, 0x8108, 0x9129, 0xa14a, 0xb16b,
  0xc18c, 0xd1ad, 0xe1ce, 0xf1ef, 0x1231, 0x0210,
  0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6,
  0x9339, 0x8318, 0xb37b, 0xa35a, 0xd3bd, 0xc39c,
  0xf3ff, 0xe3de, 0x2462, 0x3443, 0x0420, 0x1401,
  0x64e6, 0x74c7, 0x44a4, 0x5485, 0xa56a, 0xb54b,
  0x8528, 0x9509, 0xe5ee, 0xf5cf, 0xc5ac, 0xd58d,
  0x3653, 0x2672, 0x1611, 0x0630, 0x76d7, 0x66f6,
  0x5695, 0x46b4, 0xb75b, 0xa77a, 0x9719, 0x8738,
  0xf7df, 0xe7fe, 0xd79d, 0xc7bc, 0x48c4, 0x58e5,
  0x6886, 0x78a7, 0x0840, 0x1861, 0x2802, 0x3823,
  0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969,
  0xa90a, 0xb92b, 0x5af5, 0x4ad4, 0x7ab7, 0x6a96,
  0x1a71, 0x0a50, 0x3a33, 0x2a12, 0xdbfd, 0xcbdc,
  0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a,
  0x6ca6, 0x7c87, 0x4ce4, 0x5cc5, 0x2c22, 0x3c03,
  0x0c60, 0x1c41, 0xedae, 0xfd8f, 0xcdec, 0xddcd,
  0xad2a, 0xbd0b, 0x8d68, 0x9d49, 0x7e97, 0x6eb6,
  0x5ed5, 0x4ef4, 0x3e13, 0x2e32, 0x1e51, 0x0e70,
  0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a,
  0x9f59, 0x8f78, 0x9188, 0x81a9, 0xb1ca, 0xa1eb,
  0xd10c, 0xc12d, 0xf14e, 0xe16f, 0x1080, 0x00a1,
  0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067,
  0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c,
  0xe37f, 0xf35e, 0x02b1, 0x1290, 0x22f3, 0x32d2,
  0x4235, 0x5214, 0x6277, 0x7256, 0xb5ea, 0xa5cb,
  0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d,
  0x34e2, 0x24c3, 0x14a0, 0x0481, 0x7466, 0x6447,
  0x5424, 0x4405, 0xa7db, 0xb7fa, 0x8799, 0x97b8,
  0xe75f, 0xf77e, 0xc71d, 0xd73c, 0x26d3, 0x36f2,
  0x0691, 0x16b0, 0x6657, 0x7676, 0x4615, 0x5634,
  0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9,
  0xb98a, 0xa9ab, 0x5844, 0x4865, 0x7806, 0x6827,
  0x18c0, 0x08e1, 0x3882, 0x28a3, 0xcb7d, 0xdb5c,
  0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a,
  0x4a75, 0x5a54, 0x6a37, 0x7a16, 0x0af1, 0x1ad0,
  0x2ab3, 0x3a92, 0xfd2e, 0xed0f, 0xdd6c, 0xcd4d,
  0xbdaa, 0xad8b, 0x9de8, 0x8dc9, 0x7c26, 0x6c07,
  0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0x0cc1,
  0xef1f, 0xff3e, 0xcf5d, 0xdf7c, 0xaf9b, 0xbfba,
  0x8fd9, 0x9ff8, 0x6e17, 0x7e36, 0x4e55, 0x5e74,
  0x2e93, 0x3eb2, 0x0ed1, 0x1ef0,
];
