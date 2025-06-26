import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  WorkoutBlockWithExercises,
  getBlockTypeDisplayName,
} from "../types/api/workout.types";
import { formatEquipment, formatExerciseDuration } from "../utils";
import { colors } from "../lib/theme";

interface WorkoutBlockProps {
  block: WorkoutBlockWithExercises;
  blockIndex: number;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
  showDetails?: boolean;
  variant?: "calendar" | "workout" | "compact";
}

export default function WorkoutBlock({
  block,
  blockIndex,
  isExpanded = true,
  onToggleExpanded,
  showDetails = true,
  variant = "calendar",
}: WorkoutBlockProps) {
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

  const formatExerciseDetails = (exercise: any) => {
    const details = [];

    // Handle different exercise types
    if (exercise.sets && exercise.reps) {
      // Traditional sets/reps exercise
      details.push(`${exercise.sets} × ${exercise.reps}`);
    } else if (exercise.duration) {
      // Time-based exercise
      if (exercise.sets && exercise.sets > 1) {
        details.push(`${exercise.sets} × ${exercise.duration}s`);
      } else {
        details.push(`${exercise.duration}s`);
      }
    } else if (exercise.reps) {
      // Reps only (no sets)
      details.push(`${exercise.reps} reps`);
    } else if (exercise.sets) {
      // Sets only (no reps)
      details.push(`${exercise.sets} sets`);
    }

    // Add weight if specified
    if (exercise.weight) {
      details.push(`${exercise.weight} lbs`);
    }

    // Add rest time if specified
    if (exercise.restTime && exercise.restTime > 0) {
      details.push(`${exercise.restTime}s rest`);
    }

    // If no specific parameters, show a default message
    if (details.length === 0) {
      details.push("Follow instructions");
    }

    return details.join(" • ");
  };

  const isCompactVariant = variant === "compact";
  const isWorkoutVariant = variant === "workout";

  return (
    <View
      className={`rounded-xl mb-4 overflow-hidden ${isCompactVariant ? "mb-2" : "mb-4"}`}
    >
      {/* Block Header */}
      <TouchableOpacity
        className={`bg-brand-light-2 p-4 ${isCompactVariant ? "p-3" : "p-4"}`}
        onPress={onToggleExpanded}
        disabled={!onToggleExpanded}
      >
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center mr-3">
            <Ionicons
              name={getBlockIcon(block.blockType) as any}
              size={16}
              color={colors.text.primary}
            />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text
                className={`font-bold text-text-primary ${isCompactVariant ? "text-sm" : "text-base"}`}
              >
                {block.blockName || blockTypeName}
              </Text>
            </View>
            <Text
              className={`text-text-secondary mt-1 ${isCompactVariant ? "text-xs" : "text-sm"}`}
            >
              {getBlockDescription(block)}
            </Text>
          </View>
        </View>

        {/* Block Instructions */}
        {block.instructions && isExpanded && !isCompactVariant && (
          <View className="p-3 bg-white/10 rounded-lg">
            <Text className="text-sm text-text-primary leading-5">
              {block.instructions}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Block Exercises */}
      {isExpanded && showDetails && (
        <View className="bg-white border-l-4 border-l-gray-200">
          {block.exercises.map((exercise, exerciseIndex) => (
            <View
              key={exercise.id}
              className={`p-4 border-b border-gray-100 ${exerciseIndex === block.exercises.length - 1 ? "border-b-0" : ""} ${isCompactVariant ? "p-3" : "p-4"}`}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <View className="w-6 h-6 rounded-full bg-gray-100 items-center justify-center mr-3">
                      <Text className="text-xs font-bold text-gray-600">
                        {exerciseIndex + 1}
                      </Text>
                    </View>
                    <Text
                      className={`font-semibold text-text-primary flex-1 ${isCompactVariant ? "text-sm" : "text-base"}`}
                    >
                      {exercise.exercise.name}
                    </Text>
                  </View>

                  {/* Exercise Details */}
                  <View className="ml-9">
                    <Text
                      className={`text-text-muted ${isCompactVariant ? "text-xs" : "text-sm"}`}
                    >
                      {formatExerciseDetails(exercise) || "Follow instructions"}
                    </Text>

                    {/* Exercise Notes */}
                    {exercise.notes && (
                      <Text
                        className={`text-text-muted italic mt-1 ${isCompactVariant ? "text-xs" : "text-sm"}`}
                      >
                        {exercise.notes}
                      </Text>
                    )}

                    {/* Exercise Equipment */}
                    {exercise.exercise.equipment && (
                      <View className="flex-row items-center mt-1">
                        <Ionicons
                          name="fitness"
                          size={12}
                          color={colors.text.muted}
                        />
                        <Text
                          className={`text-text-muted ml-1 ${isCompactVariant ? "text-xs" : "text-sm"}`}
                        >
                          {formatEquipment(exercise.exercise.equipment)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Exercise Status (for workout variant) */}
                {isWorkoutVariant && (
                  <View className="ml-2">
                    <View
                      className={`w-6 h-6 rounded-full ${exercise.completed ? "bg-green-500" : "bg-gray-200"} items-center justify-center`}
                    >
                      {exercise.completed && (
                        <Ionicons name="checkmark" size={14} color="white" />
                      )}
                    </View>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
