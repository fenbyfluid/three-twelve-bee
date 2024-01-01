import { MultiSlider, SliderBaseProps } from "@blueprintjs/core";
import React, { useCallback, useEffect, useState } from "react";
import "./ParameterSlider.css";

type ParameterSliderProps = {
  value?: number,
  min: number,
  max: number,
  labelRenderer?: (v: number) => string,
  onChange?: (value: number) => void,
  onRelease?: (value: number) => void,
};

export function ParameterSlider({
  min,
  max,
  labelRenderer,
  value,
  onChange,
  onRelease,
  className,
  ...props
}: ParameterSliderProps & Omit<SliderBaseProps, "min" | "max" | "stepSize" | "labelStepSize" | "labelValues" | "labelRenderer">) {
  const inverted = min > max;
  const sliderMin = inverted ? max : min;
  const sliderMax = inverted ? min : max;

  const [sliderValue, setSliderValue] = useState<number | undefined>(undefined);

  useEffect(() => {
    const defaultValue = (value !== undefined) ? (inverted ? ((sliderMin + sliderMax) - value) : value) : undefined;
    setSliderValue(defaultValue);
  }, [value, inverted, sliderMin, sliderMax]);

  const sliderLabelRenderer = useCallback((sliderValue: number) => {
    const value = inverted ? ((sliderMin + sliderMax) - sliderValue) : sliderValue;
    const renderer = labelRenderer ?? (v => v.toFixed(0));
    return renderer(value);
  }, [labelRenderer, inverted, sliderMin, sliderMax]);

  const onSliderChange = useCallback((sliderValue: number) => {
    setSliderValue(sliderValue);

    const value = inverted ? ((sliderMin + sliderMax) - sliderValue) : sliderValue;
    onChange && onChange(value);
  }, [onChange, inverted, sliderMin, sliderMax]);

  const onSliderRelease = useCallback((sliderValue: number) => {
    const value = inverted ? ((sliderMin + sliderMax) - sliderValue) : sliderValue;
    onRelease && onRelease(value);
  }, [onRelease, inverted, sliderMin, sliderMax]);

  const percentage = sliderValue !== undefined ? (sliderValue - sliderMin) / (sliderMax - sliderMin) : undefined;
  const keepAway = 0.15;
  const labelValues = [];
  if (percentage === undefined || percentage > keepAway) {
    labelValues.push(sliderMin);
  }
  if (percentage === undefined || percentage < (1 - keepAway)) {
    labelValues.push(sliderMax);
  }

  const valueIsValid = sliderValue !== undefined && sliderValue >= sliderMin && sliderValue <= sliderMax;

  // TODO: Make a custom slider that keeps the handles inside the track.
  // TODO: ... and supports snapping to the display values.
  // TODO: ... and can hide the handle without breaking clicking the track to set the value.
  return <MultiSlider
    min={sliderMin}
    max={sliderMax}
    stepSize={1}
    labelValues={labelValues}
    labelRenderer={sliderLabelRenderer}
    className={`${className ?? ""} param-slider`}
    {...props}
  >
    {valueIsValid ? <MultiSlider.Handle
      value={sliderValue}
      intentBefore="primary"
      onChange={onSliderChange}
      onRelease={onSliderRelease}
    /> : undefined}
  </MultiSlider>;
}