import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { useAppDataContext } from "@/contexts/app-data-context";

// Lifted-pill shadow shared by the chip and the badge.
const pillShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.1,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: 1 },
  elevation: 2,
} as const;

type StreakChipProps = {
  count: number;
  onPress?: () => void;
};

/**
 * Subtle header streak chip — a flame + the streak count on a lifted white
 * pill, in the Cal AI register. The warmth comes from the flame emoji itself,
 * so the chip reads the same across every color theme.
 */
export function StreakChip({ count, onPress }: StreakChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Workout streak: ${count} in a row`}
      className="flex-row items-center bg-neutral-white rounded-full pl-2.5 pr-3 py-1.5"
      style={pillShadow}
    >
      <Text className="text-xs">🔥</Text>
      <Text className="text-sm font-bold text-text-primary ml-1">{count}</Text>
    </TouchableOpacity>
  );
}

/**
 * Static streak pill for the workout-complete dialog. Reads the streak live
 * from app data so it reflects the value refreshed at completion. Renders
 * nothing until there's a streak to show.
 */
export function StreakBadge() {
  const streak = useAppDataContext().data.weeklySummary?.streak ?? 0;
  if (streak < 1) return null;
  return (
    <View
      className="flex-row items-center self-center bg-neutral-white rounded-full px-3 py-1.5 mb-4"
      style={pillShadow}
    >
      <Text className="text-sm">🔥</Text>
      <Text className="text-sm font-bold text-text-primary ml-1.5">
        {streak} workouts in a row
      </Text>
    </View>
  );
}
