import { useState, useEffect, useRef, useCallback } from "react";
import { activateKeepAwake, deactivateKeepAwake } from "expo-keep-awake";
import { AppState } from "react-native";
import {
  fetchActiveWorkout,
  createExerciseLog,
  getExistingWorkoutLog,
  getOrCreateWorkoutLog,
  updateWorkoutLog,
  getExerciseLogs,
  getCompletedExercises,
  markExerciseCompleted,
  markWorkoutComplete,
  subscribeToWorkoutUpdates,
} from "@/lib/workouts";
import {
  ExerciseSessionData,
  PlanDayWithBlocks,
  WorkoutBlockWithExercise,
  CreateExerciseLogParams,
  PlanDayWithExercisesLegacy,
} from "@/types/api";
import { ExerciseSet } from "@/components/SetTracker";
import { UseWorkoutSessionReturn } from "@/types/hooks";
import { formatDateAsLocalString } from "@/utils";
import { logger } from "../lib/logger";
export function useWorkoutSession(): UseWorkoutSessionReturn {
  const [activeWorkout, setActiveWorkout] = useState<PlanDayWithBlocks | null>(
    null
  );
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [exerciseTimer, setExerciseTimer] = useState(0);
  const [workoutTimer, setWorkoutTimer] = useState(0);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [exerciseData, setExerciseData] = useState<ExerciseSessionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const exerciseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const workoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const workoutStartTime = useRef<Date | null>(null);
  const exerciseStartTime = useRef<Date | null>(null);
  const appStateRef = useRef(AppState.currentState);

  // Helper function to flatten blocks into exercises for backward compatibility
  const getFlattenedExercises = useCallback(
    (planDay: PlanDayWithBlocks | null) => {
      if (!planDay || !planDay.blocks) return [];

      const exercises: WorkoutBlockWithExercise[] = [];
      planDay.blocks.forEach((block) => {
        block.exercises.forEach((exercise) => {
          exercises.push({
            ...exercise,
            blockInfo: {
              blockId: block.id,
              blockType: block.blockType,
              blockName: block.blockName,
              instructions: block.instructions,
              rounds: block.rounds,
              timeCapMinutes: block.timeCapMinutes,
            },
          });
        });
      });

      return exercises;
    },
    []
  );

  // Get current exercise with block information
  const getCurrentExercise = useCallback(() => {
    if (!activeWorkout) return null;
    const flattenedExercises = getFlattenedExercises(activeWorkout);
    return flattenedExercises[currentExerciseIndex] || null;
  }, [activeWorkout, currentExerciseIndex, getFlattenedExercises]);

  // Get current block information
  const getCurrentBlock = useCallback(() => {
    if (!activeWorkout || !activeWorkout.blocks) return null;
    return activeWorkout.blocks[currentBlockIndex] || null;
  }, [activeWorkout, currentBlockIndex]);

  // Timer management with timestamp-based calculation
  useEffect(() => {
    if (isWorkoutActive && !isPaused) {
      // Activate keep awake to prevent screen sleep
      activateKeepAwake("workout-session-timer");

      // Initialize start times if not set
      if (!workoutStartTime.current) {
        workoutStartTime.current = new Date(Date.now() - workoutTimer * 1000);
      }
      if (!exerciseStartTime.current) {
        exerciseStartTime.current = new Date(Date.now() - exerciseTimer * 1000);
      }

      workoutTimerRef.current = setInterval(() => {
        if (workoutStartTime.current) {
          const elapsed = Math.floor(
            (Date.now() - workoutStartTime.current.getTime()) / 1000
          );
          setWorkoutTimer(elapsed);
        }
      }, 1000);

      exerciseTimerRef.current = setInterval(() => {
        if (exerciseStartTime.current) {
          const elapsed = Math.floor(
            (Date.now() - exerciseStartTime.current.getTime()) / 1000
          );
          setExerciseTimer(elapsed);
        }
      }, 1000);
    } else {
      // Deactivate keep awake when timer stops
      deactivateKeepAwake("workout-session-timer");

      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
      if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
    }

    return () => {
      deactivateKeepAwake("workout-session-timer");
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
      if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
    };
  }, [isWorkoutActive, isPaused]);

  // Load active workout on mount
  useEffect(() => {
    loadActiveWorkout();
  }, []);

  // Handle app state changes to manage timers during background/foreground transitions
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // App came to foreground - recalculate timers based on timestamps
        console.log(
          "App came to foreground, recalculating workout session timers"
        );

        if (isWorkoutActive && !isPaused) {
          if (workoutStartTime.current) {
            const elapsed = Math.floor(
              (Date.now() - workoutStartTime.current.getTime()) / 1000
            );
            setWorkoutTimer(elapsed);
          }
          if (exerciseStartTime.current) {
            const elapsed = Math.floor(
              (Date.now() - exerciseStartTime.current.getTime()) / 1000
            );
            setExerciseTimer(elapsed);
          }
        }
      } else if (nextAppState.match(/inactive|background/)) {
        console.log(
          "App going to background, workout session timers will continue via timestamps"
        );
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, [isWorkoutActive, isPaused]);

  const loadActiveWorkout = async () => {
    try {
      setIsLoading(true);
      const response = await fetchActiveWorkout();

      if (
        response &&
        response.workout &&
        response.workout.planDays &&
        response.workout.planDays.length > 0
      ) {
        const workout = response.workout;

        // Find today's plan day
        const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD format

        // Debug all plan days
        workout.planDays.forEach((day: PlanDayWithBlocks, index: number) => {
          const planDate = formatDateAsLocalString(day.date);
          console.log(`Plan day ${index}:`, {
            originalDate: day.date,
            originalDateType: typeof day.date,
            formattedDate: planDate,
            matchesToday: planDate === today,
            blocks: day.blocks?.length || 0,
            exercises:
              day.blocks?.reduce(
                (total: number, block: WorkoutBlockWithExercise) =>
                  total + (block.exercises?.length || 0),
                0
              ) || 0,
          });
        });

        // Find today's plan day
        const todaysPlan = workout.planDays.find((day: PlanDayWithBlocks) => {
          const planDate = formatDateAsLocalString(day.date);
          return planDate === today;
        });

        if (todaysPlan) {
          console.log("Found today's plan:", {
            id: todaysPlan.id,
            name: todaysPlan.name,
            blocks: todaysPlan.blocks?.length || 0,
            totalExercises:
              todaysPlan.blocks?.reduce(
                (total: number, block: WorkoutBlockWithExercise) =>
                  total + (block.exercises?.length || 0),
                0
              ) || 0,
          });

          setActiveWorkout(todaysPlan);

          // Initialize exercise data
          const exercises = getFlattenedExercises(todaysPlan);
          const initialExerciseData: ExerciseSessionData[] = exercises.map(
            (exercise) => ({
              exerciseId: exercise.exerciseId,
              planDayExerciseId: exercise.id,
              targetSets: exercise.sets || 1,
              targetReps: exercise.reps || 0,
              targetRounds: exercise.blockInfo?.rounds || 1,
              targetWeight: exercise.weight || 0,
              targetDuration: exercise.duration || 0,
              targetRestTime: exercise.restTime || 0,
              setsCompleted: 0,
              repsCompleted: 0,
              roundsCompleted: 0,
              weightUsed: 0,
              sets: [] as ExerciseSet[],
              duration: exercise.duration || 0,
              restTime: exercise.restTime || 0,
              timeTaken: 0,
              notes: "",
              isCompleted: false,
              blockInfo: exercise.blockInfo,
            })
          );

          setExerciseData(initialExerciseData);

          // Check for existing logs
          await checkExistingLogs(todaysPlan, initialExerciseData);
        } else {
          setActiveWorkout(null);
        }
      } else {
        setActiveWorkout(null);
      }
    } catch (error) {
      console.error("Error loading active workout:", error);
      setActiveWorkout(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh function that can be called externally
  const refreshWorkout = useCallback(async () => {
    // Clear current state first
    setActiveWorkout(null);
    setExerciseData([]);
    setCurrentExerciseIndex(0);
    setCurrentBlockIndex(0);
    setExerciseTimer(0);
    setWorkoutTimer(0);
    setIsWorkoutActive(false);
    setIsPaused(false);

    // Clear any running timers
    if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
    if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
    workoutStartTime.current = null;
    exerciseStartTime.current = null;

    // Load fresh data
    await loadActiveWorkout();
  }, []);

  // Subscribe to workout updates
  useEffect(() => {
    const unsubscribe = subscribeToWorkoutUpdates(() => {
      refreshWorkout();
    });

    return unsubscribe;
  }, [refreshWorkout]);

  // Update block index when exercise index changes
  useEffect(() => {
    if (!activeWorkout || !activeWorkout.blocks) return;

    let exerciseCount = 0;
    let newBlockIndex = 0;

    for (let i = 0; i < activeWorkout.blocks.length; i++) {
      const blockExerciseCount = activeWorkout.blocks[i].exercises.length;
      if (currentExerciseIndex < exerciseCount + blockExerciseCount) {
        newBlockIndex = i;
        break;
      }
      exerciseCount += blockExerciseCount;
    }

    if (newBlockIndex !== currentBlockIndex) {
      setCurrentBlockIndex(newBlockIndex);
    }
  }, [currentExerciseIndex, activeWorkout, currentBlockIndex]);

  const checkExistingLogs = async (
    planDay: PlanDayWithBlocks,
    initialData: ExerciseSessionData[]
  ) => {
    try {
      // Get existing workout log
      const workoutLog = await getExistingWorkoutLog(planDay.workoutId);
      if (workoutLog) {
        // Note: Don't check workoutLog.isComplete here because that's for the entire
        // multi-day workout. We need to check individual plan day completion instead.

        // If workout is in progress, resume the timer
        if (!workoutLog.isComplete) {
          setWorkoutTimer(workoutLog.totalTimeTaken || 0);
          setIsWorkoutActive(true);
          workoutStartTime.current = new Date(
            Date.now() - (workoutLog.totalTimeTaken || 0) * 1000
          );
        }
      }

      // Check completed exercises for THIS specific plan day
      const completedData = await getCompletedExercises(planDay.workoutId);
      const completedExerciseIds = completedData.completedExercises || [];

      const exercisesArray = Array.isArray(planDay.exercises)
        ? planDay.exercises
        : [];
      const todaysCompletedExercises = completedExerciseIds.filter(
        (exerciseId: number) =>
          exercisesArray.some(
            (ex: WorkoutBlockWithExercise) => ex.id === exerciseId
          )
      );

      // Check if ALL exercises for this specific plan day are completed
      const allTodaysExercisesCompleted =
        exercisesArray.length > 0 &&
        exercisesArray.every((ex: WorkoutBlockWithExercise) =>
          todaysCompletedExercises.includes(ex.id)
        );

      // If all today's exercises are completed, show completion state but don't block loading
      if (allTodaysExercisesCompleted) {
        setIsWorkoutActive(false);
        // Mark all exercises as completed in local state
        const completedData = initialData.map((data) => ({
          ...data,
          isCompleted: true,
        }));
        setExerciseData(completedData);
        return;
      }

      // Check exercise logs and update local state
      const updatedData = [...initialData];
      let lastCompletedIndex = -1;

      for (let i = 0; i < exercisesArray.length; i++) {
        const exercise = exercisesArray[i];
        const isCompleted = completedExerciseIds.includes(exercise.id);

        if (isCompleted) {
          lastCompletedIndex = i;
          // Get the latest exercise log for this exercise
          const logs = await getExerciseLogs(exercise.id);
          if (logs.length > 0) {
            const lastLog = logs[logs.length - 1];
            updatedData[i] = {
              ...updatedData[i],
              setsCompleted: lastLog.setsCompleted,
              repsCompleted: lastLog.repsCompleted,
              weightUsed: lastLog.weightUsed || updatedData[i].weightUsed,
              timeTaken: lastLog.timeTaken || 0,
              notes: lastLog.notes || "",
              isCompleted: true,
            };
          } else {
            updatedData[i] = {
              ...updatedData[i],
              isCompleted: true,
            };
          }
        }
      }

      // Set current exercise index to the next incomplete exercise
      const nextIncompleteIndex = exercisesArray.findIndex(
        (exercise: WorkoutBlockWithExercise, idx: number) =>
          !completedExerciseIds.includes(exercise.id)
      );

      if (nextIncompleteIndex !== -1) {
        setCurrentExerciseIndex(nextIncompleteIndex);
      } else {
        // All exercises completed for this day
        setCurrentExerciseIndex(0);
      }

      setExerciseData(updatedData);
    } catch (error) {
      console.error("Error checking existing logs:", error);
    }
  };

  const startWorkout = useCallback(async () => {
    if (!activeWorkout) return;

    try {
      // Create or get the workout log when starting
      await getOrCreateWorkoutLog(activeWorkout.workoutId);

      setIsWorkoutActive(true);
      workoutStartTime.current = new Date();
      exerciseStartTime.current = new Date();
      setWorkoutTimer(0);
      setExerciseTimer(0);

      logger.businessEvent("Workout session started", {
        workoutId: activeWorkout.workoutId,
        planDayId: activeWorkout.id,
      });
    } catch (error) {
      logger.error("Error starting workout", {
        error: error instanceof Error ? error.message : "Unknown error",
        workoutId: activeWorkout?.workoutId,
      });
    }
  }, [activeWorkout]);

  const updateExerciseData = useCallback(
    <K extends keyof ExerciseSessionData>(
      field: K,
      value: ExerciseSessionData[K]
    ) => {
      setExerciseData((prev) =>
        prev.map((data, index) =>
          index === currentExerciseIndex ? { ...data, [field]: value } : data
        )
      );
    },
    [currentExerciseIndex]
  );

  const updateExerciseSets = useCallback(
    (sets: ExerciseSet[]) => {
      setExerciseData((prev) =>
        prev.map((data, index) =>
          index === currentExerciseIndex ? { ...data, sets } : data
        )
      );
    },
    [currentExerciseIndex]
  );

  const completeExercise = useCallback(
    async (notes?: string): Promise<boolean> => {
      const currentData = exerciseData[currentExerciseIndex];
      if (!currentData || !activeWorkout) return false;

      try {
        // When the user clicks "Complete Exercise", always mark as complete
        // regardless of whether they hit the exact target sets/reps
        const isComplete = true;

        // Calculate total reps and weight for backwards compatibility
        const currentSets = currentData.sets || [];

        const exerciseLogParams: CreateExerciseLogParams = {
          planDayExerciseId: currentData.planDayExerciseId,
          sets: currentSets,
          durationCompleted: currentData.duration,
          timeTaken: exerciseTimer,
          notes: notes || currentData.notes,
          isComplete,
        };

        // Create exercise log
        await createExerciseLog(exerciseLogParams);

        // Mark exercise as completed in workout log
        await markExerciseCompleted(
          activeWorkout.workoutId,
          currentData.planDayExerciseId
        );

        // Update local state
        setExerciseData((prev) =>
          prev.map((data, index) =>
            index === currentExerciseIndex
              ? {
                  ...data,
                  timeTaken: exerciseTimer,
                  notes: notes || data.notes,
                  isCompleted: true,
                }
              : data
          )
        );

        return true;
      } catch (error) {
        console.error("Error completing exercise:", error);
        return false;
      }
    },
    [exerciseData, currentExerciseIndex, activeWorkout, exerciseTimer]
  );

  const moveToNextExercise = useCallback(() => {
    if (!activeWorkout) return;

    const flattenedExercises = getFlattenedExercises(activeWorkout);
    const nextExerciseIndex = currentExerciseIndex + 1;
    if (nextExerciseIndex < flattenedExercises.length) {
      setCurrentExerciseIndex(nextExerciseIndex);
      setExerciseTimer(0);
      exerciseStartTime.current = new Date();

      // Update block index if we've moved to a new block
      const nextExercise = flattenedExercises[nextExerciseIndex];
      if (nextExercise && nextExercise.blockInfo) {
        const nextBlockIndex = activeWorkout.blocks?.findIndex(
          (block) => block.id === nextExercise.blockInfo?.blockId
        );
        if (nextBlockIndex !== -1 && nextBlockIndex !== currentBlockIndex) {
          setCurrentBlockIndex(nextBlockIndex);
        }
      }
    }
  }, [
    currentExerciseIndex,
    currentBlockIndex,
    activeWorkout,
    getFlattenedExercises,
  ]);

  const endWorkout = useCallback(
    async (notes?: string): Promise<boolean> => {
      if (!activeWorkout) return false;

      try {
        // Calculate total time
        const totalTime = workoutTimer;

        // Update workout log
        await updateWorkoutLog(activeWorkout.workoutId, {
          notes: notes || "",
          totalTimeMinutes: Math.floor(totalTime / 60),
          isComplete: true,
        });

        // Mark workout as complete with all exercise IDs
        const flattenedExercises = getFlattenedExercises(activeWorkout);
        const totalExerciseIds = flattenedExercises.map((ex) => ex.id);
        await markWorkoutComplete(activeWorkout.workoutId, totalExerciseIds);

        const completedExercises = exerciseData.filter(
          (data) => data.isCompleted
        ).length;
        logger.businessEvent("Workout completed", {
          workoutId: activeWorkout.workoutId,
          duration: `${Math.floor(totalTime / 60)}m ${totalTime % 60}s`,
          exercisesCompleted: completedExercises,
          totalExercises: flattenedExercises.length,
        });

        return true;
      } catch (error) {
        logger.error("Error ending workout", {
          error: error instanceof Error ? error.message : "Unknown error",
          workoutId: activeWorkout?.workoutId,
        });
        return false;
      }
    },
    [activeWorkout, workoutTimer, getFlattenedExercises]
  );

  const resetSession = useCallback(() => {
    setCurrentExerciseIndex(0);
    setCurrentBlockIndex(0);
    setExerciseTimer(0);
    setWorkoutTimer(0);
    setIsWorkoutActive(false);
    setExerciseData([]);

    // Cleanup timers and keep awake
    if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
    if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
    deactivateKeepAwake("workout-session-timer");

    // Reset timestamps
    workoutStartTime.current = null;
    exerciseStartTime.current = null;
    setIsPaused(false);
  }, []);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused(!isPaused);
  }, [isPaused]);

  // Computed values
  const currentExercise = getCurrentExercise();
  const currentData = exerciseData[currentExerciseIndex];
  const completedCount = exerciseData.filter((data) => data.isCompleted).length;
  const flattenedExercises = getFlattenedExercises(activeWorkout);
  const totalExercises = flattenedExercises.length;
  const progressPercentage =
    totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;

  // Create backward compatible activeWorkout with exercises property
  const activeWorkoutWithExercises = activeWorkout
    ? ({
        ...activeWorkout,
        exercises: flattenedExercises,
      } as PlanDayWithExercisesLegacy)
    : null;

  return {
    // State
    activeWorkout: activeWorkoutWithExercises,
    currentExerciseIndex,
    currentBlockIndex,
    exerciseTimer,
    workoutTimer,
    isWorkoutActive,
    isPaused,
    exerciseData,
    isLoading,

    // Actions
    startWorkout,
    completeExercise,
    endWorkout,
    updateExerciseData,
    updateExerciseSets,
    moveToNextExercise,
    resetSession,
    refreshWorkout,
    togglePause,

    // Computed values
    currentExercise,
    currentData,
    completedCount,
    totalExercises,
    progressPercentage,
    formatTime,
  };
}
