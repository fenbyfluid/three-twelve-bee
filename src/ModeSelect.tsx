import { Button, MenuItem } from "@blueprintjs/core";
import { Select } from "@blueprintjs/select";
import type { ItemRenderer } from "@blueprintjs/select";
import React, { useCallback, useMemo } from "react";
import { Mode } from "./DeviceApi";
import "./ModeSelect.css";

type ModeSelectProps = {
  mode?: Mode,
  onModeChanged?: (mode: Mode) => void,
  topMode?: Mode,
};

export function ModeSelect({ mode, onModeChanged, topMode }: ModeSelectProps) {
  const items = useMemo(() => Mode.getAsValues().filter(({ value }) => {
    if (topMode === undefined) {
      return true;
    }

    return value <= topMode;
  }), [topMode]);

  const itemRenderer: ItemRenderer<typeof items[0]> = useCallback((mode, {
    ref,
    handleClick,
    handleFocus,
    modifiers,
  }) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }

    return <MenuItem
      ref={ref}
      active={modifiers.active}
      disabled={modifiers.disabled}
      key={mode.key}
      onClick={handleClick}
      onFocus={handleFocus}
      roleStructure="listoption"
      text={mode.label}
    />;
  }, []);

  return <Select
    items={items}
    itemRenderer={itemRenderer}
    itemsEqual="key"
    onItemSelect={({ value }) => onModeChanged && onModeChanged(value)}
    fill={true}
    filterable={false}
    popoverProps={{ matchTargetWidth: true }}
    popoverContentProps={{ className: "mode-select" }}
  >
    <Button text={(mode !== undefined ? Mode.getDisplayName(mode) : undefined) ?? "\u00a0"} rightIcon="caret-down" fill={true} alignText="left" />
  </Select>;
}