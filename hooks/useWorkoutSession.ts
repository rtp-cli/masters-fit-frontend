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
  subscribeToWorkoutUpdates,
} from "@/lib/workouts";
import {
  WorkoutSession,
  ExerciseSessionData,
  PlanDayWithBlocks,
  WorkoutBlockWithExercise,
  CreateExerciseLogParams,
  flattenBlocksToExercises,
} from "@/types/api";
import { UseWorkoutSessionReturn } from "@/types/hooks";
import { formatDateAsLocalString } from "@/utils";

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

        // Find today's plan day
        const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD format
        console.log("🗓️  Today's date:", today);

        // Debug all plan days
        workout.planDays.forEach((day: any, index: number) => {
          const planDate = formatDateAsLocalString(day.date);
          console.log(`📆 Plan day ${index}:`, {
            originalDate: day.date,
            originalDateType: typeof day.date,
            formattedDate: planDate,
            matchesToday: planDate === today,
            blocks: day.blocks?.length || 0,
            exercises:
              day.blocks?.reduce(
                (total: number, block: any) =>
                  total + (block.exercises?.length || 0),
                0
              ) || 0,
          });
        });

        // Find today's plan day
        const todaysPlan = workout.planDays.find((day: any) => {
          const planDate = formatDateAsLocalString(day.date);
          console.log(
            "🔍 Comparing plan date:",
            planDate,
            "with today:",
            today,
            "Match:",
            planDate === today
          );
          return planDate === today;
        });

        if (todaysPlan) {
          console.log("✅ Today's plan found:", todaysPlan);
          console.log("📊 Plan details:", {
            id: todaysPlan.id,
            name: todaysPlan.name,
            blocks: todaysPlan.blocks?.length || 0,
            totalExercises:
              todaysPlan.blocks?.reduce(
                (total: number, block: any) =>
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
              duration: exercise.duration || 0,
              restTime: exercise.restTime || 0,
              timeTaken: 0,
              notes: "",
              isCompleted: false,
              blockInfo: exercise.blockInfo,
            })
          );

          console.log("💪 Initialized exercise data:", initialExerciseData);
          setExerciseData(initialExerciseData);

          // Check for existing logs
          await checkExistingLogs(todaysPlan, initialExerciseData);
        } else {
          console.log("❌ No plan found for today");
          setActiveWorkout(null);
        }
      } else {
        console.log("❌ No workout plan found");
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
    console.log("🔄 Refreshing workout...");

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
      console.log("🔄 Received workout update notification, refreshing...");
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
    planDay: any, // Workout with exercises for backward compatibility
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
          exercisesArray.some((ex: any) => ex.id === exerciseId)
      );

      // Check if ALL exercises for this specific plan day are completed
      const allTodaysExercisesCompleted =
        exercisesArray.length > 0 &&
        exercisesArray.every((ex: any) =>
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
        (_: any, idx: number) =>
          !completedExerciseIds.includes(exercisesArray[idx].id)
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
          totalTimeTaken: totalTime,
          isComplete: true,
        });

        // Mark workout as complete with all exercise IDs
        const flattenedExercises = getFlattenedExercises(activeWorkout);
        const totalExerciseIds = flattenedExercises.map((ex) => ex.id);
        await markWorkoutComplete(activeWorkout.workoutId, totalExerciseIds);

        return true;
      } catch (error) {
        console.error("Error ending workout:", error);
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
  const currentExercise = getCurrentExercise();
  const currentData = exerciseData[currentExerciseIndex];
  const completedCount = exerciseData.filter((data) => data.isCompleted).length;
  const flattenedExercises = getFlattenedExercises(activeWorkout);
  const totalExercises = flattenedExercises.length;
  const progressPercentage =
    totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;

  // Create backward compatible activeWorkout with exercises property
  const activeWorkoutWithExercises = activeWorkout
    ? {
        ...activeWorkout,
        exercises: flattenedExercises,
      }
    : null;

  return {
    // State
    activeWorkout: activeWorkoutWithExercises as any, // Type assertion for backward compatibility
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
    moveToNextExercise,
    resetSession,
    refreshWorkout,
    togglePause,

    // Computed values
    currentExercise: currentExercise as any, // Type assertion for backward compatibility
    currentData,
    completedCount,
    totalExercises,
    progressPercentage,
    formatTime,
  };
}
