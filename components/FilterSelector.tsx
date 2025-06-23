import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { colors } from "../lib/theme";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterSelectorProps {
  title: string;
  options: FilterOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

export const FilterSelector: React.FC<FilterSelectorProps> = ({
  title,
  options,
  selectedValue,
  onSelect,
}) => {
  return (
    <View className="mb-4">
      <Text className="text-sm font-semibold text-text-primary mb-2">
        {title}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            className={`px-3 py-1.5 rounded-full border ${
              selectedValue === option.value
                ? "bg-primary border-primary"
                : "bg-neutral-light-1 border-neutral-light-2"
            }`}
            onPress={() => onSelect(option.value)}
          >
            <Text
              className={`text-xs font-medium ${
                selectedValue === option.value
                  ? "text-white"
                  : "text-text-muted"
              }`}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// Common filter options
export const timeRangeOptions: FilterOption[] = [
  { label: "1W", value: "1w" },
  { label: "1M", value: "1m" },
  { label: "3M", value: "3m" },
  { label: "6M", value: "6m" },
  { label: "1Y", value: "1y" },
];

export const groupByOptions: FilterOption[] = [
  { label: "Exercise", value: "exercise" },
  { label: "Day", value: "day" },
  { label: "Muscle Group", value: "muscle_group" },
];
