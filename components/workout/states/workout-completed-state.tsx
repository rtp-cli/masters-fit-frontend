import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/theme";

interface WorkoutCompletedStateProps {
  exercisesCompleted: number;
  skippedCount: number;
  hasCompletedWorkoutDuration: boolean;
}

export function WorkoutCompletedState({
  exercisesCompleted,
  skippedCount,
  hasCompletedWorkoutDuration,
}: WorkoutCompletedStateProps) {
  const colors = useThemeColors();

  return (
    <View className="flex-1 bg-background justify-center items-center px-6">
      <Ionicons
        name="checkmark-circle"
        size={80}
        color={colors.brand.primary}
      />
      <Text className="text-2xl font-bold text-text-primary text-center mt-6 mb-4">
        Workout Complete!
      </Text>
      <Text className="text-text-muted text-center mb-4 leading-6">
        Amazing work! You completed {exercisesCompleted} exercises
        {!hasCompletedWorkoutDuration &&
          skippedCount > 0 &&
          ` (${skippedCount} skipped)`}{" "}
      </Text>
      <Text className="text-text-muted text-center mb-8 leading-6">
        Check back tomorrow for your next workout.
      </Text>
    </View>
  );
}


