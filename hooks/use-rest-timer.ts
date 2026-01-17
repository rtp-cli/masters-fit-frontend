import * as Haptics from "expo-haptics";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

export interface UseRestTimerReturn {
  // State
  restTimerCountdown: number;
  isRestTimerActive: boolean;
  isRestTimerPaused: boolean;

  // Actions
  startRestTimer: (duration: number) => void;
  toggleRestTimerPause: (targetDuration: number) => void;
  resetRestTimer: (duration: number) => void;
  cancelRestTimer: () => void;
  handleRestTimerStartPause: (duration: number) => void;
  handleRestTimerReset: (duration: number) => void;
  handleRestTimerCancel: (duration: number) => void;

  // Utilities
  formatRestTimerDisplay: () => string;
}

export interface UseRestTimerConfig {
  onRestComplete?: () => void;
}

export function useRestTimer(config?: UseRestTimerConfig): UseRestTimerReturn {
  const { onRestComplete } = config || {};

  // State
  const [isRestTimerActive, setIsRestTimerActive] = useState(false);
  const [isRestTimerPaused, setIsRestTimerPaused] = useState(false);
  const [restTimerCountdown, setRestTimerCountdown] = useState(0);

  // Refs
  const _restTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restTimerStartTime = useRef<number | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const targetDurationRef = useRef<number>(0);
  const onRestCompleteRef = useRef(onRestComplete);
  const restTimerCountdownRef = useRef(restTimerCountdown);

  // Update refs when values change
  useEffect(() => {
    onRestCompleteRef.current = onRestComplete;
  }, [onRestComplete]);

  useEffect(() => {
    restTimerCountdownRef.current = restTimerCountdown;
  }, [restTimerCountdown]);

  // Rest timer management with timestamp-based calculation
  useEffect(() => {
    if (
      isRestTimerActive &&
      !isRestTimerPaused &&
      restTimerCountdownRef.current > 0
    ) {
      // Activate keep awake for rest timer
      activateKeepAwakeAsync("rest-timer").catch(() => {
        // Silently handle activation errors
      });

      // Initialize start time if not set
      if (!restTimerStartTime.current) {
        const targetDuration = targetDurationRef.current;
        restTimerStartTime.current =
          Date.now() - (targetDuration - restTimerCountdownRef.current) * 1000;
      }

      // TIMER DISABLED: Rest timer interval commented out for now
      // The timer functionality can be re-enabled when needed
    } else {
      if (!isRestTimerActive) {
        deactivateKeepAwake("rest-timer").catch(() => {
          // Silently handle deactivation errors
        });
        restTimerStartTime.current = null;
      }
    }

    return () => {
      deactivateKeepAwake("rest-timer").catch(() => {
        // Silently handle deactivation errors
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRestTimerActive, isRestTimerPaused]);

  // Handle app state changes for rest timer
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // App came to foreground - recalculate rest timer
        if (isRestTimerActive && !isRestTimerPaused) {
          const now = Date.now();
          const targetDuration = targetDurationRef.current;

          if (restTimerStartTime.current) {
            const elapsed = Math.floor(
              (now - restTimerStartTime.current) / 1000,
            );
            const remaining = Math.max(0, targetDuration - elapsed);
            setRestTimerCountdown(remaining);

            // If timer finished while in background, trigger completion
            if (remaining <= 0) {
              setIsRestTimerActive(false);
              setIsRestTimerPaused(false);
              restTimerStartTime.current = null;
              onRestCompleteRef.current?.();

              // Add haptic feedback for completion
              try {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success,
                );
              } catch (error) {
                console.log("Haptic feedback error:", error);
              }
            }
          }
        }
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [isRestTimerActive, isRestTimerPaused]);

  // Actions
  const startRestTimer = useCallback((duration: number) => {
    if (duration > 0) {
      targetDurationRef.current = duration;
      setRestTimerCountdown(duration);
      setIsRestTimerActive(true);
      setIsRestTimerPaused(false);
      restTimerStartTime.current = Date.now();
    }
  }, []);

  const toggleRestTimerPause = useCallback(
    (targetDuration: number) => {
      if (isRestTimerPaused) {
        // Resuming - adjust start time based on current countdown
        const elapsed = targetDuration - restTimerCountdown;
        restTimerStartTime.current = Date.now() - elapsed * 1000;
      }
      setIsRestTimerPaused((prev) => !prev);
    },
    [isRestTimerPaused, restTimerCountdown],
  );

  const resetRestTimer = useCallback((duration: number) => {
    targetDurationRef.current = duration;
    setRestTimerCountdown(duration);
    setIsRestTimerPaused(false);
    restTimerStartTime.current = null;
  }, []);

  const cancelRestTimer = useCallback(() => {
    setIsRestTimerActive(false);
    setIsRestTimerPaused(false);
    setRestTimerCountdown(0);
    restTimerStartTime.current = null;
  }, []);

  const handleRestTimerStartPause = useCallback(
    (duration: number) => {
      if (restTimerCountdown === 0) return; // Don't allow start/pause when completed
      if (isRestTimerActive) {
        toggleRestTimerPause(duration);
      } else {
        startRestTimer(duration);
      }
    },
    [
      restTimerCountdown,
      isRestTimerActive,
      toggleRestTimerPause,
      startRestTimer,
    ],
  );

  const handleRestTimerReset = useCallback((duration: number) => {
    // Reset timer to beginning and restart automatically
    targetDurationRef.current = duration;
    setRestTimerCountdown(duration);
    setIsRestTimerActive(true);
    setIsRestTimerPaused(false);
    restTimerStartTime.current = Date.now();
  }, []);

  const handleRestTimerCancel = useCallback((duration: number) => {
    // Cancel timer and return to initial state (not active, full duration)
    setIsRestTimerActive(false);
    setIsRestTimerPaused(false);
    setRestTimerCountdown(duration);
    restTimerStartTime.current = null;
  }, []);

  // Utilities
  const formatRestTimerDisplay = useCallback(() => {
    const minutes = Math.floor(restTimerCountdown / 60);
    const seconds = restTimerCountdown % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [restTimerCountdown]);

  return {
    // State
    restTimerCountdown,
    isRestTimerActive,
    isRestTimerPaused,

    // Actions
    startRestTimer,
    toggleRestTimerPause,
    resetRestTimer,
    cancelRestTimer,
    handleRestTimerStartPause,
    handleRestTimerReset,
    handleRestTimerCancel,

    // Utilities
    formatRestTimerDisplay,
  };
}
