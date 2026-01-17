import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

export interface UseWorkoutTimersReturn {
  // State
  workoutTimer: number;
  exerciseTimer: number;
  isPaused: boolean;

  // Refs (for external access if needed)
  workoutStartTime: React.RefObject<number | null>;
  exerciseStartTime: React.RefObject<number | null>;

  // Actions
  startTimers: () => void;
  stopTimers: () => void;
  resetTimers: () => void;
  resetExerciseTimer: () => void;
  togglePause: () => void;
  setWorkoutTimer: (value: number) => void;
  setExerciseTimer: (value: number) => void;

  // Utilities
  formatTime: (seconds: number) => string;
  getWorkoutDurationForAnalytics: () => number;
}

export interface UseWorkoutTimersConfig {
  isWorkoutStarted: boolean;
  isWorkoutCompleted: boolean;
}

export function useWorkoutTimers(
  config: UseWorkoutTimersConfig,
): UseWorkoutTimersReturn {
  const { isWorkoutStarted, isWorkoutCompleted } = config;

  // Timer state
  const [workoutTimer, setWorkoutTimer] = useState(0);
  const [exerciseTimer, setExerciseTimer] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const workoutStartTime = useRef<number | null>(null);
  const exerciseStartTime = useRef<number | null>(null);
  const appStateRef = useRef(AppState.currentState);

  // Timer management with timestamp-based calculation
  useEffect(() => {
    if (isWorkoutStarted && !isPaused && !isWorkoutCompleted) {
      // Activate keep awake to prevent screen sleep
      activateKeepAwakeAsync("workout-timer").catch(() => {
        // Silently handle activation errors
      });

      // Initialize start times if not set (preserve existing timer values on resume)
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
      deactivateKeepAwake("workout-timer").catch(() => {
        // Silently handle deactivation errors
      });

      // Clean up display timer when workout stops
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      deactivateKeepAwake("workout-timer").catch(() => {
        // Silently handle deactivation errors
      });
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      deactivateKeepAwake("workout-timer").catch(() => {
        // Silently handle deactivation errors
      });
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Actions
  const startTimers = useCallback(() => {
    const now = Date.now();
    setWorkoutTimer(0);
    setExerciseTimer(0);
    workoutStartTime.current = now;
    exerciseStartTime.current = now;
  }, []);

  const stopTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetTimers = useCallback(() => {
    setWorkoutTimer(0);
    setExerciseTimer(0);
    setIsPaused(false);
    workoutStartTime.current = null;
    exerciseStartTime.current = null;
    stopTimers();
  }, [stopTimers]);

  const resetExerciseTimer = useCallback(() => {
    setExerciseTimer(0);
    exerciseStartTime.current = Date.now();
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  // Utilities
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const getWorkoutDurationForAnalytics = useCallback((): number => {
    if (workoutStartTime.current) {
      // Simple calculation: total time from start to now in seconds
      return Math.floor((Date.now() - workoutStartTime.current) / 1000);
    }
    return 0;
  }, []);

  return {
    // State
    workoutTimer,
    exerciseTimer,
    isPaused,

    // Refs
    workoutStartTime,
    exerciseStartTime,

    // Actions
    startTimers,
    stopTimers,
    resetTimers,
    resetExerciseTimer,
    togglePause,
    setWorkoutTimer,
    setExerciseTimer,

    // Utilities
    formatTime,
    getWorkoutDurationForAnalytics,
  };
}
