import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { useThemeColors } from "../lib/theme";
import {
  type ExerciseSessionData,
  getBlockTypeDisplayName,
  type WorkoutBlockWithExercises,
} from "../types/api/workout.types";

interface WorkoutBlockProgressProps {
  block: WorkoutBlockWithExercises;
  blockIndex: number;
  exerciseData: ExerciseSessionData[];
  currentExerciseIndex: number;
  onExercisePress?: (exerciseIndex: number) => void;
  variant?: "workout" | "overview";
}

export default function WorkoutBlockProgress({
  block,
  blockIndex,
  exerciseData,
  currentExerciseIndex,
  onExercisePress,
}: WorkoutBlockProgressProps) {
  const colors = useThemeColors();
  const blockTypeName = getBlockTypeDisplayName(block.blockType);

  const getBlockIcon = (blockType?: string) => {
    const icons: Record<string, string> = {
      traditional: "barbell-outline",
      amrap: "timer-outline",
      emom: "stopwatch-outline",
      for_time: "flash-outline",
      circuit: "refresh-circle-outline",
      tabata: "pulse-outline",
      warmup: "sunny-outline",
      cooldown: "moon-outline",
      superset: "layers-outline",
      flow: "water-outline",
    };

    return icons[blockType || ""] || "fitness-outline";
  };

  const getExerciseStatus = (exerciseIndex: number) => {
    if (exerciseIndex < currentExerciseIndex) {
      return exerciseData[exerciseIndex]?.isCompleted ? "Completed" : "Skipped";
    } else if (exerciseIndex === currentExerciseIndex) {
      return "Current";
    } else if (exerciseIndex === currentExerciseIndex + 1) {
      return "Next";
    } else {
      return "Waiting";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "text-green-600";
      case "Current":
        return "text-primary";
      case "Next":
        return "text-blue-600";
      default:
        return "text-text-muted";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100";
      case "Current":
        return "bg-primary/20";
      case "Next":
        return "bg-blue-100";
      default:
        return "bg-neutral-light-2";
    }
  };

  const getBlockDescription = (block: WorkoutBlockWithExercises) => {
    const parts = [];

    if (block.rounds && block.rounds > 1) {
      parts.push(`${block.rounds} rounds`);
    }

    if (block.timeCapMinutes) {
      parts.push(`${block.timeCapMinutes} min time cap`);
    }

    if (block.exercises.length > 0) {
      parts.push(`${block.exercises.length} exercises`);
    }

    return parts.join(" • ");
  };

  // Calculate block progress
  const blockExercises = block.exercises;
  const completedInBlock = blockExercises.filter((_, idx) => {
    const globalIdx = blockExercises.findIndex(
      (ex) => ex.id === blockExercises[idx].id
    );
    return exerciseData[globalIdx]?.isCompleted;
  }).length;
  const blockProgress =
    blockExercises.length > 0
      ? (completedInBlock / blockExercises.length) * 100
      : 0;

  return (
    <View className="mb-4">
      {/* Block Header */}
      <View className="bg-brand-light-2 p-4 rounded-t-xl">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className="size-8 rounded-full bg-white/20 items-center justify-center mr-3">
              <Ionicons
                name={getBlockIcon(block.blockType) as any}
                size={16}
                color={colors.text.primary}
              />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="font-bold text-text-primary text-base">
                  {block.blockName || blockTypeName}
                </Text>
                {blockIndex > 0 && (
                  <View className="ml-2 px-2 py-0.5 bg-white/20 rounded-full">
                    <Text className="text-xs font-medium text-text-primary">
                      Block {blockIndex + 1}
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-text-secondary mt-1 text-sm">
                {getBlockDescription(block)}
              </Text>
            </View>
          </View>

          {/* Block Progress */}
          <View className="items-end">
            <Text className="text-sm font-bold text-text-primary">
              {Math.round(blockProgress)}%
            </Text>
            <Text className="text-xs text-text-secondary">
              {completedInBlock}/{blockExercises.length}
            </Text>
          </View>
        </View>

        {/* Block Instructions */}
        {block.instructions && (
          <View className="mt-3 p-3 bg-white/10 rounded-lg">
            <Text className="text-sm text-text-primary leading-5">
              {block.instructions}
            </Text>
          </View>
        )}

        {/* Progress Bar */}
        <View className="mt-3">
          <View className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <View
              className="h-full bg-white/40 rounded-full"
              style={{ width: `${blockProgress}%` }}
            />
          </View>
        </View>
      </View>

      {/* Block Exercises */}
      <View className="bg-white border-l-4 border-l-gray-200 rounded-b-xl">
        {blockExercises.map((exercise, exerciseIndex) => {
          // Find global exercise index
          const globalExerciseIndex = exerciseData.findIndex(
            (data) => data.planDayExerciseId === exercise.id
          );
          const status = getExerciseStatus(globalExerciseIndex);
          const isCurrentExercise =
            globalExerciseIndex === currentExerciseIndex;

          return (
            <TouchableOpacity
              key={exercise.id}
              className={`p-4 border-b border-gray-100 ${exerciseIndex === blockExercises.length - 1 ? "border-b-0 rounded-b-xl" : ""} ${
                isCurrentExercise ? "bg-primary/5" : "bg-white"
              }`}
              onPress={() => onExercisePress?.(globalExerciseIndex)}
              disabled={!onExercisePress}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 flex-row items-center">
                  <View className="size-8 rounded-full bg-gray-100 items-center justify-center mr-3">
                    <Text className="text-xs font-bold text-gray-600">
                      {exerciseIndex + 1}
                    </Text>
                  </View>

                  <View className="flex-1">
                    <Text className="font-semibold text-text-primary text-sm mb-1">
                      {exercise.exercise.name}
                    </Text>

                    <View className="flex-row items-center">
                      <Text className="text-text-muted text-xs">
                        {exercise.sets && exercise.reps
                          ? `${exercise.sets} × ${exercise.reps}`
                          : exercise.duration
                            ? `${exercise.duration}s`
                            : "Follow instructions"}
                      </Text>

                      {exercise.weight && (
                        <>
                          <Text className="text-text-muted mx-1 text-xs">
                            •
                          </Text>
                          <Text className="text-text-muted text-xs">
                            {exercise.weight} lbs
                          </Text>
                        </>
                      )}
                    </View>

                    {exercise.notes && (
                      <Text className="text-text-muted italic text-xs mt-1">
                        {exercise.notes}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Exercise Status */}
                <View className="ml-3">
                  <View
                    className={`px-2 py-1 rounded-full ${getStatusBg(status)}`}
                  >
                    <Text
                      className={`text-xs font-semibold ${getStatusColor(status)}`}
                    >
                      {status}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
