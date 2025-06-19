import React from "react";
import { View, Text } from "react-native";
import Slider from "@react-native-community/slider";

interface CustomSliderProps {
  label: string;
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  onValueChange: (value: number) => void;
  unit?: string;
  className?: string;
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
}: CustomSliderProps) {
  return (
    <View className={`mb-6 ${className}`}>
      <Text className="text-lg font-medium text-text-primary mb-2">
        {label}
      </Text>
      <View className="mb-2">
        <Slider
          style={{ width: "100%", height: 40 }}
          minimumValue={minimumValue}
          maximumValue={maximumValue}
          step={step}
          value={value}
          onValueChange={onValueChange}
          minimumTrackTintColor="primary"
          maximumTrackTintColor="neutral-medium-1"
          thumbTintColor="primary"
        />
      </View>
      <View className="flex-row justify-between items-center">
        <Text className="text-sm text-text-muted">
          {minimumValue}
          {unit}
        </Text>
        <Text className="text-xl font-semibold text-primary">
          {value}
          {unit}
        </Text>
        <Text className="text-sm text-text-muted">
          {maximumValue}
          {unit}
        </Text>
      </View>
    </View>
  );
}
