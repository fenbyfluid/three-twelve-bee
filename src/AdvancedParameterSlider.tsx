import { Slider, SliderProps } from "@blueprintjs/core";
import React, { useCallback, useState } from "react";
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

  const defaultValue = (value !== undefined) ? (inverted ? ((sliderMin + sliderMax) - value) : value) : sliderMin;
  const [sliderValue, setSliderValue] = useState<number>(defaultValue);

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

  const percentage = (sliderValue - sliderMin) / (sliderMax - sliderMin);
  const keepAway = 0.15;
  const labelValues = [];
  if (percentage > keepAway) {
    labelValues.push(sliderMin);
  }
  if (percentage < (1 - keepAway)) {
    labelValues.push(sliderMax);
  }

  // TODO: Make a custom slider that keeps the handles inside the track.
  // TODO: ... and supports snapping to the display values.
  // TODO: ... and show no handle if value undefined.
  return <Slider
    min={sliderMin}
    max={sliderMax}
    value={sliderValue}
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