import { Button, MenuItem } from "@blueprintjs/core";
import { Select } from "@blueprintjs/select";
import type { ItemRenderer } from "@blueprintjs/select";
import React, { useCallback, useMemo } from "react";
import { Mode } from "./DeviceApi";
import "./ModeSelect.css";

export function ModeSelect({ onItemSelect }: { onItemSelect: () => void }) {
  const items = useMemo(() => Mode.getAsValues(), []);

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
    onItemSelect={onItemSelect}
    fill={true}
    filterable={false}
    popoverProps={{ matchTargetWidth: true }}
    popoverContentProps={{ className: "mode-select" }}
  >
    <Button text={"\u00a0"} rightIcon="caret-down" fill={true} alignText="left" />
  </Select>;
}