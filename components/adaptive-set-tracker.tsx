import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity,View } from "react-native";

import { HIT_SLOP_6, HIT_SLOP_10 } from "@/constants";
import { type ThemeColorPalette,useThemeColors } from "@/lib/theme";
import { type ExerciseSet } from "@/types/api/logs.types";
import { type WorkoutBlockWithExercise } from "@/types/api/workout.types";
import {
  getExerciseLoggingType,
  getExerciseRequirementsText,
  shouldShowWeightInput,
} from "@/utils/exercise-helpers";

interface AdaptiveSetTrackerProps {
  exercise: WorkoutBlockWithExercise;
  sets: ExerciseSet[];
  onSetsChange: (sets: ExerciseSet[]) => void;
  onProgressUpdate?: (progress: {
    setsCompleted: number;
    duration: number;
    isComplete: boolean;
  }) => void;
  /** [T5-2] Fires when the user checks off the final remaining set. */
  onAllSetsCompleted?: () => void;
  blockType?: string;
}

interface DurationSet extends ExerciseSet {
  durationCompleted?: number;
  isCompleted?: boolean;
}

export default function AdaptiveSetTracker({
  exercise,
  sets,
  onSetsChange,
  onProgressUpdate,
  onAllSetsCompleted,
}: AdaptiveSetTrackerProps) {
  const colors = useThemeColors();
  const loggingType = getExerciseLoggingType(exercise);
  const showWeightInput = shouldShowWeightInput(exercise);
  // Reserved completion accent (MF-004); falls back to ink for themes without
  // it (same pattern as workout-summary.tsx).
  const successColor =
    (colors as ThemeColorPalette).success ?? colors.brand.primary;

  // Duration-based exercise state
  // [T5-3/MF-003] The exercise countdown timer (state + effects + the
  // CircularTimerDisplay hookup) was removed entirely — timers are not
  // supported (owner decision). Duration sets are logged manually.
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [durationSets, setDurationSets] = useState<DurationSet[]>([]);
  // Actual time performed, user-editable. Seeded from the prescription but
  // no longer silently echoed as if it were performance (gap-analysis
  // Phase 2): what gets logged is whatever the user confirms here.
  const [actualDuration, setActualDuration] = useState<string>(
    String(exercise.duration || 0)
  );
  // Actual distance in meters (runs/rows/carries — Phase 5), same pattern
  const [actualDistance, setActualDistance] = useState<string>(
    String(exercise.distanceM || 0)
  );

  // [T5-1] Which traditional set row is expanded for editing (steppers).
  // Collapsed rows show just the prescription + the ✓ target.
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Initialize duration sets if needed
  useEffect(() => {
    if (
      (loggingType === "duration_only" || loggingType === "sets_duration") &&
      durationSets.length === 0
    ) {
      const targetSets = exercise.sets || 1;
      const initialSets: DurationSet[] = Array.from(
        { length: targetSets },
        (_, index) => ({
          roundNumber: 1,
          setNumber: index + 1,
          weight: exercise.weight || 0,
          reps: 0, // Not used for duration exercises
          // Pre-filled from the prescription like reps/weight (T5-1);
          // user-adjustable via the "Actual duration" input.
          durationSeconds: exercise.duration || 0,
          durationCompleted: 0,
          isCompleted: false,
        })
      );
      setDurationSets(initialSets);
      onSetsChange(initialSets);
    }
  }, [loggingType, exercise, durationSets.length, onSetsChange]);

  // Reset set position when exercise changes (on exercise completion/navigation)
  useEffect(() => {
    setCurrentSetIndex(0);
    setExpandedIndex(null);
    setActualDuration(String(exercise.duration || 0));
    setActualDistance(String(exercise.distanceM || 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id]); // Reset when exercise ID changes

  const handleActualDurationChange = (text: string) => {
    setActualDuration(text);
    const seconds = parseInt(text, 10) || 0;
    // Stamp the actual time on every duration set so it persists per set
    // (exercise_set_logs.duration_seconds), and surface it to the parent
    // for the exercise-level durationCompleted.
    const stamped = durationSets.map((set) => ({
      ...set,
      durationSeconds: seconds,
    }));
    setDurationSets(stamped);
    onSetsChange(stamped);
    onProgressUpdate?.({
      setsCompleted: durationSets.filter((s) => s.isCompleted).length,
      duration: seconds,
      isComplete: false,
    });
  };

  // Same stamp-on-every-set pattern for distance (rep-based sets included:
  // a loaded carry can prescribe reps=0 + distance, or sets of carries)
  const handleActualDistanceChange = (text: string) => {
    setActualDistance(text);
    const meters = parseInt(text, 10) || 0;
    const stamped = sets.map((set) => ({ ...set, distanceM: meters }));
    onSetsChange(stamped);
  };

  // [T5-1/T5-2] Toggle a set's done state. Checking a set collapses any open
  // editor; checking the FINAL remaining set notifies the parent (which
  // auto-advances with an Undo window — T5-2).
  const toggleSetCompleted = (index: number) => {
    const updatedSets = [...sets];
    const wasCompleted = !!updatedSets[index].isCompleted;
    updatedSets[index] = { ...updatedSets[index], isCompleted: !wasCompleted };
    onSetsChange(updatedSets);
    if (!wasCompleted) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setExpandedIndex(null);
      if (updatedSets.length > 0 && updatedSets.every((s) => s.isCompleted)) {
        onAllSetsCompleted?.();
      }
    }
  };

  // Update duration set function
  const updateDurationSet = <K extends keyof DurationSet>(
    index: number,
    field: K,
    value: DurationSet[K]
  ) => {
    const updatedSets = [...durationSets];
    updatedSets[index] = { ...updatedSets[index], [field]: value };
    setDurationSets(updatedSets);
    onSetsChange(updatedSets);
  };

  // Add duration set function
  const addDurationSet = () => {
    const lastSet = durationSets[durationSets.length - 1];
    // Use target values for first set, previous set values for subsequent sets
    const useWeight = !lastSet ? exercise.weight || 0 : lastSet.weight;

    const newSet: DurationSet = {
      roundNumber: 1,
      setNumber: (lastSet?.setNumber || 0) + 1,
      weight: useWeight,
      reps: 0,
      durationCompleted: 0,
      isCompleted: false,
    };
    const updatedSets = [...durationSets, newSet];
    setDurationSets(updatedSets);
    onSetsChange(updatedSets);
  };

  // Remove duration set function
  const removeDurationSet = (index: number) => {
    const updatedSets = durationSets.filter((_, i) => i !== index);
    updatedSets.forEach((set, i) => {
      set.setNumber = i + 1;
    });
    setDurationSets(updatedSets);
    onSetsChange(updatedSets);

    // Adjust current set index if needed
    if (currentSetIndex >= updatedSets.length) {
      setCurrentSetIndex(Math.max(0, updatedSets.length - 1));
    }
  };

  // Traditional set tracker functions (adapted from SetTracker)
  const updateSet = <K extends keyof ExerciseSet>(
    index: number,
    field: K,
    value: ExerciseSet[K]
  ) => {
    const updatedSets = [...sets];
    updatedSets[index] = { ...updatedSets[index], [field]: value };
    onSetsChange(updatedSets);
  };

  // Reset traditional set to target values
  const resetSetToTarget = (index: number) => {
    const updatedSets = [...sets];
    updatedSets[index] = {
      ...updatedSets[index],
      weight: exercise.weight || 0,
      reps: exercise.reps || 0,
    };
    onSetsChange(updatedSets);
  };

  const addSet = () => {
    const lastSet = sets[sets.length - 1];
    // Use target values for first set, previous set values for subsequent sets
    const useWeight = !lastSet ? exercise.weight || 0 : lastSet.weight;
    const useReps = !lastSet ? exercise.reps || 0 : lastSet.reps;

    const newSet: ExerciseSet = {
      roundNumber: 1,
      setNumber: (lastSet?.setNumber || 0) + 1,
      weight: useWeight,
      reps: useReps,
    };
    const updatedSets = [...sets, newSet];
    onSetsChange(updatedSets);
  };

  const removeSet = (index: number) => {
    const updatedSets = sets.filter((_, i) => i !== index);
    updatedSets.forEach((set, i) => {
      set.setNumber = i + 1;
    });
    onSetsChange(updatedSets);
  };

  // Render traditional sets/reps interface — [T5-1] "tap what you did".
  // Every prescribed set is pre-rendered and pre-filled (see workout-screen's
  // pre-materialization); finishing a set is ONE tap on its ✓. Tapping the
  // prescription text expands a stepper editor for that row — no keyboard on
  // the happy path. Checking the final set triggers auto-advance (T5-2).
  const renderTraditionalSets = () => {
    const doneCount = sets.filter((s) => s.isCompleted).length;
    return (
      <View>
        {/* Target Information */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-text-primary mb-2">
            Target: {getExerciseRequirementsText(exercise)}
          </Text>
          <Text className="text-xs text-text-muted">
            {doneCount} of {sets.length} sets done
          </Text>
          <View className="h-0.5 mt-2 bg-neutral-medium-1" />
        </View>

        {/* Sets */}
        {sets.map((set, index) => {
          const isDone = !!set.isCompleted;
          const isExpanded = expandedIndex === index && !isDone;
          return (
            <View
              key={index}
              className="mb-3 rounded-xl border bg-background"
              style={{
                borderColor: isDone ? successColor : colors.neutral.medium[1],
                backgroundColor: isDone ? successColor + "14" : undefined,
              }}
            >
              <View className="flex-row items-center p-3">
                {/* Prescription — tap to adjust (locked once checked) */}
                <TouchableOpacity
                  className="flex-1 flex-row items-center"
                  onPress={() => setExpandedIndex(isExpanded ? null : index)}
                  disabled={isDone}
                  accessibilityRole="button"
                  accessibilityLabel={`Set ${set.setNumber}: ${set.reps} reps${
                    showWeightInput ? ` at ${set.weight} pounds` : ""
                  }. ${isDone ? "Done. Tap the checkmark to undo." : "Tap to adjust."}`}
                >
                  <View
                    className="size-7 rounded-full items-center justify-center mr-3"
                    style={{
                      backgroundColor:
                        (isDone ? successColor : colors.brand.primary) + "30",
                    }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{
                        color: isDone ? successColor : colors.brand.primary,
                      }}
                    >
                      {set.setNumber}
                    </Text>
                  </View>
                  <Text className="text-base font-semibold text-text-primary">
                    {set.reps} reps
                    {showWeightInput ? ` · ${set.weight} lb` : ""}
                  </Text>
                  {!isDone && (
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={14}
                      color={colors.text.muted}
                      style={{ marginLeft: 6 }}
                    />
                  )}
                </TouchableOpacity>

                {/* The one big tap: mark this set done (≥44×44 target) */}
                <TouchableOpacity
                  className="size-11 rounded-full items-center justify-center border-2"
                  style={{
                    borderColor: isDone
                      ? successColor
                      : colors.neutral.medium[2],
                    backgroundColor: isDone ? successColor : "transparent",
                  }}
                  onPress={() => toggleSetCompleted(index)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isDone
                      ? `Set ${set.setNumber} done. Tap to undo.`
                      : `Mark set ${set.setNumber} done`
                  }
                  hitSlop={HIT_SLOP_6}
                >
                  <Ionicons
                    name="checkmark"
                    size={22}
                    color={
                      isDone
                        ? colors.contentOnPrimary
                        : colors.neutral.medium[2]
                    }
                  />
                </TouchableOpacity>
              </View>

              {/* Expanded editor — steppers; keyboard only as a fallback */}
              {isExpanded && (
                <View className="px-3 pb-3">

          {/* Weight Input */}
          {showWeightInput && (
            <View className="mb-3">
              <Text className="text-xs mb-2 text-text-muted">Weight (lbs)</Text>
              <View className="flex-row items-center justify-center gap-2">
                <TouchableOpacity
                  className="size-8 rounded-full bg-neutral-light-2 items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Decrease weight 5 pounds"
                  hitSlop={HIT_SLOP_6}
                  onPress={() =>
                    updateSet(index, "weight", Math.max(0, set.weight - 5))
                  }
                >
                  <Text className="text-xs font-semibold text-text-primary">
                    -5
                  </Text>
                </TouchableOpacity>

                <View className="bg-background rounded-full px-4 py-3 border border-neutral-medium-1 min-w-[80px] items-center">
                  <TextInput
                    className="text-lg font-bold text-center text-text-primary"
                    value={set.weight.toString()}
                    onChangeText={(text) =>
                      updateSet(index, "weight", parseFloat(text) || 0)
                    }
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.text.muted}
                  />
                </View>

                <TouchableOpacity
                  className="size-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: colors.brand.primary }}
                  accessibilityRole="button"
                  accessibilityLabel="Increase weight 5 pounds"
                  hitSlop={HIT_SLOP_6}
                  onPress={() => updateSet(index, "weight", set.weight + 5)}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: colors.contentOnPrimary }}
                  >
                    +5
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Reps Input */}
          <View>
            <Text className="text-xs mb-2 text-text-muted">Reps</Text>
            <View className="flex-row items-center justify-center gap-3">
              <TouchableOpacity
                className="size-8 rounded-full bg-neutral-light-2 items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Decrease reps"
                hitSlop={HIT_SLOP_6}
                onPress={() =>
                  updateSet(index, "reps", Math.max(0, set.reps - 1))
                }
              >
                <Ionicons name="remove" size={18} color={colors.text.primary} />
              </TouchableOpacity>

              <View className="bg-background rounded-full px-4 py-3 border border-neutral-medium-1 min-w-[80px] items-center">
                <TextInput
                  className="text-lg font-bold text-center text-text-primary"
                  value={set.reps.toString()}
                  onChangeText={(text) =>
                    updateSet(index, "reps", parseInt(text) || 0)
                  }
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.text.muted}
                />
              </View>

              <TouchableOpacity
                className="size-8 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.brand.primary }}
                accessibilityRole="button"
                accessibilityLabel="Increase reps"
                hitSlop={HIT_SLOP_6}
                onPress={() => updateSet(index, "reps", set.reps + 1)}
              >
                <Ionicons name="add" size={18} color={colors.brand.secondary} />
              </TouchableOpacity>
            </View>
          </View>

                  {/* Editor actions */}
                  <View className="flex-row items-center justify-end mt-3 gap-4">
                    <TouchableOpacity
                      className="flex-row items-center p-1"
                      onPress={() => resetSetToTarget(index)}
                      accessibilityRole="button"
                      accessibilityLabel="Reset set to target"
                      hitSlop={HIT_SLOP_10}
                    >
                      <Ionicons
                        name="refresh-outline"
                        size={16}
                        color={colors.brand.primary}
                      />
                      <Text
                        className="text-xs font-semibold ml-1"
                        style={{ color: colors.brand.primary }}
                      >
                        Reset
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-row items-center p-1"
                      onPress={() => {
                        setExpandedIndex(null);
                        removeSet(index);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Remove set"
                      hitSlop={HIT_SLOP_10}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color={colors.neutral.medium[3]}
                      />
                      <Text className="text-xs font-semibold ml-1 text-text-muted">
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {/* Add an EXTRA set — prescribed sets are already rendered, so this is
            a secondary affordance now, not the filled-primary it used to be */}
        <TouchableOpacity
          className="flex-row items-center justify-center py-3 px-6 rounded-lg border"
          style={{ borderColor: colors.brand.primary }}
          onPress={addSet}
          accessibilityRole="button"
          accessibilityLabel="Add extra set"
        >
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={colors.brand.primary}
          />
          <Text
            className="text-sm font-semibold ml-2"
            style={{ color: colors.brand.primary }}
          >
            Add Extra Set
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render duration-based interface
  const renderDurationInterface = () => {
    const totalSets = exercise.sets || 1;

    return (
      <View>
        {/* Target Information */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-text-primary mb-2">
            Target: {getExerciseRequirementsText(exercise)}
          </Text>
          <Text className="text-xs text-text-muted">
            {durationSets.filter((s) => s.isCompleted).length} / {totalSets}{" "}
            sets completed
          </Text>
          <View className="h-0.5 mt-2 bg-neutral-medium-1" />
        </View>

        {/* Actual duration — user-confirmed, not echoed from the plan */}
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-xs text-text-muted">
            Actual duration (seconds)
          </Text>
          <View className="bg-background rounded-full px-4 py-2 border border-neutral-medium-1 min-w-[80px] items-center">
            <TextInput
              className="text-base font-bold text-center text-text-primary"
              value={actualDuration}
              onChangeText={handleActualDurationChange}
              keyboardType="number-pad"
              maxLength={5}
              placeholder="0"
              placeholderTextColor={colors.text.muted}
              accessibilityLabel="Actual duration in seconds"
            />
          </View>
        </View>

        {/* Duration Sets Display */}
        {durationSets.map((set, index) => (
          <View
            key={index}
            className="mb-4 p-3 rounded-lg border border-neutral-medium-1 bg-background"
          >
            <View className="flex-row items-center justify-between mb-3">
              <View
                className="size-6 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.brand.primary + "30" }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: colors.brand.primary }}
                >
                  {set.setNumber}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => removeDurationSet(index)}
                accessibilityRole="button"
                accessibilityLabel="Remove set"
                hitSlop={HIT_SLOP_10}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={colors.neutral.medium[3]}
                />
              </TouchableOpacity>
            </View>

            {/* Weight Input */}
            <View className="mb-3">
              <Text className="text-xs mb-2 text-text-muted">Weight (lbs)</Text>
              <View className="flex-row items-center justify-center gap-2">
                <TouchableOpacity
                  className="size-8 rounded-full bg-neutral-light-2 items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Decrease weight 5 pounds"
                  hitSlop={HIT_SLOP_6}
                  onPress={() =>
                    updateDurationSet(
                      index,
                      "weight",
                      Math.max(0, set.weight - 5)
                    )
                  }
                >
                  <Text className="text-xs font-semibold text-text-primary">
                    -5
                  </Text>
                </TouchableOpacity>

                <View className="bg-background rounded-full px-4 py-3 border border-neutral-medium-1 min-w-[80px] items-center">
                  <TextInput
                    className="text-lg font-bold text-center text-text-primary"
                    value={set.weight.toString()}
                    onChangeText={(text) =>
                      updateDurationSet(index, "weight", parseFloat(text) || 0)
                    }
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.text.muted}
                  />
                </View>

                <TouchableOpacity
                  className="size-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: colors.brand.primary }}
                  accessibilityRole="button"
                  accessibilityLabel="Increase weight 5 pounds"
                  hitSlop={HIT_SLOP_6}
                  onPress={() =>
                    updateDurationSet(index, "weight", set.weight + 5)
                  }
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: colors.contentOnPrimary }}
                  >
                    +5
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Duration Status */}
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-text-muted">
                Duration: {exercise.duration || 0}s
              </Text>
              {set.isCompleted ? (
                <View className="flex-row items-center">
                  <Text
                    className="text-xs mr-2"
                    style={{ color: colors.brand.primary }}
                  >
                    Completed
                  </Text>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={colors.brand.primary}
                  />
                </View>
              ) : index === currentSetIndex ? (
                <Text className="text-xs" style={{ color: colors.text.muted }}>
                  Current set
                </Text>
              ) : (
                <Text className="text-xs" style={{ color: colors.text.muted }}>
                  Pending
                </Text>
              )}
            </View>
          </View>
        ))}

        {/* Add Set Button */}
        <TouchableOpacity
          className="flex-row items-center justify-center py-3 px-6 rounded-lg border mb-4"
          style={{
            borderColor: colors.brand.primary,
            backgroundColor: colors.brand.primary,
          }}
          onPress={addDurationSet}
          accessibilityRole="button"
          accessibilityLabel="Add set"
        >
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={colors.contentOnPrimary}
          />
          <Text
            className="text-sm font-semibold ml-2"
            style={{ color: colors.contentOnPrimary }}
          >
            Add Set
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Return appropriate interface based on exercise type
  // Distance-prescribed movements (runs, rows, carries — Phase 5) get an
  // actual-distance entry above whichever interface renders. Same honor-
  // system pattern as actual duration: seeded from the prescription,
  // user-confirmed, stamped on every set as distanceM.
  const distanceInput =
    exercise.distanceM && exercise.distanceM > 0 ? (
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-xs text-text-muted">
          Actual distance (meters)
        </Text>
        <View className="bg-background rounded-full px-4 py-2 border border-neutral-medium-1 min-w-[80px] items-center">
          <TextInput
            className="text-base font-bold text-center text-text-primary"
            value={actualDistance}
            onChangeText={handleActualDistanceChange}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="0"
            placeholderTextColor={colors.text.muted}
            accessibilityLabel="Actual distance in meters"
          />
        </View>
      </View>
    ) : null;

  switch (loggingType) {
    case "duration_only":
    case "sets_duration":
      return (
        <View>
          {distanceInput}
          {renderDurationInterface()}
        </View>
      );

    case "sets_reps":
    case "hybrid":
    default:
      return (
        <View>
          {distanceInput}
          {renderTraditionalSets()}
        </View>
      );
  }
}
