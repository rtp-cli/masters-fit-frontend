import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { colors } from "@/lib/theme";
import { WorkoutBlockWithExercise } from "@/types/api/workout.types";
import { ExerciseSet } from "./SetTracker";
import CircularTimerDisplay from "./CircularTimerDisplay";
import {
  getExerciseLoggingType,
  getExerciseRequirementsText,
  shouldShowWeightInput,
} from "@/utils/exerciseHelpers";

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
  onProgressUpdate,
  blockType = "traditional",
}: AdaptiveSetTrackerProps) {
  const loggingType = getExerciseLoggingType(exercise);
  const showWeightInput = shouldShowWeightInput(exercise);

  // Duration-based exercise state
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [durationSets, setDurationSets] = useState<DurationSet[]>([]);

  // Timer state for CircularTimerDisplay
  const [countdown, setCountdown] = useState(exercise.duration || 0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [showExerciseTimer, setShowExerciseTimer] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Format timer display for button
  const formatExerciseTimerDisplay = () => {
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

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

  // Reset countdown when not active or exercise changes
  useEffect(() => {
    if (!isTimerActive) {
      setCountdown(exercise.duration || 0);
      setIsCompleted(false);
      setIsTimerPaused(false);
    }
  }, [exercise.duration, currentSetIndex, isTimerActive]);

  // Reset timer state when exercise changes (on exercise completion/navigation)
  useEffect(() => {
    setIsTimerActive(false);
    setIsTimerPaused(false);
    setCountdown(exercise.duration || 0);
    setIsCompleted(false);
    setCurrentSetIndex(0);
  }, [exercise.id]); // Reset when exercise ID changes

  // Timer countdown logic
  useEffect(() => {
    if (isTimerActive && !isTimerPaused && countdown > 0 && !isCompleted) {
      // TIMER DISABLED: Exercise timer timeout commented out
      // timerRef.current = setTimeout(() => {
      //   setCountdown((prev) => {
      //     const newValue = prev - 1;
      //     if (newValue <= 0) {
      //       // Timer finished
      //       setIsCompleted(true);
      //       setIsTimerActive(false);
      //       setIsTimerPaused(false);
      //       // Add notification and haptic feedback
      //       try {
      //         // Send local notification with sound (no banner will show)
      //         Notifications.scheduleNotificationAsync({
      //           content: {
      //             title: "Exercise Complete!",
      //             body: "Your exercise duration has ended.",
      //             sound: "tri-tone", // iOS notification sound
      //           },
      //           trigger: null, // Show immediately
      //         });
      //         // Add haptic feedback
      //         Haptics.notificationAsync(
      //           Haptics.NotificationFeedbackType.Success
      //         );
      //       } catch (error) {
      //         console.log("Notification/haptic feedback error:", error);
      //       }
      //       // Handle duration logging (but don't auto-advance)
      //       setTimeout(() => {
      //         handleTimerCompletion();
      //       }, 100);
      //       return 0;
      //     }
      //     return newValue;
      //   });
      // }, 1000);
    } else {
      if (timerRef.current) {
        // TIMER DISABLED: Clear timeout commented out
        // clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        // TIMER DISABLED: Clear timeout commented out
        // clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    isTimerActive,
    isTimerPaused,
    countdown,
    isCompleted,
    currentSetIndex,
    exercise.sets,
  ]);

  // Handle timer completion (log duration but don't advance)
  const handleTimerCompletion = () => {
    const updatedSets = [...durationSets];
    updatedSets[currentSetIndex] = {
      ...updatedSets[currentSetIndex],
      durationCompleted: exercise.duration || 0,
      isCompleted: true,
    };
    setDurationSets(updatedSets);
    onSetsChange(updatedSets);

    // Update progress but don't advance to next set
    const completedSets = updatedSets.filter((set) => set.isCompleted).length;
    // Calculate total duration from all completed sets for backend logging
    const totalDuration = updatedSets
      .filter((set) => set.isCompleted)
      .reduce((sum, set) => sum + (set.durationCompleted || 0), 0);

    onProgressUpdate?.({
      setsCompleted: completedSets,
      duration: totalDuration, // Send total duration, not individual set duration
      isComplete: false, // Don't mark as complete to prevent auto-advance
    });
  };

  const handleStartPause = () => {
    if (isCompleted) return; // Don't allow start/pause when completed

    if (!isTimerActive) {
      // Starting timer for first time
      setIsTimerActive(true);
      setIsTimerPaused(false);
    } else {
      // Toggle pause/resume
      setIsTimerPaused(!isTimerPaused);
    }
  };

  const handleReset = () => {
    // Reset timer to beginning and restart automatically
    setIsTimerActive(true);
    setIsTimerPaused(false);
    setCountdown(exercise.duration || 0);
    setIsCompleted(false);
  };

  const handleCancel = () => {
    // Cancel timer and return to initial state (not active, full duration)
    setIsTimerActive(false);
    setIsTimerPaused(false);
    setCountdown(exercise.duration || 0);
    setIsCompleted(false);
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
              className="w-6 h-6 rounded-full items-center justify-center"
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
              >
                <Ionicons
                  name="refresh-outline"
                  size={16}
                  color={colors.brand.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeSet(index)}>
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
                  className="w-8 h-8 rounded-full bg-neutral-light-2 items-center justify-center"
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
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: colors.brand.primary }}
                  onPress={() => updateSet(index, "weight", set.weight + 5)}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: colors.brand.secondary }}
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
                className="w-8 h-8 rounded-full bg-neutral-light-2 items-center justify-center"
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
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.brand.primary }}
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
      >
        <Ionicons
          name="add-circle-outline"
          size={20}
          color={colors.brand.secondary}
        />
        <Text
          className="text-sm font-semibold ml-2"
          style={{ color: colors.brand.secondary }}
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
                className="w-6 h-6 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.brand.primary + "30" }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: colors.brand.primary }}
                >
                  {set.setNumber}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeDurationSet(index)}>
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
                  className="w-8 h-8 rounded-full bg-neutral-light-2 items-center justify-center"
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
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: colors.brand.primary }}
                  onPress={() =>
                    updateDurationSet(index, "weight", set.weight + 5)
                  }
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: colors.brand.secondary }}
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
        >
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={colors.brand.secondary}
          />
          <Text
            className="text-sm font-semibold ml-2"
            style={{ color: colors.brand.secondary }}
          >
            Add Set
          </Text>
        </TouchableOpacity>

        {/* TIMER DISPLAY HIDDEN: Exercise Timer interface commented out */}
        {/* {currentSetIndex < durationSets.length && (
          <View className="mt-4">
            <TouchableOpacity
              className={`py-3 px-6 rounded-lg items-center border-2 mb-2 ${
                showExerciseTimer
                  ? "bg-brand-primary border-brand-primary"
                  : "border-brand-primary bg-transparent"
              }`}
              onPress={() => setShowExerciseTimer(!showExerciseTimer)}
            >
              <Text
                className={`text-sm font-semibold ${
                  showExerciseTimer ? "text-white" : ""
                }`}
                style={!showExerciseTimer ? { color: colors.brand.primary } : {}}
              >
                {showExerciseTimer ? "Hide Exercise Timer" : `Show Exercise Timer (${formatExerciseTimerDisplay()})`}
              </Text>
            </TouchableOpacity>

            {showExerciseTimer && (
              <View className="rounded-2xl p-4 border shadow-rn-sm border-neutral-light-2 bg-card">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-sm font-semibold text-text-primary">
                    Exercise Timer
                  </Text>
                </View>

                <CircularTimerDisplay
                  countdown={countdown}
                  targetDuration={exercise.duration || 30}
                  isActive={isTimerActive}
                  isPaused={isTimerPaused}
                  isCompleted={isCompleted}
                  startButtonText={`Start Timer`}
                  onStartPause={handleStartPause}
                  onReset={handleReset}
                  onCancel={handleCancel}
                />
              </View>
            )}
          </View>
        )} */}
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
