import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";

import { useAppDataContext } from "@/contexts/app-data-context";
import { useAuth } from "@/contexts/auth-context";
import { useBackgroundJobs } from "@/contexts/background-job-context";
import { useWorkout } from "@/contexts/workout-context";
import { useCircuitSession } from "@/hooks/use-circuit-session";
import { useRestTimer } from "@/hooks/use-rest-timer";
import { useWorkoutTimers } from "@/hooks/use-workout-timers";
import { trackWorkoutStarted } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { logCircuitRound, markBlockExercisesComplete } from "@/lib/circuits";
import { registerForPushNotifications } from "@/lib/notifications";
import {
  createExerciseLog,
  fetchActiveWorkout,
  generateWorkoutPlanAsync,
  getPlanDayLog,
  markPlanDayAsComplete,
  skipExercise,
} from "@/lib/workouts";
import {
  type CircuitExerciseLog as CircuitExercise,
  type CircuitSessionConfig,
} from "@/types/api/circuit.types";
import {
  type PlanDayWithBlocks,
  type WorkoutBlockWithExercise,
  type WorkoutBlockWithExercises,
} from "@/types/api/workout.types";
import { formatDateAsString, getCurrentDate } from "@/utils";
import { isCircuitBlock, isWarmupCooldownBlock } from "@/utils/circuit-utils";
import { type ExerciseSet } from "@/components/set-tracker";

export interface ExerciseProgress {
  setsCompleted: number;
  repsCompleted: number;
  roundsCompleted: number;
  weightUsed: number;
  sets: ExerciseSet[];
  duration: number;
  restTime: number;
  notes: string;
  isSkipped?: boolean;
}

export function useWorkoutSession() {
  const router = useRouter();

  // Contexts
  const { setWorkoutInProgress, isWorkoutInProgress, setCurrentWorkoutData } =
    useWorkout();
  const { user, isLoading: authLoading } = useAuth();
  const { isGenerating, addJob } = useBackgroundJobs();
  const {
    refresh: { refreshDashboard, reset },
  } = useAppDataContext();

  // Core state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workout, setWorkout] = useState<PlanDayWithBlocks | null>(null);
  const [hasActiveWorkoutPlan, setHasActiveWorkoutPlan] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);
  const [isWorkoutCompleted, setIsWorkoutCompleted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasCompletedWorkoutDuration, setHasCompletedWorkoutDuration] =
    useState(false);
  const [completedExercisesCount, setCompletedExercisesCount] = useState(0);

  // Exercise progress state
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress[]>(
    [],
  );
  const [skippedExercises, setSkippedExercises] = useState<number[]>([]);

  // Modal state
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showRestCompleteModal, setShowRestCompleteModal] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [isCompletingExercise, setIsCompletingExercise] = useState(false);
  const [isSkippingExercise, setIsSkippingExercise] = useState(false);

  // UI refs
  const scrollViewRef = useRef<ScrollView>(null);
  const exerciseHeadingRef = useRef<View>(null);
  const circuitHeadingRef = useRef<View>(null);

  // Custom hooks for timers
  const timers = useWorkoutTimers({
    isWorkoutStarted,
    isWorkoutCompleted,
  });

  const handleRestComplete = useCallback(() => {
    setShowRestCompleteModal(true);
  }, []);

  const restTimer = useRestTimer({
    onRestComplete: handleRestComplete,
  });

  // Get flattened exercises from blocks
  const getFlattenedExercises = useCallback((): WorkoutBlockWithExercise[] => {
    if (!workout?.blocks) return [];
    return workout.blocks.flatMap((block) => block.exercises);
  }, [workout]);

  const exercises = getFlattenedExercises();
  const currentExercise = exercises[currentExerciseIndex];
  const currentProgress = exerciseProgress[currentExerciseIndex];

  // Calculate progress percentage
  const completedAndSkippedCount =
    currentExerciseIndex + skippedExercises.length;
  const progressPercent =
    exercises.length > 0
      ? (completedAndSkippedCount / exercises.length) * 100
      : 0;

  // Get current block for the current exercise
  const getCurrentBlock = useCallback((): WorkoutBlockWithExercises | null => {
    if (!workout?.blocks || !currentExercise) return null;
    for (const block of workout.blocks) {
      if (block.exercises.some((ex) => ex.id === currentExercise.id)) {
        return block;
      }
    }
    return null;
  }, [workout, currentExercise]);

  const currentBlock = getCurrentBlock();
  const isCurrentBlockCircuit = currentBlock
    ? isCircuitBlock(currentBlock.blockType)
    : false;
  const isCurrentBlockWarmupCooldown = currentBlock
    ? isWarmupCooldownBlock(currentBlock.blockType)
    : false;

  // Circuit session setup
  const dummyBlock: WorkoutBlockWithExercises = {
    id: 0,
    blockType: "circuit",
    blockName: "dummy",
    rounds: 1,
    exercises: [],
    created_at: new Date(),
    updated_at: new Date(),
  };

  const circuitConfig: CircuitSessionConfig = {
    block: currentBlock || dummyBlock,
    autoStartTimer: false,
    allowPartialRounds: true,
  };

  const circuitSession = useCircuitSession(circuitConfig);

  // Helper function to scroll to exercise heading
  const scrollToExerciseHeading = useCallback(
    (exerciseIndex: number) => {
      const nextExercise = exercises[exerciseIndex];
      const nextBlock = workout?.blocks?.find((block) =>
        block.exercises.some((ex) => ex.id === nextExercise?.id),
      );
      const isNextCircuit = nextBlock && isCircuitBlock(nextBlock.blockType);

      if (isNextCircuit && circuitHeadingRef.current && scrollViewRef.current) {
        circuitHeadingRef.current.measureLayout(
          scrollViewRef.current as any,
          (x, y) =>
            scrollViewRef.current?.scrollTo({
              y: Math.max(0, y - 20),
              animated: true,
            }),
          () => console.log("Failed to measure circuit heading"),
        );
      } else if (exerciseHeadingRef.current && scrollViewRef.current) {
        exerciseHeadingRef.current.measureLayout(
          scrollViewRef.current as any,
          (x, y) =>
            scrollViewRef.current?.scrollTo({
              y: Math.max(0, y - 20),
              animated: true,
            }),
          () => console.log("Failed to measure exercise heading"),
        );
      }
    },
    [exercises, workout],
  );

  // Update exercise progress
  const updateProgress = useCallback(
    <K extends keyof ExerciseProgress>(
      field: K,
      value: ExerciseProgress[K],
    ) => {
      setExerciseProgress((prev) => {
        const updated = [...prev];
        updated[currentExerciseIndex] = {
          ...updated[currentExerciseIndex],
          [field]: value,
        };
        return updated;
      });
    },
    [currentExerciseIndex],
  );

  // Update current block for abandonment tracking
  const updateCurrentBlockForAbandonment = useCallback(
    (exerciseIndex: number) => {
      if (!workout || !exercises[exerciseIndex]) return;

      const exercise = exercises[exerciseIndex];
      const block = workout.blocks.find((b) =>
        b.exercises?.some((ex) => ex.exerciseId === exercise.exerciseId),
      );

      if (block) {
        setCurrentWorkoutData({
          workout_id: workout.workoutId,
          plan_day_id: workout.id,
          block_id: block.id,
          block_name: block.blockType || "unknown",
        });
      }
    },
    [workout, exercises, setCurrentWorkoutData],
  );

  // Load completed workout duration
  const loadCompletedWorkoutDuration = useCallback(
    async (planDayId: number) => {
      try {
        const planDayLog = await getPlanDayLog(planDayId);
        if (planDayLog?.totalTimeMinutes) {
          timers.setWorkoutTimer(planDayLog.totalTimeMinutes * 60);
          setCompletedExercisesCount(planDayLog.exercisesCompleted || 0);
          setHasCompletedWorkoutDuration(true);
        } else {
          timers.setWorkoutTimer(0);
          setCompletedExercisesCount(0);
          setHasCompletedWorkoutDuration(false);
        }
      } catch (error) {
        console.error("Error loading completed workout duration:", error);
        timers.setWorkoutTimer(0);
        setCompletedExercisesCount(0);
        setHasCompletedWorkoutDuration(false);
      }
    },
    [timers],
  );

  // Load workout data
  const loadWorkout = useCallback(
    async (forceRefresh = false) => {
      // Skip loading if workout is already in progress (prevents resetting active workout)
      if (isWorkoutStarted && !forceRefresh) {
        return;
      }

      try {
        if (!forceRefresh && !isWorkoutStarted) setLoading(true);
        setError(null);

        const response = await fetchActiveWorkout(forceRefresh);

        if (!response?.planDays?.length) {
          setWorkout(null);
          setHasActiveWorkoutPlan(false);
          return;
        }

        setHasActiveWorkoutPlan(true);
        const today = getCurrentDate();
        const todaysWorkout = response.planDays.find(
          (day: PlanDayWithBlocks) => {
            const normalizedDayDate = formatDateAsString(day.date);
            return normalizedDayDate === today;
          },
        );

        if (!todaysWorkout) {
          setWorkout(null);
          return;
        }

        if (todaysWorkout.isComplete) {
          setWorkout(todaysWorkout);
          setIsWorkoutCompleted(true);
          setWorkoutInProgress(false);
          await loadCompletedWorkoutDuration(todaysWorkout.id);
          return;
        }

        setWorkout(todaysWorkout);

        // Only initialize exercise progress if workout hasn't started
        // This prevents resetting progress during an active workout
        if (!isWorkoutStarted) {
          const flatExercises = todaysWorkout.blocks.flatMap(
            (block: WorkoutBlockWithExercises) => block.exercises,
          );
          const initialProgress: ExerciseProgress[] = flatExercises.map(
            (exercise: WorkoutBlockWithExercise) => ({
              setsCompleted: 0,
              repsCompleted: 0,
              roundsCompleted: 0,
              weightUsed: exercise.weight || 0,
              sets: [],
              duration: exercise.duration || 0,
              restTime: exercise.restTime || 0,
              notes: "",
            }),
          );
          setExerciseProgress(initialProgress);
        }
      } catch (err) {
        console.error("Error loading workout:", err);
        setError("Failed to load workout. Please try again.");
      } finally {
        setLoading(false);
        if (forceRefresh) setRefreshing(false);
      }
    },
    [setWorkoutInProgress, loadCompletedWorkoutDuration, isWorkoutStarted],
  );

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWorkout(true);
  }, [loadWorkout]);

  // Generate new workout
  const handleGenerateNewWorkout = useCallback(async () => {
    if (!user?.id) return null;

    if (isGenerating) {
      return {
        error: true,
        title: "Generation in Progress",
        description:
          "A workout is already being generated. Please wait for it to complete.",
        icon: "information-circle" as const,
      };
    }

    try {
      await registerForPushNotifications();
      const result = await generateWorkoutPlanAsync(user.id);

      if (result?.success && result.jobId) {
        await addJob(result.jobId, "generation");
        router.replace("/");
        return null;
      } else {
        return {
          error: true,
          title: "Generation Failed",
          description:
            "Unable to start workout generation. Please check your connection and try again.",
          icon: "alert-circle" as const,
        };
      }
    } catch (error) {
      return {
        error: true,
        title: "Generation Error",
        description:
          "An error occurred while starting workout generation. Please try again.",
        icon: "alert-circle" as const,
      };
    }
  }, [user, isGenerating, addJob, router]);

  // Handle repeat workout success
  const handleRepeatWorkoutSuccess = useCallback(() => {
    loadWorkout(true);
  }, [loadWorkout]);

  // Start workout
  const startWorkout = useCallback(async () => {
    timers.startTimers();
    setIsWorkoutStarted(true);

    if (workout) {
      const firstBlock = workout.blocks[0];
      setCurrentWorkoutData({
        workout_id: workout.workoutId,
        plan_day_id: workout.id,
        block_id: firstBlock?.id || 0,
        block_name: firstBlock?.blockType || "unknown",
      });
    }

    setWorkoutInProgress(true);

    if (workout?.id) {
      try {
        await trackWorkoutStarted({
          workout_id: workout.workoutId,
          plan_day_id: workout.id,
          workout_name: workout.name,
        });
      } catch (error) {
        console.warn("Failed to track workout started:", error);
      }
    }

    setTimeout(() => scrollToExerciseHeading(0), 100);
  }, [
    timers,
    workout,
    setCurrentWorkoutData,
    setWorkoutInProgress,
    scrollToExerciseHeading,
  ]);

  // Complete workout day helper
  const completeWorkoutDay = useCallback(async () => {
    if (!workout?.id) return;

    const completedExerciseCount = exercises.length - skippedExercises.length;
    const completedBlockCount = workout.blocks.length;
    const finalDuration = timers.getWorkoutDurationForAnalytics();

    await markPlanDayAsComplete(workout.id, {
      totalTimeSeconds: finalDuration,
      exercisesCompleted: completedExerciseCount,
      blocksCompleted: completedBlockCount,
    });

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 30);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 7);

    await refreshDashboard({
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    });

    setCurrentExerciseIndex(exercises.length);
    setIsWorkoutCompleted(true);
    setWorkoutInProgress(false);
  }, [
    workout,
    exercises,
    skippedExercises,
    timers,
    refreshDashboard,
    setWorkoutInProgress,
  ]);

  // Complete exercise
  const completeExercise = useCallback(async (): Promise<{
    success: boolean;
    error?: { title: string; description: string };
    workoutComplete?: boolean;
  }> => {
    if (!currentExercise || !currentProgress) {
      return { success: false };
    }

    setIsCompletingExercise(true);

    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("User not authenticated");

      // Handle warmup/cooldown completion
      if (isCurrentBlockWarmupCooldown) {
        await createExerciseLog({
          planDayExerciseId: currentExercise.id,
          sets: [
            {
              roundNumber: 1,
              setNumber: 1,
              weight: 0,
              reps: currentExercise.reps || 1,
            },
          ],
          durationCompleted: currentExercise.duration || 0,
          isComplete: true,
          timeTaken: timers.exerciseTimer,
          notes: currentProgress.notes || "",
        });

        if (currentExerciseIndex < exercises.length - 1) {
          const nextIndex = currentExerciseIndex + 1;
          setCurrentExerciseIndex(nextIndex);
          timers.resetExerciseTimer();
          updateCurrentBlockForAbandonment(nextIndex);
          scrollToExerciseHeading(nextIndex);
        } else {
          await completeWorkoutDay();
        }

        setShowCompleteModal(false);
        return { success: true };
      }

      // Handle circuit completion
      if (isCurrentBlockCircuit && currentBlock) {
        if (circuitSession?.actions.completeCircuit) {
          await circuitSession.actions.completeCircuit();
        }

        const session = circuitSession?.sessionData;
        if (workout?.workoutId && session) {
          for (const round of session.rounds) {
            const hasReps = round.exercises?.some(
              (ex: CircuitExercise) => (ex.actualReps || 0) > 0,
            );
            if (hasReps || round.isCompleted) {
              await logCircuitRound(workout.workoutId, currentBlock.id, round);
            }
          }
          await markBlockExercisesComplete(workout.workoutId, currentBlock);
        }

        const circuitExerciseIds = currentBlock.exercises.map((ex) => ex.id);
        const exerciseIndices = circuitExerciseIds
          .map((exerciseId) =>
            exercises.findIndex((ex) => ex.id === exerciseId),
          )
          .filter((index) => index !== -1);

        const updatedProgress = [...exerciseProgress];
        const roundsCompleted = (
          circuitSession?.sessionData.rounds || []
        ).filter((r) => r.isCompleted).length;
        exerciseIndices.forEach((index) => {
          updatedProgress[index] = {
            ...updatedProgress[index],
            setsCompleted: currentBlock.exercises[index]?.sets || 1,
            repsCompleted: 0,
            roundsCompleted,
          };
        });
        setExerciseProgress(updatedProgress);

        const maxCircuitIndex = Math.max(...exerciseIndices);
        const nextExerciseIndex = maxCircuitIndex + 1;

        if (nextExerciseIndex < exercises.length) {
          setCurrentExerciseIndex(nextExerciseIndex);
          timers.resetExerciseTimer();
          scrollToExerciseHeading(nextExerciseIndex);
        } else {
          await completeWorkoutDay();
        }

        setShowCompleteModal(false);
        return { success: true };
      }

      // Regular exercise completion
      const hasSets = currentProgress.sets && currentProgress.sets.length > 0;
      const hasDuration =
        currentProgress.duration && currentProgress.duration > 0;
      const isDurationBasedExercise =
        currentExercise.duration &&
        currentExercise.duration > 0 &&
        (!currentExercise.reps || currentExercise.reps === 0);

      if (!hasSets && !hasDuration && !isDurationBasedExercise) {
        return {
          success: false,
          error: {
            title: "No Progress Logged",
            description:
              "Please log your exercise progress before completing this exercise.",
          },
        };
      }

      let setsToLog = currentProgress.sets;
      if (isDurationBasedExercise && (!setsToLog || setsToLog.length === 0)) {
        setsToLog = [
          {
            roundNumber: 1,
            setNumber: 1,
            weight: currentExercise.weight || 0,
            reps: 0,
          },
        ];
      }

      await createExerciseLog({
        planDayExerciseId: currentExercise.id,
        sets: setsToLog,
        durationCompleted: currentProgress.duration,
        isComplete: true,
        timeTaken: timers.exerciseTimer,
        notes: currentProgress.notes,
      });

      if (currentExerciseIndex < exercises.length - 1) {
        const nextIndex = currentExerciseIndex + 1;
        setCurrentExerciseIndex(nextIndex);
        timers.resetExerciseTimer();
        updateCurrentBlockForAbandonment(nextIndex);
        scrollToExerciseHeading(nextIndex);
        setShowCompleteModal(false);
        return { success: true };
      } else {
        await completeWorkoutDay();
        setShowCompleteModal(false);
        return { success: true, workoutComplete: true };
      }
    } catch (err) {
      console.error("Error completing exercise:", err);
      return {
        success: false,
        error: {
          title: "Error",
          description: isCurrentBlockCircuit
            ? "Failed to complete circuit. Please try again."
            : "Failed to complete exercise. Please try again.",
        },
      };
    } finally {
      setIsCompletingExercise(false);
    }
  }, [
    currentExercise,
    currentProgress,
    currentBlock,
    isCurrentBlockWarmupCooldown,
    isCurrentBlockCircuit,
    exercises,
    exerciseProgress,
    currentExerciseIndex,
    workout,
    circuitSession,
    timers,
    updateCurrentBlockForAbandonment,
    scrollToExerciseHeading,
    completeWorkoutDay,
  ]);

  // Skip exercise
  const skipCurrentExercise = useCallback(async (): Promise<{
    success: boolean;
    error?: { title: string; description: string };
    workoutComplete?: boolean;
  }> => {
    if (!currentExercise || !workout) {
      return { success: false };
    }

    setIsSkippingExercise(true);

    try {
      await skipExercise(workout.workoutId, currentExercise.id);
      setSkippedExercises((prev) => [...prev, currentExercise.id]);

      setExerciseProgress((prev) => {
        const updated = [...prev];
        updated[currentExerciseIndex] = {
          ...updated[currentExerciseIndex],
          isSkipped: true,
        };
        return updated;
      });

      if (currentExerciseIndex < exercises.length - 1) {
        const nextIndex = currentExerciseIndex + 1;
        setCurrentExerciseIndex(nextIndex);
        timers.resetExerciseTimer();
        updateCurrentBlockForAbandonment(nextIndex);
        scrollToExerciseHeading(nextIndex);
        setShowSkipModal(false);
        return { success: true };
      } else {
        await completeWorkoutDay();
        setShowSkipModal(false);
        return { success: true, workoutComplete: true };
      }
    } catch (err) {
      console.error("Error skipping exercise:", err);
      return {
        success: false,
        error: {
          title: "Error",
          description: "Failed to skip exercise. Please try again.",
        },
      };
    } finally {
      setIsSkippingExercise(false);
    }
  }, [
    currentExercise,
    workout,
    exercises,
    currentExerciseIndex,
    timers,
    updateCurrentBlockForAbandonment,
    scrollToExerciseHeading,
    completeWorkoutDay,
  ]);

  // Sync context with workout state
  useEffect(() => {
    if (isWorkoutCompleted) {
      setWorkoutInProgress(false);
    } else if (isWorkoutStarted) {
      setWorkoutInProgress(true);
    } else {
      setWorkoutInProgress(false);
    }
  }, [isWorkoutStarted, isWorkoutCompleted, setWorkoutInProgress]);

  // Note: Workout abandonment handling removed due to race conditions
  // The workout context (isWorkoutInProgress) is managed by the sync effect above

  // Auto-add first set when moving to a new exercise
  useEffect(() => {
    if (
      isWorkoutStarted &&
      !isWorkoutCompleted &&
      currentExercise &&
      currentProgress
    ) {
      if (currentProgress.sets.length === 0) {
        const firstSet = {
          roundNumber: 1,
          setNumber: 1,
          weight: currentExercise.weight || 0,
          reps: currentExercise.reps || 10,
        };
        updateProgress("sets", [firstSet]);
      }
    }
  }, [
    currentExerciseIndex,
    isWorkoutStarted,
    isWorkoutCompleted,
    currentExercise,
    currentProgress,
    updateProgress,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setWorkoutInProgress(false);
      timers.stopTimers();
    };
  }, [setWorkoutInProgress, timers]);

  // Clear data on logout
  useEffect(() => {
    if (!user && !authLoading) {
      reset();
    }
  }, [user, authLoading, reset]);

  return {
    // State
    loading,
    error,
    workout,
    hasActiveWorkoutPlan,
    currentExerciseIndex,
    isWorkoutStarted,
    isWorkoutCompleted,
    refreshing,
    hasCompletedWorkoutDuration,
    completedExercisesCount,
    exerciseProgress,
    skippedExercises,
    
    // Modal state
    showCompleteModal,
    setShowCompleteModal,
    showRestCompleteModal,
    setShowRestCompleteModal,
    showSkipModal,
    setShowSkipModal,
    showRepeatModal,
    setShowRepeatModal,
    isCompletingExercise,
    isSkippingExercise,
    
    // Derived data
    exercises,
    currentExercise,
    currentProgress,
    progressPercent,
    currentBlock,
    isCurrentBlockCircuit,
    isCurrentBlockWarmupCooldown,
    circuitSession,
    
    // Refs
    scrollViewRef,
    exerciseHeadingRef,
    circuitHeadingRef,
    
    // Timers
    timers,
    restTimer,
    
    // Context data
    isGenerating,

    // Actions
    loadWorkout,
    onRefresh,
    handleGenerateNewWorkout,
    handleRepeatWorkoutSuccess,
    startWorkout,
    completeExercise,
    skipCurrentExercise,
    updateProgress,
  };
}
