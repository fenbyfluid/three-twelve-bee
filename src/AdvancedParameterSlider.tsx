import { Slider, SliderProps } from "@blueprintjs/core";
import React, { useCallback, useEffect, useState } from "react";
import "./AdvancedParameterSlider.css";

type AdvancedParameterSliderProps = {
  min: number,
  max: number,
  labelRenderer?: (v: number) => string,
};

export function AdvancedParameterSlider({
  min,
  max,
  labelRenderer,
  value,
  initialValue,
  onChange,
  onRelease,
  className,
  ...props
}: AdvancedParameterSliderProps & Omit<SliderProps, "min" | "max" | "stepSize" | "labelStepSize" | "labelValues" | "labelRenderer">) {
  const inverted = min > max;
  const sliderMin = inverted ? max : min;
  const sliderMax = inverted ? min : max;

  const [sliderValue, setSliderValue] = useState<number | undefined>(undefined);

  useEffect(() => {
    const defaultValue = (value !== undefined) ? (inverted ? ((sliderMin + sliderMax) - value) : value) : undefined;
    setSliderValue(defaultValue);
  }, [value]);

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

  const sliderInitialValue = (initialValue !== undefined) ? (inverted ? ((sliderMin + sliderMax) - initialValue) : initialValue) : undefined;

  const percentage = sliderValue !== undefined ? (sliderValue - sliderMin) / (sliderMax - sliderMin) : undefined;
  const keepAway = 0.15;
  const labelValues = [];
  if (percentage === undefined || percentage > keepAway) {
    labelValues.push(sliderMin);
  }
  if (percentage === undefined || percentage < (1 - keepAway)) {
    labelValues.push(sliderMax);
  }

  // TODO: Make a custom slider that keeps the handles inside the track.
  // TODO: ... and supports snapping to the display values.
  // TODO: ... and show no handle if value undefined.
  return <Slider
    min={sliderMin}
    max={sliderMax}
    value={sliderValue ?? sliderMin}
    initialValue={sliderInitialValue}
    showTrackFill={sliderValue !== sliderInitialValue}
    stepSize={1}
    labelValues={labelValues}
    labelRenderer={sliderLabelRenderer}
    onChange={onSliderChange}
    onRelease={onSliderRelease}
    className={`${className ?? ""} advanced-param-slider`}
    {...props}
  />;
}