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
import CircuitRoundAction from "@/components/circuit-round-action";
import CircuitTracker from "@/components/circuit-tracker";
import DemoChip from "@/components/demo-chip";
import DemoSheet, { type DemoSheetEntry } from "@/components/demo-sheet";
import Header from "@/components/header";
import JustGeneratedBadge from "@/components/just-generated-badge";
import NoActiveWorkoutCard from "@/components/no-active-workout-card";
import { ShareWorkoutButton } from "@/components/share";
import { WorkoutSkeleton } from "@/components/skeletons/skeleton-screens";
import { StreakBadge } from "@/components/streak";
import type { DialogButton } from "@/components/ui";
import { CustomDialog } from "@/components/ui";
import { CircuitTimeModal } from "@/components/workout/circuit-time-modal";
import ExerciseCompleteSnackbar from "@/components/workout/exercise-complete-snackbar";
import WatchNudgeBanner from "@/components/workout/watch-nudge-banner";
import WorkoutBlock from "@/components/workout-block";
import WorkoutChoiceModal from "@/components/workout-choice-modal";
import WorkoutRegenerationModal from "@/components/workout-regeneration-modal";
import WorkoutRepeatPicker from "@/components/workout-repeat-picker";
import WorkoutSummary from "@/components/workout-summary";
import { HIT_SLOP_6, HIT_SLOP_10 } from "@/constants";
import {
  getEffectiveScoringType,
  getLoggingMode,
} from "@/constants/block-types";
import { useAppDataContext } from "@/contexts/app-data-context";
import { useAuth } from "@/contexts/auth-context";
import { useBackgroundJobs } from "@/contexts/background-job-context";
import { useWorkout } from "@/contexts/workout-context";
import { useCircuitSession } from "@/hooks/use-circuit-session";
import { trackWorkoutStarted } from "@/lib/analytics";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics-events";
import { getCurrentUser } from "@/lib/auth";
import { logCircuitCompletion } from "@/lib/circuits";
import { exerciseHasDemo } from "@/lib/exercise-video";
import { tabEvents } from "@/lib/tab-events";
import { useThemeColors } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import {
  createExerciseLog,
  fetchActiveWorkout,
  fetchExerciseLogsForPlanDay,
  markPlanDayAsComplete,
  skipExercise,
  subscribeToWorkoutUpdates,
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
import {
  formatDateAsString,
  formatDateForDisplay,
  formatEquipment,
  getCurrentDate,
} from "@/utils";
import { isCircuitBlock, isRoundActionVisible } from "@/utils/circuit-utils";
import {
  getHealthConnection,
  hasRecentHeartRateSample,
} from "@/utils/health";

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
    autoStartRequested,
    clearAutoStart,
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
  // Bumped to remount the completed WorkoutSummary so it reloads its logs when a
  // log edit made elsewhere (Calendar edit-log) fires a workout update.
  const [completedRefreshKey, setCompletedRefreshKey] = useState(0);
  // Tracks whether this session was ended early — used to suppress the share
  // affordance on the ended-early summary (that screen offers Resume/feedback).
  const [endedEarly, setEndedEarly] = useState(false);
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
  // for_time manual finish-time entry (null = not asked, 0 = skipped)
  const [showCircuitTimeModal, setShowCircuitTimeModal] = useState(false);
  const circuitTimeSecondsRef = useRef<number | null>(null);
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

  // Demo sheet state: the demos in the tapped exercise's block plus which one
  // to open on. null = closed. The sheet overlays this screen, so the list
  // never unmounts and dismissing lands the user exactly where they were.
  const [demoSheet, setDemoSheet] = useState<{
    entries: DemoSheetEntry[];
    index: number;
  } | null>(null);

  // Pre-start plan overview: which blocks are expanded (default true). Makes
  // the shared WorkoutBlock headers collapsible here too, so the disclosure
  // chevron appears on this surface as it does on Calendar.
  const [expandedBlocks, setExpandedBlocks] = useState<Record<number, boolean>>(
    {}
  );

  // Open the demo sheet anchored on `exerciseId` (or the block's first demo),
  // with prev/next stepping through the block's other demos.
  const openDemoSheet = useCallback(
    (block: WorkoutBlockWithExercises, exerciseId?: number) => {
      const entries: DemoSheetEntry[] = block.exercises
        .filter((ex) => exerciseHasDemo(ex.exercise))
        .map((ex) => ({
          exerciseId: ex.exercise.id,
          exerciseName: ex.exercise.name,
          link: ex.exercise.link!,
          description: ex.exercise.description,
        }));
      if (entries.length === 0) return;
      const index = exerciseId
        ? Math.max(
            0,
            entries.findIndex((entry) => entry.exerciseId === exerciseId),
          )
        : 0;
      setDemoSheet({ entries, index });
    },
    [],
  );

  // [T5-3/MF-003] Rest-timer state, countdown, UI, and the Rest Complete modal
  // were removed entirely (owner decision: no timers). The workout/exercise
  // elapsed "timers" below are an invisible analytics stopwatch feeding
  // timeTaken/duration — deliberately kept.
  const workoutStartTime = useRef<number | null>(null);
  const exerciseStartTime = useRef<number | null>(null);
  const appStateRef = useRef(AppState.currentState);

  // Watch nudge: shown once per session start when health is connected but no
  // recent heart-rate samples exist (user likely has a watch that isn't recording)
  const [showWatchNudge, setShowWatchNudge] = useState(false);

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

  // Header vitals: estimated session length (sum of per-block estimates) and
  // the elapsed clock shown in the active-workout header.
  const totalDurationMinutes =
    workout?.blocks?.reduce(
      (sum, block) => sum + (block.blockDurationMinutes || 0),
      0,
    ) || 0;
  const formatElapsed = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return hours > 0
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      : `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  // Timer management with timestamp-based calculation
  useEffect(() => {
    if (isWorkoutStarted && !isPaused && !isWorkoutCompleted) {
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
      // Clean up display timer when workout stops
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isWorkoutStarted, isPaused, isWorkoutCompleted]);

  // Keep the screen awake for the entire active workout session. This is
  // deliberately SEPARATE from the analytics stopwatch above and is NOT gated
  // on isPaused -- a user reading/logging on a paused-but-open workout should
  // not have the screen sleep. Re-assert on foreground because iOS can clear
  // the idle-timer flag across a background cycle (e.g. an incoming call).
  useEffect(() => {
    if (!isWorkoutStarted || isWorkoutCompleted) return;

    activateKeepAwake("workout-session");

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        activateKeepAwake("workout-session");
      }
    });

    return () => {
      subscription.remove();
      deactivateKeepAwake("workout-session");
    };
  }, [isWorkoutStarted, isWorkoutCompleted]);

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

      // Keep-awake is released by the dedicated session effect when
      // isWorkoutStarted flips to false below.

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
        // Distance movements (a run) aren't 10 reps — prefill 1 "rep" so
        // the set row is completable without fabricating rep volume
        const targetReps =
          currentExercise.reps || (currentExercise.distanceM ? 1 : 10);
        const targetWeight = currentExercise.weight || 0;

        const prescribedSets = Array.from({ length: targetSets }, (_, i) => ({
          roundNumber: 1,
          setNumber: i + 1,
          weight: targetWeight,
          reps: targetReps,
          distanceM: currentExercise.distanceM || undefined,
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
      // Keep-awake is released by the dedicated session effect's cleanup.
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

  // Keep a live ref of completion state for the workout-update subscription
  // (its listener closure would otherwise capture a stale value).
  const isCompletedRef = useRef(isWorkoutCompleted);
  isCompletedRef.current = isWorkoutCompleted;

  // The completed view is frozen (useFocusEffect skips reload when completed),
  // so a log edited elsewhere — e.g. the Calendar edit-log flow — wouldn't show
  // here without a manual refresh. Subscribe to workout updates and, when
  // completed, refetch the plan day (fresh isSkipped) and remount the summary
  // so it reloads its logs. Refetching a complete day keeps it complete
  // (loadWorkout re-detects isComplete), so this never disturbs the view.
  useEffect(() => {
    const unsubscribe = subscribeToWorkoutUpdates(() => {
      if (isCompletedRef.current) {
        loadWorkout(true);
        setCompletedRefreshKey((k) => k + 1);
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Watch nudge (best-effort, off the critical path): if health is
    // connected but no heart rate has landed recently, the user's watch
    // probably isn't recording — remind them so this session gets HR data.
    (async () => {
      try {
        if (
          (await getHealthConnection()) &&
          !(await hasRecentHeartRateSample())
        ) {
          setShowWatchNudge(true);
        }
      } catch {
        // never block or noise the start flow over a nudge
      }
    })();

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

  // Consume the Calendar "Start" intent: once today's workout has loaded (and
  // isn't already started, completed, or a rest day), begin the session
  // automatically. Guarded so it fires exactly once per request.
  useEffect(() => {
    if (
      autoStartRequested &&
      !loading &&
      workout &&
      !isWorkoutStarted &&
      !isWorkoutCompleted
    ) {
      clearAutoStart();
      startWorkout();
    }
    // startWorkout/clearAutoStart are stable enough for this one-shot effect;
    // re-running only on the state that gates it avoids double-starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartRequested, loading, workout, isWorkoutStarted, isWorkoutCompleted]);

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

  // [AN-04b] One `exercise_logged` per real (performance-data) exercise log.
  // Fired only after a successful persist and only from the standard/circuit
  // paths — completion-only blocks (warmup/cooldown) are intentionally excluded,
  // matching how the persistence path already treats them for analytics.
  // workout_id uses workout.workoutId to join with the "Workout Started" event.
  const fireExerciseLogged = (exerciseId?: number) => {
    trackEvent(AnalyticsEvent.EXERCISE_LOGGED, {
      workout_id: workout?.workoutId,
      exercise_id: exerciseId,
    });
  };

  const flushPendingCommit = async () => {
    const pending = pendingCommitRef.current;
    if (!pending) return;
    pendingCommitRef.current = null;
    clearTimeout(pending.timeout);
    setUndoSnackbar(null);
    try {
      await createExerciseLog(pending.payload);
      // Auto-advance path: exercise id resolved from the captured index.
      fireExerciseLogged(exercises[pending.exerciseIndex]?.exercise?.id);
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

      // Completion-only blocks (warmup/cooldown/flow): mark done, no set
      // data. Previously this logged a synthetic {weight:0, reps} set and
      // echoed the prescribed duration as if performed — both polluted
      // history and analytics (gap-analysis Phase 3).
      if (isCurrentBlockCompletionOnly) {
        await createExerciseLog({
          planDayExerciseId: currentExercise.id,
          sets: [],
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
        // Time-scored blocks (for_time) have no timer (T5-3): ask for the
        // finish time manually before completing. The modal re-enters
        // completeExercise with circuitTimeSecondsRef set (0 = skipped).
        if (
          getEffectiveScoringType(currentBlock) === "time" &&
          circuitTimeSecondsRef.current === null
        ) {
          setShowCircuitTimeModal(true);
          return;
        }

        // Finalize session state
        if (circuitSession?.actions.completeCircuit) {
          await circuitSession.actions.completeCircuit();
        }

        const session = circuitSession?.sessionData;
        if (workout?.workoutId && session) {
          // Batch log all rounds + mark exercises complete in minimal API
          // calls, including the block-level result (rounds + score)
          const actualTimeSeconds = circuitTimeSecondsRef.current || undefined;
          circuitTimeSecondsRef.current = null;
          await logCircuitCompletion(
            workout.workoutId,
            session.rounds,
            currentBlock,
            {
              actualTimeSeconds,
              targetRounds: session.targetRounds,
            },
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
          // Circuit completion logs every exercise in the block at once — emit
          // one exercise_logged per exercise for parity with the standard path.
          fireExerciseLogged(exercises[index]?.exercise?.id);
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
      // Standard (manual/final/duration) exercise completion.
      fireExerciseLogged(currentExercise.exercise?.id);

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
      // The completion path throws BEFORE advancing or marking anything
      // complete, and every write it makes is idempotent, so retrying is safe
      // and lossless. Offer a real Retry instead of a dead-end "OK" — a save
      // failure mid-workout is almost always a transient network blip.
      setDialogConfig({
        title: isCurrentBlockCircuit
          ? "Couldn't Save Circuit"
          : "Couldn't Save Exercise",
        description: isCurrentBlockCircuit
          ? "We couldn't save this circuit just now — check your connection. Your reps are still here and nothing was lost."
          : "We couldn't save this exercise just now — check your connection. Your sets are still here and nothing was lost.",
        primaryButton: {
          text: "Retry",
          onPress: () => {
            setDialogVisible(false);
            completeExercise();
          },
        },
        secondaryButton: {
          text: "Not Now",
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
      // Distinguishes "nothing to save" (fine, complete the day) from "the save
      // threw" (do NOT complete — that would mark today done with this block's
      // data dropped, and resuming would restart from zero). See below.
      let saveFailed = false;

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
                // End-early: no time prompt (keep the exit frictionless)
                await logCircuitCompletion(
                  workout.workoutId,
                  session.rounds,
                  block,
                  { targetRounds: session.targetRounds },
                );
                savedCurrentExercise = true;
                savedCircuitExerciseCount = block.exercises.length;
                // End-early circuit save: one exercise_logged per block exercise.
                block.exercises.forEach((ex) =>
                  fireExerciseLogged(ex.exercise?.id),
                );
              }
            }
          } else if (block && getLoggingMode(block) === "completion_only") {
            // Completion-only: no synthetic set rows, no echoed duration
            await createExerciseLog({
              planDayExerciseId: currentEx.id,
              sets: [],
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
                // End-early standard save.
                fireExerciseLogged(currentEx.exercise?.id);
              }
            }
          }
        } catch (saveErr) {
          console.error("Error saving current exercise on early end:", saveErr);
          saveFailed = true;
        }
      }

      // Robustness: never mark the day complete on a failed save. Doing so
      // would strand the current block's reps (they live only in memory /
      // circuit session) and, because the day is now "complete" with no logs,
      // resuming would restart from the first exercise. Keep the user in the
      // workout with their progress intact so they can retry or truly abandon.
      if (saveFailed) {
        showErrorDialog(
          "Couldn't Save Your Progress",
          "We couldn't save this block just now — check your connection and try again. Your workout is still here and nothing was lost.",
        );
        return;
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
      setEndedEarly(true);
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
  // Completion-only blocks (warmup, cooldown, flow — completion-scored):
  // simplified panel, no set entry, logged without synthetic set rows.
  const isCurrentBlockCompletionOnly = currentBlock
    ? getLoggingMode(currentBlock) === "completion_only"
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

  // Whether the fixed footer should surface the per-round action (Complete
  // Round / Interval / EMOM finish / Undo) as its primary button. Pinning it
  // here keeps it on-screen on short devices (S22) where it used to scroll
  // out of view inside the tracker; "Complete Circuit" then becomes a link.
  const showCircuitRoundAction = Boolean(
    isCurrentBlockCircuit &&
      currentBlock &&
      isRoundActionVisible(
        currentBlock,
        circuitSession.sessionData,
        circuitSession.canUndoRound
      )
  );

  // Render loading state
  if (loading) {
    return <WorkoutSkeleton />;
  }

  // Render error state
  if (error) {
    return (
      <View className="flex-1 bg-background">
        {/* The header names the state; the body explains it (no repeats). */}
        <Header
          title="Error"
          subtitle={formatDateForDisplay(getCurrentDate(), {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        />
        <View className="flex-1 justify-center items-center px-6">
        <Ionicons
          name="alert-circle-outline"
          size={64}
          color={colors.text.secondary}
        />
        <Text className="text-text-muted text-center mt-4 mb-2 leading-6">
          We couldn't load your workout.
        </Text>
        <Text className="text-sm text-text-muted text-center mb-6 leading-5">
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
      </View>
    );
  }

  // Render no workout state
  if (!workout) {
    return (
      <View className="flex-1 bg-background">
        {/* Same unified header shell as the rest of the tab. The header owns
            the page identity ("Rest Day" / "No Active Plan") so the body
            below never repeats it — it only carries the supporting copy. */}
        <Header
          title={hasActiveWorkoutPlan ? "Rest Day" : "No Active Plan"}
          subtitle={formatDateForDisplay(getCurrentDate(), {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        />
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
                <Text className="text-text-muted text-center mt-4 mb-8 leading-6">
                  No workout scheduled for today. Take time to rest and recover!
                </Text>
                <TouchableOpacity
                  className={`rounded-xl py-3 px-6 flex-row items-center justify-center ${
                    isGenerating ? "bg-primary/50 opacity-50" : "bg-primary"
                  }`}
                  onPress={
                    isGenerating
                      ? undefined
                      : // On a rest day, skip the "Create New vs Repeat Past"
                        // chooser — creating a fresh workout is the dominant
                        // intent, so go straight to the generate form. Repeat
                        // Past stays reachable via the secondary link below.
                        () => setShowRegenerationModal(true)
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
                <TouchableOpacity
                  className="mt-4"
                  onPress={
                    isGenerating ? undefined : () => setShowRepeatPicker(true)
                  }
                  disabled={isGenerating}
                  accessibilityRole="button"
                  accessibilityLabel="Repeat a past workout"
                >
                  <Text className="text-sm font-medium text-text-secondary">
                    Repeat a past workout
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              // No active workout plan at all — the header already says
              // "No Active Plan", so the card carries only the copy + CTA
              <NoActiveWorkoutCard
                isGenerating={isGenerating}
                onShowWorkoutChoice={() => setShowWorkoutChoice(true)}
                variant="workout"
                showTitle={false}
                subtitle="You don't have an active workout plan for this week."
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
    setEndedEarly(false);

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
        // Remounts to reload logs when a log edit elsewhere (e.g. Calendar
        // edit-log) fires a workout update — see the subscription below.
        key={completedRefreshKey}
        workout={workout}
        onResume={isToday ? handleResume : undefined}
        isResuming={isResuming}
        // Authoritative session state: a completed day stays "Workout Complete"
        // even after its log is edited — editing never resurrects Ended Early.
        endedEarly={endedEarly}
        // Just-finished today's workout is the most recent completed day, so
        // it's inside the edit window (SPEC §8). Ended-early days lead with
        // Resume instead, so no edit affordance there.
        canEditLog={isToday && !endedEarly}
        footer={
          <>
            {/* Share slots into the existing footer prop (nothing else moves).
                Suppressed on an ended-early summary — that screen is asking for
                feedback and offering Resume, so a share prompt is tone-deaf. */}
            {!endedEarly && workout?.id ? (
              <ShareWorkoutButton
                planDayId={workout.id}
                kind="completed"
                workoutName={workout.name ?? undefined}
                variant="completion"
              />
            ) : null}
            <Text className="text-text-muted text-center text-sm px-6 mt-4">
              Check back tomorrow for your next workout.
            </Text>
          </>
        }
      />
    );
  }

  // Main workout interface
  return (
    <View className="flex-1 bg-background">
      {/* Active-workout header: pinned OUTSIDE the ScrollView so the elapsed
          clock and progress bar stay visible while the user works down the
          set list (the pre-start variant scrolls with the content below). */}
      {isWorkoutStarted ? (
        <Header
          title={workout.name}
          subtitle={
            currentBlock
              ? `${
                  currentBlock.blockName ||
                  getBlockTypeDisplayName(currentBlock.blockType)
                } · exercise ${Math.min(
                  currentExerciseIndex + 1,
                  exercises.length,
                )} of ${exercises.length}`
              : undefined
          }
          showActions={false}
          rightAccessory={
            <Text className="text-lg font-bold text-text-primary">
              {formatElapsed(workoutTimer)}
            </Text>
          }
        >
          <View className="px-5 pb-4">
            <View className="w-full h-2 bg-neutral-light-2 rounded-full overflow-hidden">
              <View
                className="h-full bg-primary rounded-full"
                style={{ width: `${progressPercent.toFixed(0)}%` } as ViewStyle}
              />
            </View>
          </View>
        </Header>
      ) : null}
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
        {/* Unified header (same shell as Dashboard/Calendar), pre-start
            variant: scrolls with the content like the other tabs. The
            active-workout variant is pinned above this ScrollView. */}
        {!isWorkoutStarted ? (
          <Header
            title={workout.name}
            subtitle={[
              formatDateForDisplay(workout.date, {
                weekday: "short",
                month: "short",
                day: "numeric",
              }),
              totalDurationMinutes ? `${totalDurationMinutes} min` : null,
              `${exercises.length} exercise${exercises.length === 1 ? "" : "s"}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        ) : null}

        <View className="px-6 pt-2">
          {/* "Just generated" badge after a single-day generation. Used to
              float over the deleted hero media; now sits in flow. */}
          {justGenerated === "day" && (
            <View className="mb-4 self-start">
              <JustGeneratedBadge />
            </View>
          )}
          {/* Day-level coach instructions, shown before the workout starts */}
          {!isWorkoutStarted && workout.instructions ? (
            <Text className="text-base text-text-secondary leading-6 mb-6">
              {workout.instructions}
            </Text>
          ) : null}

          {/* Current Block Info — a mid-workout surface. Pre-start, the
              WorkoutBlock cards below carry the same info (screens/02). */}
          {isWorkoutStarted && currentBlock ? (
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

          {/* Current Exercise - Only show for traditional workouts, once the
              workout is underway (pre-start shows the plan list instead) */}
          {isWorkoutStarted && currentExercise && !isCurrentBlockCircuit ? (
            <View
              ref={exerciseHeadingRef}
              className="bg-card rounded-2xl mb-6 p-6 border font-bold border-neutral-light-2"
            >
              <Text className="text-xl font-bold text-text-primary mb-3">
                {currentExercise.exercise.name}
              </Text>

              {exerciseHasDemo(currentExercise.exercise) && currentBlock && (
                <DemoChip
                  label="Demo"
                  accessibilityLabel={`Demo: ${currentExercise.exercise.name}`}
                  onPress={() =>
                    openDemoSheet(currentBlock, currentExercise.exercise.id)
                  }
                  className="mb-3"
                />
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
                            className="bg-card border border-neutral-light-2 rounded-full px-3 py-1 mr-2"
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
                  {/* Simplified interface for completion-only blocks
                      (warmup, cooldown, mobility flows) */}
                  {isCurrentBlockCompletionOnly ? (
                    <View>
                      {/* Show target parameters in a structured layout matching the main interface */}
                      {Boolean(
                        currentExercise.duration ||
                          currentExercise.reps ||
                          currentExercise.sets
                      ) && (
                        <View className="flex items-center bg-background rounded-xl px-4 py-5">
                          <View className="flex-row flex-wrap justify-center gap-3">
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
                          <Text className="text-xs text-text-muted text-center mt-3 leading-5">
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
                {currentBlock.exercises.some((ex) =>
                  exerciseHasDemo(ex.exercise),
                ) && (
                  <DemoChip
                    label="Demos"
                    accessibilityLabel={`Demos: ${currentBlock.blockName}`}
                    onPress={() => openDemoSheet(currentBlock)}
                    className="mt-2"
                  />
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

          {/* Workout Overview. Pre-start it IS the screen — the shared
              WorkoutBlock cards with demo chips (screens/02). Once started it
              collapses into the [MF-012] progress-rail card below. */}
          {!isWorkoutStarted ? (
            <View>
              {workout.blocks.map((block, blockIndex) => (
                <WorkoutBlock
                  key={block.id}
                  block={block}
                  blockIndex={blockIndex}
                  isExpanded={expandedBlocks[block.id] !== false}
                  onToggleExpanded={() =>
                    setExpandedBlocks((prev) => ({
                      ...prev,
                      [block.id]: prev[block.id] === false,
                    }))
                  }
                  onExerciseDemoPress={(exercise) =>
                    openDemoSheet(block, exercise.exercise.id)
                  }
                />
              ))}
            </View>
          ) : (
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

                      {/* Icon-only demo chip — the row already names the
                          exercise, so a repeated "Demo" label is noise. */}
                      {exerciseHasDemo(exercise.exercise) ? (
                        <DemoChip
                          accessibilityLabel={`Demo: ${exercise.exercise.name}`}
                          onPress={() =>
                            openDemoSheet(block, exercise.exercise.id)
                          }
                          className="ml-2"
                        />
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ))}
              </>
            )}
          </View>
          )}
        </View>
      </ScrollView>

      {/* [T5-2] Undo window for an auto-advanced exercise */}
      <ExerciseCompleteSnackbar
        visible={!!undoSnackbar}
        exerciseName={undoSnackbar?.exerciseName}
        onUndo={undoAutoComplete}
      />

      <WatchNudgeBanner
        visible={showWatchNudge}
        onDismiss={() => setShowWatchNudge(false)}
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
          <>
            <View className="flex-row gap-2">
              {/* Skip button - only for completion-only blocks */}
              {isCurrentBlockCompletionOnly && (
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
                  <Text
                    className="text-content-on-primary font-semibold ml-2"
                    maxFontSizeMultiplier={1.3}
                  >
                    Skip
                  </Text>
                </TouchableOpacity>
              )}

              {/* Surface + border, not neutral-light-2 — that gray vanished
                  against the bg-card action bar and Pause read as bare text. */}
              <TouchableOpacity
                className="bg-surface border border-neutral-medium-1 rounded-2xl py-4 flex-1 flex-row items-center justify-center"
                onPress={togglePause}
                accessibilityRole="button"
                accessibilityLabel={isPaused ? "Resume" : "Pause"}
              >
                <Ionicons
                  name={isPaused ? "play-outline" : "pause-outline"}
                  size={20}
                  color={colors.text.primary}
                />
                <Text
                  className="text-text-primary font-semibold ml-2"
                  maxFontSizeMultiplier={1.3}
                >
                  {isPaused ? "Resume" : "Pause"}
                </Text>
              </TouchableOpacity>

              {/* Circuit blocks pin the per-round action here so it stays
                  visible on short screens (S22); "Complete Circuit" drops to
                  the link below. All other blocks keep the single Complete
                  button. [T5-2] Single tap — no confirmation modal. */}
              {showCircuitRoundAction && currentBlock ? (
                <CircuitRoundAction
                  isActive={!isWorkoutCompleted}
                  block={currentBlock}
                  sessionData={circuitSession.sessionData}
                  canUndoRound={circuitSession.canUndoRound}
                  circuitActions={circuitSession.actions}
                />
              ) : (
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
                  <Text
                    className="text-content-on-primary font-semibold ml-2"
                    maxFontSizeMultiplier={1.3}
                  >
                    {isCompletingExercise
                      ? "Saving..."
                      : isCurrentBlockCircuit
                        ? "Complete Circuit"
                        : "Complete"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* When the round action owns the primary slot, finishing the
                whole circuit becomes a secondary link. */}
            {showCircuitRoundAction && (
              <TouchableOpacity
                onPress={completeExercise}
                disabled={isCompletingExercise}
                className="items-center mt-3"
                accessibilityRole="button"
                accessibilityLabel="Complete Circuit"
                accessibilityState={{ disabled: isCompletingExercise }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: colors.brand.primary }}
                  maxFontSizeMultiplier={1.3}
                >
                  {isCompletingExercise ? "Saving..." : "Complete Circuit"}
                </Text>
              </TouchableOpacity>
            )}
          </>
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

      {/* for_time finish-time entry */}
      <CircuitTimeModal
        visible={showCircuitTimeModal}
        onSave={(totalSeconds) => {
          circuitTimeSecondsRef.current = totalSeconds;
          setShowCircuitTimeModal(false);
          completeExercise();
        }}
        onSkip={() => {
          circuitTimeSecondsRef.current = 0;
          setShowCircuitTimeModal(false);
          completeExercise();
        }}
        onCancel={() => {
          circuitTimeSecondsRef.current = null;
          setShowCircuitTimeModal(false);
        }}
      />

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

      {/* Demo video sheet — the single playback surface for every Demo chip */}
      <DemoSheet
        visible={!!demoSheet}
        entries={demoSheet?.entries ?? []}
        initialIndex={demoSheet?.index ?? 0}
        surface="workout"
        onClose={() => setDemoSheet(null)}
      />

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
