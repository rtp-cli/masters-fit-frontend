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
  AppStateStatus,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import {
  fetchActiveWorkout,
  createExerciseLog,
  markPlanDayAsComplete,
  getPlanDayLog,
  skipExercise,
} from "@/lib/workouts";
import { getCurrentUser } from "@/lib/auth";
import { formatEquipment, getCurrentDate, formatDateAsString } from "@/utils";
import ExerciseLink from "@/components/ExerciseLink";
import ExerciseVideoCarousel from "@/components/ExerciseVideoCarousel";
import { ExerciseSet } from "@/components/SetTracker";
import AdaptiveSetTracker from "@/components/AdaptiveSetTracker";
import CircularTimerDisplay from "@/components/CircularTimerDisplay";
import CircuitTracker from "@/components/CircuitTracker";
import CircuitTimer from "@/components/CircuitTimer";
import { colors } from "@/lib/theme";
import {
  WorkoutBlockWithExercises,
  WorkoutBlockWithExercise,
  PlanDayWithBlocks,
  getBlockTypeDisplayName,
} from "@/types/api/workout.types";
import {
  CircuitSessionData,
  CircuitSessionConfig,
  CircuitRound,
  CircuitExerciseLog as CircuitExercise,
} from "@/types/api/circuit.types";
import {
  isCircuitBlock,
  getLoggingInterface,
  isWarmupCooldownBlock,
} from "@/utils/circuitUtils";
import { useCircuitSession } from "@/hooks/useCircuitSession";
import {
  logCircuitSession,
  logCircuitRound,
  markBlockExercisesComplete,
} from "@/lib/circuits";
import { useWorkout } from "@/contexts/WorkoutContext";
import { useAppDataContext } from "@/contexts/AppDataContext";
import { WorkoutSkeleton } from "../../components/skeletons/skeleton-screens";
import WorkoutRepeatModal from "@/components/WorkoutRepeatModal";
import {
  generateWorkoutPlanAsync,
  invalidateActiveWorkoutCache,
} from "@/lib/workouts";
import { registerForPushNotifications } from "@/lib/notifications";
import { useAuth } from "@/contexts/AuthContext";
import { useBackgroundJobs } from "@contexts/BackgroundJobContext";
import { trackWorkoutStarted } from "@/lib/analytics";
import NoActiveWorkoutCard from "@/components/NoActiveWorkoutCard";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { activateKeepAwake, deactivateKeepAwake } from "expo-keep-awake";
import { AppState } from "react-native";

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

// Utility functions
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// Circuit Logging Interface Component
function CircuitLoggingInterface({
  block,
  workout,
  isWorkoutStarted,
  circuitSession,
}: {
  block: WorkoutBlockWithExercises;
  workout: PlanDayWithBlocks;
  isWorkoutStarted: boolean;
  circuitSession: ReturnType<typeof useCircuitSession> | null;
}) {
  if (!circuitSession) {
    return null; // Don't render if no circuit session
  }

  const {
    sessionData,
    currentRoundData,
    metrics,
    actions,
    isLoading,
    canCompleteRound,
    canCompleteCircuit,
    updateTimerState,
  } = circuitSession;

  const handleRoundComplete = async (roundData: CircuitRound) => {
    try {
      await logCircuitRound(workout.workoutId, block.id, roundData);
    } catch (error) {
      Alert.alert("Error", "Failed to log round. Please try again.");
    }
  };

  const handleCircuitComplete = async (sessionData: CircuitSessionData) => {
    try {
      // Log the circuit session; advancement is handled by bottom "Complete Circuit"
      await logCircuitSession(workout.workoutId, sessionData);
    } catch (error) {
      console.error("Error completing circuit:", error);
      Alert.alert("Error", "Failed to complete circuit. Please try again.");
    }
  };

  // TIMER DISPLAY HIDDEN: Timer display disabled
  // const shouldShowTimer = Boolean(
  //   (block.timeCapMinutes && block.timeCapMinutes > 0) ||
  //     block.blockType === "for_time"
  // );
  const shouldShowTimer = false;

  return (
    <View className="space-y-6">
      {/* Circuit Tracker */}
      <View className="bg-card rounded-2xl p-6 border border-neutral-light-2">
        <CircuitTracker
          block={block}
          sessionData={sessionData}
          onSessionUpdate={(updatedSessionData) => {
            // Update session data through the hook's actions
            // This is handled internally by the useCircuitSession hook
          }}
          onRoundComplete={handleRoundComplete}
          onCircuitComplete={handleCircuitComplete}
          isActive={isWorkoutStarted}
          circuitActions={actions}
          updateTimerState={updateTimerState}
          shouldShowTimer={shouldShowTimer}
        />
        {/* Circuit Timer - Only show when there's a time cap */}
      </View>
    </View>
  );
}

export default function WorkoutScreen() {
  // Get workout context for tab disabling
  const { setWorkoutInProgress, isWorkoutInProgress, setCurrentWorkoutData } =
    useWorkout();

  // Get user from auth context
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Background job tracking
  const { isGenerating, addJob } = useBackgroundJobs();

  // Get data refresh functions
  const {
    refresh: { refreshDashboard, reset, refreshAll },
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
  const [hasCompletedWorkoutDuration, setHasCompletedWorkoutDuration] =
    useState(false);
  const [completedExercisesCount, setCompletedExercisesCount] = useState(0);

  // Timer state
  const [workoutTimer, setWorkoutTimer] = useState(0);
  const [exerciseTimer, setExerciseTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Exercise progress state
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress[]>(
    []
  );

  // Skip state
  const [skippedExercises, setSkippedExercises] = useState<number[]>([]);
  const [skippedBlocks, setSkippedBlocks] = useState<number[]>([]);

  // Timer visibility state
  const [showRestTimer, setShowRestTimer] = useState(false);

  // Format timer display for compact view
  const formatRestTimerDisplay = () => {
    const minutes = Math.floor(restTimerCountdown / 60);
    const seconds = restTimerCountdown % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Modal state
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showRestCompleteModal, setShowRestCompleteModal] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [isCompletingExercise, setIsCompletingExercise] = useState(false);
  const [isSkippingExercise, setIsSkippingExercise] = useState(false);

  // New modal states for repeat workout
  const [showRepeatModal, setShowRepeatModal] = useState(false);

  // Rest timer state
  const [isRestTimerActive, setIsRestTimerActive] = useState(false);
  const [isRestTimerPaused, setIsRestTimerPaused] = useState(false);
  const [restTimerCountdown, setRestTimerCountdown] = useState(0);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restTimerStartTime = useRef<number | null>(null);
  const workoutStartTime = useRef<number | null>(null);
  const exerciseStartTime = useRef<number | null>(null);
  const appStateRef = useRef(AppState.currentState);

  // UI state
  const scrollViewRef = useRef<ScrollView>(null);
  const exerciseHeadingRef = useRef<View>(null);
  const circuitHeadingRef = useRef<View>(null);

  // Helper function to scroll to exercise heading
  const scrollToExerciseHeading = (exerciseIndex: number) => {
    const nextExercise = exercises[exerciseIndex];
    const nextBlock = workout?.blocks?.find((block) =>
      block.exercises.some((ex) => ex.id === nextExercise?.id)
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
        () => console.log("Failed to measure circuit heading")
      );
    } else if (exerciseHeadingRef.current && scrollViewRef.current) {
      exerciseHeadingRef.current.measureLayout(
        scrollViewRef.current as any,
        (x, y) =>
          scrollViewRef.current?.scrollTo({
            y: Math.max(0, y - 20),
            animated: true,
          }),
        () => console.log("Failed to measure exercise heading")
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
            Math.floor((now - exerciseStartTime.current) / 1000)
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

  // Rest timer management with timestamp-based calculation
  useEffect(() => {
    if (isRestTimerActive && !isRestTimerPaused && restTimerCountdown > 0) {
      // Activate keep awake for rest timer
      activateKeepAwake("rest-timer");

      // Initialize start time if not set
      if (!restTimerStartTime.current) {
        const targetDuration = currentExercise?.restTime || 0;
        restTimerStartTime.current =
          Date.now() - (targetDuration - restTimerCountdown) * 1000;
      }

      // TIMER DISABLED: Rest timer interval commented out
      // restTimerRef.current = setInterval(() => {
      //   const now = Date.now();
      //   const targetDuration = currentExercise?.restTime || 0;

      //   if (restTimerStartTime.current) {
      //     const elapsed = Math.floor((now - restTimerStartTime.current) / 1000);
      //     const remaining = Math.max(0, targetDuration - elapsed);

      //     setRestTimerCountdown(remaining);

      //     if (remaining <= 0) {
      //       // Timer finished - add notification + haptic feedback
      //       try {
      //         // Send local notification with sound (no banner will show)
      //         Notifications.scheduleNotificationAsync({
      //           content: {
      //             title: "Rest Complete!",
      //             body: "Your rest period has ended. Ready for the next set?",
      //             sound: "tri-tone", // Different iOS notification sound
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

      //       setIsRestTimerActive(false);
      //       setIsRestTimerPaused(false);
      //       restTimerStartTime.current = null;
      //       deactivateKeepAwake("rest-timer");

      //       if (restTimerRef.current) {
      //         clearInterval(restTimerRef.current);
      //       }

      //       // Show rest completion modal when rest timer finishes
      //       setShowRestCompleteModal(true);
      //     }
      //   }
      // }, 1000);
    } else {
      if (!isRestTimerActive) {
        deactivateKeepAwake("rest-timer");
        restTimerStartTime.current = null;
      }

      if (restTimerRef.current) {
        // TIMER DISABLED: Clear interval commented out
        // clearInterval(restTimerRef.current);
      }
    }

    return () => {
      deactivateKeepAwake("rest-timer");
      if (restTimerRef.current) {
        // TIMER DISABLED: Clear interval commented out
        // clearInterval(restTimerRef.current);
      }
    };
  }, [
    isRestTimerActive,
    isRestTimerPaused,
    restTimerCountdown,
    currentExercise?.restTime,
  ]);

  // Reset rest timer countdown when not active or exercise changes
  useEffect(() => {
    if (!isRestTimerActive) {
      const restTime = currentExercise?.restTime || 0;
      setRestTimerCountdown(restTime);
      restTimerStartTime.current = null;
    }
  }, [isRestTimerActive, currentExercise?.restTime]);

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
              Math.floor((now - workoutStartTime.current) / 1000)
            );
          }
          if (exerciseStartTime.current) {
            setExerciseTimer(
              Math.floor((now - exerciseStartTime.current) / 1000)
            );
          }
        }

        // Recalculate rest timer
        if (isRestTimerActive && !isRestTimerPaused) {
          const now = Date.now();
          const targetDuration = currentExercise?.restTime || 0;

          if (restTimerStartTime.current) {
            const elapsed = Math.floor(
              (now - restTimerStartTime.current) / 1000
            );
            const remaining = Math.max(0, targetDuration - elapsed);
            setRestTimerCountdown(remaining);

            // If timer finished while in background, trigger completion
            if (remaining <= 0) {
              setIsRestTimerActive(false);
              setIsRestTimerPaused(false);
              restTimerStartTime.current = null;
              setShowRestCompleteModal(true);

              // Add haptic feedback for completion
              try {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                );
              } catch (error) {
                console.log("Haptic feedback error:", error);
              }
            }
          }
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App going to background - timers will continue based on timestamps
        console.log(
          "App going to background, timers will continue via timestamps"
        );
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, [
    isWorkoutStarted,
    isPaused,
    isWorkoutCompleted,
    isRestTimerActive,
    isRestTimerPaused,
    currentExercise?.restTime,
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

  // Handle workout abandonment - reset workout state when context says no workout in progress
  // but local state thinks workout is started
  useEffect(() => {
    if (!isWorkoutInProgress && isWorkoutStarted && !isWorkoutCompleted) {
      setIsWorkoutStarted(false);
      setIsPaused(false);
      setWorkoutTimer(0);
      setExerciseTimer(0);
      setCurrentExerciseIndex(0);
      setIsRestTimerActive(false);
      setIsRestTimerPaused(false);
      setRestTimerCountdown(0);

      // Reset timestamp references
      workoutStartTime.current = null;
      exerciseStartTime.current = null;
      restTimerStartTime.current = null;

      // Deactivate keep awake
      deactivateKeepAwake("workout-timer");
      deactivateKeepAwake("rest-timer");

      // Clear any active timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (restTimerRef.current) {
        // clearInterval(restTimerRef.current);
      }
    }
  }, [isWorkoutInProgress, isWorkoutStarted, isWorkoutCompleted]);

  // Auto-add first set when moving to a new exercise
  useEffect(() => {
    if (
      isWorkoutStarted &&
      !isWorkoutCompleted &&
      currentExercise &&
      currentProgress
    ) {
      // Only add first set if no sets exist for this exercise
      if (currentProgress.sets.length === 0) {
        // Use the same target values that are passed to SetTracker
        const targetSets = currentExercise.sets || 3;
        const targetReps = currentExercise.reps || 10;
        const targetWeight = currentExercise.weight || 0;

        const firstSet = {
          roundNumber: 1,
          setNumber: 1,
          weight: targetWeight,
          reps: targetReps,
        };
        updateProgress("sets", [firstSet]);
      }
    }
  }, [currentExerciseIndex, isWorkoutStarted, isWorkoutCompleted]);

  // Cleanup workout context on unmount
  useEffect(() => {
    return () => {
      setWorkoutInProgress(false);
      // Cleanup keep awake on unmount
      deactivateKeepAwake("workout-timer");
      deactivateKeepAwake("rest-timer");
      // Clear timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (restTimerRef.current) {
        // clearInterval(restTimerRef.current);
      }
    };
  }, [setWorkoutInProgress]);

  // Load completed workout duration from plan day log
  const loadCompletedWorkoutDuration = async (planDayId: number) => {
    try {
      const planDayLog = await getPlanDayLog(planDayId);

      if (planDayLog?.totalTimeMinutes) {
        console.log("Loaded completed workout data:", {
          totalTimeMinutes: planDayLog.totalTimeMinutes,
          exercisesCompleted: planDayLog.exercisesCompleted,
          blocksCompleted: planDayLog.blocksCompleted,
        });
        setWorkoutTimer(planDayLog.totalTimeMinutes * 60);
        setCompletedExercisesCount(planDayLog.exercisesCompleted || 0);
        setHasCompletedWorkoutDuration(true);
      } else {
        // For completed workouts without duration, show 0:00 rather than confusing display
        setWorkoutTimer(0);
        setCompletedExercisesCount(0);
        setHasCompletedWorkoutDuration(false);
      }
    } catch (error) {
      console.error("❌ Error loading completed workout duration:", error);
      setWorkoutTimer(0);
      setCompletedExercisesCount(0);
      setHasCompletedWorkoutDuration(false);
    }
  };

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

        // Load the actual workout duration from plan day log
        await loadCompletedWorkoutDuration(todaysWorkout.id);
        return;
      }

      setWorkout(todaysWorkout);

      // Check if there's an existing workout session in progress
      // (You might need to add logic here to detect if a workout was previously started)

      // Initialize exercise progress (including warmup/cooldown)
      const flatExercises = todaysWorkout.blocks.flatMap(
        (block: WorkoutBlockWithExercises) => block.exercises
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

  // Handle generating new workout
  const handleGenerateNewWorkout = async () => {
    if (!user?.id) return;

    // Simple prevention using the isGenerating flag
    if (isGenerating) {
      Alert.alert(
        "Generation in Progress",
        "A workout is already being generated. Please wait for it to complete.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      // Register for push notifications
      await registerForPushNotifications();

      const result = await generateWorkoutPlanAsync(user.id);

      if (result?.success && result.jobId) {
        // Register the job with background context for FAB tracking
        await addJob(result.jobId, "generation");

        // Job started successfully - FAB will show progress
        // Data refresh will happen when generation completes
        // Navigate to dashboard to show the FAB
        router.replace("/");
      } else {
        // Only show error alerts for actual failures
        Alert.alert(
          "Generation Failed",
          "Unable to start workout generation. Please check your connection and try again.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      Alert.alert(
        "Generation Error",
        "An error occurred while starting workout generation. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  // Handle successful workout repetition
  const handleRepeatWorkoutSuccess = () => {
    // Refresh workout data after successful repetition
    loadWorkout(true);
  };

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
        } as any),
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

  useFocusEffect(
    React.useCallback(() => {
      // Don't force refresh on focus, rely on cache
      loadWorkout(false);
      // Scroll to top when tab is focused
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  // Listen for tab re-click events
  useEffect(() => {
    const handleScrollToTop = () => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    };

    const { tabEvents } = require("../../lib/tabEvents");
    tabEvents.on("scrollToTop:workout", handleScrollToTop);

    return () => {
      tabEvents.off("scrollToTop:workout", handleScrollToTop);
    };
  }, []);

  // Update exercise progress
  const updateProgress = <K extends keyof ExerciseProgress>(
    field: K,
    value: ExerciseProgress[K]
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
        (ex) => ex.exerciseId === currentExercise.exerciseId
      )
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

  // Start rest timer
  const startRestTimer = () => {
    const restTime = currentExercise?.restTime || 0;
    if (restTime > 0) {
      setRestTimerCountdown(restTime);
      setIsRestTimerActive(true);
      setIsRestTimerPaused(false);
      restTimerStartTime.current = Date.now();
    }
  };

  // Pause/Resume rest timer
  const toggleRestTimerPause = () => {
    if (isRestTimerPaused) {
      // Resuming - adjust start time based on current countdown
      const targetDuration = currentExercise?.restTime || 0;
      const elapsed = targetDuration - restTimerCountdown;
      restTimerStartTime.current = Date.now() - elapsed * 1000;
    }
    setIsRestTimerPaused(!isRestTimerPaused);
  };

  // Reset rest timer
  const resetRestTimer = () => {
    const restTime = currentExercise?.restTime || 0;
    setRestTimerCountdown(restTime);
    setIsRestTimerPaused(false);
    restTimerStartTime.current = null;
  };

  // Cancel rest timer
  const cancelRestTimer = () => {
    setIsRestTimerActive(false);
    setIsRestTimerPaused(false);
    setRestTimerCountdown(0);
    restTimerStartTime.current = null;
    deactivateKeepAwake("rest-timer");
    if (restTimerRef.current) {
      // TIMER DISABLED: Clear interval commented out
      // clearInterval(restTimerRef.current);
    }
  };

  // Handle rest timer start/pause for CircularTimerDisplay
  const handleRestTimerStartPause = () => {
    if (restTimerCountdown === 0) return; // Don't allow start/pause when completed
    if (isRestTimerActive) {
      toggleRestTimerPause();
    } else {
      startRestTimer();
    }
  };

  // Handle rest timer reset for CircularTimerDisplay
  const handleRestTimerReset = () => {
    // Reset timer to beginning and restart automatically
    const restTime = currentExercise?.restTime || 0;
    setRestTimerCountdown(restTime);
    setIsRestTimerActive(true);
    setIsRestTimerPaused(false);
    restTimerStartTime.current = Date.now();
  };

  // Handle rest timer cancel for CircularTimerDisplay
  const handleRestTimerCancel = () => {
    // Cancel timer and return to initial state (not active, full duration)
    const restTime = currentExercise?.restTime || 0;
    setIsRestTimerActive(false);
    setIsRestTimerPaused(false);
    setRestTimerCountdown(restTime);
    restTimerStartTime.current = null;
    deactivateKeepAwake("rest-timer");
    if (restTimerRef.current) {
      // TIMER DISABLED: Clear interval commented out
      // clearInterval(restTimerRef.current);
    }
  };

  // Complete current exercise
  const completeExercise = async () => {
    if (!currentExercise || !currentProgress) return;

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
          scrollToExerciseHeading(nextIndex);
        } else {
          // All exercises completed, complete the workout
          if (workout?.id) {
            const completedExerciseCount =
              exercises.length - skippedExercises.length;
            const completedBlockCount = workout.blocks.length;

            // Get duration for analytics (simple start to end time)
            const finalDuration = getWorkoutDurationForAnalytics();

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
          }

          setCurrentExerciseIndex(exercises.length);
          setIsWorkoutCompleted(true);
          setWorkoutInProgress(false);
        }

        setShowCompleteModal(false);
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
          // Log each round that has any reps or is marked completed
          for (const round of session.rounds) {
            const hasReps = round.exercises?.some(
              (ex: CircuitExercise) => (ex.actualReps || 0) > 0
            );
            if (hasReps || round.isCompleted) {
              await logCircuitRound(workout.workoutId, currentBlock.id, round);
            }
          }

          // Ensure all exercises in the block are marked complete in workout log
          await markBlockExercisesComplete(workout.workoutId, currentBlock);
        }

        // Update local progress and advance
        const circuitExerciseIds = currentBlock.exercises.map((ex) => ex.id);
        const exerciseIndices = circuitExerciseIds
          .map((exerciseId) =>
            exercises.findIndex((ex) => ex.id === exerciseId)
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
          scrollToExerciseHeading(nextExerciseIndex);
        } else {
          // All exercises completed, complete the workout day
          if (workout?.id) {
            const completedExerciseCount =
              exercises.length - skippedExercises.length;
            const completedBlockCount = workout.blocks.length;

            // Get duration for analytics (simple start to end time)
            const finalDuration = getWorkoutDurationForAnalytics();

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
          }

          setCurrentExerciseIndex(exercises.length);
          setIsWorkoutCompleted(true);
          setWorkoutInProgress(false);
        }

        setShowCompleteModal(false);
        return;
      }

      // Regular exercise completion logic for non-circuits
      // Check if we have valid progress - either sets or duration
      const hasSets = currentProgress.sets && currentProgress.sets.length > 0;
      const hasDuration =
        currentProgress.duration && currentProgress.duration > 0;
      const isDurationBasedExercise =
        currentExercise.duration &&
        currentExercise.duration > 0 &&
        (!currentExercise.reps || currentExercise.reps === 0);

      if (!hasSets && !hasDuration && !isDurationBasedExercise) {
        Alert.alert(
          "No Progress Logged",
          "Please log your exercise progress before completing this exercise.",
          [{ text: "OK" }]
        );
        return;
      }

      // For duration-based exercises, ensure we have proper sets structure
      let setsToLog = currentProgress.sets;
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
        sets: setsToLog,
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
        exerciseStartTime.current = Date.now(); // Reset exercise timer timestamp
        updateCurrentBlockForAbandonment(nextIndex);
        scrollToExerciseHeading(nextIndex);
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

          await markPlanDayAsComplete(workout.id, {
            totalTimeSeconds: finalDuration,
            exercisesCompleted: completedExerciseCount,
            blocksCompleted: completedBlockCount,
          });
          // Refresh dashboard data with current date range to ensure today's data is included
          // Include both past workouts and upcoming planned workouts for weekly progress
          const today = new Date();
          const startDate = new Date(today);
          startDate.setDate(today.getDate() - 30); // 30 days back for historical data
          const endDate = new Date(today);
          endDate.setDate(today.getDate() + 7); // 7 days forward for planned workouts

          await refreshDashboard({
            startDate: startDate.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
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
      console.error(
        isCurrentBlockCircuit
          ? "Error completing circuit:"
          : "Error completing exercise:",
        err
      );
      Alert.alert(
        "Error",
        isCurrentBlockCircuit
          ? "Failed to complete circuit. Please try again."
          : "Failed to complete exercise. Please try again."
      );
    } finally {
      setIsCompletingExercise(false);
    }
  };

  // Skip current exercise
  const skipCurrentExercise = async () => {
    if (!currentExercise || !workout) return;

    setIsSkippingExercise(true);

    try {
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
        exerciseStartTime.current = Date.now(); // Reset exercise timer timestamp
        updateCurrentBlockForAbandonment(nextIndex);
        scrollToExerciseHeading(nextIndex);
      } else {
        // Check if all exercises are completed or skipped
        const allProcessed = exercises.every(
          (ex, index) =>
            index < currentExerciseIndex ||
            skippedExercises.includes(ex.id) ||
            index === currentExerciseIndex
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

          // Mark plan day as complete with detailed timing in seconds
          await markPlanDayAsComplete(workout.id, {
            totalTimeSeconds: finalDuration,
            exercisesCompleted: completedExerciseCount,
            blocksCompleted: completedBlockCount,
          });
          setCurrentExerciseIndex(exercises.length);
          setIsWorkoutCompleted(true);
          setWorkoutInProgress(false);
          Alert.alert("Workout Complete!", "You've finished today's workout.", [
            { text: "OK" },
          ]);
        }
      }

      setShowSkipModal(false);
    } catch (err) {
      console.error("Error skipping exercise:", err);
      Alert.alert("Error", "Failed to skip exercise. Please try again.");
    } finally {
      setIsSkippingExercise(false);
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
  const loggingInterface = getLoggingInterface(currentBlock || undefined);
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
  const circuitActions =
    isCurrentBlockCircuit && currentBlock ? circuitSession.actions : null;

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
      <View className="flex-1 bg-background">
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
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
              </>
            ) : (
              // No active workout plan at all
              <NoActiveWorkoutCard
                isGenerating={isGenerating}
                onRepeatWorkout={() => setShowRepeatModal(true)}
                onGenerateWorkout={handleGenerateNewWorkout}
                variant="workout"
              />
            )}
          </View>
        </ScrollView>

        {/* Workout Repeat Modal */}
        <WorkoutRepeatModal
          visible={showRepeatModal}
          onClose={() => setShowRepeatModal(false)}
          onSuccess={handleRepeatWorkoutSuccess}
        />
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
          Amazing work! You completed{" "}
          {hasCompletedWorkoutDuration
            ? completedExercisesCount
            : currentExerciseIndex}{" "}
          exercises
          {!hasCompletedWorkoutDuration &&
            skippedExercises.length > 0 &&
            ` (${skippedExercises.length} skipped)`}{" "}
          {/* TIMER DISPLAY HIDDEN: Completion timer message commented out */}
          {/* {hasCompletedWorkoutDuration
            ? `in ${formatTime(workoutTimer)}.`
            : "(duration not available)."} */}
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
        {/* Hero Exercise Media - Contextual based on workout type */}
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
              {/* TIMER DISPLAY HIDDEN: Main workout timer commented out */}
              {/* {isWorkoutStarted && (
                <View className="bg-background rounded-xl px-3 py-1 min-w-[80px]">
                  <Text className="text-lg font-bold text-text-primary text-center">
                    {formatTime(workoutTimer)}
                  </Text>
                </View>
              )} */}
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
                        {currentBlock.rounds && !isCurrentBlockCircuit && (
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
                  {/* Show simplified interface for warmup/cooldown */}
                  {isCurrentBlockWarmupCooldown ? (
                    <View>
                      {/* Show target parameters in a structured layout matching the main interface */}
                      {(currentExercise.duration ||
                        currentExercise.reps ||
                        currentExercise.sets) && (
                        <View className="flex items-center bg-background rounded-xl pt-6">
                          <View className="flex-row flex-wrap gap-3">
                            {currentExercise.sets && (
                              <View className="flex-row items-center">
                                <Text className="text-sm text-text-muted mr-1">
                                  Sets:
                                </Text>
                                <Text className="text-sm font-semibold text-text-primary">
                                  {currentExercise.sets}
                                </Text>
                              </View>
                            )}
                            {currentExercise.reps && (
                              <View className="flex-row items-center">
                                <Text className="text-sm text-text-muted mr-1">
                                  Reps:
                                </Text>
                                <Text className="text-sm font-semibold text-text-primary">
                                  {currentExercise.reps}
                                </Text>
                              </View>
                            )}
                            {currentExercise.duration && (
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
                              }
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
                              progress.setsCompleted
                            );
                            updateProgress("duration", progress.duration);
                            // Note: Removed auto-completion - user now manually completes exercise
                          }}
                          blockType={currentBlock?.blockType}
                        />
                      </View>

                      {/* TIMER DISPLAY HIDDEN: Rest timer interface commented out */}
                      {/* {currentExercise.restTime && currentExercise.restTime > 0 ? (
                        <View className="mt-2 px-3 mb-3">
                          <TouchableOpacity
                            className={`py-3 px-6 rounded-lg items-center border-2 mb-2 ${
                              showRestTimer
                                ? "bg-brand-primary border-brand-primary"
                                : "border-brand-primary bg-transparent"
                            }`}
                            onPress={() => setShowRestTimer(!showRestTimer)}
                          >
                            <Text
                              className={`text-sm font-semibold ${
                                showRestTimer ? "text-white" : ""
                              }`}
                              style={
                                !showRestTimer
                                  ? { color: colors.brand.primary }
                                  : {}
                              }
                            >
                              {showRestTimer
                                ? "Hide Rest Timer"
                                : `Show Rest Timer (${formatRestTimerDisplay()})`}
                            </Text>
                          </TouchableOpacity>

                          {showRestTimer && (
                            <View className="rounded-2xl p-4 border border-neutral-light-2 bg-card">
                              <CircularTimerDisplay
                                countdown={restTimerCountdown}
                                targetDuration={currentExercise?.restTime || 0}
                                isActive={isRestTimerActive}
                                isPaused={isRestTimerPaused}
                                isCompleted={restTimerCountdown === 0}
                                startButtonText={`Start Rest`}
                                onStartPause={handleRestTimerStartPause}
                                onReset={handleRestTimerReset}
                                onCancel={handleRestTimerCancel}
                              />
                            </View>
                          )}
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
              <View className="flex-row items-center justify-between mb-4">
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
                    className="flex-row items-center gap-1 px-2 py-1 bg-brand-primary/10 rounded-full"
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
              />
            </View>
          ) : null}

          {/* Workout Overview */}
          <View className="bg-card rounded-2xl p-6 border border-neutral-light-2">
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
                        className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                          isCompleted
                            ? "bg-neutral-dark-1"
                            : "bg-brand-medium-2"
                        }`}
                      >
                        {isSkipped ? (
                          <Ionicons
                            name="play-skip-forward-outline"
                            size={16}
                            color="white"
                          />
                        ) : isCompleted ? (
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={colors.neutral.light[2]}
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
          <View className="flex-row gap-2">
            {/* Skip button - only show for warmup/cooldown */}
            {isCurrentBlockWarmupCooldown && (
              <TouchableOpacity
                className="bg-primary rounded-2xl py-4 flex-1 flex-row items-center justify-center"
                onPress={() => setShowSkipModal(true)}
              >
                <Ionicons
                  name="play-skip-forward-outline"
                  size={20}
                  color={colors.text.secondary}
                />
                <Text className="text-secondary font-semibold ml-2">Skip</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className="bg-neutral-light-2 rounded-2xl py-4 flex-1 flex-row items-center justify-center"
              onPress={togglePause}
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

            <TouchableOpacity
              className="bg-primary rounded-2xl py-4 flex-row items-center justify-center flex-1"
              onPress={() => setShowCompleteModal(true)}
            >
              <Ionicons
                name="checkmark"
                size={20}
                color={colors.text.secondary}
              />
              <Text className="text-secondary font-semibold ml-2">
                {isCurrentBlockCircuit
                  ? "Complete Circuit"
                  : isCurrentBlockWarmupCooldown
                  ? "Complete"
                  : "Complete"}
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
              {isCurrentBlockCircuit
                ? "Complete Circuit"
                : isCurrentBlockWarmupCooldown
                ? `Complete ${
                    currentBlock?.blockType === "warmup" ? "Warmup" : "Cooldown"
                  }`
                : "Complete Exercise"}
            </Text>
            <Text className="text-base text-text-secondary text-center mb-6 leading-6">
              {isCurrentBlockCircuit
                ? `Complete "${
                    currentBlock?.blockName || "Circuit Block"
                  }"? All rounds and exercises will be logged.`
                : isCurrentBlockWarmupCooldown
                ? `Mark "${
                    currentExercise?.exercise.name
                  }" as complete and move to the next ${
                    currentExerciseIndex < exercises.length - 1
                      ? "exercise"
                      : "phase"
                  }?`
                : `Mark "${currentExercise?.exercise.name}" as complete? Your progress will be saved.`}
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

      {/* Skip Exercise Modal */}
      <Modal visible={showSkipModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
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
                      color={colors.text.primary}
                    />
                    <Text className="text-text-primary font-semibold ml-2">
                      Skipping...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-text-primary font-semibold text-center">
                    Skip
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rest Complete Modal */}
      <Modal visible={showRestCompleteModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            {/* TIMER DISPLAY HIDDEN: Timer icon commented out */}
            {/* <View className="items-center mb-4">
              <Ionicons name="timer" size={48} color={colors.brand.primary} />
            </View> */}
            <Text className="text-xl font-bold text-text-primary mb-4 text-center">
              Rest Complete!
            </Text>
            <Text className="text-base text-text-secondary text-center mb-6 leading-6">
              Your {currentExercise?.restTime}s rest is finished. What would you
              like to do next?
            </Text>

            {/* Show current progress */}
            {currentProgress && currentExercise && (
              <View className="bg-neutral-light-1 rounded-xl p-3 mb-6">
                <Text className="text-sm font-semibold text-text-primary mb-2 text-center">
                  Current Progress
                </Text>
                <View className="flex-row justify-center items-center space-x-4">
                  <View className="items-center">
                    <Text className="text-lg font-bold text-text-primary">
                      {currentProgress.sets?.length || 0}
                    </Text>
                    <Text className="text-xs text-text-muted">
                      of {currentExercise.sets || 3} sets
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View className="space-y-3">
              {/* Continue button - only show if more sets are needed */}
              {currentProgress &&
                currentExercise &&
                (currentProgress.sets?.length || 0) <
                  (currentExercise.sets || 3) && (
                  <TouchableOpacity
                    className="bg-primary rounded-xl py-3 mb-3 px-6"
                    onPress={() => {
                      setShowRestCompleteModal(false);
                      // Timer is already finished, user can continue with next set
                    }}
                  >
                    <Text className="text-secondary font-semibold text-center">
                      Continue Exercise
                    </Text>
                  </TouchableOpacity>
                )}

              {/* Complete exercise button */}
              <TouchableOpacity
                className="bg-neutral-light-2 rounded-xl py-3 px-6"
                onPress={() => {
                  setShowRestCompleteModal(false);
                  setShowCompleteModal(true);
                }}
              >
                <Text className="text-text-primary font-semibold text-center">
                  {isCurrentBlockCircuit
                    ? "Complete Circuit"
                    : "Complete Exercise"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
