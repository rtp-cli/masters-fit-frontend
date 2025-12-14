import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { colors } from "@/lib/theme";
import {
  CircuitTimerProps,
  CircuitTimerState,
} from "@/types/api/circuit.types";
import { getCircuitTimerConfig } from "@/utils/circuit-utils";

export default function CircuitTimer({
  blockType,
  timeCapMinutes,
  rounds,
  timerState,
  onTimerUpdate,
  onTimerEvent,
  disabled = false,
}: CircuitTimerProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedMinuteRef = useRef<number>(0);
  const timerConfig = getCircuitTimerConfig(blockType);

  // Calculate display time based on timer type
  const getDisplayTime = () => {
    const { currentTime, currentInterval, isWorkPhase } = timerState;

    if (timerConfig.type === "intervals" && blockType === "tabata") {
      // Tabata: show interval time
      const intervalTime = isWorkPhase
        ? timerConfig.workInterval
        : timerConfig.restInterval;
      const elapsedInInterval =
        currentTime % (timerConfig.workInterval + timerConfig.restInterval);

      if (isWorkPhase) {
        return Math.max(0, timerConfig.workInterval - elapsedInInterval);
      } else {
        return Math.max(
          0,
          timerConfig.restInterval -
            (elapsedInInterval - timerConfig.workInterval)
        );
      }
    } else if (timerConfig.type === "countDown" && blockType === "emom") {
      // EMOM: show countdown within current minute
      const secondsInMinute = currentTime % 60;
      return Math.max(0, 60 - secondsInMinute);
    } else if (
      timerConfig.type === "countDown" &&
      blockType === "for_time" &&
      timeCapMinutes
    ) {
      // For Time with time cap: show countdown from time cap
      const timeCapSeconds = timeCapMinutes * 60;
      return Math.max(0, timeCapSeconds - currentTime);
    } else if (blockType === "for_time" && !timeCapMinutes) {
      // For Time without time cap: show elapsed time
      return currentTime;
    } else if (timerConfig.type === "countUp" && timeCapMinutes) {
      // AMRAP with time cap: show remaining time
      const timeCapSeconds = timeCapMinutes * 60;
      return Math.max(0, timeCapSeconds - currentTime);
    } else {
      // Default: show elapsed time
      return currentTime;
    }
  };

  const getTimerLabel = () => {
    if (timerConfig.type === "intervals" && blockType === "tabata") {
      return timerState.isWorkPhase ? "WORK" : "REST";
    } else if (blockType === "emom") {
      return "Next Minute";
    } else if (blockType === "for_time" && timeCapMinutes) {
      return "Time Remaining";
    } else if (blockType === "for_time" && !timeCapMinutes) {
      return "Time Elapsed";
    } else if (blockType === "amrap" && timeCapMinutes) {
      return "Time Remaining";
    } else {
      return "Time Elapsed";
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Timer logic
  useEffect(() => {
    if (timerState.isActive && !timerState.isPaused) {
      // TIMER DISABLED: Circuit timer interval commented out
      // timerRef.current = setInterval(() => {
      //   const now = Date.now();
      //   let newCurrentTime = timerState.currentTime;
      //   if (timerState.startTime) {
      //     const elapsed = Math.floor(
      //       (now - timerState.startTime.getTime()) / 1000
      //     );
      //     newCurrentTime = elapsed - timerState.totalPausedTime;
      //   } else {
      //     newCurrentTime = timerState.currentTime + 1;
      //   }
      //   const newState: CircuitTimerState = {
      //     ...timerState,
      //     currentTime: newCurrentTime,
      //   };
      //   // Handle specific timer behaviors
      //   if (blockType === "tabata") {
      //     handleTabataLogic(newCurrentTime, newState);
      //   } else if (blockType === "emom") {
      //     handleEmomLogic(newCurrentTime, newState);
      //   } else if (blockType === "amrap" && timeCapMinutes) {
      //     handleAmrapLogic(newCurrentTime, newState);
      //   } else if (blockType === "for_time" && timeCapMinutes) {
      //     handleForTimeLogic(newCurrentTime, newState);
      //   }
      //   // Ensure state consistency - don't update if timer was stopped during logic
      //   if (newState.isActive) {
      //     onTimerUpdate(newState);
      //   }
      // }, 1000);
    } else {
      if (timerRef.current) {
        // TIMER DISABLED: Clear interval commented out
        // clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        // TIMER DISABLED: Clear interval commented out
        // clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    timerState.isActive,
    timerState.isPaused,
    timerState.currentInterval,
    blockType,
    timeCapMinutes,
    rounds,
  ]);

  // Tabata interval logic
  const handleTabataLogic = (
    currentTime: number,
    newState: CircuitTimerState
  ) => {
    const totalIntervalTime =
      timerConfig.workInterval + timerConfig.restInterval; // 30 seconds
    const elapsedInInterval = currentTime % totalIntervalTime;
    const currentInterval = Math.floor(currentTime / totalIntervalTime) + 1;
    const isWorkPhase = elapsedInInterval < timerConfig.workInterval;

    // Update interval state
    if (
      currentInterval !== timerState.currentInterval ||
      isWorkPhase !== timerState.isWorkPhase
    ) {
      newState.currentInterval = currentInterval;
      newState.isWorkPhase = isWorkPhase;

      // Provide haptic feedback only for transitions (no sound)
      try {
        if (elapsedInInterval === 0) {
          // Starting work phase
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else if (elapsedInInterval === timerConfig.workInterval) {
          // Starting rest phase
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } catch (error) {
        console.log("Haptic feedback error:", error);
      }
    }

    // Check if Tabata is complete (8 rounds)
    if (currentInterval > 8) {
      newState.isActive = false;
      onTimerEvent?.("complete");

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Notifications.scheduleNotificationAsync({
          content: {
            title: "Tabata Complete!",
            body: "8 rounds finished - great work!",
            sound: "chime",
          },
          trigger: null,
        });
      } catch (error) {
        console.log("Notification/haptic feedback error:", error);
      }
    }
  };

  // EMOM logic
  const handleEmomLogic = (
    currentTime: number,
    newState: CircuitTimerState
  ) => {
    const currentMinute = Math.floor(currentTime / 60) + 1;
    const secondsInMinute = currentTime % 60;

    // Update current interval if minute changed
    if (currentMinute !== timerState.currentInterval) {
      newState.currentInterval = currentMinute;

      // Auto-complete the previous minute's round (only after the first minute)
      if (currentMinute > 1) {
        // Reset timer to start of new minute (keep total elapsed time tracking)
        newState.currentTime = (currentMinute - 1) * 60;
        newState.startTime = new Date(Date.now() - newState.currentTime * 1000);
        newState.totalPausedTime = 0; // Reset paused time for clean minute

        // Guard against duplicate processing for the same minute (for haptics/notifications only)
        if (lastProcessedMinuteRef.current !== currentMinute) {
          lastProcessedMinuteRef.current = currentMinute;
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Notifications.scheduleNotificationAsync({
              content: {
                title: `Minute ${currentMinute}`,
                body: "New minute started!",
                sound: "tri-tone",
              },
              trigger: null,
            });
          } catch (error) {
            console.log("Notification/haptic feedback error:", error);
          }
        }
      }
    } else if (!newState.currentInterval && currentMinute === 1) {
      // Initialize currentInterval if it's not set and we're in the first minute
      newState.currentInterval = 1;
    }

    // Check if EMOM is complete
    if (rounds && currentMinute > rounds) {
      newState.isActive = false;
      newState.currentTime = rounds * 60; // Ensure time doesn't exceed target
      onTimerEvent?.("complete");

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Notifications.scheduleNotificationAsync({
          content: {
            title: "EMOM Complete!",
            body: `${rounds} minutes finished - great work!`,
            sound: "chime",
          },
          trigger: null,
        });
      } catch (error) {
        console.log("Notification/haptic feedback error:", error);
      }
    }
  };

  // AMRAP with time cap logic
  const handleAmrapLogic = (
    currentTime: number,
    newState: CircuitTimerState
  ) => {
    const timeCapSeconds = (timeCapMinutes || 0) * 60;
    const remainingTime = timeCapSeconds - currentTime;

    // Warning at 1 minute remaining (haptic only)
    if (remainingTime === 60 && currentTime > 0) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (error) {
        console.log("Haptic feedback error:", error);
      }
    }

    // Time cap reached
    if (remainingTime <= 0) {
      newState.isActive = false;
      newState.currentTime = timeCapSeconds;
      onTimerEvent?.("complete");

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Notifications.scheduleNotificationAsync({
          content: {
            title: "Time Cap Reached!",
            body: "AMRAP complete - great work!",
            sound: "chime",
          },
          trigger: null,
        });
      } catch (error) {
        console.log("Notification/haptic feedback error:", error);
      }
    }
  };

  // For Time logic - warn about time cap but don't auto-complete
  const handleForTimeLogic = (
    currentTime: number,
    newState: CircuitTimerState
  ) => {
    const timeCapSeconds = (timeCapMinutes || 0) * 60;
    const remainingTime = timeCapSeconds - currentTime;

    // Warning at 1 minute remaining
    if (remainingTime === 60 && currentTime > 0) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Notifications.scheduleNotificationAsync({
          content: {
            title: "1 Minute Remaining!",
            body: "Time cap approaching - keep pushing!",
            sound: "submarine",
          },
          trigger: null,
        });
      } catch (error) {
        console.log("Notification/haptic feedback error:", error);
      }
    }

    // Time cap reached - warn but don't stop (For Time continues until rounds are done)
    if (remainingTime <= 0 && currentTime === timeCapSeconds) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Notifications.scheduleNotificationAsync({
          content: {
            title: "Time Cap Reached!",
            body: "Finish your current round when possible",
            sound: "tri-tone",
          },
          trigger: null,
        });
      } catch (error) {
        console.log("Notification/haptic feedback error:", error);
      }
    }
  };

  // Timer controls
  const handleStartPause = () => {
    if (disabled) return;

    if (!timerState.isActive) {
      // Start timer
      const newState: CircuitTimerState = {
        ...timerState,
        isActive: true,
        isPaused: false,
        startTime: timerState.startTime || new Date(),
      };

      // Initialize for specific block types
      if (blockType === "tabata") {
        newState.currentInterval = 1;
        newState.isWorkPhase = true;
      } else if (blockType === "emom") {
        newState.currentInterval = 1;
        // Ensure we don't have stale startTime that could cause time calculation issues
        if (!newState.startTime) {
          newState.startTime = new Date();
        }
      }

      onTimerUpdate(newState);
      onTimerEvent?.("start");
    } else {
      // Toggle pause/resume
      const isPausing = !timerState.isPaused;
      const newState: CircuitTimerState = {
        ...timerState,
        isPaused: isPausing,
      };

      if (isPausing) {
        newState.pausedAt = new Date();
        onTimerEvent?.("pause");
      } else {
        if (timerState.pausedAt) {
          const pauseDuration = Math.floor(
            (Date.now() - timerState.pausedAt.getTime()) / 1000
          );
          newState.totalPausedTime = timerState.totalPausedTime + pauseDuration;
        }
        newState.pausedAt = undefined;
        onTimerEvent?.("resume");
      }

      onTimerUpdate(newState);
    }
  };

  const handleReset = () => {
    if (disabled) return;

    Alert.alert(
      "Reset Timer",
      "Are you sure you want to reset the timer? This will clear your current progress.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            const newState: CircuitTimerState = {
              currentTime: 0,
              isActive: false,
              isPaused: false,
              startTime: undefined,
              pausedAt: undefined,
              totalPausedTime: 0,
              currentInterval: undefined,
              isWorkPhase: undefined,
            };
            onTimerUpdate(newState);
            onTimerEvent?.("reset");
          },
        },
      ]
    );
  };

  const displayTime = getDisplayTime();
  const timerLabel = getTimerLabel();
  const isRunning = timerState.isActive && !timerState.isPaused;

  const progress = (() => {
    if (timerConfig.type === "intervals" && blockType === "tabata") {
      // Tabata: progress within current work/rest interval
      const intervalTime = timerState.isWorkPhase
        ? timerConfig.workInterval
        : timerConfig.restInterval;
      return ((intervalTime - displayTime) / intervalTime) * 100;
    } else if (timerConfig.type === "countDown" && blockType === "emom") {
      // EMOM: progress within current minute (60 seconds)
      return ((60 - displayTime) / 60) * 100;
    } else if (
      timerConfig.type === "countDown" &&
      blockType === "for_time" &&
      timeCapMinutes
    ) {
      // For Time: progress toward time cap while counting down
      const timeCapSeconds = timeCapMinutes * 60;
      return (
        ((timeCapSeconds - Math.max(0, displayTime)) / timeCapSeconds) * 100
      );
    } else if (
      timerConfig.type === "countUp" &&
      blockType === "amrap" &&
      timeCapMinutes
    ) {
      // AMRAP: progress toward time cap
      const timeCapSeconds = timeCapMinutes * 60;
      return (timerState.currentTime / timeCapSeconds) * 100;
    }
    return 0;
  })();

  return (
    <View className="items-center">
      {/* Timer Display */}
      <View className="items-center mb-6">
        <Text className="text-sm font-semibold text-text-muted mb-2">
          {timerLabel}
        </Text>

        <View className="relative items-center justify-center mb-2">
          {/* Progress Circle Background */}
          <View
            className="w-24 h-24 rounded-full border-3"
            style={{ borderColor: colors.neutral.light[2] }}
          />

          {/* Progress Circle Foreground */}
          <View
            className="absolute w-24 h-24 rounded-full"
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              borderWidth: 3,
              borderColor: "transparent",
              borderTopColor: isRunning
                ? colors.brand.primary
                : timerState.isActive
                  ? colors.brand.primary
                  : colors.neutral.medium[2],
              transform: [
                {
                  rotate: `${-90 + progress * 3.6}deg`,
                },
              ],
            }}
          />

          {/* Timer Text */}
          <View className="absolute items-center justify-center">
            <Text
              className="text-lg font-bold"
              style={{
                color: isRunning
                  ? colors.text.primary
                  : timerState.isActive
                    ? colors.text.primary
                    : colors.text.muted,
              }}
            >
              {formatTime(displayTime)}
            </Text>
            {timerState.isActive && (
              <Text
                className="text-xs mt-1"
                style={{ color: colors.text.muted }}
              >
                {timerState.isPaused ? "PAUSED" : "ACTIVE"}
              </Text>
            )}
          </View>
        </View>

        {/* Phase indicator for Tabata */}
        {blockType === "tabata" && timerState.isActive && (
          <Text
            className={`text-xs font-semibold ${
              timerState.isWorkPhase ? "text-red-600" : "text-blue-600"
            }`}
          >
            {timerState.isWorkPhase ? "WORK" : "REST"}
          </Text>
        )}

        {/* Interval indicator */}
        {timerState.currentInterval && (
          <Text className="text-xs text-text-muted mt-1">
            {blockType === "tabata"
              ? `Round ${timerState.currentInterval}/8`
              : blockType === "emom"
                ? `Minute ${timerState.currentInterval}${
                    rounds ? `/${rounds}` : ""
                  }`
                : `Interval ${timerState.currentInterval}`}
          </Text>
        )}
      </View>

      {/* Control Buttons */}
      {timerState.isActive ? (
        <View className="flex-row gap-2 w-full">
          <TouchableOpacity
            className="flex-1 rounded-xl py-2 px-3 flex-row items-center justify-center"
            onPress={handleStartPause}
            disabled={disabled}
          >
            <Ionicons
              name={timerState.isPaused ? "play" : "pause"}
              size={14}
              color={disabled ? colors.text.muted : colors.text.primary}
            />
            <Text
              className={`text-xs font-semibold ml-1 ${
                disabled ? "text-text-muted" : "text-text-primary"
              }`}
            >
              {timerState.isPaused ? "Resume" : "Pause"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 rounded-xl py-2 px-3 flex-row items-center justify-center"
            onPress={handleReset}
            disabled={disabled}
          >
            <Ionicons
              name="refresh"
              size={14}
              color={disabled ? colors.text.muted : colors.text.primary}
            />
            <Text
              className={`text-xs font-semibold ml-1 ${
                disabled ? "text-text-muted" : "text-text-primary"
              }`}
            >
              Reset
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          className="w-full flex-row items-center justify-center py-3 px-6 rounded-lg border"
          style={{
            borderColor: colors.brand.primary,
            backgroundColor: colors.brand.primary + "10",
          }}
          onPress={handleStartPause}
          disabled={disabled}
        >
          <Ionicons
            name="timer-outline"
            size={20}
            color={disabled ? colors.text.muted : colors.brand.primary}
          />
          <Text
            className={`text-sm font-semibold ml-2 ${
              disabled ? "text-text-muted" : ""
            }`}
            style={disabled ? {} : { color: colors.brand.primary }}
          >
            Start
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
