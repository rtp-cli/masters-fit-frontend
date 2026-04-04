import React from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/theme";
import { PlanDayWithBlocks, WorkoutWithDetails } from "@/types/api";

type CalendarActionButtonsProps = {
  workoutPlan: WorkoutWithDetails | null;
  isHistoricalWorkout: boolean;
  isPastDate: boolean;
  currentSelectedPlanDay: PlanDayWithBlocks | null;
  onShowWorkoutChoice: () => void;
  onOpenEditExercises: (planDay: PlanDayWithBlocks) => void;
};

export default function CalendarActionButtons({
  workoutPlan,
  isHistoricalWorkout,
  isPastDate,
  currentSelectedPlanDay,
  onShowWorkoutChoice,
  onOpenEditExercises,
}: CalendarActionButtonsProps) {
  const colors = useThemeColors();

  if (!workoutPlan || !currentSelectedPlanDay || isHistoricalWorkout || isPastDate || currentSelectedPlanDay.isComplete) {
    return null;
  }

  return (
    <View className="px-lg my-lg">
      <View className="flex-row" style={{ gap: 8 }}>
        <TouchableOpacity
          className="flex-1 bg-primary py-3 px-3 rounded-xl items-center flex-row justify-center"
          onPress={() => onShowWorkoutChoice()}
        >
          <Ionicons
            name="settings-outline"
            size={16}
            color={colors.contentOnPrimary}
          />
          <Text
            className="text-content-on-primary font-semibold text-sm ml-2"
            maxFontSizeMultiplier={1.3}
          >
            Regenerate Workout
          </Text>
        </TouchableOpacity>

        {currentSelectedPlanDay && (
          <TouchableOpacity
            className="flex-1 bg-card border border-neutral-light-2 py-3 px-3 rounded-xl items-center flex-row justify-center"
            onPress={() => onOpenEditExercises(currentSelectedPlanDay)}
          >
            <Ionicons
              name="create-outline"
              size={16}
              color={colors.brand.primary}
            />
            <Text
              className="text-primary font-semibold text-sm ml-2"
              maxFontSizeMultiplier={1.3}
            >
              Edit Workout
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
