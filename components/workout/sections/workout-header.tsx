import React from "react";
import { Text, View, type ViewStyle } from "react-native";

interface WorkoutHeaderProps {
  workoutName: string;
  instructions?: string | null;
  progressPercent: number;
  workoutTimer?: number;
  isWorkoutStarted?: boolean;
  formatTime?: (seconds: number) => string;
}

export function WorkoutHeader({
  workoutName,
  instructions,
  progressPercent,
}: WorkoutHeaderProps) {
  return (
    <View className="mb-6">
      <View className="w-full h-2 mb-4 bg-neutral-light-2 rounded-full overflow-hidden">
        <View
          className="h-full bg-primary rounded-full"
          style={{ width: `${progressPercent.toFixed(0)}%` } as ViewStyle}
        />
      </View>
      <View className="flex-row items-start mb-2">
        <Text className="text-2xl font-bold text-text-primary flex-1 mr-3">
          {workoutName}
        </Text>
        {/* TIMER DISPLAY HIDDEN: Main workout timer commented out */}
        {/* {isWorkoutStarted && formatTime && (
          <View className="bg-background rounded-xl px-3 py-1 min-w-[80px]">
            <Text className="text-lg font-bold text-text-primary text-center">
              {formatTime(workoutTimer || 0)}
            </Text>
          </View>
        )} */}
      </View>
      {instructions ? (
        <Text className="text-base text-text-secondary leading-6">
          {instructions}
        </Text>
      ) : null}
    </View>
  );
}
