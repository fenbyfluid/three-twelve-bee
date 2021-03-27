import { JavaSerializable, ObjectInputStream } from "./JavaObjectStream";

// com.erostek.eroslink.SerializeReadHelper
// ObjectInputStream wrapper that computes a CRC32 of all data read.
class SerializeReadHelper {
  private readonly stream: ObjectInputStream;

  constructor(stream: ObjectInputStream) {
    this.stream = stream;
  }

  readStringObject(): string | null {
    const obj = this.stream.readObject();
    if (obj === null) {
      return null;
    }

    if (typeof obj !== "string") {
      throw new Error("expected string");
    }

    return obj;
  }

  readObject() {
    return this.stream.readObject();
  }

  readBoolean(): boolean {
    return this.stream.readBoolean();
  }

  readByte(): number {
    return this.stream.readByte();
  }

  readDouble(): number {
    return this.stream.readDouble();
  }

  readFloat(): number {
    return this.stream.readFloat();
  }

  readInt(): number {
    return this.stream.readInt();
  }

  readLong() {
    return this.stream.readLong();
  }

  readShort() {
    return this.stream.readShort();
  }

  isReadAndCheckCrcOk(): boolean {
    const crc32 = this.stream.readLong();

    return true; // TODO
  }
}

// com.erostek.eroslink.Context._$95299
// Not sure on the real name for this.
// Code is replicated in a bunch of readObject impls, so keeping as shared helper.
function readListModel(reader: SerializeReadHelper): any[] {
  const values = [];
  const length = reader.readInt();
  for (let i = 0; i < length; ++i) {
    values.push(reader.readObject());
  }

  return values;
}

class Routine implements JavaSerializable {
  name: string | null = null;
  description: string | null = null;
  ingredients: any[] = [];

  readObject(stream: ObjectInputStream) {
    const reader = new SerializeReadHelper(stream);

    const version = reader.readStringObject();
    if (version !== "V1-20011017") {
      throw new Error("bad Routine version");
    }

    this.name = reader.readStringObject();
    this.description = reader.readStringObject();
    this.ingredients = readListModel(reader);

    if (!reader.isReadAndCheckCrcOk()) {
      throw new Error("Routine data is corrupted")
    }
  }
}

ObjectInputStream.RegisterObjectClass(Routine, "com.erostek.eroslink.Routine", "3448188839253229806");

class AbstractIngredient implements JavaSerializable {
  instanceName: string | null = null;
  alsoDoIngredientName: string | null = null;
  useDefaultBackgroundColor: boolean = true;
  backgroundColor: number = 0;

  readObject(stream: ObjectInputStream) {
    const reader = new SerializeReadHelper(stream);

    const version = reader.readStringObject();
    if (version !== "V1-20011109" && version !== "V2-20030330") {
      throw new Error("bad AbstractIngredient version");
    }

    this.instanceName = reader.readStringObject();
    this.alsoDoIngredientName = reader.readStringObject();

    if (version === "V1-20011109") {
      this.useDefaultBackgroundColor = true;
      this.backgroundColor = 0;
    } else {
      this.useDefaultBackgroundColor = reader.readBoolean();
      this.backgroundColor = reader.readInt();
    }

    if (!reader.isReadAndCheckCrcOk()) {
      throw new Error("AbstractIngredient data is corrupted")
    }
  }
}

ObjectInputStream.RegisterObjectClass(AbstractIngredient, "com.erostek.eroslink.AbstractIngredient", "9884959880645212484");

class Channel implements JavaSerializable {
  value: number = 0;

  readObject(stream: ObjectInputStream) {
    const reader = new SerializeReadHelper(stream);

    const version = reader.readStringObject();
    if (version !== "V1-20020725") {
      throw new Error("bad Channel version");
    }

    this.value = reader.readShort();

    if (!reader.isReadAndCheckCrcOk()) {
      throw new Error("Channel data is corrupted")
    }
  }

  // Mirror-ish the Java version, which returns a singleton object for each value.
  readResolve(): "A" | "B" | "BOTH" {
    switch (this.value) {
      case 1:
        return "A";
      case 2:
        return "B";
      case 3:
        return "BOTH";
      default:
        throw new Error("invalid channel");
    }
  }
}

ObjectInputStream.RegisterObjectClass(Channel, "com.erostek.eroslink.ChannelIngredient$Channel", "10332034024603954032");

class ChannelIngredient extends AbstractIngredient implements JavaSerializable {
  channel: "A" | "B" | "BOTH" | null = null;

  readObject(stream: ObjectInputStream) {
    const reader = new SerializeReadHelper(stream);

    const version = reader.readStringObject();
    if (version !== "V1-20020718") {
      throw new Error("bad ChannelIngredient version");
    }

    this.channel = reader.readObject();

    if (!reader.isReadAndCheckCrcOk()) {
      throw new Error("ChannelIngredient data is corrupted")
    }
  }
}

ObjectInputStream.RegisterObjectClass(ChannelIngredient, "com.erostek.eroslink.ChannelIngredient", "79906390503894974");

class ValueFrom implements JavaSerializable {
  value: number = 0;

  readObject(stream: ObjectInputStream) {
    const reader = new SerializeReadHelper(stream);

    const version = reader.readStringObject();
    if (version !== "V1-20030423") {
      throw new Error("bad ValueFrom version");
    }

    this.value = reader.readShort();

    if (!reader.isReadAndCheckCrcOk()) {
      throw new Error("ValueFrom data is corrupted")
    }
  }

  // Mirror-ish the Java version, which returns a singleton object for each value.
  readResolve(): "NATIVE" | "ADVANCED_PARAM" | "MULTI_ADJUST" | "OTHER_CHANNEL" {
    switch (this.value) {
      case 1:
        return "NATIVE";
      case 2:
        return "ADVANCED_PARAM";
      case 3:
        return "MULTI_ADJUST";
      case 4:
        return "OTHER_CHANNEL";
      default:
        throw new Error("invalid ValueFrom");
    }
  }
}

ObjectInputStream.RegisterObjectClass(ValueFrom, "com.erostek.eroslink.ValueFrom", "12855825877105598366");

class SetValueIngredient extends AbstractIngredient implements JavaSerializable {
  value: number = 0.0;
  setIntensity: boolean = false;
  setFrequency: boolean = false;
  setPulseWidth: boolean = false;
  fullRange: boolean = false;
  cancelIntensityRamp: boolean = false;
  cancelFrequencyRamp: boolean = false;
  cancelPulseWidthRamp: boolean = false;
  intensityValueFrom: string = "NATIVE";
  frequencyValueFrom: string = "NATIVE";
  pulseWidthValueFrom: string = "NATIVE";
  unknownBool: boolean = true;

  readObject(stream: ObjectInputStream) {
    const reader = new SerializeReadHelper(stream);

    const version = reader.readStringObject();
    if (version !== "V1-20011107" && version !== "V2-20030226" && version !== "V3-20030328" && version !== "V4-20030423" && version !== "V4-20030425") {
      throw new Error("bad SetValueIngredient version");
    }

    this.value = reader.readDouble();
    this.setIntensity = reader.readBoolean();
    this.setFrequency = reader.readBoolean();
    this.setPulseWidth = reader.readBoolean();

    if (version === "V1-20011107") {
      this.fullRange = true;
      this.cancelIntensityRamp = true;
      this.cancelFrequencyRamp = true;
      this.cancelPulseWidthRamp = true;
      this.intensityValueFrom = "NATIVE";
      this.frequencyValueFrom = "NATIVE";
      this.pulseWidthValueFrom = "NATIVE";
      this.unknownBool = true;
    } else if (version === "V2-20030226") {
      this.fullRange = reader.readBoolean();
      this.cancelIntensityRamp = true;
      this.cancelFrequencyRamp = true;
      this.cancelPulseWidthRamp = true;
      this.intensityValueFrom = "NATIVE";
      this.frequencyValueFrom = "NATIVE";
      this.pulseWidthValueFrom = "NATIVE";
      this.unknownBool = true;
    } else if (version === "V3-20030328") {
      this.fullRange = reader.readBoolean();
      const cancelRamp = reader.readBoolean();
      this.cancelIntensityRamp = cancelRamp;
      this.cancelFrequencyRamp = cancelRamp;
      this.cancelPulseWidthRamp = cancelRamp;
      this.intensityValueFrom = "NATIVE";
      this.frequencyValueFrom = "NATIVE";
      this.pulseWidthValueFrom = "NATIVE";
      this.unknownBool = true;
    } else if (version === "V4-20030423") {
      this.fullRange = reader.readBoolean();
      const cancelRamp = reader.readBoolean();
      this.cancelIntensityRamp = cancelRamp;
      this.cancelFrequencyRamp = cancelRamp;
      this.cancelPulseWidthRamp = cancelRamp;
      this.intensityValueFrom = reader.readObject();
      this.frequencyValueFrom = reader.readObject();
      this.pulseWidthValueFrom = reader.readObject();
      this.unknownBool = reader.readBoolean();
    } else {
      this.fullRange = reader.readBoolean();
      this.cancelIntensityRamp = reader.readBoolean();
      this.cancelFrequencyRamp = reader.readBoolean();
      this.cancelPulseWidthRamp = reader.readBoolean();
      this.intensityValueFrom = reader.readObject();
      this.frequencyValueFrom = reader.readObject();
      this.pulseWidthValueFrom = reader.readObject();
      this.unknownBool = reader.readBoolean();
    }

    if (!reader.isReadAndCheckCrcOk()) {
      throw new Error("SetValueIngredient data is corrupted")
    }
  }
}

ObjectInputStream.RegisterObjectClass(SetValueIngredient, "com.erostek.eroslink.SetValueIngredient", "14652491185422251312");

class MultiAIngredient extends AbstractIngredient implements JavaSerializable {
  startPercent: number = 0.0;
  endPercent: number = 0.0;
  setIntensity: boolean = false;
  setFrequency: boolean = false;
  setPulseWidth: boolean = false;
  fullRange: boolean = false;

  readObject(stream: ObjectInputStream) {
    const reader = new SerializeReadHelper(stream);

    const version = reader.readStringObject();
    if (version !== "V1-20011231" && version !== "V2-20030226") {
      throw new Error("bad MultiAIngredient version");
    }

    this.startPercent = reader.readDouble();
    this.endPercent = reader.readDouble();
    this.setIntensity = reader.readBoolean();
    this.setFrequency = reader.readBoolean();
    this.setPulseWidth = reader.readBoolean();

    if (version === "V1-20011231") {
      this.fullRange = true;
    } else {
      this.fullRange = reader.readBoolean();
    }

    if (!reader.isReadAndCheckCrcOk()) {
      throw new Error("MultiAIngredient data is corrupted")
    }
  }
}

ObjectInputStream.RegisterObjectClass(MultiAIngredient, "com.erostek.eroslink.MultiAIngredient", "2219200672153964470");

class MultiAGateIngredient extends AbstractIngredient implements JavaSerializable {
  minTimeSeconds: number = 0.0;
  maxTimeSeconds: number = 0.0;
  setOnTime: boolean = false;
  setOffTime: boolean = false;

  readObject(stream: ObjectInputStream) {
    const reader = new SerializeReadHelper(stream);

    const version = reader.readStringObject();
    if (version !== "V1-20020723") {
      throw new Error("bad MultiAGateIngredient version");
    }

    this.minTimeSeconds = reader.readDouble();
    this.maxTimeSeconds = reader.readDouble();
    this.setOnTime = reader.readBoolean();
    this.setOffTime = reader.readBoolean();

    if (!reader.isReadAndCheckCrcOk()) {
      throw new Error("MultiAGateIngredient data is corrupted")
    }
  }
}

ObjectInputStream.RegisterObjectClass(MultiAGateIngredient, "com.erostek.eroslink.MultiAGateIngredient", "14746168127036709790");

class RawIngredient extends AbstractIngredient implements JavaSerializable {
  rawBytesString: string | null = null;

  readObject(stream: ObjectInputStream) {
    const reader = new SerializeReadHelper(stream);

    const version = reader.readStringObject();
    if (version !== "V1-20020713") {
      throw new Error("bad RawIngredient version");
    }

    this.rawBytesString = reader.readStringObject();

    if (this.rawBytesString) {
      const characters = this.rawBytesString.split('');

      // TODO: This doesn't seem to be correct yet either.
      for (let i = 0; i < characters.length; ++i) {
        let c = characters[i].charCodeAt(0);
        if ((i % 2) === 0) {
          if (i > 6) {
            c -= 24; // TODO
          } else {
            c -= 23; // TODO
          }
        } else if (i > 8) {
          c -= 32;
        } else {
          c -= 34;
        }

        characters[i] = String.fromCharCode(c);
      }

      this.rawBytesString = characters.reverse().join('');
    }

    if (!reader.isReadAndCheckCrcOk()) {
      throw new Error("RawIngredient data is corrupted")
    }
  }
}

ObjectInputStream.RegisterObjectClass(RawIngredient, "com.erostek.eroslink.RawIngredient", "8487267098554881198");

class RampIngredient extends AbstractIngredient implements JavaSerializable {
  startPercent: number = 0.0;
  endPercent: number = 0.0;
  timeSeconds: number = 0.0;
  andThen: string | null = null;
  setIntensity: boolean = false;
  setFrequency: boolean = false;
  setPulseWidth: boolean = false;
  fullRange: boolean = false;

  readObject(stream: ObjectInputStream) {
    const reader = new SerializeReadHelper(stream);

    const version = reader.readStringObject();
    if (version !== "V1-20011107" && version !== "V2-20030226") {
      throw new Error("bad RampIngredient version");
    }

    this.startPercent = reader.readDouble();
    this.endPercent = reader.readDouble();
    this.timeSeconds = reader.readDouble();
    this.andThen = reader.readStringObject();
    this.setIntensity = reader.readBoolean();
    this.setFrequency = reader.readBoolean();
    this.setPulseWidth = reader.readBoolean();

    if (version === "V1-20011107") {
      this.fullRange = true;
    } else {
      this.fullRange = reader.readBoolean();
    }

    if (!reader.isReadAndCheckCrcOk()) {
      throw new Error("RampIngredient data is corrupted")
    }
  }
}

ObjectInputStream.RegisterObjectClass(RampIngredient, "com.erostek.eroslink.RampIngredient", "12729286752313604554");

class GateIngredient extends AbstractIngredient implements JavaSerializable {
  onTimeSeconds: number = 0.0;
  offTimeSeconds: number = 0.0;

  readObject(stream: ObjectInputStream) {
    const reader = new SerializeReadHelper(stream);

    const version = reader.readStringObject();
    if (version !== "V1-20020723") {
      throw new Error("bad GateIngredient version");
    }

    this.onTimeSeconds = reader.readDouble();
    this.offTimeSeconds = reader.readDouble();

    if (!reader.isReadAndCheckCrcOk()) {
      throw new Error("GateIngredient data is corrupted")
    }
  }
}

ObjectInputStream.RegisterObjectClass(GateIngredient, "com.erostek.eroslink.GateIngredient", "2870378091326621964");

class TimeGotoIngredient extends AbstractIngredient implements JavaSerializable {
  timeSeconds: number = 0.0;
  andThen: string | null = null;

  readObject(stream: ObjectInputStream) {
    const reader = new SerializeReadHelper(stream);

    const version = reader.readStringObject();
    if (version !== "V1-20011108") {
      throw new Error("bad TimeGotoIngredient version");
    }

    this.timeSeconds = reader.readDouble();
    this.andThen = reader.readStringObject();

    if (!reader.isReadAndCheckCrcOk()) {
      throw new Error("TimeGotoIngredient data is corrupted")
    }
  }
}

ObjectInputStream.RegisterObjectClass(TimeGotoIngredient, "com.erostek.eroslink.TimeGotoIngredient", "688125513414001038");

class ExtTriggerIngredient extends AbstractIngredient implements JavaSerializable {
  andThen: string | null = null;

  readObject(stream: ObjectInputStream) {
    const reader = new SerializeReadHelper(stream);

    const version = reader.readStringObject();
    if (version !== "V1-20011211") {
      throw new Error("bad ExtTriggerIngredient version");
    }

    this.andThen = reader.readStringObject();

    if (!reader.isReadAndCheckCrcOk()) {
      throw new Error("ExtTriggerIngredient data is corrupted")
    }
  }
}

ObjectInputStream.RegisterObjectClass(ExtTriggerIngredient, "com.erostek.eroslink.ExtTriggerIngredient", "13880809489726259087");

class MultiARampIngredient extends RampIngredient implements JavaSerializable {
  multiASetIntensity: boolean = false;
  multiASetFrequency: boolean = false;
  multiASetPulseWidth: boolean = false;
  multiAAffectsMin: boolean = false;
  otherBound: number = 0.0;

  readObject(stream: ObjectInputStream) {
    const reader = new SerializeReadHelper(stream);

    const version = reader.readStringObject();
    if (version !== "V1-20030305") {
      throw new Error("bad MultiARampIngredient version");
    }

    this.multiASetIntensity = reader.readBoolean();
    this.multiASetFrequency = reader.readBoolean();
    this.multiASetPulseWidth = reader.readBoolean();
    this.multiAAffectsMin = reader.readBoolean();
    this.otherBound = reader.readDouble();

    if (!reader.isReadAndCheckCrcOk()) {
      throw new Error("MultiARampIngredient data is corrupted")
    }
  }
}

ObjectInputStream.RegisterObjectClass(MultiARampIngredient, "com.erostek.eroslink.MultiARampIngredient", "9760390132124100081");

class GateFrom implements JavaSerializable {
  value: number = 0;

  readObject(stream: ObjectInputStream) {
    const reader = new SerializeReadHelper(stream);

    const version = reader.readStringObject();
    if (version !== "V1-20020725") {
      throw new Error("bad From version");
    }

    this.value = reader.readShort();

    if (!reader.isReadAndCheckCrcOk()) {
      throw new Error("From data is corrupted")
    }
  }

  // Mirror-ish the Java version, which returns a singleton object for each value.
  readResolve(): "SET_VALUE" | "MULTI_A" | "ADV_P" {
    switch (this.value) {
      case 1:
        return "SET_VALUE";
      case 2:
        return "MULTI_A";
      case 3:
        return "ADV_P";
      default:
        throw new Error("invalid From");
    }
  }
}

ObjectInputStream.RegisterObjectClass(GateFrom, "com.erostek.eroslink.GateFromIngredient$From", "13441635889020800604");

class GateFromIngredient extends AbstractIngredient implements JavaSerializable {
  onFrom: "SET_VALUE" | "MULTI_A" | "ADV_P" = "SET_VALUE";
  offFrom: "SET_VALUE" | "MULTI_A" | "ADV_P" = "SET_VALUE";

  readObject(stream: ObjectInputStream) {
    const reader = new SerializeReadHelper(stream);

    const version = reader.readStringObject();
    if (version !== "V1-20020718") {
      throw new Error("bad GateFromIngredient version");
    }

    this.onFrom = reader.readObject();
    this.offFrom = reader.readObject();

    if (!reader.isReadAndCheckCrcOk()) {
      throw new Error("GateFromIngredient data is corrupted")
    }
  }
}

ObjectInputStream.RegisterObjectClass(GateFromIngredient, "com.erostek.eroslink.GateFromIngredient", "1617202387615904078");

class Preset implements JavaSerializable {
  name: string | null = null;
  routines: string[] = [];

  readObject(stream: ObjectInputStream) {
    const reader = new SerializeReadHelper(stream);

    const version = reader.readStringObject();
    if (version !== "V1-20011018") {
      throw new Error("bad Preset version");
    }

    this.name = reader.readStringObject();

    // TODO: Not quite right, should be calling readStringObject not readObject for each.
    this.routines = readListModel(reader);

    if (!reader.isReadAndCheckCrcOk()) {
      throw new Error("Preset data is corrupted")
    }
  }
}

ObjectInputStream.RegisterObjectClass(Preset, "com.erostek.eroslink.Preset", "9066715381541207945");

// com.erostek.eroslink.ErosLinkHelper.loadSerial
// TODO: This doesn't seem to be correct yet, but it isn't really important.
function loadSerial(reader: SerializeReadHelper): string | null {
  const str1 = reader.readStringObject();
  const str2 = reader.readStringObject();
  const str3 = reader.readStringObject();
  if (str3 === null) {
    return null;
  }

  const characters = str3.split('');
  for (let i = 0; i < characters.length; ++i) {
    let c = characters[i].charCodeAt(0);
    if ((i % 2) === 0) {
      if (i > 3) {
        c -= 24; // TODO
      } else {
        c -= 23; // TODO
      }
    } else if (i > 4) {
      c -= 32;
    } else {
      c -= 34;
    }

    characters[i] = String.fromCharCode(c);
  }

  return characters.reverse().join('');
}

// com.erostek.eroslink.Context
export class ErosLinkFile {
  serial: string | null;
  boxInfo: { internalRev: number, majorVersion: number, minorVersion: number, model: number } | null;
  date: string | null;
  triggers: any[];
  parameters: any[];
  routines: Routine[];
  presets: Preset[];

  constructor(file: Uint8Array) {
    const stream = new ObjectInputStream(file);
    const reader = new SerializeReadHelper(stream);

    const version = reader.readStringObject();
    if (version !== "Context V1-20020725" && version !== "Context V2-20030519") {
      throw new Error("bad Context version");
    }

    this.serial = loadSerial(reader);

    // An empty string.
    reader.readStringObject();

    this.boxInfo = null;
    if (version !== "Context V1-20020725") {
      const wasConnected = reader.readBoolean();
      if (wasConnected) {
        this.boxInfo = {
          internalRev: reader.readByte(),
          majorVersion: reader.readByte(),
          minorVersion: reader.readByte(),
          model: reader.readByte(),
        }
      }
    }

    this.date = reader.readStringObject();

    this.triggers = readListModel(reader);
    this.parameters = readListModel(reader);
    this.routines = readListModel(reader);
    this.presets = readListModel(reader);

    if (!reader.isReadAndCheckCrcOk()) {
      throw new Error("Context data is corrupted")
    }
  }
}
