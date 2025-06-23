import { useState, useEffect, useRef, useCallback } from "react";
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
  CreateExerciseLogParams,
  subscribeToWorkoutUpdates,
} from "@lib/workouts";
import {
  WorkoutSession,
  ExerciseSessionData,
  PlanDayWithExercises,
  PlanDayWithExercise,
} from "../app/types";

export interface UseWorkoutSessionReturn {
  // State
  activeWorkout: PlanDayWithExercises | null;
  currentExerciseIndex: number;
  exerciseTimer: number;
  workoutTimer: number;
  isWorkoutActive: boolean;
  isPaused: boolean;
  exerciseData: ExerciseSessionData[];
  isLoading: boolean;

  // Actions
  startWorkout: () => Promise<void>;
  completeExercise: (notes?: string) => Promise<boolean>;
  endWorkout: (notes?: string) => Promise<boolean>;
  updateExerciseData: (field: keyof ExerciseSessionData, value: any) => void;
  moveToNextExercise: () => void;
  resetSession: () => void;
  refreshWorkout: () => Promise<void>;
  togglePause: () => void;

  // Computed values
  currentExercise: PlanDayWithExercise | undefined;
  currentData: ExerciseSessionData | undefined;
  completedCount: number;
  totalExercises: number;
  progressPercentage: number;
  formatTime: (seconds: number) => string;
}

export function useWorkoutSession(): UseWorkoutSessionReturn {
  const [activeWorkout, setActiveWorkout] =
    useState<PlanDayWithExercises | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
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

  // Timer management
  useEffect(() => {
    if (isWorkoutActive && !isPaused) {
      workoutTimerRef.current = setInterval(() => {
        setWorkoutTimer((prev) => prev + 1);
      }, 1000);

      exerciseTimerRef.current = setInterval(() => {
        setExerciseTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
      if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
    }

    return () => {
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
      if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
    };
  }, [isWorkoutActive, isPaused]);

  // Load active workout on mount
  useEffect(() => {
    loadActiveWorkout();
  }, []);

  const loadActiveWorkout = async () => {
    try {
      setIsLoading(true);
      const response = await fetchActiveWorkout();
      console.log("🔄 Full API response:", response);

      if (
        response &&
        response.workout &&
        response.workout.planDays &&
        response.workout.planDays.length > 0
      ) {
        const workout = response.workout;
        console.log("📅 Workout data:", workout);
        console.log("📋 Plan days:", workout.planDays);

        // Find today's plan day (similar to calendar logic)
        const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD format
        console.log("🗓️  Today's date:", today);
        console.log(
          "🌍 Timezone:",
          Intl.DateTimeFormat().resolvedOptions().timeZone
        );

        // Helper function for safe date parsing
        const formatDateToString = (dateStr: string): string => {
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr; // Already in YYYY-MM-DD format
          }
          // For other formats, parse safely
          const [year, month, day] = dateStr.split("-").map(Number);
          const safeDate = new Date(year, month - 1, day);
          return safeDate.toLocaleDateString("en-CA");
        };

        // Debug all plan days
        workout.planDays.forEach((day: any, index: number) => {
          const planDate = formatDateToString(day.date);
          console.log(`📆 Plan day ${index}:`, {
            originalDate: day.date,
            formattedDate: planDate,
            matchesToday: planDate === today,
            isCompleted: day.completed,
          });
        });

        const todaysPlan = workout.planDays.find((day: any) => {
          const planDate = formatDateToString(day.date);
          console.log(
            "🔍 Comparing plan date:",
            planDate,
            "with today:",
            today
          );
          return planDate === today;
        });

        if (!todaysPlan) {
          console.log("❌ No workout plan found for today");
          console.log(
            "Available dates:",
            workout.planDays.map((day: any) =>
              new Date(day.date).toLocaleDateString("en-CA")
            )
          );
          setActiveWorkout(null);
          setIsLoading(false);
          return;
        }

        console.log("✅ Today's plan found:", todaysPlan);

        setActiveWorkout(todaysPlan);

        // Initialize exercise data
        const initialData = todaysPlan.exercises.map(
          (exercise: PlanDayWithExercise) => ({
            exerciseId: exercise.exerciseId,
            planDayExerciseId: exercise.id,
            targetSets: exercise.sets || 3,
            targetReps: exercise.reps || 12,
            targetWeight: exercise.weight,
            setsCompleted: 0,
            repsCompleted: 0,
            weightUsed: exercise.weight || 0,
            timeTaken: 0,
            notes: "",
            isCompleted: exercise.completed,
          })
        );
        setExerciseData(initialData);
        console.log("💪 Initialized exercise data:", initialData);

        // Check for existing logs and resume if needed
        await checkExistingLogs(todaysPlan, initialData);
      } else {
        console.log("❌ No workout data found in response");
        setActiveWorkout(null);
      }
    } catch (error) {
      console.error("❌ Error loading active workout:", error);
      setActiveWorkout(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh function that can be called externally
  const refreshWorkout = useCallback(async () => {
    console.log("🔄 Refreshing workout...");

    // Clear current state first
    setActiveWorkout(null);
    setExerciseData([]);
    setCurrentExerciseIndex(0);
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
      console.log("🔄 Received workout update notification, refreshing...");
      refreshWorkout();
    });

    return unsubscribe;
  }, [refreshWorkout]);

  const checkExistingLogs = async (
    planDay: PlanDayWithExercises,
    initialData: ExerciseSessionData[]
  ) => {
    try {
      // Check if there's an existing workout log
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

      // Filter completed exercises to only those belonging to this plan day
      const todaysCompletedExercises = completedExerciseIds.filter(
        (exerciseId) => planDay.exercises.some((ex) => ex.id === exerciseId)
      );

      // Check if ALL exercises for this specific plan day are completed
      const allTodaysExercisesCompleted =
        planDay.exercises.length > 0 &&
        planDay.exercises.every((ex) =>
          todaysCompletedExercises.includes(ex.id)
        );

      // If all today's exercises are completed, show completion state but don't block loading
      if (allTodaysExercisesCompleted) {
        console.log("All exercises for this plan day are completed");
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

      for (let i = 0; i < planDay.exercises.length; i++) {
        const exercise = planDay.exercises[i];
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
      const nextIncompleteIndex = planDay.exercises.findIndex(
        (_, idx) => !completedExerciseIds.includes(planDay.exercises[idx].id)
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
    } catch (error) {
      console.error("Error starting workout:", error);
    }
  }, [activeWorkout]);

  const updateExerciseData = useCallback(
    (field: keyof ExerciseSessionData, value: any) => {
      setExerciseData((prev) =>
        prev.map((data, index) =>
          index === currentExerciseIndex ? { ...data, [field]: value } : data
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

        const exerciseLogParams: CreateExerciseLogParams = {
          planDayExerciseId: currentData.planDayExerciseId,
          setsCompleted: currentData.setsCompleted,
          repsCompleted: currentData.repsCompleted,
          weightUsed: currentData.weightUsed || 0,
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

    const nextExerciseIndex = currentExerciseIndex + 1;
    if (nextExerciseIndex < activeWorkout.exercises.length) {
      setCurrentExerciseIndex(nextExerciseIndex);
      setExerciseTimer(0);
      exerciseStartTime.current = new Date();
    }
  }, [currentExerciseIndex, activeWorkout]);

  const endWorkout = useCallback(
    async (notes?: string): Promise<boolean> => {
      if (!activeWorkout) return false;

      try {
        // Calculate total time
        const totalTime = workoutTimer;

        // Update workout log
        await updateWorkoutLog(activeWorkout.workoutId, {
          notes: notes || "",
          totalTimeTaken: totalTime,
          isComplete: true,
        });

        // Mark workout as complete with all exercise IDs
        const totalExerciseIds = activeWorkout.exercises.map((ex) => ex.id);
        await markWorkoutComplete(activeWorkout.workoutId, totalExerciseIds);

        return true;
      } catch (error) {
        console.error("Error ending workout:", error);
        return false;
      }
    },
    [activeWorkout, workoutTimer]
  );

  const resetSession = useCallback(() => {
    setCurrentExerciseIndex(0);
    setExerciseTimer(0);
    setWorkoutTimer(0);
    setIsWorkoutActive(false);
    setExerciseData([]);
    if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
    if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
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
  const currentExercise = activeWorkout?.exercises[currentExerciseIndex];
  const currentData = exerciseData[currentExerciseIndex];
  const completedCount = exerciseData.filter((data) => data.isCompleted).length;
  const totalExercises = activeWorkout?.exercises.length || 0;
  const progressPercentage =
    totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;

  return {
    // State
    activeWorkout,
    currentExerciseIndex,
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
