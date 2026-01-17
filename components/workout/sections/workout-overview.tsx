import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/theme";
import {
  WorkoutBlockWithExercise,
  PlanDayWithBlocks,
  getBlockTypeDisplayName,
} from "@/types/api/workout.types";

interface WorkoutOverviewProps {
  workout: PlanDayWithBlocks;
  exercises: WorkoutBlockWithExercise[];
  currentExerciseIndex: number;
  skippedExercises: number[];
}

export function WorkoutOverview({
  workout,
  exercises,
  currentExerciseIndex,
  skippedExercises,
}: WorkoutOverviewProps) {
  const colors = useThemeColors();

  return (
    <View className="bg-card rounded-2xl p-6 border border-neutral-light-2">
      <Text className="text-lg font-bold text-text-primary mb-4">
        Today's Workout Plan
      </Text>

      {workout.blocks.map((block, blockIndex) => (
        <View key={block.id} className="mb-4 last:mb-0">
          <View className="rounded-xl p-3 mb-2">
            <Text className="text-sm font-bold text-text-primary">
              {block.blockName || getBlockTypeDisplayName(block.blockType)}
            </Text>
            {block.instructions ? (
              <Text className="text-xs text-text-muted mt-1">
                {block.instructions}
              </Text>
            ) : null}
          </View>

          {block.exercises.map((exercise, exerciseIndex) => {
            const globalIndex = exercises.findIndex(
              (ex) => ex.id === exercise.id
            );
            const isCompleted = globalIndex < currentExerciseIndex;
            const isCurrent = globalIndex === currentExerciseIndex;
            const isSkipped = skippedExercises.includes(exercise.id);

            return (
              <View
                key={exercise.id}
                className={`flex-row items-center p-3 rounded-xl mb-2 ${
                  isCurrent
                    ? "bg-brand-light-1 border border-brand-light-1"
                    : isCompleted || isSkipped
                      ? "bg-brand-light-1 border border-brand-light-1"
                      : "bg-background border border-neutral-light-2"
                }`}
              >
                <View
                  className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                    isCompleted ? "bg-neutral-dark-1" : "bg-brand-medium-2"
                  }`}
                >
                  {isSkipped ? (
                    <Ionicons
                      name="play-skip-forward-outline"
                      size={16}
                      color={colors.contentOnPrimary}
                    />
                  ) : isCompleted ? (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={colors.neutral.light[2]}
                    />
                  ) : isCurrent ? (
                    <Ionicons
                      name="play-outline"
                      size={12}
                      color={colors.neutral.dark[1]}
                    />
                  ) : (
                    <Text className="text-xs font-bold text-neutral-dark-1">
                      {globalIndex + 1}
                    </Text>
                  )}
                </View>

                <View className="flex-1">
                  <Text className="text-sm font-semibold text-text-primary">
                    {exercise.exercise.name}
                  </Text>
                  <View className="flex-row flex-wrap mt-1">
                    {exercise.sets ? (
                      <Text className="text-xs text-text-muted mr-3">
                        {exercise.sets} sets
                      </Text>
                    ) : null}
                    {exercise.reps ? (
                      <Text className="text-xs text-text-muted mr-3">
                        {exercise.reps} reps
                      </Text>
                    ) : null}
                    {exercise.weight ? (
                      <Text className="text-xs text-text-muted mr-3">
                        {exercise.weight} lbs
                      </Text>
                    ) : null}
                    {exercise.duration ? (
                      <Text className="text-xs text-text-muted">
                        {exercise.duration}s
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}


