import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useThemeColors } from "@/lib/theme";
import NoActiveWorkoutCard from "@/components/no-active-workout-card";
import WorkoutBlock from "@/components/workout-block";
import {
  calculatePlanDayDuration,
  formatDateAsString,
  formatWorkoutDuration,
} from "@/utils";
import {
  PlanDayWithBlocks,
  WorkoutBlockWithExercises,
  WorkoutWithDetails,
} from "@/types/api";

type WorkoutDaySectionProps = {
  selectedDate: string;
  workoutPlan: WorkoutWithDetails | null;
  currentSelectedPlanDay: PlanDayWithBlocks | null;
  isHistoricalWorkout: boolean;
  isToday: boolean;
  isGenerating: boolean;
  expandedBlocks: Record<string, boolean>;
  onToggleBlock: (blockId: number) => void;
  getTotalExerciseCount: (blocks: WorkoutBlockWithExercises[]) => number;
  onStartWorkout: () => void;
  onRepeatWorkout: () => void;
  onGenerateWorkout: () => void;
};

export default function WorkoutDaySection({
  selectedDate,
  workoutPlan,
  currentSelectedPlanDay,
  isHistoricalWorkout,
  isToday,
  isGenerating,
  expandedBlocks,
  onToggleBlock,
  getTotalExerciseCount,
  onStartWorkout,
  onRepeatWorkout,
  onGenerateWorkout,
}: WorkoutDaySectionProps) {
  const colors = useThemeColors();

  if (!selectedDate) {
    return null;
  }

  const noActiveWorkout =
    !workoutPlan ||
    (workoutPlan?.endDate &&
      selectedDate > formatDateAsString(workoutPlan.endDate));

  if (!currentSelectedPlanDay) {
    return (
      <View className="px-lg">
        {noActiveWorkout ? (
          <NoActiveWorkoutCard
            isGenerating={isGenerating}
            onRepeatWorkout={onRepeatWorkout}
            onGenerateWorkout={onGenerateWorkout}
            variant="calendar"
            showActionsOnlyForToday={true}
            isToday={isToday}
          />
        ) : (
          <View className="bg-brand-light-1 p-6 rounded-xl items-center">
            <Text className="text-base font-bold text-text-primary mb-xs">
              Rest Day
            </Text>
            <Text className="text-sm text-text-muted text-center leading-5">
              Take this time to recover and prepare for your next workout!
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View className="px-lg">
      <View className="mb-lg">
        <View className="mb-md">
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-1">
              <Text className="text-base font-bold text-text-primary">
                {currentSelectedPlanDay.description || "Workout"}
              </Text>
              <View className="flex-row items-center mt-xs">
                <Text className="text-xs text-text-muted">
                  {getTotalExerciseCount(currentSelectedPlanDay.blocks || [])}{" "}
                  exercises
                </Text>
                <Text className="text-xs text-text-muted mx-2">•</Text>
                <Text className="text-xs text-text-muted">
                  {formatWorkoutDuration(
                    calculatePlanDayDuration(currentSelectedPlanDay)
                  )}
                </Text>
                {currentSelectedPlanDay.isComplete && (
                  <>
                    <Text className="text-xs text-text-muted mx-2">•</Text>
                    <View className="flex-row items-center">
                      <Ionicons
                        name="checkmark-circle"
                        size={12}
                        color={colors.brand.primary}
                      />
                      <Text className="text-xs text-brand-primary ml-1 font-medium">
                        Completed
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>
            <View className="flex-row items-center space-x-sm">
              {isToday && !isHistoricalWorkout && workoutPlan && (
                <TouchableOpacity
                  className="bg-secondary py-2 px-4 rounded-xl"
                  onPress={onStartWorkout}
                >
                  <Text className="text-background font-semibold text-sm">
                    Start
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View className="space-y-sm">
          {currentSelectedPlanDay.blocks &&
          currentSelectedPlanDay.blocks.length > 0 ? (
            currentSelectedPlanDay.blocks
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map((block, blockIndex) => (
                <WorkoutBlock
                  key={block.id}
                  block={block}
                  blockIndex={blockIndex}
                  isExpanded={expandedBlocks[block.id] !== false}
                  onToggleExpanded={() => onToggleBlock(block.id)}
                  showDetails={true}
                  variant="calendar"
                />
              ))
          ) : (
            <View className="bg-brand-light-1 p-6 rounded-xl items-center">
              <Text className="text-base font-bold text-text-primary mb-xs">
                No Workout Planned
              </Text>
              <Text className="text-sm text-text-muted text-center leading-5">
                This day doesn't have any workout blocks scheduled.
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
