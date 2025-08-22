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
import { ExerciseSet } from "@/components/SetTracker";
import AdaptiveSetTracker from "@/components/AdaptiveSetTracker";
import CircularTimerDisplay from "@/components/CircularTimerDisplay";
import { colors } from "@/lib/theme";
import {
  WorkoutBlockWithExercises,
  WorkoutBlockWithExercise,
  PlanDayWithBlocks,
  getBlockTypeDisplayName,
} from "@/types/api/workout.types";
import { useWorkout } from "@/contexts/WorkoutContext";
import { useAppDataContext } from "@/contexts/AppDataContext";
import { WorkoutSkeleton } from "../../components/skeletons/SkeletonScreens";
import WorkoutRepeatModal from "@/components/WorkoutRepeatModal";
import { generateWorkoutPlan } from "@/lib/workouts";
import { useAuth } from "@/contexts/AuthContext";
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

export default function WorkoutScreen() {
  // Get workout context for tab disabling
  const { setWorkoutInProgress, isWorkoutInProgress } = useWorkout();

  // Get user from auth context
  const {
    user,
    setIsGeneratingWorkout,
    setIsPreloadingData,
    isLoading: authLoading,
  } = useAuth();
  const router = useRouter();

  // Get data refresh functions
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
  const [restTimerCountdown, setRestTimerCountdown] = useState(
    currentExercise?.restTime || 0
  );
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restTimerStartTime = useRef<number | null>(null);
  const workoutStartTime = useRef<number | null>(null);
  const exerciseStartTime = useRef<number | null>(null);
  const appStateRef = useRef(AppState.currentState);

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
      activateKeepAwake('workout-timer');
      
      // Initialize start times if not set
      if (!workoutStartTime.current) {
        workoutStartTime.current = Date.now() - (workoutTimer * 1000);
      }
      if (!exerciseStartTime.current) {
        exerciseStartTime.current = Date.now() - (exerciseTimer * 1000);
      }
      
      timerRef.current = setInterval(() => {
        const now = Date.now();
        if (workoutStartTime.current) {
          setWorkoutTimer(Math.floor((now - workoutStartTime.current) / 1000));
        }
        if (exerciseStartTime.current) {
          setExerciseTimer(Math.floor((now - exerciseStartTime.current) / 1000));
        }
      }, 1000);
    } else {
      // Deactivate keep awake when timer stops
      deactivateKeepAwake('workout-timer');
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      deactivateKeepAwake('workout-timer');
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isWorkoutStarted, isPaused, isWorkoutCompleted]);

  // Rest timer management with timestamp-based calculation
  useEffect(() => {
    if (isRestTimerActive && !isRestTimerPaused && restTimerCountdown > 0) {
      // Activate keep awake for rest timer
      activateKeepAwake('rest-timer');
      
      // Initialize start time if not set
      if (!restTimerStartTime.current) {
        const targetDuration = currentExercise?.restTime || 0;
        restTimerStartTime.current = Date.now() - ((targetDuration - restTimerCountdown) * 1000);
      }
      
      restTimerRef.current = setInterval(() => {
        const now = Date.now();
        const targetDuration = currentExercise?.restTime || 0;
        
        if (restTimerStartTime.current) {
          const elapsed = Math.floor((now - restTimerStartTime.current) / 1000);
          const remaining = Math.max(0, targetDuration - elapsed);
          
          setRestTimerCountdown(remaining);
          
          if (remaining <= 0) {
            // Timer finished - add notification + haptic feedback
            try {
              // Send local notification with sound (no banner will show)
              Notifications.scheduleNotificationAsync({
                content: {
                  title: "Rest Complete!",
                  body: "Your rest period has ended. Ready for the next set?",
                  sound: "tri-tone", // Different iOS notification sound
                },
                trigger: null, // Show immediately
              });

              // Add haptic feedback
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
            } catch (error) {
              console.log("Notification/haptic feedback error:", error);
            }

            setIsRestTimerActive(false);
            setIsRestTimerPaused(false);
            restTimerStartTime.current = null;
            deactivateKeepAwake('rest-timer');
            
            if (restTimerRef.current) {
              clearInterval(restTimerRef.current);
            }
            
            // Show rest completion modal when rest timer finishes
            setShowRestCompleteModal(true);
          }
        }
      }, 1000);
    } else {
      if (!isRestTimerActive) {
        deactivateKeepAwake('rest-timer');
        restTimerStartTime.current = null;
      }
      
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current);
      }
    }

    return () => {
      deactivateKeepAwake('rest-timer');
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current);
      }
    };
  }, [isRestTimerActive, isRestTimerPaused, restTimerCountdown, currentExercise?.restTime]);

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
    const handleAppStateChange = (nextAppState: string) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - recalculate timers based on timestamps
        console.log('App came to foreground, recalculating timers');
        
        // Recalculate workout and exercise timers
        if (isWorkoutStarted && !isPaused && !isWorkoutCompleted) {
          const now = Date.now();
          if (workoutStartTime.current) {
            setWorkoutTimer(Math.floor((now - workoutStartTime.current) / 1000));
          }
          if (exerciseStartTime.current) {
            setExerciseTimer(Math.floor((now - exerciseStartTime.current) / 1000));
          }
        }
        
        // Recalculate rest timer
        if (isRestTimerActive && !isRestTimerPaused) {
          const now = Date.now();
          const targetDuration = currentExercise?.restTime || 0;
          
          if (restTimerStartTime.current) {
            const elapsed = Math.floor((now - restTimerStartTime.current) / 1000);
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
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (error) {
                console.log('Haptic feedback error:', error);
              }
            }
          }
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App going to background - timers will continue based on timestamps
        console.log('App going to background, timers will continue via timestamps');
      }
      
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isWorkoutStarted, isPaused, isWorkoutCompleted, isRestTimerActive, isRestTimerPaused, currentExercise?.restTime]);

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
      deactivateKeepAwake('workout-timer');
      deactivateKeepAwake('rest-timer');
      
      // Clear any active timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current);
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
      deactivateKeepAwake('workout-timer');
      deactivateKeepAwake('rest-timer');
      // Clear timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current);
      }
    };
  }, [setWorkoutInProgress]);

  // Load completed workout duration from plan day log
  const loadCompletedWorkoutDuration = async (planDayId: number) => {
    try {
      const planDayLog = await getPlanDayLog(planDayId);

      if (planDayLog?.totalTimeSeconds) {
        console.log("Loaded completed workout data:", {
          totalTimeSeconds: planDayLog.totalTimeSeconds,
          exercisesCompleted: planDayLog.exercisesCompleted,
          blocksCompleted: planDayLog.blocksCompleted,
        });
        setWorkoutTimer(planDayLog.totalTimeSeconds);
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

      const todaysWorkout = response.planDays.find((day: any) => {
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

    try {
      setIsGeneratingWorkout(true);
      const result = await generateWorkoutPlan(user.id);

      if (result?.success) {
        // Trigger app reload to show warming up screen
        setIsPreloadingData(true);
        // Navigate to home to trigger the warming up flow
        router.replace("/");
      } else {
        throw new Error("Failed to generate workout");
      }
    } catch (error) {
      console.error("Error generating workout:", error);
      Alert.alert("Error", "Failed to generate new workout. Please try again.");
      setIsGeneratingWorkout(false);
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
      handleNotification: async () => ({
        shouldShowAlert: false, // Hide the banner notification
        shouldPlaySound: true, // Keep the sound
        shouldSetBadge: false,
      }),
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
    const now = Date.now();
    setIsWorkoutStarted(true);
    setWorkoutTimer(0);
    setExerciseTimer(0);
    workoutStartTime.current = now;
    exerciseStartTime.current = now;
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
      restTimerStartTime.current = Date.now() - (elapsed * 1000);
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
    deactivateKeepAwake('rest-timer');
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
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
    deactivateKeepAwake('rest-timer');
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
        setCurrentExerciseIndex((prev) => prev + 1);
        setExerciseTimer(0);
        exerciseStartTime.current = Date.now(); // Reset exercise timer timestamp
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
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

          // Mark plan day as complete with detailed timing in seconds
          await markPlanDayAsComplete(workout.id, {
            totalTimeSeconds: workoutTimer,
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
      console.error("Error completing exercise:", err);
      Alert.alert("Error", "Failed to complete exercise. Please try again.");
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
        setCurrentExerciseIndex((prev) => prev + 1);
        setExerciseTimer(0);
        exerciseStartTime.current = Date.now(); // Reset exercise timer timestamp
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
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
          const skippedExerciseCount = skippedExercises.length;
          const totalProcessedExercises =
            completedExerciseCount + skippedExerciseCount;
          const completedBlockCount = workout.blocks.length; // All blocks processed

          console.log("Workout skip completion data:", {
            workoutTimer,
            totalTimeSeconds: workoutTimer,
            exercisesCompleted: totalProcessedExercises,
            blocksCompleted: completedBlockCount,
          });

          // Mark plan day as complete with detailed timing in seconds
          await markPlanDayAsComplete(workout.id, {
            totalTimeSeconds: workoutTimer,
            exercisesCompleted: totalProcessedExercises,
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
              <>
                <Ionicons
                  name="fitness-outline"
                  size={64}
                  color={colors.text.muted}
                />
                <Text className="text-lg font-bold text-text-primary text-center mt-4 mb-2">
                  No Workout Plan
                </Text>
                <Text className="text-text-muted text-center mb-8 leading-6">
                  You don't have an active workout plan for this week.
                </Text>

                {/* Action buttons for no workout plan */}
                <View className="w-full space-y-3">
                  <TouchableOpacity
                    className="bg-primary rounded-xl py-4 px-6 mb-2 flex-row items-center justify-center"
                    onPress={() => setShowRepeatModal(true)}
                  >
                    <Ionicons
                      name="repeat"
                      size={20}
                      color={colors.text.secondary}
                    />
                    <Text className="text-secondary font-semibold text-base ml-2">
                      Repeat a Previous Workout Plan
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="bg-neutral-light-2 rounded-xl py-4 px-6 flex-row items-center justify-center"
                    onPress={handleGenerateNewWorkout}
                  >
                    <Ionicons
                      name="sparkles"
                      size={20}
                      color={colors.text.primary}
                    />
                    <Text className="text-text-primary font-semibold text-base ml-2">
                      Generate a New Workout Plan
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
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
          {hasCompletedWorkoutDuration
            ? `in ${formatTime(workoutTimer)}.`
            : "(duration not available)."}
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
                    <View className="flex-row items-center gap-2">
                      <View className="items-end">
                        {currentBlock.rounds && (
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

                  {/* Adaptive Set Tracker Component */}
                  <View className="rounded-2xl p-4">
                    <View className="flex-row items-center justify-between mb-3">
                      <Text className="text-sm font-semibold text-text-primary">
                        Exercise Logging
                      </Text>
                    </View>
                    <AdaptiveSetTracker
                      exercise={currentExercise}
                      sets={currentProgress.sets}
                      onSetsChange={(sets) => updateProgress("sets", sets)}
                      onProgressUpdate={(progress) => {
                        updateProgress("setsCompleted", progress.setsCompleted);
                        updateProgress("duration", progress.duration);
                        // Note: Removed auto-completion - user now manually completes exercise
                      }}
                      blockType={currentBlock?.blockType}
                    />
                  </View>

                  {/* Rest Timer - Only show if exercise has rest time */}
                  {currentExercise.restTime && currentExercise.restTime > 0 ? (
                    <View className="rounded-2xl p-4 mt-2">
                      <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-sm font-semibold text-text-primary">
                          Rest Timer
                        </Text>
                      </View>

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
            <TouchableOpacity
              className="bg-primary rounded-2xl py-4 flex-1 flex-row items-center justify-center"
              onPress={() => setShowSkipModal(true)}
            >
              <Ionicons
                name="play-skip-forward-outline"
                size={20}
                color={colors.text.primary}
              />
              <Text className="text-text-primary font-semibold ml-2">Skip</Text>
            </TouchableOpacity>

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
              className="bg-primary rounded-2xl py-4 flex-1 flex-row items-center justify-center"
              onPress={() => setShowCompleteModal(true)}
            >
              <Ionicons
                name="checkmark"
                size={20}
                color={colors.text.secondary}
              />
              <Text className="text-secondary font-semibold ml-2">
                Complete
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
            <View className="items-center mb-4">
              <Ionicons name="timer" size={48} color={colors.brand.primary} />
            </View>
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
                  Complete Exercise
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
