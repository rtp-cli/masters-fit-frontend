import React, { useCallback, useState } from "react";
import { Text, TouchableOpacity,View } from "react-native";

import DemoSheet, { type DemoSheetEntry } from "@/components/demo-sheet";
import NoActiveWorkoutCard from "@/components/no-active-workout-card";
import WorkoutBlock from "@/components/workout-block";
import WorkoutSummary from "@/components/workout-summary";
import { exerciseHasDemo } from "@/lib/exercise-video";
import {
  type PlanDayWithBlocks,
  type WorkoutBlockWithExercises,
  type WorkoutWithDetails,
} from "@/types/api";
import {
  calculatePlanDayDuration,
  formatDateAsString,
  formatWorkoutDuration,
} from "@/utils";

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
  onShowWorkoutChoice: () => void;
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
  onShowWorkoutChoice,
}: WorkoutDaySectionProps) {
  // One demo sheet for the whole day detail (scheduled or completed). It
  // overlays the caller, so dismissing preserves scroll position and the
  // selected day — the day detail is never remounted.
  const [demoSheet, setDemoSheet] = useState<{
    entries: DemoSheetEntry[];
    index: number;
  } | null>(null);

  const openDemoSheet = useCallback(
    (block: WorkoutBlockWithExercises, exerciseId: number) => {
      const entries: DemoSheetEntry[] = block.exercises
        .filter((ex) => exerciseHasDemo(ex.exercise))
        .map((ex) => ({
          exerciseId: ex.exercise.id,
          exerciseName: ex.exercise.name,
          link: ex.exercise.link!,
          description: ex.exercise.description,
        }));
      if (entries.length === 0) return;
      const index = Math.max(
        0,
        entries.findIndex((entry) => entry.exerciseId === exerciseId)
      );
      setDemoSheet({ entries, index });
    },
    []
  );

  if (!selectedDate) {
    return null;
  }

  const noActiveWorkout =
    !workoutPlan ||
    (workoutPlan?.endDate &&
      selectedDate > formatDateAsString(workoutPlan.endDate));

  if (!currentSelectedPlanDay || !currentSelectedPlanDay.blocks?.length) {
    return (
      <View className="px-lg">
        {noActiveWorkout ? (
          <NoActiveWorkoutCard
            isGenerating={isGenerating}
            onShowWorkoutChoice={onShowWorkoutChoice}
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

  // Show summary view for completed plan days
  if (currentSelectedPlanDay.isComplete) {
    // Editing window (SPEC §8): correctable until the next workout is complete.
    // The host owns this check — no plan day with a later date is complete yet.
    const hasLaterCompletedDay = (workoutPlan?.planDays || []).some(
      (day) =>
        day.isComplete &&
        formatDateAsString(day.date) >
          formatDateAsString(currentSelectedPlanDay.date)
    );
    return (
      <>
        <WorkoutSummary
          workout={currentSelectedPlanDay}
          compact
          canEditLog={!hasLaterCompletedDay}
          onExerciseDemoPress={(block, exercise) =>
            openDemoSheet(block, exercise.exercise.id)
          }
        />
        <DemoSheet
          visible={!!demoSheet}
          entries={demoSheet?.entries ?? []}
          initialIndex={demoSheet?.index ?? 0}
          surface="calendar_complete"
          onClose={() => setDemoSheet(null)}
        />
      </>
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
              </View>
            </View>
            <View className="flex-row items-center space-x-sm">
              {isToday && !isHistoricalWorkout && workoutPlan && (
                <TouchableOpacity
                  // [Bug fix] bg-secondary + text-background resolve to the
                  // SAME color in every theme -- this text was invisible.
                  className="bg-neutral-light-2 py-2 px-4 rounded-xl"
                  onPress={onStartWorkout}
                >
                  <Text className="text-text-primary font-semibold text-sm">
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
                  onExerciseDemoPress={(exercise) =>
                    openDemoSheet(block, exercise.exercise.id)
                  }
                  // No labelled "Demos" chip in the header: on Calendar the
                  // header is a collapse toggle, so a chip nested in it invites
                  // a near-miss collapse. Per-row icon chips only.
                  showBlockDemoChip={false}
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

      <DemoSheet
        visible={!!demoSheet}
        entries={demoSheet?.entries ?? []}
        initialIndex={demoSheet?.index ?? 0}
        surface="calendar_scheduled"
        onClose={() => setDemoSheet(null)}
      />
    </View>
  );
}
