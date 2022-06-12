import { Dexie, Table } from "dexie";
import { Routine as RoutineData } from "./Routine";

export interface Routine {
  id?: number;
  routine: RoutineData;
}

export class Database extends Dexie {
  routines!: Table<Routine, number>;

  constructor() {
    super("three-twelve-bee");

    this.version(1).stores({
      routines: "++id",
    });
  }
}

export const db = new Database();
