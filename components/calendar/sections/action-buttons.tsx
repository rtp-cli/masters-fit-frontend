import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text,TouchableOpacity, View } from "react-native";

import { useThemeColors } from "@/lib/theme";
import { type PlanDayWithBlocks, type WorkoutWithDetails } from "@/types/api";

type CalendarActionButtonsProps = {
  workoutPlan: WorkoutWithDetails | null;
  isHistoricalWorkout: boolean;
  isPastDate: boolean;
  currentSelectedPlanDay: PlanDayWithBlocks | null;
  // [MF-022] Opens WorkoutRegenerationModal directly (not the choice modal).
  // Used by both the rest-day and scheduled-day branches.
  onOpenRegeneration: () => void;
};

export default function CalendarActionButtons({
  workoutPlan,
  isHistoricalWorkout,
  isPastDate,
  currentSelectedPlanDay,
  onOpenRegeneration,
}: CalendarActionButtonsProps) {
  const colors = useThemeColors();

  // No actions on past dates, historical views, or when there's no plan at all.
  // A completed day's share affordance now lives inline under the compact
  // summary header (WorkoutSummary), not in this slot — so it reads after the
  // workout it shares, not before it.
  if (!workoutPlan || isHistoricalWorkout || isPastDate) {
    return null;
  }

  // Rest / no-workout day within an active plan (e.g. Tuesday on an MWF plan):
  // offer week regeneration directly, so the user doesn't have to open a
  // scheduled day first just to reach the regenerate flow.
  if (!currentSelectedPlanDay) {
    return (
      <View className="px-lg my-lg">
        <TouchableOpacity
          className="bg-primary p-3 rounded-xl items-center flex-row justify-center"
          onPress={() => onOpenRegeneration()}
          accessibilityRole="button"
          accessibilityLabel="Adjust week"
        >
          <Ionicons
            name="refresh-outline"
            size={16}
            color={colors.contentOnPrimary}
          />
          <Text
            className="text-content-on-primary font-semibold text-sm ml-2"
            style={{ flexShrink: 1 }}
            numberOfLines={1}
            adjustsFontSizeToFit
            maxFontSizeMultiplier={1.3}
          >
            Adjust Week
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Completed scheduled day: no action buttons here. The share affordance is
  // rendered inline under the compact summary header (WorkoutSummary).
  if (currentSelectedPlanDay.isComplete) {
    return null;
  }

  // Scheduled, incomplete day: one door. "Change Workout" opens the
  // regeneration sheet, which now also hosts the manual-edit exit and a
  // week-scope link (see WorkoutRegenerationModal). Two sibling buttons whose
  // labels both read "change this workout" were the confusion this replaces.
  return (
    <View className="px-lg my-lg">
      <TouchableOpacity
        className="bg-primary p-3 rounded-xl items-center flex-row justify-center"
        onPress={() => onOpenRegeneration()}
        accessibilityRole="button"
        accessibilityLabel="Change workout"
      >
        {/* Speech bubble, not a gear: the sheet is a conversation with the
            coach, not a settings panel. */}
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={16}
          color={colors.contentOnPrimary}
        />
        <Text
          className="text-content-on-primary font-semibold text-sm ml-2"
          style={{ flexShrink: 1 }}
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.3}
        >
          Change Workout
        </Text>
      </TouchableOpacity>
    </View>
  );
}
