import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { activateKeepAwake, deactivateKeepAwake } from "expo-keep-awake";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import React, { useCallback,useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  type AppStateStatus,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { AppState } from "react-native";

import AdaptiveSetTracker from "@/components/adaptive-set-tracker";
import CircuitTracker from "@/components/circuit-tracker";
import ExerciseLink from "@/components/exercise-link";
import ExerciseVideoCarousel from "@/components/exercise-video-carousel";
import JustGeneratedBadge from "@/components/just-generated-badge";
import NoActiveWorkoutCard from "@/components/no-active-workout-card";
import { WorkoutSkeleton } from "@/components/skeletons/skeleton-screens";
import { StreakBadge } from "@/components/streak";
import type { DialogButton } from "@/components/ui";
import { CustomDialog } from "@/components/ui";
import ExerciseCompleteSnackbar from "@/components/workout/exercise-complete-snackbar";
import WorkoutChoiceModal from "@/components/workout-choice-modal";
import WorkoutRegenerationModal from "@/components/workout-regeneration-modal";
import WorkoutRepeatPicker from "@/components/workout-repeat-picker";
import WorkoutSummary from "@/components/workout-summary";
import { HIT_SLOP_6, HIT_SLOP_10 } from "@/constants";
import { useAppDataContext } from "@/contexts/app-data-context";
import { useAuth } from "@/contexts/auth-context";
import { useBackgroundJobs } from "@/contexts/background-job-context";
import { useWorkout } from "@/contexts/workout-context";
import { useCircuitSession } from "@/hooks/use-circuit-session";
import { trackWorkoutStarted } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { logCircuitCompletion } from "@/lib/circuits";
import { tabEvents } from "@/lib/tab-events";
import { useThemeColors } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import {
  createExerciseLog,
  fetchActiveWorkout,
  fetchExerciseLogsForPlanDay,
  markPlanDayAsComplete,
  skipExercise,
} from "@/lib/workouts";
import { invalidateActiveWorkoutCache } from "@/lib/workouts";
import {
  type CircuitRound,
  type CircuitSessionConfig,
  type CircuitSessionData,
} from "@/types/api/circuit.types";
import { type ExerciseSet } from "@/types/api/logs.types";
import {
  getBlockTypeDisplayName,
  type PlanDayWithBlocks,
  type WorkoutBlockWithExercise,
  type WorkoutBlockWithExercises,
} from "@/types/api/workout.types";
import { formatDateAsString,formatEquipment, getCurrentDate } from "@/utils";
import {
  isCircuitBlock,
  isWarmupCooldownBlock,
} from "@/utils/circuit-utils";

// Local types for this component
interface ExerciseProgress {
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

// Circuit Logging Interface Component
function CircuitLoggingInterface({
  block,
  isWorkoutStarted,
  circuitSession,
}: {
  block: WorkoutBlockWithExercises;
  workout: PlanDayWithBlocks;
  isWorkoutStarted: boolean;
  circuitSession: ReturnType<typeof useCircuitSession> | null;
  onError: (title: string, description: string) => void;
}) {
  if (!circuitSession) {
    return null; // Don't render if no circuit session
  }

  const { sessionData, actions, canUndoRound } = circuitSession;

  // Round/circuit completion callbacks are no-ops for logging — all logging
  // is batched into a single call via logCircuitCompletion() when the user
  // presses "Complete Circuit" in the exercise completion flow.
  const handleRoundComplete = async (_roundData: CircuitRound) => {
    // No incremental API calls — data is logged in batch at circuit completion
  };

  const handleCircuitComplete = async (_sessionData: CircuitSessionData) => {
    // No incremental API calls — data is logged in batch at circuit completion
  };

  return (
    <View className="space-y-6">
      {/* Circuit Tracker */}
      <View className="bg-card rounded-2xl p-3">
        <CircuitTracker
          block={block}
          sessionData={sessionData}
          onSessionUpdate={(_updatedSessionData) => {
            // Update session data through the hook's actions
            // This is handled internally by the useCircuitSession hook
          }}
          onRoundComplete={handleRoundComplete}
          onCircuitComplete={handleCircuitComplete}
          isActive={isWorkoutStarted}
          circuitActions={actions}
          canUndoRound={canUndoRound}
        />
      </View>
    </View>
  );
}

export function WorkoutScreen() {
  const colors = useThemeColors();
  const { isDark } = useTheme();

  // Get workout context for tab disabling
  const {
    setWorkoutInProgress,
    isWorkoutInProgress,
    setCurrentWorkoutData,
    setEndWorkoutEarlyHandler,
    abandonWorkout,
  } = useWorkout();

  // Get user from auth context
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Background job tracking
  const { isGenerating, justGenerated, clearJustGenerated } =
    useBackgroundJobs();

  // Get data refresh functions
  const {
    refresh: { refreshDashboard, refreshWorkout, reset },
  } = useAppDataContext();

  // Core state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workout, setWorkout] = useState<PlanDayWithBlocks | null>(null);
  const [hasActiveWorkoutPlan, setHasActiveWorkoutPlan] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);
  const [isWorkoutCompleted, setIsWorkoutCompleted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // [MF-012] Full plan overview collapses to a compact progress rail once
  // the workout starts, so the current exercise dominates. User can still
  // expand it back on demand.
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  // [MF-012] Notes stay collapsed behind a row unless the user already has
  // a note for this exercise -- avoids an always-open text field competing
  // with the logging UI for attention.
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);

  // Timer state
  const [workoutTimer, setWorkoutTimer] = useState(0);
  const [exerciseTimer, setExerciseTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Exercise progress state
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress[]>(
    [],
  );

  // Skip state
  const [skippedExercises, setSkippedExercises] = useState<number[]>([]);

  // Modal state
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [isCompletingExercise, setIsCompletingExercise] = useState(false);
  const [isSkippingExercise, setIsSkippingExercise] = useState(false);
  const [isEndingEarly, setIsEndingEarly] = useState(false);
  const [isResuming, setIsResuming] = useState(false);

  // New modal states for repeat workout
  const [showRegenerationModal, setShowRegenerationModal] = useState(false);
  const [showRepeatPicker, setShowRepeatPicker] = useState(false);
  const [showWorkoutChoice, setShowWorkoutChoice] = useState(false);

  // Dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    description: string;
    primaryButton: DialogButton;
    secondaryButton?: DialogButton;
    tertiaryButton?: DialogButton;
    icon?: keyof typeof Ionicons.glyphMap;
    accessory?: React.ReactNode;
  } | null>(null);

  // Helper function to show error dialog
  const showErrorDialog = useCallback((title: string, description: string) => {
    setDialogConfig({
      title,
      description,
      primaryButton: {
        text: "OK",
        onPress: () => setDialogVisible(false),
      },
      icon: "alert-circle",
    });
    setDialogVisible(true);
  }, []);

  // [T5-3/MF-003] Rest-timer state, countdown, UI, and the Rest Complete modal
  // were removed entirely (owner decision: no timers). The workout/exercise
  // elapsed "timers" below are an invisible analytics stopwatch feeding
  // timeTaken/duration — deliberately kept.
  const workoutStartTime = useRef<number | null>(null);
  const exerciseStartTime = useRef<number | null>(null);
  const appStateRef = useRef(AppState.currentState);

  // UI state
  const scrollViewRef = useRef<ScrollView>(null);
  const exerciseHeadingRef = useRef<View>(null);
  const isResumingRef = useRef(false);
  const circuitHeadingRef = useRef<View>(null);

  // Helper function to scroll to exercise heading
  const scrollToExerciseHeading = (exerciseIndex: number) => {
    const nextExercise = exercises[exerciseIndex];
    const nextBlock = workout?.blocks?.find((block) =>
      block.exercises.some((ex) => ex.id === nextExercise?.id),
    );
    const isNextCircuit =
      nextBlock &&
      (nextBlock.blockType === "circuit" ||
        nextBlock.blockType === "amrap" ||
        nextBlock.blockType === "emom" ||
        nextBlock.blockType === "tabata" ||
        nextBlock.blockType === "for_time");

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
  };

  // Get flattened exercises from blocks (including warmup/cooldown)
  const getFlattenedExercises = (): WorkoutBlockWithExercise[] => {
    if (!workout?.blocks) return [];
    return workout.blocks.flatMap((block) => block.exercises);
  };

  const exercises = getFlattenedExercises();
  const currentExercise = exercises[currentExerciseIndex];
  const currentProgress = exerciseProgress[currentExerciseIndex];

  // Calculate overall workout progress (0 - 100) including skipped exercises
  const completedAndSkippedCount =
    currentExerciseIndex + skippedExercises.length;
  const progressPercent =
    exercises.length > 0
      ? (completedAndSkippedCount / exercises.length) * 100
      : 0;

  // Timer management with timestamp-based calculation
  useEffect(() => {
    if (isWorkoutStarted && !isPaused && !isWorkoutCompleted) {
      // Activate keep awake to prevent screen sleep
      activateKeepAwake("workout-timer");

      // Initialize start times if not set
      if (!workoutStartTime.current) {
        workoutStartTime.current = Date.now() - workoutTimer * 1000;
      }
      if (!exerciseStartTime.current) {
        exerciseStartTime.current = Date.now() - exerciseTimer * 1000;
      }

      // Workout timer interval
      timerRef.current = setInterval(() => {
        const now = Date.now();
        if (workoutStartTime.current) {
          setWorkoutTimer(Math.floor((now - workoutStartTime.current) / 1000));
        }
        if (exerciseStartTime.current) {
          setExerciseTimer(
            Math.floor((now - exerciseStartTime.current) / 1000),
          );
        }
      }, 1000);
    } else {
      // Deactivate keep awake when timer stops
      deactivateKeepAwake("workout-timer");

      // Clean up display timer when workout stops
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      deactivateKeepAwake("workout-timer");
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isWorkoutStarted, isPaused, isWorkoutCompleted]);

  // Handle app state changes to manage timers during background/foreground transitions
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // App came to foreground - recalculate timers based on timestamps
        console.log("App came to foreground, recalculating timers");

        // Recalculate workout and exercise timers
        if (isWorkoutStarted && !isPaused && !isWorkoutCompleted) {
          const now = Date.now();
          if (workoutStartTime.current) {
            setWorkoutTimer(
              Math.floor((now - workoutStartTime.current) / 1000),
            );
          }
          if (exerciseStartTime.current) {
            setExerciseTimer(
              Math.floor((now - exerciseStartTime.current) / 1000),
            );
          }
        }

      } else if (nextAppState.match(/inactive|background/)) {
        // App going to background - timers will continue based on timestamps
        console.log(
          "App going to background, timers will continue via timestamps",
        );
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [isWorkoutStarted, isPaused, isWorkoutCompleted]);

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

  // Handle workout abandonment - reset workout state when context says no workout in progress
  // but local state thinks workout is started
  useEffect(() => {
    if (!isWorkoutInProgress && isWorkoutStarted && !isWorkoutCompleted) {
      setIsWorkoutStarted(false);
      setIsPaused(false);
      setWorkoutTimer(0);
      setExerciseTimer(0);
      setCurrentExerciseIndex(0);

      // Reset timestamp references
      workoutStartTime.current = null;
      exerciseStartTime.current = null;

      // Deactivate keep awake
      deactivateKeepAwake("workout-timer");

      // Clear any active timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isWorkoutInProgress, isWorkoutStarted, isWorkoutCompleted]);

  // [T5-1] Pre-materialize ALL prescribed sets when moving to a new exercise
  // (previously only set 1 was auto-created and the user hand-built the rest
  // via Add Set). Each set is pre-filled from the prescription and starts
  // unchecked; the user just taps ✓ as they finish each one.
  useEffect(() => {
    if (
      isWorkoutStarted &&
      !isWorkoutCompleted &&
      currentExercise &&
      currentProgress
    ) {
      // Only materialize if no sets exist for this exercise yet
      if (currentProgress.sets.length === 0) {
        const targetSets = currentExercise.sets || 1;
        const targetReps = currentExercise.reps || 10;
        const targetWeight = currentExercise.weight || 0;

        const prescribedSets = Array.from({ length: targetSets }, (_, i) => ({
          roundNumber: 1,
          setNumber: i + 1,
          weight: targetWeight,
          reps: targetReps,
          isCompleted: false,
        }));
        updateProgress("sets", prescribedSets);
      }
    }
  }, [currentExerciseIndex, isWorkoutStarted, isWorkoutCompleted]);

  // [MF-012] Notes expansion is per-exercise -- collapse it again on
  // navigating to a new exercise so a note left open on a prior exercise
  // doesn't stay open here too.
  useEffect(() => {
    setIsNotesExpanded(false);
  }, [currentExerciseIndex]);

  // Cleanup workout context on unmount
  useEffect(() => {
    return () => {
      // [T5-2] Land any deferred auto-advance commit (reads a ref, so the
      // stale closure is safe); fire-and-forget on teardown.
      void flushPendingCommit();
      setWorkoutInProgress(false);
      // Cleanup keep awake on unmount
      deactivateKeepAwake("workout-timer");
      // Clear timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setWorkoutInProgress]);

  // Load workout data
  const loadWorkout = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        setLoading(true);
      }
      setError(null);

      const response = await fetchActiveWorkout(forceRefresh);

      if (!response?.planDays?.length) {
        setWorkout(null);
        setHasActiveWorkoutPlan(false);
        return;
      }

      // We have an active workout plan
      setHasActiveWorkoutPlan(true);

      // Find today's workout using string comparison to avoid timezone issues
      const today = getCurrentDate(); // Use the same function as other parts of the app

      const todaysWorkout = response.planDays.find((day: PlanDayWithBlocks) => {
        // Use the formatDateAsString function to normalize dates consistently
        const normalizedDayDate = formatDateAsString(day.date);
        return normalizedDayDate === today;
      });

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

      // Rest day plan days have no blocks — treat as rest day
      if (!todaysWorkout.blocks || todaysWorkout.blocks.length === 0) {
        setWorkout(null);
        return;
      }

      setWorkout(todaysWorkout);

      // Initialize exercise progress
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

  // Set up notification handler and request permissions
  useEffect(() => {
    // Configure notification handler for iOS sound support (no banner)
    Notifications.setNotificationHandler({
      handleNotification: async () =>
        ({
          shouldShowAlert: false, // Hide the banner notification
          shouldShowBanner: false,
          shouldShowList: false,
          shouldPlaySound: true, // Keep the sound
          shouldSetBadge: false,
        }) as any,
    });

    const requestPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        console.log("Notification permissions not granted");
      }
    };
    requestPermissions();
  }, []);

  // Load workout on mount and when tab is focused
  useEffect(() => {
    loadWorkout();
  }, []);

  // Clear app data when user logs out (but not during initial auth loading)
  useEffect(() => {
    if (!user && !authLoading) {
      reset();
    }
  }, [user, authLoading, reset]);

  const hasLoadedOnce = useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      if (!isWorkoutCompleted && !isResumingRef.current) {
        loadWorkout(false);
      }
      isResumingRef.current = false;
      // Only scroll to top on subsequent tab focuses, not on initial load
      // or when isWorkoutCompleted changes mid-session
      if (hasLoadedOnce.current) {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      }
      hasLoadedOnce.current = true;

      return () => {
        // Reset so the next focus event scrolls to top
        hasLoadedOnce.current = false;
        // Clear the "Just generated" badge once the user navigates away
        clearJustGenerated();
      };
    }, [isWorkoutCompleted, clearJustGenerated]),
  );

  // Listen for tab re-click events
  useEffect(() => {
    const handleScrollToTop = () => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    };

    tabEvents.on("scrollToTop:workout", handleScrollToTop);

    return () => {
      tabEvents.off("scrollToTop:workout", handleScrollToTop);
    };
  }, []);

  // Update exercise progress
  const updateProgress = <K extends keyof ExerciseProgress>(
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
  };

  // Get workout duration for analytics (ignores pause state)
  const getWorkoutDurationForAnalytics = (): number => {
    if (workoutStartTime.current) {
      // Simple calculation: total time from start to now in seconds (backend converts to ms)
      return Math.floor((Date.now() - workoutStartTime.current) / 1000);
    }
    return 0; // No start time recorded
  };

  // Update current block for abandonment tracking
  const updateCurrentBlockForAbandonment = (exerciseIndex: number) => {
    if (!workout || !exercises[exerciseIndex]) return;

    const currentExercise = exercises[exerciseIndex];
    const currentBlock = workout.blocks.find((block) =>
      block.exercises?.some(
        (ex) => ex.exerciseId === currentExercise.exerciseId,
      ),
    );

    if (currentBlock) {
      setCurrentWorkoutData({
        workout_id: workout.workoutId,
        plan_day_id: workout.id,
        block_id: currentBlock.id,
        block_name: currentBlock.blockType || "unknown",
      });
    }
  };

  // Start workout
  const startWorkout = async () => {
    const now = Date.now();
    setIsWorkoutStarted(true);
    setWorkoutTimer(0);
    setExerciseTimer(0);
    workoutStartTime.current = now;
    exerciseStartTime.current = now;
    // Set current workout data BEFORE marking workout as in progress
    if (workout) {
      const currentBlock = workout.blocks[0]; // Start with first block
      const abandData = {
        workout_id: workout.workoutId,
        plan_day_id: workout.id,
        block_id: currentBlock?.id || 0,
        block_name: currentBlock?.blockType || "unknown",
      };
      console.log("🐛 Setting workout abandonment data:", abandData);
      setCurrentWorkoutData(abandData);
    }

    setWorkoutInProgress(true); // Notify context that workout started

    // Track workout started
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

    // Auto-scroll to first exercise when workout starts
    setTimeout(() => {
      scrollToExerciseHeading(0);
    }, 100);
  };

  // Toggle pause
  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  // Complete current exercise
  // ── [T5-2] Auto-advance with a deferred commit + Undo window ──────────────
  // When the final set is checked, the UI advances immediately but the
  // exercise log is committed after UNDO_WINDOW_MS. Undo cancels the commit
  // and returns to the exercise. Every other flow that persists or leaves the
  // session flushes the pending commit first so logs always land in order.
  const UNDO_WINDOW_MS = 5000;
  const pendingCommitRef = useRef<{
    timeout: NodeJS.Timeout;
    exerciseIndex: number;
    payload: Parameters<typeof createExerciseLog>[0];
  } | null>(null);
  const [undoSnackbar, setUndoSnackbar] = useState<{
    exerciseName: string;
  } | null>(null);

  // [T5-1] isCompleted is client-side only — strip it before the API call.
  const toApiSets = (setsToStrip: ExerciseSet[]) =>
    setsToStrip.map(({ isCompleted: _isCompleted, ...rest }) => rest);

  const flushPendingCommit = async () => {
    const pending = pendingCommitRef.current;
    if (!pending) return;
    pendingCommitRef.current = null;
    clearTimeout(pending.timeout);
    setUndoSnackbar(null);
    try {
      await createExerciseLog(pending.payload);
    } catch (err) {
      // The user has already moved on — surface without blocking the session.
      console.error("Error committing auto-completed exercise log:", err);
      showErrorDialog(
        "Sync Issue",
        "A completed exercise couldn't be saved. It will be missing from your log.",
      );
    }
  };

  // All sets checked → complete + advance in one motion (no modal, T5-2).
  const handleAllSetsCompleted = () => {
    if (!currentExercise || !currentProgress) return;

    // Final exercise: run the full completion path (marks the day complete,
    // shows the summary) — immediate commit, no Undo window.
    if (currentExerciseIndex >= exercises.length - 1) {
      completeExercise();
      return;
    }

    // A previous exercise's commit may still be pending — land it first.
    flushPendingCommit();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const completedSets = (currentProgress.sets || []).filter(
      (s) => s.isCompleted,
    );
    const payload = {
      planDayExerciseId: currentExercise.id,
      sets: toApiSets(completedSets),
      durationCompleted: currentProgress.duration,
      isComplete: true,
      timeTaken: exerciseTimer,
      notes: currentProgress.notes,
    };
    const timeout = setTimeout(() => {
      void flushPendingCommit();
    }, UNDO_WINDOW_MS);
    pendingCommitRef.current = {
      timeout,
      exerciseIndex: currentExerciseIndex,
      payload,
    };
    setUndoSnackbar({ exerciseName: currentExercise.exercise.name });

    // Advance the UI immediately (mirrors completeExercise's advance block).
    const nextIndex = currentExerciseIndex + 1;
    setCurrentExerciseIndex(nextIndex);
    setExerciseTimer(0);
    exerciseStartTime.current = Date.now();
    updateCurrentBlockForAbandonment(nextIndex);
    setTimeout(() => scrollToExerciseHeading(nextIndex), 150);
  };

  // Undo: cancel the pending commit, return to the exercise, and uncheck its
  // last set so re-checking naturally re-triggers the advance.
  const undoAutoComplete = () => {
    const pending = pendingCommitRef.current;
    if (!pending) return;
    clearTimeout(pending.timeout);
    pendingCommitRef.current = null;
    setUndoSnackbar(null);

    const idx = pending.exerciseIndex;
    setExerciseProgress((prev) => {
      const updated = [...prev];
      const prog = updated[idx];
      if (prog) {
        const undoneSets = [...prog.sets];
        for (let i = undoneSets.length - 1; i >= 0; i--) {
          if (undoneSets[i].isCompleted) {
            undoneSets[i] = { ...undoneSets[i], isCompleted: false };
            break;
          }
        }
        updated[idx] = { ...prog, sets: undoneSets };
      }
      return updated;
    });
    setCurrentExerciseIndex(idx);
    exerciseStartTime.current = Date.now();
    setTimeout(() => scrollToExerciseHeading(idx), 150);
  };

  const completeExercise = async () => {
    if (!currentExercise || !currentProgress) return;

    // [T5-2] Land any deferred commit from a prior auto-advance first, so
    // exercise logs are persisted in order.
    await flushPendingCommit();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsCompletingExercise(true);

    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("User not authenticated");

      // Handle warmup/cooldown completion differently - simplified logging
      if (isCurrentBlockWarmupCooldown) {
        // For warmup/cooldown, we don't require detailed logging
        // Just mark as complete with minimal data
        await createExerciseLog({
          planDayExerciseId: currentExercise.id,
          sets: [
            {
              roundNumber: 1,
              setNumber: 1,
              weight: 0,
              reps: currentExercise.reps || 1, // Use target reps or default to 1
            },
          ],
          durationCompleted: currentExercise.duration || 0,
          isComplete: true,
          timeTaken: exerciseTimer,
          notes: currentProgress.notes || "",
        });

        // Move to next exercise or complete workout
        if (currentExerciseIndex < exercises.length - 1) {
          const nextIndex = currentExerciseIndex + 1;
          setCurrentExerciseIndex(nextIndex);
          setExerciseTimer(0);
          exerciseStartTime.current = Date.now();
          updateCurrentBlockForAbandonment(nextIndex);
          setTimeout(() => scrollToExerciseHeading(nextIndex), 150);
        } else {
          // All exercises completed, complete the workout
          if (workout?.id) {
            const completedExerciseCount =
              exercises.length - skippedExercises.length;
            const completedBlockCount = workout.blocks.length;

            // Get duration for analytics (simple start to end time)
            const finalDuration = getWorkoutDurationForAnalytics();

            const today = new Date();
            const startDate = new Date(today);
            startDate.setDate(today.getDate() - 30);
            const endDate = new Date(today);
            endDate.setDate(today.getDate() + 7);

            await Promise.all([
              markPlanDayAsComplete(workout.id, {
                totalTimeSeconds: finalDuration,
                exercisesCompleted: completedExerciseCount,
                blocksCompleted: completedBlockCount,
              }),
              refreshDashboard({
                startDate: startDate.toISOString().split("T")[0],
                endDate: endDate.toISOString().split("T")[0],
              }),
            ]);
          }

          setCurrentExerciseIndex(exercises.length);
          setIsWorkoutCompleted(true);
        }
        return;
      }

      // Handle circuit completion differently
      if (isCurrentBlockCircuit && currentBlock) {
        // Finalize session state
        if (circuitSession?.actions.completeCircuit) {
          await circuitSession.actions.completeCircuit();
        }

        const session = circuitSession?.sessionData;
        if (workout?.workoutId && session) {
          // Batch log all rounds + mark exercises complete in minimal API calls
          await logCircuitCompletion(
            workout.workoutId,
            session.rounds,
            currentBlock,
          );
        }

        // Update local progress and advance
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
            roundsCompleted: roundsCompleted,
          };
        });
        setExerciseProgress(updatedProgress);

        const maxCircuitIndex = Math.max(...exerciseIndices);
        const nextExerciseIndex = maxCircuitIndex + 1;

        if (nextExerciseIndex < exercises.length) {
          setCurrentExerciseIndex(nextExerciseIndex);
          setExerciseTimer(0);
          exerciseStartTime.current = Date.now();
          setTimeout(() => scrollToExerciseHeading(nextExerciseIndex), 150);
        } else {
          // All exercises completed, complete the workout day
          if (workout?.id) {
            const completedExerciseCount =
              exercises.length - skippedExercises.length;
            const completedBlockCount = workout.blocks.length;

            // Get duration for analytics (simple start to end time)
            const finalDuration = getWorkoutDurationForAnalytics();

            const today = new Date();
            const startDate = new Date(today);
            startDate.setDate(today.getDate() - 30);
            const endDate = new Date(today);
            endDate.setDate(today.getDate() + 7);

            await Promise.all([
              markPlanDayAsComplete(workout.id, {
                totalTimeSeconds: finalDuration,
                exercisesCompleted: completedExerciseCount,
                blocksCompleted: completedBlockCount,
              }),
              refreshDashboard({
                startDate: startDate.toISOString().split("T")[0],
                endDate: endDate.toISOString().split("T")[0],
              }),
            ]);
          }

          setCurrentExerciseIndex(exercises.length);
          setIsWorkoutCompleted(true);
        }
        return;
      }

      // Regular exercise completion logic for non-circuits
      const isDurationBasedExercise =
        currentExercise.duration &&
        currentExercise.duration > 0 &&
        (!currentExercise.reps || currentExercise.reps === 0);

      // [T5-1] For rep-based exercises, only the sets the user actually
      // checked off count — pre-materialized-but-unchecked rows are NOT
      // logged. Duration-based exercises keep their original behavior.
      let setsToLog = currentProgress.sets;
      if (!isDurationBasedExercise) {
        setsToLog = (currentProgress.sets || []).filter((s) => s.isCompleted);
      }

      const hasSets = setsToLog && setsToLog.length > 0;
      const hasDuration =
        currentProgress.duration && currentProgress.duration > 0;

      if (!hasSets && !hasDuration && !isDurationBasedExercise) {
        setDialogConfig({
          title: "No Sets Done Yet",
          description:
            "Tap the checkmark on each set as you finish it, then the exercise completes on its own. To finish early with fewer sets, check the sets you did first.",
          primaryButton: {
            text: "OK",
            onPress: () => setDialogVisible(false),
          },
          icon: "alert-circle",
        });
        setDialogVisible(true);
        return;
      }

      // For duration-based exercises, ensure we have proper sets structure
      if (isDurationBasedExercise && (!setsToLog || setsToLog.length === 0)) {
        // Create a default set for duration-based exercises
        setsToLog = [
          {
            roundNumber: 1,
            setNumber: 1,
            weight: currentExercise.weight || 0,
            reps: 0, // No reps for duration-based exercises
          },
        ];
      }

      await createExerciseLog({
        planDayExerciseId: currentExercise.id,
        sets: toApiSets(setsToLog),
        durationCompleted: currentProgress.duration,
        isComplete: true,
        timeTaken: exerciseTimer, // This logs the actual time spent on exercise
        notes: currentProgress.notes,
      });

      // Move to next exercise or complete workout
      if (currentExerciseIndex < exercises.length - 1) {
        const nextIndex = currentExerciseIndex + 1;
        setCurrentExerciseIndex(nextIndex);
        setExerciseTimer(0);
        exerciseStartTime.current = Date.now();
        updateCurrentBlockForAbandonment(nextIndex);
        setTimeout(() => scrollToExerciseHeading(nextIndex), 150);
      } else {
        // All exercises completed, so mark the plan day as complete
        if (workout?.id) {
          // Calculate completion data
          const completedExerciseCount = currentExerciseIndex + 1; // +1 because we just completed this exercise
          const completedBlockCount = workout.blocks.length; // All blocks completed

          console.log("Workout completion data:", {
            workoutTimer,
            totalTimeSeconds: workoutTimer,
            exercisesCompleted: completedExerciseCount,
            blocksCompleted: completedBlockCount,
          });

          // Get duration for analytics (simple start to end time)
          const finalDuration = getWorkoutDurationForAnalytics();

          const today = new Date();
          const startDate = new Date(today);
          startDate.setDate(today.getDate() - 30);
          const endDate = new Date(today);
          endDate.setDate(today.getDate() + 7);

          await Promise.all([
            markPlanDayAsComplete(workout.id, {
              totalTimeSeconds: finalDuration,
              exercisesCompleted: completedExerciseCount,
              blocksCompleted: completedBlockCount,
            }),
            refreshDashboard({
              startDate: startDate.toISOString().split("T")[0],
              endDate: endDate.toISOString().split("T")[0],
            }),
          ]);
        }

        setCurrentExerciseIndex(exercises.length); // This will make progress show 100%
        setIsWorkoutCompleted(true);

        setDialogConfig({
          title: "Workout Complete!",
          description: "Congratulations! You've completed today's workout.",
          primaryButton: {
            text: "OK",
            onPress: () => setDialogVisible(false),
          },
          icon: "checkmark-circle",
          accessory: <StreakBadge />,
        });
        setDialogVisible(true);
      }
    } catch (err) {
      console.error(
        isCurrentBlockCircuit
          ? "Error completing circuit:"
          : "Error completing exercise:",
        err,
      );
      setDialogConfig({
        title: "Error",
        description: isCurrentBlockCircuit
          ? "Failed to complete circuit. Please try again."
          : "Failed to complete exercise. Please try again.",
        primaryButton: {
          text: "OK",
          onPress: () => setDialogVisible(false),
        },
        icon: "alert-circle",
      });
      setDialogVisible(true);
    } finally {
      setIsCompletingExercise(false);
    }
  };

  // Skip current exercise
  const skipCurrentExercise = async () => {
    if (!currentExercise || !workout) return;

    setIsSkippingExercise(true);

    try {
      // [T5-2] Land any deferred auto-advance commit before skipping onward.
      await flushPendingCommit();

      // Call skip API
      await skipExercise(workout.workoutId, currentExercise.id);

      // Update local state
      setSkippedExercises((prev) => [...prev, currentExercise.id]);

      // Mark progress as skipped
      setExerciseProgress((prev) => {
        const updated = [...prev];
        updated[currentExerciseIndex] = {
          ...updated[currentExerciseIndex],
          isSkipped: true,
        };
        return updated;
      });

      // Move to next exercise or complete workout
      if (currentExerciseIndex < exercises.length - 1) {
        const nextIndex = currentExerciseIndex + 1;
        setCurrentExerciseIndex(nextIndex);
        setExerciseTimer(0);
        exerciseStartTime.current = Date.now();
        updateCurrentBlockForAbandonment(nextIndex);
        setTimeout(() => scrollToExerciseHeading(nextIndex), 150);
      } else {
        // Check if all exercises are completed or skipped
        const allProcessed = exercises.every(
          (ex, index) =>
            index < currentExerciseIndex ||
            skippedExercises.includes(ex.id) ||
            index === currentExerciseIndex,
        );

        if (allProcessed && workout?.id) {
          // Calculate completion data (including skipped exercises/blocks)
          const completedExerciseCount = currentExerciseIndex; // Current index is number of completed
          const completedBlockCount = workout.blocks.length; // All blocks processed

          // Get duration for analytics (simple start to end time)
          const finalDuration = getWorkoutDurationForAnalytics();

          console.log("Workout skip completion data:", {
            finalDuration,
            totalTimeSeconds: finalDuration,
            exercisesCompleted: completedExerciseCount,
            blocksCompleted: completedBlockCount,
          });

          // Mark plan day as complete with detailed timing in seconds, then
          // refresh the dashboard so the streak badge reflects this completion.
          await markPlanDayAsComplete(workout.id, {
            totalTimeSeconds: finalDuration,
            exercisesCompleted: completedExerciseCount,
            blocksCompleted: completedBlockCount,
          });
          await refreshDashboard();
          setCurrentExerciseIndex(exercises.length);
          setIsWorkoutCompleted(true);
          setDialogConfig({
            title: "Workout Complete!",
            description: "You've finished today's workout.",
            primaryButton: {
              text: "OK",
              onPress: () => setDialogVisible(false),
            },
            icon: "checkmark-circle",
            accessory: <StreakBadge />,
          });
          setDialogVisible(true);
        }
      }

      setShowSkipModal(false);
    } catch (err) {
      console.error("Error skipping exercise:", err);
      setDialogConfig({
        title: "Error",
        description: "Failed to skip exercise. Please try again.",
        primaryButton: {
          text: "OK",
          onPress: () => setDialogVisible(false),
        },
        icon: "alert-circle",
      });
      setDialogVisible(true);
    } finally {
      setIsSkippingExercise(false);
    }
  };

  // End workout early — save in-progress data, then mark complete
  const endWorkoutEarly = async () => {
    if (!workout?.id) return;

    setIsEndingEarly(true);
    try {
      // [T5-2] Land any deferred auto-advance commit before wrapping up.
      await flushPendingCommit();

      // Flush the current exercise's unsaved progress before marking complete
      const currentEx = exercises[currentExerciseIndex];
      const currentProg = exerciseProgress[currentExerciseIndex];
      let savedCurrentExercise = false;
      let savedCircuitExerciseCount = 0;

      if (currentEx && currentProg) {
        const block = workout.blocks.find((b) =>
          b.exercises.some((e) => e.id === currentEx.id),
        );

        try {
          if (block && isCircuitBlock(block.blockType)) {
            const session = circuitSession?.sessionData;
            if (workout.workoutId && session) {
              const hasProgress = session.rounds.some(
                (r) =>
                  r.isCompleted ||
                  r.exercises?.some((ex) => (ex.actualReps || 0) > 0),
              );
              if (hasProgress) {
                await logCircuitCompletion(
                  workout.workoutId,
                  session.rounds,
                  block,
                );
                savedCurrentExercise = true;
                savedCircuitExerciseCount = block.exercises.length;
              }
            }
          } else if (block && isWarmupCooldownBlock(block.blockType)) {
            await createExerciseLog({
              planDayExerciseId: currentEx.id,
              sets: [
                {
                  roundNumber: 1,
                  setNumber: 1,
                  weight: 0,
                  reps: currentEx.reps || 1,
                },
              ],
              durationCompleted: currentEx.duration || 0,
              isComplete: false,
              timeTaken: exerciseTimer,
              notes: currentProg.notes || "",
            });
            savedCurrentExercise = true;
          } else {
            const isDurationBased =
              currentEx.duration &&
              currentEx.duration > 0 &&
              (!currentEx.reps || currentEx.reps === 0);

            // [T5-1] Rep-based: only the sets the user checked off count.
            let setsToLog = currentProg.sets;
            if (!isDurationBased) {
              setsToLog = (currentProg.sets || []).filter(
                (s) => s.isCompleted,
              );
            }

            const hasSets = setsToLog && setsToLog.length > 0;
            const hasDuration =
              currentProg.duration && currentProg.duration > 0;

            if (hasSets || hasDuration || isDurationBased) {
              if (isDurationBased && (!setsToLog || setsToLog.length === 0)) {
                setsToLog = [
                  {
                    roundNumber: 1,
                    setNumber: 1,
                    weight: currentEx.weight || 0,
                    reps: 0,
                  },
                ];
              }

              if (setsToLog && setsToLog.length > 0) {
                await createExerciseLog({
                  planDayExerciseId: currentEx.id,
                  sets: toApiSets(setsToLog),
                  durationCompleted: currentProg.duration,
                  isComplete: false,
                  timeTaken: exerciseTimer,
                  notes: currentProg.notes,
                });
                savedCurrentExercise = true;
              }
            }
          }
        } catch (saveErr) {
          console.error("Error saving current exercise on early end:", saveErr);
        }
      }

      const extraExercises = savedCurrentExercise
        ? Math.max(savedCircuitExerciseCount, 1)
        : 0;
      const completedExerciseCount = currentExerciseIndex + extraExercises;

      const completedBlockIds = new Set<number>();
      const sliceEnd = currentExerciseIndex + (savedCurrentExercise ? 1 : 0);
      exercises.slice(0, sliceEnd).forEach((ex) => {
        const block = workout.blocks.find((b) =>
          b.exercises.some((e) => e.id === ex.id),
        );
        if (block) completedBlockIds.add(block.id);
      });

      const finalDuration = getWorkoutDurationForAnalytics();

      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 30);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 7);

      await markPlanDayAsComplete(workout.id, {
        totalTimeSeconds: finalDuration,
        exercisesCompleted: completedExerciseCount,
        blocksCompleted: completedBlockIds.size,
      });

      // Refresh app-wide data so calendar updates
      // Invalidate cache and reload fresh workout data (with updated isSkipped flags)
      invalidateActiveWorkoutCache();
      const freshResponse = await fetchActiveWorkout(true);
      if (freshResponse?.planDays) {
        const todayStr = getCurrentDate();
        const freshPlanDay = freshResponse.planDays.find(
          (day: PlanDayWithBlocks) => formatDateAsString(day.date) === todayStr,
        );
        if (freshPlanDay) {
          setWorkout(freshPlanDay);
        }
      }

      await Promise.all([
        refreshWorkout(),
        refreshDashboard({
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
        }),
      ]);

      setCurrentExerciseIndex(exercises.length);
      setIsWorkoutCompleted(true);
    } catch (err) {
      console.error("Error ending workout early:", err);
      showErrorDialog("Error", "Failed to end workout. Please try again.");
    } finally {
      setIsEndingEarly(false);
    }
  };

  // Register endWorkoutEarly with the context so _layout.tsx can invoke it.
  // No dep array on purpose: the setter only writes a ref (no re-render, no
  // loop), and endWorkoutEarly closes over frequently-changing state
  // (exerciseProgress[currentExerciseIndex], circuit sessionData, exerciseTimer).
  // Keying on [workout?.id, currentExerciseIndex] left a stale closure, so
  // ending early from the global header could flush an old snapshot and drop the
  // current exercise's just-logged sets/notes. Re-register the latest closure
  // every render.
  useEffect(() => {
    setEndWorkoutEarlyHandler(endWorkoutEarly);
  });

  const showEndEarlyDialog = () => {
    setDialogConfig({
      title: "End Workout?",
      description:
        "Finish & save to log your progress so far and mark today's workout done. Abandon to stop without saving — today stays available to pick up later.",
      // Safe default: back out and keep going.
      primaryButton: {
        text: "Continue Workout",
        onPress: () => setDialogVisible(false),
      },
      // Save partial progress and complete the day.
      tertiaryButton: {
        text: "Finish & Save Progress",
        onPress: () => {
          setDialogVisible(false);
          endWorkoutEarly();
        },
      },
      // Destructive: stop without saving today as done. Mirrors the tab-away
      // "Abandon Workout" flow (MF-013) — track it, clear in-progress state, leave.
      secondaryButton: {
        text: "Abandon Workout",
        destructive: true,
        onPress: () => {
          setDialogVisible(false);
          // [T5-2] An auto-advanced exercise WAS completed — land its log
          // (fire-and-forget) even though the rest of the day is abandoned.
          void flushPendingCommit();
          abandonWorkout("manual_exit");
          router.replace("/dashboard");
        },
      },
      icon: "flag-outline",
    });
    setDialogVisible(true);
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
  const isCurrentBlockCircuit = currentBlock
    ? isCircuitBlock(currentBlock.blockType)
    : false;
  const isCurrentBlockWarmupCooldown = currentBlock
    ? isWarmupCooldownBlock(currentBlock.blockType)
    : false;

  // Circuit session management - Always call hook but initialize properly
  const dummyBlock: WorkoutBlockWithExercises = {
    id: 0,
    blockType: "circuit",
    blockName: "dummy",
    rounds: 1,
    exercises: [],
    created_at: new Date(),
    updated_at: new Date(),
  };

  // Always use real current block, fallback to dummy only if no block exists
  const circuitConfig: CircuitSessionConfig = {
    block: currentBlock || dummyBlock,
    autoStartTimer: false,
    allowPartialRounds: true,
  };

  const circuitSession = useCircuitSession(circuitConfig);

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
          <Text className="text-content-on-primary font-semibold">
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render no workout state
  if (!workout) {
    return (
      <View className="flex-1 bg-background">
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.text.primary}
            />
          }
          contentContainerStyle={{
            flex: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <View className="items-center">
            {hasActiveWorkoutPlan ? (
              // Rest day - we have an active workout plan but no workout today
              <>
                <Ionicons
                  name="bed-outline"
                  size={64}
                  color={colors.brand.primary}
                />
                <Text className="text-lg font-bold text-text-primary text-center mt-4 mb-2">
                  Rest Day
                </Text>
                <Text className="text-text-muted text-center mb-8 leading-6">
                  No workout scheduled for today. Take time to rest and recover!
                </Text>
                <TouchableOpacity
                  className={`rounded-xl py-3 px-6 flex-row items-center justify-center ${
                    isGenerating ? "bg-primary/50 opacity-50" : "bg-primary"
                  }`}
                  onPress={
                    isGenerating
                      ? undefined
                      : () => setShowWorkoutChoice(true)
                  }
                  disabled={isGenerating}
                >
                  <Ionicons
                    name="fitness-outline"
                    size={18}
                    color={
                      isGenerating
                        ? colors.contentOnPrimary + "70"
                        : colors.contentOnPrimary
                    }
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    className={`font-semibold text-sm ${
                      isGenerating
                        ? "text-content-on-primary/70"
                        : "text-content-on-primary"
                    }`}
                  >
                    {isGenerating
                      ? "Creating Workout..."
                      : "Create a New Workout"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              // No active workout plan at all
              <NoActiveWorkoutCard
                isGenerating={isGenerating}
                onShowWorkoutChoice={() => setShowWorkoutChoice(true)}
                variant="workout"
              />
            )}
          </View>
        </ScrollView>

        {/* Rest Day Regeneration Modal */}
        <WorkoutRegenerationModal
          visible={showRegenerationModal}
          onClose={() => setShowRegenerationModal(false)}
          onRegenerate={() => {}}
          regenerationType="day"
          singleTabOnly={true}
          isRestDay={!workout}
          selectedDate={getCurrentDate()}
          onSuccess={() => {
            invalidateActiveWorkoutCache();
            setShowRegenerationModal(false);
            router.replace("/(tabs)/dashboard");
          }}
        />

        <WorkoutChoiceModal
          visible={showWorkoutChoice}
          onClose={() => setShowWorkoutChoice(false)}
          onGenerateNew={() => setShowRegenerationModal(true)}
          onRepeatPast={() => setShowRepeatPicker(true)}
        />

        <WorkoutRepeatPicker
          visible={showRepeatPicker}
          singleDayOnly={true}
          onClose={() => setShowRepeatPicker(false)}
          onSuccess={() => {
            invalidateActiveWorkoutCache();
            setShowRepeatPicker(false);
            loadWorkout(true);
          }}
        />
      </View>
    );
  }

  // Check if this is today's workout (for resume eligibility)
  const isToday =
    formatDateAsString(workout.date) === getCurrentDate();

  // Resume handler: start from first unfinished exercise (plan day stays complete)
  const handleResume = async () => {
    setIsResuming(true);

    // Fetch existing logs to find where to resume
    const existingLogs = await fetchExerciseLogsForPlanDay(workout.id);

    // Find first unfinished exercise, treating circuit blocks as a unit
    let resumeIndex = 0;
    for (let i = 0; i < exercises.length; i++) {
      const exercise = exercises[i];
      const hasLogs = (existingLogs[exercise.id] || []).length > 0;

      if (!hasLogs) {
        // Skip past explicitly skipped exercises
        if (exercise.isSkipped) continue;

        // Check if part of a circuit block that was completed
        const block = workout.blocks.find((b) =>
          b.exercises.some((e) => e.id === exercise.id),
        );
        if (block && isCircuitBlock(block.blockType)) {
          const anyInBlockHasLogs = block.exercises.some(
            (e) => (existingLogs[e.id] || []).length > 0,
          );
          if (anyInBlockHasLogs) continue;
        }
        resumeIndex = i;
        break;
      }
    }

    // Re-initialize exercise progress (may not have been set if workout loaded as complete)
    const flatExercises = workout.blocks.flatMap(
      (block: WorkoutBlockWithExercises) => block.exercises,
    );
    const freshProgress: ExerciseProgress[] = flatExercises.map(
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
    setExerciseProgress(freshProgress);

    // Prevent useFocusEffect from calling loadWorkout which would override our state
    isResumingRef.current = true;

    // Reset state and start from resume point
    setIsWorkoutCompleted(false);
    setCurrentExerciseIndex(resumeIndex);
    setIsWorkoutStarted(true);
    setWorkoutInProgress(true);

    const now = Date.now();
    workoutStartTime.current = now;
    exerciseStartTime.current = now;

    setIsResuming(false);
    updateCurrentBlockForAbandonment(resumeIndex);
    setTimeout(() => scrollToExerciseHeading(resumeIndex), 300);
  };

  // Render workout completed state
  if (isWorkoutCompleted) {
    return (
      <WorkoutSummary
        workout={workout}
        onResume={isToday ? handleResume : undefined}
        isResuming={isResuming}
        footer={
          <Text className="text-text-muted text-center text-sm px-6 mt-4">
            Check back tomorrow for your next workout.
          </Text>
        }
      />
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
            tintColor={colors.text.primary}
          />
        }
      >
        {/* Hero Exercise Media - Contextual based on workout type */}
        <View className="relative">
          {currentExercise && !isCurrentBlockCircuit ? (
            <ExerciseLink
              link={currentExercise.exercise.link}
              exerciseName={currentExercise.exercise.name}
              exerciseId={currentExercise.exercise.id}
              variant="hero"
            />
          ) : isCurrentBlockCircuit && currentBlock ? (
            <ExerciseVideoCarousel
              exercises={currentBlock.exercises}
              blockName=""
            />
          ) : null}

          {/* "Just generated" badge after a single-day generation */}
          {justGenerated === "day" && (
            <View style={{ position: "absolute", top: 16, left: 16 }}>
              <JustGeneratedBadge />
            </View>
          )}
        </View>

        <View className="px-6 pt-6">
          {/* Workout Header */}
          {/* Pre-computed progressPercent used for the progress bar */}
          <View className="mb-6">
            <View className="w-full h-2 mb-4 bg-neutral-light-2 rounded-full overflow-hidden">
              <View
                className="h-full bg-primary rounded-full"
                style={{ width: `${progressPercent.toFixed(0)}%` } as ViewStyle}
              />
            </View>
            <View className="flex-row items-start mb-2">
              <Text className="text-2xl font-bold text-text-primary flex-1 mr-3">
                {workout.name}
              </Text>
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
                    <View className="flex-row items-center gap-2">
                      <View className="items-end">
                        {Boolean(currentBlock.rounds) &&
                          !isCurrentBlockCircuit && (
                          <Text className="text-sm font-semibold text-text-primary">
                            {currentBlock.rounds === 1
                              ? "1 Round"
                              : `${currentBlock.rounds} Rounds`}
                          </Text>
                        )}
                      </View>
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

          {/* Current Exercise - Only show for traditional workouts */}
          {currentExercise && !isCurrentBlockCircuit ? (
            <View
              ref={exerciseHeadingRef}
              className="bg-card rounded-2xl mb-6 p-6 border font-bold border-neutral-light-2"
            >
              <Text className="text-xl font-bold text-text-primary mb-3">
                {currentExercise.exercise.name}
              </Text>

              {currentExercise.exercise.link && (
                <TouchableOpacity
                  onPress={() =>
                    scrollViewRef.current?.scrollTo({
                      y: 0,
                      animated: true,
                    })
                  }
                  className="flex-row items-center gap-1 px-2 py-1 bg-brand-primary/10 rounded-full self-start mb-3"
                >
                  <Ionicons
                    name="play-circle-outline"
                    size={14}
                    color={colors.brand.primary}
                  />
                  <Text className="text-xs text-brand-primary">
                    Video Available
                  </Text>
                </TouchableOpacity>
              )}

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
                            // [MF-006] Informational tag, not the screen's
                            // primary action — steps down from solid ink.
                            className="bg-accent-subtle border border-accent-subtle rounded-full px-3 py-1 mr-2"
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
                  {/* Show simplified interface for warmup/cooldown */}
                  {isCurrentBlockWarmupCooldown ? (
                    <View>
                      {/* Show target parameters in a structured layout matching the main interface */}
                      {Boolean(
                        currentExercise.duration ||
                          currentExercise.reps ||
                          currentExercise.sets
                      ) && (
                        <View className="flex items-center bg-background rounded-xl pt-6">
                          <View className="flex-row flex-wrap gap-3">
                            {Boolean(currentExercise.sets) && (
                              <View className="flex-row items-center">
                                <Text className="text-sm text-text-muted mr-1">
                                  Sets:
                                </Text>
                                <Text className="text-sm font-semibold text-text-primary">
                                  {currentExercise.sets}
                                </Text>
                              </View>
                            )}
                            {Boolean(currentExercise.reps) && (
                              <View className="flex-row items-center">
                                <Text className="text-sm text-text-muted mr-1">
                                  Reps:
                                </Text>
                                <Text className="text-sm font-semibold text-text-primary">
                                  {currentExercise.reps}
                                </Text>
                              </View>
                            )}
                            {Boolean(currentExercise.duration) && (
                              <View className="flex-row items-center">
                                <Text className="text-sm text-text-muted mr-1">
                                  Duration:
                                </Text>
                                <Text className="text-sm font-semibold text-text-primary">
                                  {currentExercise.duration}s
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text className="text-xs text-text-muted mt-2 leading-4">
                            {currentBlock?.blockType === "warmup"
                              ? "Prepare your muscles and joints for the workout ahead."
                              : "Focus on stretching and recovery to wind down."}
                          </Text>
                        </View>
                      )}

                      {/* Show message when no specific targets are set */}
                      {!currentExercise.duration &&
                        !currentExercise.reps &&
                        !currentExercise.sets && (
                          <View className="bg-background rounded-xl p-3 border border-neutral-light-2">
                            <Text className="text-sm text-text-secondary text-center leading-5">
                              {currentBlock?.blockType === "warmup"
                                ? "Take your time to properly warm up your muscles and prepare for the workout."
                                : "Focus on stretching and recovery. Take the time you need to cool down properly."}
                            </Text>
                          </View>
                        )}
                    </View>
                  ) : (
                    /* Traditional Exercise Logging Interface for main workout */
                    <>
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
                            {Array.from(
                              { length: currentBlock.rounds },
                              (_, i) => {
                                const isCompleted =
                                  i < (currentProgress?.roundsCompleted || 0);
                                return (
                                  <TouchableOpacity
                                    key={i}
                                    className={`size-9 rounded-full items-center justify-center border-2 ${
                                      isCompleted
                                        ? "border-success bg-success"
                                        : "border-neutral-medium-1 bg-background"
                                    }`}
                                    hitSlop={HIT_SLOP_6}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Round ${i + 1}`}
                                    accessibilityState={{ selected: isCompleted }}
                                    onPress={() => {
                                      Haptics.impactAsync(
                                        Haptics.ImpactFeedbackStyle.Light,
                                      );
                                      updateProgress("roundsCompleted", i + 1);
                                    }}
                                  >
                                    {isCompleted ? (
                                      <Ionicons
                                        name="checkmark"
                                        size={14}
                                        color={colors.contentOnPrimary}
                                      />
                                    ) : (
                                      <Text className="text-xs font-semibold text-text-muted">
                                        {i + 1}
                                      </Text>
                                    )}
                                  </TouchableOpacity>
                                );
                              },
                            )}
                          </View>
                        </View>
                      ) : null}

                      {/* Traditional Exercise Logging Interface */}
                      <View className="rounded-2xl p-4">
                        <AdaptiveSetTracker
                          exercise={currentExercise}
                          sets={currentProgress.sets}
                          onSetsChange={(sets) => updateProgress("sets", sets)}
                          onProgressUpdate={(progress) => {
                            updateProgress(
                              "setsCompleted",
                              progress.setsCompleted,
                            );
                            updateProgress("duration", progress.duration);
                          }}
                          onAllSetsCompleted={handleAllSetsCompleted}
                          blockType={currentBlock?.blockType}
                        />
                      </View>

                      {/* Notes - collapsed behind a row unless already used (MF-012) */}
                      <View className="rounded-2xl p-4">
                        {isNotesExpanded || currentProgress.notes ? (
                          <>
                            <Text className="text-sm font-semibold text-text-primary mb-3">
                              Notes
                            </Text>
                            <TextInput
                              className="bg-background border border-neutral-light-2 rounded-xl p-3 text-text-primary text-sm"
                              placeholder="Add a note... (Optional)"
                              placeholderTextColor={colors.text.muted}
                              value={currentProgress.notes}
                              onChangeText={(text) =>
                                updateProgress("notes", text)
                              }
                              multiline
                              numberOfLines={2}
                            />
                          </>
                        ) : (
                          <TouchableOpacity
                            className="flex-row items-center justify-between"
                            onPress={() => setIsNotesExpanded(true)}
                            accessibilityRole="button"
                            accessibilityLabel="Add a note"
                          >
                            <Text className="text-sm font-semibold text-text-secondary">
                              Add a note
                            </Text>
                            <Ionicons
                              name="add-circle-outline"
                              size={20}
                              color={colors.text.muted}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </>
                  )}
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Circuit Logging Interface - Show for circuit workouts */}
          {isCurrentBlockCircuit && currentBlock && isWorkoutStarted ? (
            <View
              ref={circuitHeadingRef}
              className="bg-card rounded-2xl p-6 border border-neutral-light-2 mb-6"
            >
              <View className="mb-4">
                <Text className="text-lg font-bold text-text-primary">
                  {currentBlock.blockName}
                </Text>
                {currentBlock.exercises.some((ex) => ex.exercise.link) && (
                  <TouchableOpacity
                    onPress={() =>
                      scrollViewRef.current?.scrollTo({
                        y: 0,
                        animated: true,
                      })
                    }
                    className="flex-row items-center gap-1 px-2 py-1 bg-brand-primary/10 rounded-full self-start mt-2"
                  >
                    <Ionicons
                      name="play-circle-outline"
                      size={14}
                      color={colors.brand.primary}
                    />
                    <Text className="text-xs text-brand-primary">
                      Videos Available
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <CircuitLoggingInterface
                block={currentBlock}
                workout={workout}
                isWorkoutStarted={isWorkoutStarted}
                circuitSession={circuitSession}
                onError={showErrorDialog}
              />
            </View>
          ) : null}

          {/* Workout Overview */}
          <View className="bg-card rounded-2xl p-6 border border-neutral-light-2">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-text-primary">
                Today's Workout Plan
              </Text>
              {isWorkoutStarted && (
                <TouchableOpacity
                  onPress={() => setIsOverviewExpanded((prev) => !prev)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isOverviewExpanded
                      ? "Collapse full plan"
                      : "Expand full plan"
                  }
                  hitSlop={HIT_SLOP_10}
                >
                  <Ionicons
                    name={isOverviewExpanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={colors.text.muted}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* [MF-012] Compact progress rail replaces the full plan once
                started, so the current exercise stays dominant. */}
            {isWorkoutStarted && !isOverviewExpanded ? (
              <View>
                <Text className="text-sm text-text-secondary mb-2">
                  Exercise {currentExerciseIndex + 1} of {exercises.length}
                </Text>
                <View className="flex-row gap-1">
                  {exercises.map((exercise, index) => {
                    const isCompleted = index < currentExerciseIndex;
                    const isCurrent = index === currentExerciseIndex;
                    const isSkipped = skippedExercises.includes(exercise.id);
                    return (
                      <View
                        key={exercise.id}
                        className={`flex-1 h-2 rounded-full ${
                          isCurrent
                            ? "bg-primary"
                            : isCompleted || isSkipped
                              ? "bg-success"
                              : "bg-neutral-medium-2"
                        }`}
                      />
                    );
                  })}
                </View>
              </View>
            ) : (
              <>
                {workout.blocks.map((block, _blockIndex) => (
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

                {block.exercises.map((exercise, _exerciseIndex) => {
                  const globalIndex = exercises.findIndex(
                    (ex) => ex.id === exercise.id,
                  );
                  const isCompleted = globalIndex < currentExerciseIndex;
                  const isCurrent = globalIndex === currentExerciseIndex;
                  const isSkipped = skippedExercises.includes(exercise.id);

                  return (
                    <View
                      key={exercise.id}
                      className={`flex-row items-center p-3 rounded-xl mb-2 ${
                        isCurrent
                          ? "bg-brand-light-1 border border-brand-light-1"
                          : isCompleted || isSkipped
                            ? "bg-brand-light-1 border border-brand-light-1"
                            : "bg-background border border-neutral-light-2"
                      }`}
                    >
                      <View
                        className={`size-8 rounded-full items-center justify-center mr-3 ${
                          isCompleted ? "bg-success" : "bg-brand-medium-2"
                        }`}
                      >
                        {isSkipped ? (
                          <Ionicons
                            name="play-skip-forward-outline"
                            size={16}
                            color={colors.contentOnPrimary}
                          />
                        ) : isCompleted ? (
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={colors.contentOnPrimary}
                          />
                        ) : isCurrent ? (
                          <Ionicons
                            name="play-outline"
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
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* [T5-2] Undo window for an auto-advanced exercise */}
      <ExerciseCompleteSnackbar
        visible={!!undoSnackbar}
        exerciseName={undoSnackbar?.exerciseName}
        onUndo={undoAutoComplete}
      />

      {/* Bottom Action Bar */}
      <View className="bg-card p-6">
        {!isWorkoutStarted ? (
          <TouchableOpacity
            className="bg-primary rounded-2xl py-4 flex-row items-center justify-center"
            onPress={startWorkout}
            accessibilityRole="button"
            accessibilityLabel="Start Workout"
          >
            <Ionicons name="play" size={20} color={colors.contentOnPrimary} />
            <Text className="text-content-on-primary font-bold text-lg ml-2">
              Start Workout
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="flex-row gap-2">
            {/* Skip button - only show for warmup/cooldown */}
            {isCurrentBlockWarmupCooldown && (
              <TouchableOpacity
                className="bg-primary rounded-2xl py-4 flex-1 flex-row items-center justify-center"
                onPress={() => setShowSkipModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Skip"
              >
                <Ionicons
                  name="play-skip-forward-outline"
                  size={20}
                  color={colors.contentOnPrimary}
                />
                <Text className="text-content-on-primary font-semibold ml-2">
                  Skip
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className="bg-neutral-light-2 rounded-2xl py-4 flex-1 flex-row items-center justify-center"
              onPress={togglePause}
              accessibilityRole="button"
              accessibilityLabel={isPaused ? "Resume" : "Pause"}
            >
              <Ionicons
                name={isPaused ? "play-outline" : "pause-outline"}
                size={20}
                color={colors.text.primary}
              />
              <Text className="text-text-primary font-semibold ml-2">
                {isPaused ? "Resume" : "Pause"}
              </Text>
            </TouchableOpacity>

            {/* [T5-2] Single tap — the confirmation modal is gone. For
                rep-based exercises this is the partial-completion path (all
                sets checked auto-advances); circuits/warmups complete here. */}
            <TouchableOpacity
              className={`bg-primary rounded-2xl py-4 flex-row items-center justify-center flex-1 ${
                isCompletingExercise ? "opacity-75" : ""
              }`}
              onPress={completeExercise}
              disabled={isCompletingExercise}
              accessibilityRole="button"
              accessibilityLabel="Complete"
              accessibilityState={{ disabled: isCompletingExercise }}
            >
              {isCompletingExercise ? (
                <ActivityIndicator
                  size="small"
                  color={colors.contentOnPrimary}
                />
              ) : (
                <Ionicons
                  name="checkmark"
                  size={20}
                  color={colors.contentOnPrimary}
                />
              )}
              <Text className="text-content-on-primary font-semibold ml-2">
                {isCompletingExercise
                  ? "Saving..."
                  : isCurrentBlockCircuit
                    ? "Complete Circuit"
                    : "Complete"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* End Early link */}
        {isWorkoutStarted && !isWorkoutCompleted && (
          <TouchableOpacity
            onPress={showEndEarlyDialog}
            className="items-center mt-4 pb-1"
            disabled={isEndingEarly}
            accessibilityRole="button"
            accessibilityLabel="End Workout"
            accessibilityState={{ disabled: isEndingEarly }}
          >
            {isEndingEarly ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="#ef4444" />
                <Text className="text-sm text-red-500 ml-2">
                  Ending...
                </Text>
              </View>
            ) : (
              <Text className="text-sm text-red-500">
                End Workout
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Skip Exercise Modal */}
      <Modal visible={showSkipModal} transparent animationType="fade">
        <View
          className={`flex-1 bg-black/50 justify-center items-center px-6 ${isDark ? "dark" : ""}`}
        >
          <View className="bg-surface rounded-2xl p-6 w-full max-w-sm shadow-xl border border-neutral-medium-1">
            <Text className="text-xl font-bold text-text-primary mb-4 text-center">
              Skip Exercise
            </Text>
            <Text className="text-base text-text-secondary text-center mb-6 leading-6">
              Skip "{currentExercise?.exercise.name}"? This exercise will be
              marked as incomplete.
            </Text>

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="bg-neutral-light-2 rounded-xl py-3 px-6 flex-1"
                onPress={() => setShowSkipModal(false)}
              >
                <Text className="text-text-primary font-semibold text-center">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`bg-primary rounded-xl py-3 px-6 flex-1 ${
                  isSkippingExercise ? "opacity-75" : ""
                }`}
                onPress={skipCurrentExercise}
                disabled={isSkippingExercise}
              >
                {isSkippingExercise ? (
                  <View className="flex-row items-center justify-center">
                    <ActivityIndicator
                      size="small"
                      color={colors.contentOnPrimary}
                    />
                    <Text className="text-content-on-primary font-semibold ml-2">
                      Skipping...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-content-on-primary font-semibold text-center">
                    Skip
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Dialog */}
      {dialogConfig && (
        <CustomDialog
          visible={dialogVisible}
          onClose={() => setDialogVisible(false)}
          title={dialogConfig.title}
          description={dialogConfig.description}
          primaryButton={dialogConfig.primaryButton}
          secondaryButton={dialogConfig.secondaryButton}
          tertiaryButton={dialogConfig.tertiaryButton}
          icon={dialogConfig.icon}
          accessory={dialogConfig.accessory}
        />
      )}
    </View>
  );
}
