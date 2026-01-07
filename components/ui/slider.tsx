import { Slider } from "@miblanchard/react-native-slider";
import React from "react";
import { Text, View } from "react-native";

import { useThemeColors } from "../../lib/theme";

interface CustomSliderProps {
  label?: string;
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  onValueChange: (value: number) => void;
  unit?: string;
  className?: string;
  formatValue?: (value: number) => string;
  formatMinMax?: (value: number) => string;
}

export default function CustomSlider({
  label,
  value,
  minimumValue,
  maximumValue,
  step = 1,
  onValueChange,
  unit = "",
  className = "",
  formatValue,
  formatMinMax,
}: CustomSliderProps) {
  const colors = useThemeColors();
  const displayValue = formatValue ? formatValue(value) : `${value}${unit}`;
  const displayMin = formatMinMax
    ? formatMinMax(minimumValue)
    : `${minimumValue}`;
  const displayMax = formatMinMax
    ? formatMinMax(maximumValue)
    : `${maximumValue}`;

  // Debug logging for all sliders to compare
  const range = maximumValue - minimumValue;
  const _position = ((value - minimumValue) / range) * 100;
  const _expectedPosition = 50; // What we expect for center

  return (
    <View className={`mb-6 ${className}`}>
      {label && (
        <Text className="text-lg font-medium text-text-primary mb-4">
          {label}
        </Text>
      )}

      <View className="items-center mb-2">
        <Text className="text-md font-semibold text-text-muted">
          {displayValue}
        </Text>
      </View>

      <View className="flex-row items-center">
        <Text className="text-sm text-text-muted mr-3">{displayMin}</Text>

        <View className="flex-1">
          <Slider
            containerStyle={{ width: "100%", height: 30 }}
            minimumValue={minimumValue}
            maximumValue={maximumValue}
            step={step}
            value={value}
            trackClickable={false}
            onValueChange={(values) =>
              onValueChange(Array.isArray(values) ? values[0] : values)
            }
            minimumTrackTintColor={colors.neutral.dark[1]}
            maximumTrackTintColor={colors.neutral.medium[1]}
            thumbStyle={{
              backgroundColor: colors.neutral.dark[1],
              width: 24,
              height: 24,
            }}
            thumbTouchSize={{ width: 40, height: 40 }}
            trackStyle={{
              height: 4,
              borderRadius: 2,
            }}
          />
        </View>

        <Text className="text-sm text-text-muted ml-3">{displayMax}</Text>
      </View>
    </View>
  );
}
