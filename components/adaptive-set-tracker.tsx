import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity,View } from "react-native";

import { HIT_SLOP_6, HIT_SLOP_10 } from "@/constants";
import { useThemeColors } from "@/lib/theme";
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
}: AdaptiveSetTrackerProps) {
  const colors = useThemeColors();
  const loggingType = getExerciseLoggingType(exercise);
  const showWeightInput = shouldShowWeightInput(exercise);

  // Duration-based exercise state
  // [T5-3/MF-003] The exercise countdown timer (state + effects + the
  // CircularTimerDisplay hookup) was removed entirely — timers are not
  // supported (owner decision). Duration sets are logged manually.
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [durationSets, setDurationSets] = useState<DurationSet[]>([]);

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
  }, [exercise.id]); // Reset when exercise ID changes

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

  // Render traditional sets/reps interface
  const renderTraditionalSets = () => (
    <View>
      {/* Target Information */}
      <View className="mb-4">
        <Text className="text-sm font-semibold text-text-primary mb-2">
          Target: {getExerciseRequirementsText(exercise)}
        </Text>
        <Text className="text-xs text-text-muted">
          {sets.length} / {exercise.sets || 3} sets logged
        </Text>
        <View className="h-0.5 mt-2 bg-neutral-medium-1" />
      </View>

      {/* Sets */}
      {sets.map((set, index) => (
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
            <View className="flex-row items-center">
              <TouchableOpacity
                className="p-1 mr-1"
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
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => removeSet(index)}
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
          </View>

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
        </View>
      ))}

      {/* Add Set Button */}
      <TouchableOpacity
        className="flex-row items-center justify-center py-3 px-6 rounded-lg border"
        style={{
          borderColor: colors.brand.primary,
          backgroundColor: colors.brand.primary,
        }}
        onPress={addSet}
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
  switch (loggingType) {
    case "duration_only":
    case "sets_duration":
      return renderDurationInterface();

    case "sets_reps":
    case "hybrid":
    default:
      return renderTraditionalSets();
  }
}
