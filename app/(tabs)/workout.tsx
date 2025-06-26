import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useFocusEffect } from "@react-navigation/native";
import { fetchActiveWorkout, createExerciseLog } from "@/lib/workouts";
import { getCurrentUser } from "@/lib/auth";
import { calculateWorkoutDuration, formatEquipment } from "@/utils";
import ExerciseLink from "@/components/ExerciseLink";
import { colors } from "@/lib/theme";
import {
  WorkoutBlockWithExercises,
  WorkoutBlockWithExercise,
  PlanDayWithBlocks,
  CreateExerciseLogParams,
  getBlockTypeDisplayName,
} from "@/types/api/workout.types";
import { Exercise } from "@/types/api/exercise.types";

// Local types for this component
interface ExerciseProgress {
  setsCompleted: number;
  repsCompleted: number;
  weightUsed: number;
  duration: number;
  restTime: number;
  notes: string;
}

// Utility functions
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default function WorkoutScreen() {
  // Core state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workout, setWorkout] = useState<PlanDayWithBlocks | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);
  const [isWorkoutCompleted, setIsWorkoutCompleted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Timer state
  const [workoutTimer, setWorkoutTimer] = useState(0);
  const [exerciseTimer, setExerciseTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Exercise progress state
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress[]>(
    []
  );

  // Modal state
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isCompletingExercise, setIsCompletingExercise] = useState(false);

  // UI state
  const scrollViewRef = useRef<ScrollView>(null);

  // Get flattened exercises from blocks
  const getFlattenedExercises = (): WorkoutBlockWithExercise[] => {
    if (!workout?.blocks) return [];
    return workout.blocks.flatMap((block) => block.exercises);
  };

  const exercises = getFlattenedExercises();
  const currentExercise = exercises[currentExerciseIndex];
  const currentProgress = exerciseProgress[currentExerciseIndex];

  // Calculate overall workout progress (0 - 100)
  const progressPercent =
    exercises.length > 0 ? (currentExerciseIndex / exercises.length) * 100 : 0;

  // Timer management
  useEffect(() => {
    if (isWorkoutStarted && !isPaused && !isWorkoutCompleted) {
      timerRef.current = setInterval(() => {
        setWorkoutTimer((prev) => prev + 1);
        setExerciseTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isWorkoutStarted, isPaused, isWorkoutCompleted]);

  // Load workout data
  const loadWorkout = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchActiveWorkout();

      if (!response?.workout?.planDays?.length) {
        setWorkout(null);
        return;
      }

      // Find today's workout
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const todaysWorkout = response.workout.planDays.find((day: any) => {
        const dayDate = new Date(day.date).toISOString().split("T")[0];
        return dayDate === today;
      });

      if (!todaysWorkout) {
        setWorkout(null);
        return;
      }

      setWorkout(todaysWorkout);

      // Initialize exercise progress
      const flatExercises = todaysWorkout.blocks.flatMap(
        (block: WorkoutBlockWithExercises) => block.exercises
      );
      const initialProgress: ExerciseProgress[] = flatExercises.map(
        (exercise: WorkoutBlockWithExercise) => ({
          setsCompleted: 0,
          repsCompleted: 0,
          weightUsed: exercise.weight || 0,
          duration: exercise.duration || 0,
          restTime: exercise.restTime || 0,
          notes: "",
        })
      );
      setExerciseProgress(initialProgress);
    } catch (err) {
      console.error("Error loading workout:", err);
      setError("Failed to load workout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Load workout on mount and when tab is focused
  useEffect(() => {
    loadWorkout();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadWorkout();
    }, [])
  );

  // Update exercise progress
  const updateProgress = (field: keyof ExerciseProgress, value: any) => {
    setExerciseProgress((prev) => {
      const updated = [...prev];
      updated[currentExerciseIndex] = {
        ...updated[currentExerciseIndex],
        [field]: value,
      };
      return updated;
    });
  };

  // Start workout
  const startWorkout = () => {
    setIsWorkoutStarted(true);
    setWorkoutTimer(0);
    setExerciseTimer(0);
  };

  // Toggle pause
  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  // Complete current exercise
  const completeExercise = async () => {
    if (!currentExercise || !currentProgress) return;

    setIsCompletingExercise(true);

    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("User not authenticated");

      // Create exercise log - use timer for duration
      await createExerciseLog({
        planDayExerciseId: currentExercise.id,
        setsCompleted: currentProgress.setsCompleted,
        repsCompleted: currentProgress.repsCompleted,
        weightUsed: currentProgress.weightUsed,
        isComplete: true,
        timeTaken: exerciseTimer, // This logs the actual time spent on exercise
        notes: currentProgress.notes,
      });

      // Move to next exercise or complete workout
      if (currentExerciseIndex < exercises.length - 1) {
        setCurrentExerciseIndex((prev) => prev + 1);
        setExerciseTimer(0);
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      } else {
        // All exercises completed
        setCurrentExerciseIndex(exercises.length); // This will make progress show 100%
        setIsWorkoutCompleted(true);
        Alert.alert(
          "Workout Complete!",
          "Congratulations! You've completed today's workout.",
          [{ text: "OK" }]
        );
      }

      setShowCompleteModal(false);
    } catch (err) {
      console.error("Error completing exercise:", err);
      Alert.alert("Error", "Failed to complete exercise. Please try again.");
    } finally {
      setIsCompletingExercise(false);
    }
  };

  // Get current block for the current exercise
  const getCurrentBlock = (): WorkoutBlockWithExercises | null => {
    if (!workout?.blocks || !currentExercise) return null;

    for (const block of workout.blocks) {
      if (block.exercises.some((ex) => ex.id === currentExercise.id)) {
        return block;
      }
    }
    return null;
  };

  const currentBlock = getCurrentBlock();

  // Render loading state
  if (loading) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color={colors.brand.primary} />
        <Text className="text-text-primary mt-4 text-base">
          Loading workout...
        </Text>
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View className="flex-1 bg-background justify-center items-center px-6">
        <Ionicons
          name="alert-circle-outline"
          size={64}
          color={colors.text.secondary}
        />
        <Text className="text-lg font-bold text-text-primary text-center mt-4 mb-2">
          Error Loading Workout
        </Text>
        <Text className="text-text-muted text-center mb-6 leading-6">
          {error}
        </Text>
        <TouchableOpacity
          className="bg-primary rounded-xl py-3 px-6"
          onPress={loadWorkout}
        >
          <Text className="text-secondary font-semibold">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render no workout state
  if (!workout) {
    return (
      <View className="flex-1 bg-background justify-center items-center px-6">
        <Ionicons name="fitness-outline" size={64} color={colors.text.muted} />
        <Text className="text-lg font-bold text-text-primary text-center mt-4 mb-2">
          No Workout Today
        </Text>
        <Text className="text-text-muted text-center mb-6 leading-6">
          You don't have a workout scheduled for today. Check back tomorrow or
          visit the Calendar tab to see your workout plan.
        </Text>
        <TouchableOpacity
          className="bg-primary rounded-xl py-3 px-6"
          onPress={loadWorkout}
        >
          <Text className="text-secondary font-semibold">Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render workout completed state
  if (isWorkoutCompleted) {
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
          Amazing work! You completed all {exercises.length} exercises in{" "}
          {formatTime(workoutTimer)}.
        </Text>
        <Text className="text-text-muted text-center mb-8 leading-6">
          Check back tomorrow for your next workout.
        </Text>
      </View>
    );
  }

  // Main workout interface
  return (
    <View className="flex-1 bg-background">
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Hero Exercise Media */}
        {currentExercise ? (
          <ExerciseLink
            link={currentExercise.exercise.link}
            exerciseName={currentExercise.exercise.name}
            variant="hero"
          />
        ) : null}

        <View className="px-6 pt-6">
          {/* Workout Header */}
          {/* Pre-computed progressPercent used for the progress bar */}
          <View className="mb-6">
            <View className="w-full h-2 mb-4 bg-neutral-light-2 rounded-full overflow-hidden">
              <View
                className="h-full bg-primary rounded-full"
                style={{ width: `${progressPercent.toFixed(0)}%` } as any}
              />
            </View>
            <Text className="text-2xl font-bold text-text-primary mb-2">
              {workout.name}
            </Text>
            {workout.instructions ? (
              <Text className="text-base text-text-secondary leading-6">
                {workout.instructions}
              </Text>
            ) : null}
          </View>

          {/* Current Block Info */}
          {currentBlock ? (
            <View className="bg-brand-light-1 rounded-2xl p-4 mb-6">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center justify-between px-2 mb-1">
                    <Text className="text-sm font-bold text-text-primary mb-1">
                      {currentBlock.blockName ||
                        getBlockTypeDisplayName(currentBlock.blockType)}
                    </Text>
                    <View className="items-end">
                      {currentBlock.rounds ? (
                        <Text className="text-sm font-semibold text-text-primary">
                          {currentBlock.rounds === 1
                            ? "1 Round"
                            : `${currentBlock.rounds} Rounds`}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  {currentBlock.instructions ? (
                    <Text className="text-sm text-text-secondary px-2 leading-5">
                      {currentBlock.instructions}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          ) : null}

          {/* Current Exercise */}
          {currentExercise ? (
            <View className="bg-card rounded-2xl mb-6 p-6 border shadow-sm font-bold border-neutral-light-2">
              <Text className="text-xl font-bold mb-4 text-text-primary">
                {currentExercise.exercise.name}
              </Text>

              <Text className="text-sm text-text-primary leading-6 mb-3">
                {currentExercise.exercise.description}
              </Text>

              {/* Equipment */}
              {currentExercise.exercise.equipment ? (
                <View className="flex-row justify-start items-center">
                  <View className="flex-col items-start justify-center mb-2">
                    <View className="flex-row items-center mb-2">
                      <Ionicons
                        name="fitness-outline"
                        size={16}
                        color={colors.text.muted}
                      />
                      <Text className="text-sm font-semibold text-text-muted mx-2">
                        Equipment
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-center flex-wrap">
                      {currentExercise.exercise.equipment
                        .split(",")
                        .map((equipment, index) => (
                          <View
                            key={index}
                            className=" bg-brand-primary rounded-full px-3 py-1 mr-2"
                          >
                            <Text className="text-xs text-text-primary font-semibold">
                              {formatEquipment(equipment.trim())}
                            </Text>
                          </View>
                        ))}
                    </View>
                  </View>
                </View>
              ) : null}

              {/* Progress Tracking - Sleek Twitter-style */}
              {isWorkoutStarted && currentProgress ? (
                <View className="space-y-4">
                  {/* Sets - Compact bubbles only */}
                  {currentExercise.sets ? (
                    <View className=" rounded-2xl p-4">
                      <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-sm font-semibold text-text-primary">
                          Sets
                        </Text>
                        <Text className="text-xs text-text-muted">
                          Target:{" "}
                          {currentExercise.sets === 1
                            ? "1 Set"
                            : `${currentExercise.sets} Sets`}
                        </Text>
                      </View>
                      <View className="flex-row justify-center gap-2">
                        {Array.from(
                          { length: currentExercise.sets },
                          (_, i) => {
                            const isCompleted =
                              i < currentProgress.setsCompleted;
                            return (
                              <TouchableOpacity
                                key={i}
                                className={`w-9 h-9 rounded-full items-center justify-center border-2 ${
                                  isCompleted
                                    ? "border-primary bg-primary"
                                    : "border-neutral-medium-1 bg-background"
                                }`}
                                onPress={() =>
                                  updateProgress("setsCompleted", i + 1)
                                }
                              >
                                {isCompleted ? (
                                  <Ionicons
                                    name="checkmark"
                                    size={14}
                                    color={colors.text.secondary}
                                  />
                                ) : (
                                  <Text className="text-xs font-semibold text-text-muted">
                                    {i + 1}
                                  </Text>
                                )}
                              </TouchableOpacity>
                            );
                          }
                        )}
                      </View>
                    </View>
                  ) : null}

                  {/* Reps - Tap counter only, no slider */}
                  {currentExercise.reps ? (
                    <View className="rounded-2xl p-4">
                      <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-sm font-semibold text-text-primary">
                          Reps
                        </Text>
                        <Text className="text-xs text-text-muted">
                          Target:{" "}
                          {currentExercise.reps === 1
                            ? "1 Rep"
                            : `${currentExercise.reps} Reps`}
                        </Text>
                      </View>
                      <View className="flex-row items-center justify-center gap-3">
                        <TouchableOpacity
                          className="w-9 h-9 rounded-full bg-neutral-light-2 items-center justify-center"
                          onPress={() =>
                            updateProgress(
                              "repsCompleted",
                              Math.max(0, currentProgress.repsCompleted - 1)
                            )
                          }
                        >
                          <Ionicons
                            name="remove"
                            size={18}
                            color={colors.text.primary}
                          />
                        </TouchableOpacity>

                        <View className="bg-background rounded-2xl px-4 py-3 border border-dashed border-neutral-light-2 min-w-[80px] items-center">
                          <TextInput
                            className="text-lg font-bold text-text-primary text-center"
                            value={String(currentProgress.repsCompleted)}
                            onChangeText={(text) =>
                              updateProgress("repsCompleted", Number(text) || 0)
                            }
                            keyboardType="numeric"
                          />
                        </View>

                        <TouchableOpacity
                          className="w-9 h-9 rounded-full bg-primary items-center justify-center"
                          onPress={() =>
                            updateProgress(
                              "repsCompleted",
                              currentProgress.repsCompleted + 1
                            )
                          }
                        >
                          <Ionicons
                            name="add"
                            size={18}
                            color={colors.text.secondary}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}

                  {/* Weight - Quick buttons only, no slider */}
                  <View className="rounded-2xl p-4">
                    <View className="flex-row items-center justify-between mb-3">
                      <Text className="text-sm font-semibold text-text-primary">
                        Weight (lbs)
                      </Text>
                      {currentExercise.weight ? (
                        <TouchableOpacity
                          className="bg-primary/10 rounded-full px-2 py-1"
                          onPress={() =>
                            updateProgress(
                              "weightUsed",
                              currentExercise.weight || 0
                            )
                          }
                        >
                          <Text className="text-xs font-semibold text-primary">
                            Target: {currentExercise.weight} lbs
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <View className="flex-row items-center justify-center gap-3">
                      <TouchableOpacity
                        className="w-9 h-9 rounded-full bg-neutral-light-2 items-center justify-center"
                        onPress={() =>
                          updateProgress(
                            "weightUsed",
                            Math.max(0, currentProgress.weightUsed - 10)
                          )
                        }
                      >
                        <Text className="text-xs font-semibold text-text-primary">
                          -10
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="w-9 h-9 rounded-full bg-neutral-light-2 items-center justify-center"
                        onPress={() =>
                          updateProgress(
                            "weightUsed",
                            Math.max(0, currentProgress.weightUsed - 5)
                          )
                        }
                      >
                        <Text className="text-xs font-semibold text-text-primary">
                          -5
                        </Text>
                      </TouchableOpacity>

                      <View className="bg-background rounded-2xl px-4 py-3 border border-dashed border-neutral-light-2 min-w-[80px] items-center">
                        <TextInput
                          className="text-lg font-bold text-text-primary text-center"
                          value={String(currentProgress.weightUsed)}
                          onChangeText={(text) =>
                            updateProgress("weightUsed", Number(text) || 0)
                          }
                          keyboardType="numeric"
                        />
                      </View>

                      <TouchableOpacity
                        className="w-9 h-9 rounded-full bg-primary items-center justify-center"
                        onPress={() =>
                          updateProgress(
                            "weightUsed",
                            currentProgress.weightUsed + 5
                          )
                        }
                      >
                        <Text className="text-xs font-semibold text-secondary">
                          +5
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="w-9 h-9 rounded-full bg-primary items-center justify-center"
                        onPress={() =>
                          updateProgress(
                            "weightUsed",
                            currentProgress.weightUsed + 10
                          )
                        }
                      >
                        <Text className="text-xs font-semibold text-secondary">
                          +10
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Duration - Auto-logged, compact display */}
                  {currentExercise.duration ? (
                    <View className="rounded-2xl p-4">
                      <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-sm font-semibold text-text-primary">
                          Duration
                        </Text>
                        <Text className="text-xs text-text-muted">
                          Target: {currentExercise.duration}s
                        </Text>
                      </View>
                      <View className="flex-row items-center justify-between">
                        <Text
                          className={`text-base font-bold ${
                            exerciseTimer >= currentExercise.duration
                              ? "text-primary"
                              : "text-text-primary"
                          }`}
                        >
                          {formatTime(exerciseTimer)}
                        </Text>
                        {exerciseTimer >= currentExercise.duration && (
                          <View className="flex-row items-center">
                            <Ionicons
                              name="checkmark-circle"
                              size={16}
                              color={colors.brand.primary}
                            />
                            <Text className="text-xs font-semibold text-primary ml-1">
                              Done!
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ) : null}

                  {/* Rest Time - Quick presets only */}
                  {currentExercise.restTime ? (
                    <View className="rounded-2xl p-4">
                      <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-sm font-semibold text-text-primary">
                          Rest Time
                        </Text>
                        <Text className="text-xs text-text-muted">
                          Target: {currentProgress.restTime}s
                        </Text>
                      </View>
                      <View className="flex-row justify-center gap-2">
                        {[30, 60, 90, 120].map((time) => (
                          <TouchableOpacity
                            key={time}
                            className={`rounded-xl px-3 py-1 ${
                              currentProgress.restTime === time
                                ? "bg-primary"
                                : "bg-neutral-light-2"
                            }`}
                            onPress={() => updateProgress("restTime", time)}
                          >
                            <Text
                              className={`text-sm font-semibold ${
                                currentProgress.restTime === time
                                  ? "text-secondary"
                                  : "text-text-primary"
                              }`}
                            >
                              {time}s
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  {/* Notes - Compact with quick chips */}
                  <View className="rounded-2xl p-4">
                    <Text className="text-sm font-semibold text-text-primary mb-3">
                      Notes
                    </Text>
                    <TextInput
                      className="bg-background border border-neutral-light-2 rounded-xl p-3 text-text-primary text-sm"
                      placeholder="Add a note... (Optional)"
                      placeholderTextColor={colors.text.muted}
                      value={currentProgress.notes}
                      onChangeText={(text) => updateProgress("notes", text)}
                      multiline
                      numberOfLines={2}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Workout Overview */}
          <View className="bg-card rounded-2xl p-6 shadow-sm border border-neutral-light-2">
            <Text className="text-lg font-bold text-text-primary mb-4">
              Today's Workout Plan
            </Text>

            {workout.blocks.map((block, blockIndex) => (
              <View key={block.id} className="mb-4 last:mb-0">
                <View className="rounded-xl p-3 mb-2">
                  <Text className="text-sm font-bold text-text-primary">
                    {block.blockName ||
                      getBlockTypeDisplayName(block.blockType)}
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

                  return (
                    <View
                      key={exercise.id}
                      className={`flex-row items-center p-3 rounded-xl mb-2 ${
                        isCurrent
                          ? "bg-brand-light-1 border border-brand-light-1"
                          : isCompleted
                            ? "bg-brand-light-1 border border-brand-light-1"
                            : "bg-background border border-neutral-light-2"
                      }`}
                    >
                      <View
                        className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${isCompleted ? "bg-neutral-dark-1" : "bg-brand-medium-2"}`}
                      >
                        {isCompleted ? (
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={colors.neutral.light[2]}
                          />
                        ) : isCurrent ? (
                          <Ionicons
                            name="play"
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
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View className="bg-card p-6">
        {!isWorkoutStarted ? (
          <TouchableOpacity
            className="bg-primary rounded-2xl py-4 flex-row items-center justify-center"
            onPress={startWorkout}
          >
            <Ionicons name="play" size={20} color={colors.text.secondary} />
            <Text className="text-secondary font-bold text-lg ml-2">
              Start Workout
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="bg-neutral-light-2 rounded-2xl py-4 flex-1 flex-row items-center justify-center"
              onPress={togglePause}
            >
              <Ionicons
                name={isPaused ? "play" : "pause"}
                size={20}
                color={colors.text.primary}
              />
              <Text className="text-text-primary font-semibold ml-2">
                {isPaused ? "Resume" : "Pause"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-primary rounded-2xl py-4 flex-1 flex-row items-center justify-center"
              onPress={() => setShowCompleteModal(true)}
            >
              <Ionicons
                name="checkmark"
                size={20}
                color={colors.text.secondary}
              />
              <Text className="text-secondary font-bold text-lg ml-2">
                Complete Exercise
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Complete Exercise Modal */}
      <Modal visible={showCompleteModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <Text className="text-xl font-bold text-text-primary mb-4 text-center">
              Complete Exercise
            </Text>
            <Text className="text-base text-text-secondary text-center mb-6 leading-6">
              Mark "{currentExercise?.exercise.name}" as complete? Your progress
              will be saved.
            </Text>

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="bg-neutral-light-2 rounded-xl py-3 px-6 flex-1"
                onPress={() => setShowCompleteModal(false)}
              >
                <Text className="text-text-primary font-semibold text-center">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`bg-primary rounded-xl py-3 px-6 flex-1 ${
                  isCompletingExercise ? "opacity-75" : ""
                }`}
                onPress={completeExercise}
                disabled={isCompletingExercise}
              >
                {isCompletingExercise ? (
                  <View className="flex-row items-center justify-center">
                    <ActivityIndicator
                      size="small"
                      color={colors.text.secondary}
                    />
                    <Text className="text-secondary font-semibold ml-2">
                      Saving...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-secondary font-semibold text-center">
                    Complete
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
