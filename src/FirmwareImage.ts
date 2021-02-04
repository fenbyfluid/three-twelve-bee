const KEY = [0x65, 0xED, 0x83];
const IV = [0xB9, 0xFE, 0x8F];

export class FirmwareImage {
  private file: Uint8Array;

  constructor(file: ArrayBuffer) {
    if (file.byteLength > 16384) {
      throw new Error("File too long to be a firmware image, expected no more than 16K bytes.");
    }

    if (file.byteLength < 15872) {
      throw new Error("File too short to be a firmware image.");
    }

    if (file.byteLength !== 15872 && file.byteLength !== 16384) {
      throw new Error("File has an unexpected size for a firmware image.");
    }

    this.file = new Uint8Array(file);
  }

  clone(): FirmwareImage {
    return new FirmwareImage(this.file.slice());
  }

  prepareForDevice(): Uint8Array {
    this.stripBootloader();
    this.fixChecksum();
    this.encrypt();

    return this.file;
  }

  hasBootloader(): boolean {
    return this.file.length === 16384;
  }

  getSplashMessage(): string | null {
    const view = this.getSplashMessageView();

    // Check for only ASCII printable characters.
    for (let i = 0; i < view.length; ++i) {
      let c = view[i];
      if (c < 0x20 || c > 0x7E) {
        return null;
      }
    }

    return Array.from(view)
      .map(c => String.fromCharCode(c))
      .join("")
      .trimEnd();
  }

  setSplashMessage(message: string) {
    // Sanity check, make sure the firmware is sane.
    if (this.getSplashMessage() === null) {
      throw new Error("Can't set splash message.");
    }

    if (message.length > 16) {
      throw new Error("Splash message too long.");
    }

    if (message.match(/^[ -~]*$/) === null) {
      throw new Error("Splash message contains invalid characters.");
    }

    const view = this.getSplashMessageView();
    for (let i = 0; i < view.length; ++i) {
      view[i] = (i < message.length) ? message.charCodeAt(i) : 0x20;
    }

    this.fixChecksum();
  }

  isChecksumValid(): boolean {
    this.decrypt();

    let fileChecksum = this.getChecksumView();
    let correctChecksum = this.calculateChecksum();

    for (let i = 0; i < 3; ++i) {
      if (fileChecksum[i] !== correctChecksum[i]) {
        return false;
      }
    }

    return true;
  }

  private stripBootloader(): void {
    if (!this.hasBootloader()) {
      return;
    }

    this.file = this.file.subarray(0, 15872);
  }

  private getSplashMessageView(): Uint8Array {
    return this.file.subarray(0x1CE8, 0x1CE8 + 16);
  }

  private fixChecksum(): void {
    const checksum = this.calculateChecksum();
    const checksumView = this.getChecksumView();
    for (let i = 0; i < 3; ++i) {
      checksumView[i] = checksum[i];
    }
  }

  private getChecksumView(): Uint8Array {
    return this.file.subarray(15872 - 16, (15872 - 16) + 3);
  }

  private calculateChecksum(): Uint8Array {
    let xor = 0;
    let add = 0;
    for (let i = 0; i < (15872 - 16); ++i) {
      xor ^= this.file[i];
      add += this.file[i];
    }

    return new Uint8Array([xor, add & 0xFF, (add >> 8) & 0xFF]);
  }

  private isEncrypted(): boolean {
    // Look for a run of at least 16 ASCII-printable characters.
    let length = 0;
    for (let i = 0; i < this.file.length; ++i) {
      let c = this.file[i];
      if (c < 0x20 || c > 0x7E) {
        length = 0;
        continue;
      }

      length++;
      if (length >= 16) {
        return false;
      }
    }

    return true;
  }

  private encrypt(): void {
    if (this.isEncrypted()) {
      return;
    }

    const transforms: ((n: number) => number)[] = [
      n => ((n - 0x41) ^ 0x62) & 0xFF,
      n => (n >> 4) | ((n & 0x0F) << 4),
      n => n,
    ];

    const iv = IV.slice();
    for (let i = 0; i < this.file.length; ++i) {
      const n = this.file[i];

      const j = i % 3;
      this.file[i] = iv[j] = transforms[j](n ^ iv[j] ^ KEY[j]);
    }
  }

  private decrypt(): void {
    if (!this.isEncrypted()) {
      return;
    }

    const transforms: ((n: number) => number)[] = [
      n => ((n ^ 0x62) + 0x41) & 0xFF,
      n => (n >> 4) | ((n & 0x0F) << 4),
      n => n,
    ];

    const iv = IV.slice();
    for (let i = 0; i < this.file.length; ++i) {
      const n = this.file[i];

      const j = i % 3;
      this.file[i] = transforms[j](n) ^ iv[j] ^ KEY[j];
      iv[j] = n;
    }
  }

  static async FromBlob(file: Blob): Promise<FirmwareImage> {
    return new FirmwareImage(await file.arrayBuffer());
  }
}