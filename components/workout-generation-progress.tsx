import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/theme";
import {
  useWorkoutProgress,
  GenerationDayStatus,
} from "@/hooks/use-workout-progress";

function phaseLabel(
  phase: string | null,
  days: GenerationDayStatus[]
): string {
  switch (phase) {
    case "planning":
      return "Designing your week...";
    case "generating_days": {
      const done = days.filter((d) => d.status === "done").length;
      return `Building your workouts... ${done}/${days.length}`;
    }
    case "saving":
      return "Saving your plan...";
    default:
      return "Creating your workout plan...";
  }
}

function DayCard({ day }: { day: GenerationDayStatus }) {
  const colors = useThemeColors();

  return (
    <View
      className={`flex-row items-center rounded-lg px-3 py-2 mr-2 mb-2 bg-surface-elevated ${
        day.status === "done" ? "opacity-100" : "opacity-70"
      }`}
    >
      <View className="mr-2">
        {day.status === "generating" && (
          <ActivityIndicator size="small" color={colors.brand.primary} />
        )}
        {day.status === "done" && (
          <Ionicons
            name="checkmark-circle"
            size={18}
            color={colors.brand.primary}
          />
        )}
        {day.status === "failed" && (
          <Ionicons name="alert-circle" size={18} color={colors.text.muted} />
        )}
        {day.status === "pending" && (
          <Ionicons
            name="ellipse-outline"
            size={18}
            color={colors.text.muted}
          />
        )}
      </View>
      <View>
        <Text className="text-xs font-semibold text-text-primary">
          Day {day.dayNumber}
        </Text>
        <Text
          className="text-xs text-text-muted max-w-[120px]"
          numberOfLines={1}
        >
          {day.label}
        </Text>
      </View>
    </View>
  );
}

/**
 * Live generation status driven by websocket workout-progress events:
 * a real progress bar plus one card per workout day that fills in as the
 * parallel day generations complete. Falls back to an indeterminate
 * spinner state until the first structured event arrives.
 */
export default function WorkoutGenerationProgress() {
  const colors = useThemeColors();
  const { progress, phase, days } = useWorkoutProgress();

  return (
    <View className="w-full items-center py-2">
      <View className="flex-row items-center mb-3">
        <ActivityIndicator size="small" color={colors.brand.primary} />
        <Text className="text-sm font-semibold text-text-primary ml-2">
          {phaseLabel(phase, days)}
        </Text>
      </View>

      {/* Progress bar */}
      <View className="w-full h-2 rounded-full bg-surface-elevated overflow-hidden mb-4">
        <View
          className="h-2 rounded-full"
          style={{
            width: `${Math.max(progress, 4)}%`,
            backgroundColor: colors.brand.primary,
          }}
        />
      </View>

      {/* Week strip — appears once the plan is designed */}
      {days.length > 0 && (
        <View className="flex-row flex-wrap justify-center">
          {days.map((day) => (
            <DayCard key={day.dayNumber} day={day} />
          ))}
        </View>
      )}
    </View>
  );
}
