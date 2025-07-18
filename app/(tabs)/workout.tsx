import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useFocusEffect } from "@react-navigation/native";
import {
  fetchActiveWorkout,
  createExerciseLog,
  markPlanDayAsComplete,
} from "@/lib/workouts";
import { getCurrentUser } from "@/lib/auth";
import {
  calculateWorkoutDuration,
  formatEquipment,
  getCurrentDate,
  formatDateAsString,
} from "@/utils";
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
import { useWorkout } from "@/contexts/WorkoutContext";
import { useAppDataContext } from "@/contexts/AppDataContext";
import { WorkoutSkeleton } from "../../components/skeletons/SkeletonScreens";

// Local types for this component
interface ExerciseProgress {
  setsCompleted: number;
  repsCompleted: number;
  roundsCompleted: number;
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
  // Get workout context for tab disabling
  const { setWorkoutInProgress, isWorkoutInProgress } = useWorkout();
  
  // Get data refresh functions
  const { refresh: { refreshDashboard } } = useAppDataContext();

  // Core state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workout, setWorkout] = useState<PlanDayWithBlocks | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);
  const [isWorkoutCompleted, setIsWorkoutCompleted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  // Rest timer state
  const [isRestTimerActive, setIsRestTimerActive] = useState(false);
  const [restTimerCountdown, setRestTimerCountdown] = useState(0);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  console.log("WORKOUT", workout);
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

  // Rest timer management
  useEffect(() => {
    if (isRestTimerActive && restTimerCountdown > 0) {
      restTimerRef.current = setInterval(() => {
        setRestTimerCountdown((prev) => {
          if (prev <= 1) {
            // Timer finished
            setIsRestTimerActive(false);
            if (restTimerRef.current) {
              clearInterval(restTimerRef.current);
            }
            // Show completion modal when rest timer finishes
            setShowCompleteModal(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current);
      }
    }

    return () => {
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current);
      }
    };
  }, [isRestTimerActive, restTimerCountdown]);

  // Sync context with workout state
  useEffect(() => {
    console.log(
      "🔄 Syncing context - isWorkoutStarted:",
      isWorkoutStarted,
      "isWorkoutCompleted:",
      isWorkoutCompleted
    );

    if (isWorkoutCompleted) {
      setWorkoutInProgress(false);
    } else if (isWorkoutStarted) {
      setWorkoutInProgress(true);
    } else {
      setWorkoutInProgress(false);
    }
  }, [isWorkoutStarted, isWorkoutCompleted, setWorkoutInProgress]);

  // Handle workout abandonment - reset workout state when context says no workout in progress
  // but local state thinks workout is started
  useEffect(() => {
    if (!isWorkoutInProgress && isWorkoutStarted && !isWorkoutCompleted) {
      console.log("🚪 Workout abandoned - resetting workout state");
      setIsWorkoutStarted(false);
      setIsPaused(false);
      setWorkoutTimer(0);
      setExerciseTimer(0);
      setCurrentExerciseIndex(0);
      setIsRestTimerActive(false);
      setRestTimerCountdown(0);
      // Clear any active timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current);
      }
    }
  }, [isWorkoutInProgress, isWorkoutStarted, isWorkoutCompleted]);

  // Cleanup workout context on unmount
  useEffect(() => {
    return () => {
      console.log("🧹 Component unmounting, clearing workout context");
      setWorkoutInProgress(false);
    };
  }, [setWorkoutInProgress]);

  // Load workout data
  const loadWorkout = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        setLoading(true);
      }
      setError(null);

      const response = await fetchActiveWorkout(forceRefresh);

      if (!response?.workout?.planDays?.length) {
        setWorkout(null);
        return;
      }

      // Find today's workout using string comparison to avoid timezone issues
      const today = getCurrentDate(); // Use the same function as other parts of the app
      console.log("🗓️ Looking for workout for today:", today);
      console.log(
        "📅 Available plan days:",
        response.workout.planDays.map((day: any) => ({
          date: day.date,
          normalizedDate: formatDateAsString(day.date),
        }))
      );

      const todaysWorkout = response.workout.planDays.find((day: any) => {
        // Use the formatDateAsString function to normalize dates consistently
        const normalizedDayDate = formatDateAsString(day.date);
        return normalizedDayDate === today;
      });

      console.log("🎯 Found today's workout:", todaysWorkout ? "YES" : "NO");

      if (!todaysWorkout) {
        setWorkout(null);
        return;
      }

      // If the plan day is already marked as complete, show the completed screen.
      if (todaysWorkout.isComplete) {
        setWorkout(todaysWorkout);
        setIsWorkoutCompleted(true);
        setWorkoutInProgress(false); // Make sure context knows workout is complete
        return;
      }

      setWorkout(todaysWorkout);

      // Check if there's an existing workout session in progress
      // (You might need to add logic here to detect if a workout was previously started)

      // Initialize exercise progress
      const flatExercises = todaysWorkout.blocks.flatMap(
        (block: WorkoutBlockWithExercises) => block.exercises
      );
      const initialProgress: ExerciseProgress[] = flatExercises.map(
        (exercise: WorkoutBlockWithExercise) => ({
          setsCompleted: 0,
          repsCompleted: 0,
          roundsCompleted: 0,
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
      if (forceRefresh) {
        setRefreshing(false);
      }
    }
  };

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWorkout(true);
  }, []);

  // Load workout on mount and when tab is focused
  useEffect(() => {
    loadWorkout();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // Don't force refresh on focus, rely on cache
      loadWorkout(false);
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
    console.log("🏃 Starting workout, setting context to true");
    setWorkoutInProgress(true); // Notify context that workout started
  };

  // Toggle pause
  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  // Start rest timer
  const startRestTimer = () => {
    const restTime = currentExercise?.restTime || 0;
    if (restTime > 0) {
      setRestTimerCountdown(restTime);
      setIsRestTimerActive(true);
    }
  };

  // Stop rest timer
  const stopRestTimer = () => {
    setIsRestTimerActive(false);
    setRestTimerCountdown(0);
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
    }
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
        roundsCompleted: currentProgress.roundsCompleted,
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
        // All exercises completed, so mark the plan day as complete
        if (workout?.id) {
          await markPlanDayAsComplete(workout.id);
          // Refresh dashboard data with current date range to ensure today's data is included
          // Include both past workouts and upcoming planned workouts for weekly progress
          const today = new Date();
          const startDate = new Date(today);
          startDate.setDate(today.getDate() - 30); // 30 days back for historical data
          const endDate = new Date(today);
          endDate.setDate(today.getDate() + 7); // 7 days forward for planned workouts
          
          await refreshDashboard({
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
          });
        }

        setCurrentExerciseIndex(exercises.length); // This will make progress show 100%
        setIsWorkoutCompleted(true);
        setWorkoutInProgress(false); // Notify context that workout ended
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
    return <WorkoutSkeleton />;
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
          onPress={() => loadWorkout(true)}
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
          onPress={() => loadWorkout()}
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
          />
        }
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
            <View className="flex-row items-start mb-2">
              <Text className="text-2xl font-bold text-text-primary flex-1 mr-3">
                {workout.name}
              </Text>
              {isWorkoutStarted && (
                <View className="bg-background rounded-xl px-3 py-1 min-w-[80px]">
                  <Text className="text-lg font-bold text-text-primary text-center">
                    {formatTime(workoutTimer)}
                  </Text>
                </View>
              )}
            </View>
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

              {isWorkoutStarted && currentProgress ? (
                <View className="space-y-4">
                  {/* Rounds - Show if block has multiple rounds */}
                  {currentBlock &&
                  currentBlock.rounds &&
                  currentBlock.rounds > 1 ? (
                    <View className="rounded-2xl p-4">
                      <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-sm font-semibold text-text-primary">
                          Rounds
                        </Text>
                        <Text className="text-xs text-text-muted">
                          Target: {currentBlock.rounds} Rounds
                        </Text>
                      </View>
                      <View className="flex-row justify-center gap-2">
                        {Array.from({ length: currentBlock.rounds }, (_, i) => {
                          const isCompleted =
                            i < (currentProgress?.roundsCompleted || 0);
                          return (
                            <TouchableOpacity
                              key={i}
                              className={`w-9 h-9 rounded-full items-center justify-center border-2 ${
                                isCompleted
                                  ? "border-primary bg-primary"
                                  : "border-neutral-medium-1 bg-background"
                              }`}
                              onPress={() =>
                                updateProgress("roundsCompleted", i + 1)
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
                        })}
                      </View>
                    </View>
                  ) : null}

                  {/* Sets - Only show if more than 1 set */}
                  {currentExercise.sets && currentExercise.sets > 1 ? (
                    <View className=" rounded-2xl p-4">
                      <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-sm font-semibold text-text-primary">
                          Sets
                        </Text>
                        <Text className="text-xs text-text-muted">
                          Target: {currentExercise.sets} Sets
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
                        <Text className="text-xs font-semibold text-text-muted">
                          Target: {currentExercise.weight} lbs
                        </Text>
                      ) : null}
                    </View>
                    <View className="flex-row items-center justify-center gap-3">
                      <TouchableOpacity
                        className="w-9 h-9 rounded-full bg-neutral-light-2 items-center justify-center"
                        onPress={() =>
                          updateProgress(
                            "weightUsed",
                            Math.max(0, (currentProgress?.weightUsed || 0) - 10)
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
                            Math.max(0, (currentProgress?.weightUsed || 0) - 5)
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
                          value={String(currentProgress?.weightUsed || 0)}
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
                            (currentProgress?.weightUsed || 0) + 5
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
                            (currentProgress?.weightUsed || 0) + 10
                          )
                        }
                      >
                        <Text className="text-xs font-semibold text-secondary">
                          +10
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Duration - Auto-logged, centered display */}
                  {/* {currentExercise.duration ? (
                    <View className="rounded-2xl p-4">
                      <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-sm font-semibold text-text-primary">
                          Duration
                        </Text>
                        <Text className="text-xs text-text-muted">
                          Target: {currentExercise.duration}s
                        </Text>
                      </View>
                      <View className="flex-row items-center justify-center">
                        <View className="bg-background rounded-2xl px-4 py-3 border border-dashed border-neutral-light-2 min-w-[80px] items-center">
                          <Text
                            className={`text-lg font-bold ${
                              exerciseTimer >= currentExercise.duration
                                ? "text-primary"
                                : "text-text-primary"
                            }`}
                          >
                            {formatTime(exerciseTimer)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : null} */}

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

                  {/* Rest Timer - Only show if exercise has rest time */}
                  {currentExercise.restTime && currentExercise.restTime > 0 ? (
                    <View className="rounded-2xl p-4 mt-2">
                      <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-sm font-semibold text-text-primary">
                          Rest Timer
                        </Text>
                        <Text className="text-xs font-semibold text-text-muted">
                          Target: {currentExercise.restTime}s
                        </Text>
                      </View>

                      {isRestTimerActive ? (
                        // Active countdown display
                        <View className="items-center">
                          <View className="bg-background rounded-2xl px-4 py-3 min-w-[80px] items-center">
                            <Text className="text-lg font-bold text-text-primary text-center">
                              {formatTime(restTimerCountdown)}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        // Rest timer button styled like main action buttons
                        <View className="items-center">
                          <TouchableOpacity
                            className="bg-primary rounded-2xl py-2 px-6 flex-row items-center justify-center"
                            onPress={startRestTimer}
                          >
                            <Ionicons
                              name="timer-outline"
                              size={18}
                              color={colors.text.secondary}
                            />
                            <Text className="text-secondary text-sm ml-2">
                              Start {currentExercise.restTime}s Rest
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ) : null}
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
              <Text className="text-secondary font-semibold ml-2">
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
