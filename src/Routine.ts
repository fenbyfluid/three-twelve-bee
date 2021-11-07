export interface XYPosition {
  readonly x: number;
  readonly y: number;
}

export interface Routine {
  readonly name: string;
  readonly startPosition?: XYPosition;
  readonly modules: Module[];
}

export interface Module {
  readonly id: string;
  readonly position?: XYPosition;
  readonly name: string;
  readonly ingredients: Ingredient[];
}

export type Ingredient = AffectChannelsIngredient | SetValueIngredient | DelayExecIngredient | RawSetValueIngredient | RawCondExecIngredient;

export interface AffectChannelsIngredient {
  readonly id: string;
  readonly type: "affect-channels";
  readonly channels: "both" | "a" | "b";
}

export interface SetValueIngredient {
  readonly id: string;
  readonly type: "set-value";
  readonly parameter: "intensity" | "frequency" | "width";
  readonly value: number;
}

export interface DelayExecIngredient {
  readonly id: string;
  readonly type: "delay-exec";
  readonly delay: number;
  readonly target: string | null;
}

export interface RawSetValueIngredient {
  readonly id: string;
  readonly type: "raw-set-value";
  readonly address: number;
  readonly value: number;
}

export interface RawCondExecIngredient {
  readonly id: string;
  readonly type: "raw-cond-exec";
  readonly address: number;
  readonly target: string | null;
}
