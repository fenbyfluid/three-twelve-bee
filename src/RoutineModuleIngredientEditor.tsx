import { AffectChannelsIngredient, DelayExecIngredient, Ingredient, SetValueIngredient } from "./Routine";
import React, { useCallback } from "react";
import { ItemRenderer, Select } from "@blueprintjs/select";
import { MenuItem, Popover, Slider } from "@blueprintjs/core";

interface RoutineModuleIngredientEditorProps<T = Ingredient> {
  ingredient: T;
  onChange: (newIngredient: T) => void;
}

export function RoutineModuleIngredientEditor({
  ingredient,
  onChange,
}: RoutineModuleIngredientEditorProps) {
  switch (ingredient.type) {
    case "affect-channels":
      return <AffectChannelsIngredientEditor ingredient={ingredient} onChange={onChange} />;
    case "set-value":
      return <SetValueIngredientEditor ingredient={ingredient} onChange={onChange} />;
    case "delay-exec":
      return <DelayExecIngredientEditor ingredient={ingredient} onChange={onChange} />;
    default:
      return <>{ingredient.type}</>;
  }
}

function EnumParameterEditor<TIngredient>({
  ingredient,
  onChange,
  property,
  values,
}: RoutineModuleIngredientEditorProps<TIngredient> & { property: keyof TIngredient, values: { [key in string]: string } }) {
  const onItemSelect = (key: string) => {
    onChange({
      ...ingredient,
      [property]: key,
    });
  };

  const itemRenderer: ItemRenderer<string> = useCallback((key, { handleClick, modifiers }) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }

    return <MenuItem key={key} text={values[key]} active={modifiers.active} disabled={modifiers.disabled} onClick={handleClick} />;
  }, [values]);

  // TODO: Find a way to specify the `property` and `values` types explicitly so that:
  //       a) `TIngredient[property]` must be a union of string constants
  //       b) `values` keys must be exhaustive over `TIngredient[property]`
  //       c) We can use `Select<TIngredient[property]>` instead of `Select<string>`
  return <Select filterable={false} onItemSelect={onItemSelect} itemRenderer={itemRenderer} items={Object.keys(values)} popoverProps={{
    hasBackdrop: true,
  }}>
    <span className="text-dropdown">{values[ingredient[property] as unknown as string]}</span>
  </Select>;
}

function NumericParameterEditor<TIngredient>({
  ingredient,
  onChange,
  property,
  min,
  max,
  suffix,
}: RoutineModuleIngredientEditorProps<TIngredient> & { property: keyof TIngredient, min: number, max: number, suffix?: string }) {
  const onSliderChanged = (value: number) => {
    onChange({
      ...ingredient,
      [property]: value,
    });
  };

  return <Popover
    popoverClassName="editor-slider-popover"
    placement="bottom-start"
    hasBackdrop={true}
    content={
      <Slider labelRenderer={false} max={max} min={min} value={ingredient[property] as unknown as number} onChange={onSliderChanged} />
    }
  >
    <span className="text-dropdown">{ingredient[property]}{ suffix && ` ${suffix}` }</span>
  </Popover>;
}

function AffectChannelsIngredientEditor({
  ingredient,
  onChange,
}: RoutineModuleIngredientEditorProps<AffectChannelsIngredient>) {
  const channelsValues = {
    both: "Both Channels",
    a: "Channel A",
    b: "Channel B",
  };

  return <>
    Affect <EnumParameterEditor ingredient={ingredient} onChange={onChange} property="channels" values={channelsValues} />
  </>;
}

function SetValueIngredientEditor({
  ingredient,
  onChange,
}: RoutineModuleIngredientEditorProps<SetValueIngredient>) {
  const parameterValues = {
    intensity: "Intensity",
    frequency: "Frequency",
    width: "Pulse Width",
  };

  return <>
    Set <EnumParameterEditor ingredient={ingredient} onChange={onChange} property="parameter" values={parameterValues} /> to <NumericParameterEditor ingredient={ingredient} onChange={onChange} property="value" min={0} max={99} />
  </>;
}

function DelayExecIngredientEditor({
  ingredient,
  onChange,
}: RoutineModuleIngredientEditorProps<DelayExecIngredient>) {
  return <>
    After <NumericParameterEditor ingredient={ingredient} onChange={onChange} property="delay" min={0} max={99} suffix="seconds" /> &hellip;
  </>;
}
