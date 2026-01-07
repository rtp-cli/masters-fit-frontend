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
  onOpenRegeneration: (planDay?: PlanDayWithBlocks) => void;
  onOpenEditExercises: (planDay: PlanDayWithBlocks) => void;
};

export default function CalendarActionButtons({
  workoutPlan,
  isHistoricalWorkout,
  isPastDate,
  currentSelectedPlanDay,
  onOpenRegeneration,
  onOpenEditExercises,
}: CalendarActionButtonsProps) {
  const colors = useThemeColors();

  if (!workoutPlan || isHistoricalWorkout || isPastDate) {
    return null;
  }

  return (
    <View className="px-lg my-lg">
      <View className="flex-row space-x-3">
        <TouchableOpacity
          className="flex-1 bg-primary py-3 rounded-lg items-center flex-row justify-center"
          onPress={() =>
            onOpenRegeneration(currentSelectedPlanDay || undefined)
          }
        >
          <Ionicons
            name="settings-outline"
            size={16}
            color={colors.neutral.light[1]}
          />
          <Text className="text-neutral-light-1 font-semibold text-sm ml-2">
            Edit Workout Plan
          </Text>
        </TouchableOpacity>

        {currentSelectedPlanDay && (
          <TouchableOpacity
            className="flex-1 ml-2 bg-white border border-primary py-3 rounded-lg items-center flex-row justify-center"
            onPress={() => onOpenEditExercises(currentSelectedPlanDay)}
          >
            <Ionicons
              name="create-outline"
              size={16}
              color={colors.brand.primary}
            />
            <Text className="text-primary font-semibold text-sm ml-2">
              Replace Exercises
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
