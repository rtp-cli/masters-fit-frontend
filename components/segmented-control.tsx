import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { TIME_RANGE_FILTER } from "@/constants/global.enum";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Group label for screen readers, e.g. "Time range". */
  accessibilityLabel?: string;
}

/**
 * Accessible segmented control — a pill row where exactly one segment is selected.
 * Each segment carries `accessibilityState.selected` so the selection is announced and
 * is not conveyed by color alone. Replaces the hand-rolled segmented rows duplicated
 * across the dashboard analytics cards (MF-016); the duplication is what let the
 * 6M/1Y filter/label mismatch (MF-002) slip in per-card.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  return (
    <View
      className="flex-row bg-neutral-light-2 rounded-lg p-1"
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            className={`px-3 py-1 rounded-md ${
              selected ? "bg-primary" : "bg-transparent"
            }`}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
          >
            <Text
              className={`text-xs font-medium ${
                selected ? "text-content-on-primary" : "text-text-muted"
              }`}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

interface TimeRangeSegmentedControlProps {
  value: TIME_RANGE_FILTER;
  onChange: (value: TIME_RANGE_FILTER) => void;
  /**
   * Which ranges this card actually supports. Defaults to all of them.
   * A card should only offer ranges its data layer honors — passing a subset
   * prevents re-introducing the MF-002 "offer a range we don't filter" bug.
   */
  supportedRanges?: TIME_RANGE_FILTER[];
}

const ALL_RANGES = Object.values(TIME_RANGE_FILTER);

/**
 * Time-range picker for the dashboard analytics cards. Wraps SegmentedControl with the
 * TIME_RANGE_FILTER options so all cards share one accessible, consistent control.
 */
export function TimeRangeSegmentedControl({
  value,
  onChange,
  supportedRanges = ALL_RANGES,
}: TimeRangeSegmentedControlProps) {
  const options: SegmentOption<TIME_RANGE_FILTER>[] = supportedRanges.map(
    (range) => ({ value: range, label: range })
  );

  return (
    <SegmentedControl
      options={options}
      value={value}
      onChange={onChange}
      accessibilityLabel="Time range"
    />
  );
}

export default SegmentedControl;
