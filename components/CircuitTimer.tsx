import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { colors } from "@/lib/theme";
import { CircuitTimerProps, CircuitTimerState } from "@/types/api/circuit.types";
import { getCircuitTimerConfig } from "@/utils/circuitUtils";

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
  const timerConfig = getCircuitTimerConfig(blockType);

  // Calculate display time based on timer type
  const getDisplayTime = () => {
    const { currentTime, currentInterval, isWorkPhase } = timerState;
    
    if (timerConfig.type === 'intervals' && blockType === 'tabata') {
      // Tabata: show interval time
      const intervalTime = isWorkPhase ? timerConfig.workInterval : timerConfig.restInterval;
      const elapsedInInterval = currentTime % (timerConfig.workInterval + timerConfig.restInterval);
      
      if (isWorkPhase) {
        return Math.max(0, timerConfig.workInterval - elapsedInInterval);
      } else {
        return Math.max(0, timerConfig.restInterval - (elapsedInInterval - timerConfig.workInterval));
      }
    } else if (timerConfig.type === 'countDown' && blockType === 'emom') {
      // EMOM: show countdown within current minute
      const secondsInMinute = currentTime % 60;
      return Math.max(0, 60 - secondsInMinute);
    } else if (timerConfig.type === 'countUp' && timeCapMinutes) {
      // AMRAP with time cap: show remaining time
      const timeCapSeconds = timeCapMinutes * 60;
      return Math.max(0, timeCapSeconds - currentTime);
    } else {
      // Default: show elapsed time
      return currentTime;
    }
  };

  const getTimerLabel = () => {
    if (timerConfig.type === 'intervals' && blockType === 'tabata') {
      return timerState.isWorkPhase ? 'WORK' : 'REST';
    } else if (blockType === 'emom') {
      return 'Next Minute';
    } else if (blockType === 'amrap' && timeCapMinutes) {
      return 'Time Remaining';
    } else {
      return 'Time Elapsed';
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer logic
  useEffect(() => {
    if (timerState.isActive && !timerState.isPaused) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        let newCurrentTime = timerState.currentTime;
        
        if (timerState.startTime) {
          const elapsed = Math.floor((now - timerState.startTime.getTime()) / 1000);
          newCurrentTime = elapsed - timerState.totalPausedTime;
        } else {
          newCurrentTime = timerState.currentTime + 1;
        }

        const newState: CircuitTimerState = {
          ...timerState,
          currentTime: newCurrentTime,
        };

        // Handle specific timer behaviors
        if (blockType === 'tabata') {
          handleTabataLogic(newCurrentTime, newState);
        } else if (blockType === 'emom') {
          handleEmomLogic(newCurrentTime, newState);
        } else if (blockType === 'amrap' && timeCapMinutes) {
          handleAmrapLogic(newCurrentTime, newState);
        }

        onTimerUpdate(newState);
      }, 1000);
    } else {
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
  }, [timerState.isActive, timerState.isPaused, blockType, timeCapMinutes]);

  // Tabata interval logic
  const handleTabataLogic = (currentTime: number, newState: CircuitTimerState) => {
    const totalIntervalTime = timerConfig.workInterval + timerConfig.restInterval; // 30 seconds
    const elapsedInInterval = currentTime % totalIntervalTime;
    const currentInterval = Math.floor(currentTime / totalIntervalTime) + 1;
    const isWorkPhase = elapsedInInterval < timerConfig.workInterval;

    // Update interval state
    if (currentInterval !== timerState.currentInterval || isWorkPhase !== timerState.isWorkPhase) {
      newState.currentInterval = currentInterval;
      newState.isWorkPhase = isWorkPhase;

      // Provide feedback for transitions
      try {
        if (elapsedInInterval === 0) {
          // Starting work phase
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          Notifications.scheduleNotificationAsync({
            content: {
              title: "WORK!",
              body: `Round ${currentInterval} - 20 seconds`,
              sound: "tri-tone",
            },
            trigger: null,
          });
        } else if (elapsedInInterval === timerConfig.workInterval) {
          // Starting rest phase
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Notifications.scheduleNotificationAsync({
            content: {
              title: "REST",
              body: "10 seconds recovery",
              sound: "submarine",
            },
            trigger: null,
          });
        }
      } catch (error) {
        console.log("Notification/haptic feedback error:", error);
      }
    }

    // Check if Tabata is complete (8 rounds)
    if (currentInterval > 8) {
      newState.isActive = false;
      onTimerEvent?.('complete');
      
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
  const handleEmomLogic = (currentTime: number, newState: CircuitTimerState) => {
    const currentMinute = Math.floor(currentTime / 60) + 1;
    const secondsInMinute = currentTime % 60;

    if (currentMinute !== timerState.currentInterval) {
      newState.currentInterval = currentMinute;
      
      // New minute notification
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Notifications.scheduleNotificationAsync({
          content: {
            title: `Minute ${currentMinute}`,
            body: "Start your reps!",
            sound: "tri-tone",
          },
          trigger: null,
        });
      } catch (error) {
        console.log("Notification/haptic feedback error:", error);
      }
    }

    // Check if EMOM is complete
    if (rounds && currentMinute > rounds) {
      newState.isActive = false;
      onTimerEvent?.('complete');
      
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.log("Haptic feedback error:", error);
      }
    }
  };

  // AMRAP with time cap logic
  const handleAmrapLogic = (currentTime: number, newState: CircuitTimerState) => {
    const timeCapSeconds = (timeCapMinutes || 0) * 60;
    const remainingTime = timeCapSeconds - currentTime;

    // Warning at 1 minute remaining
    if (remainingTime === 60 && currentTime > 0) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Notifications.scheduleNotificationAsync({
          content: {
            title: "1 Minute Remaining!",
            body: "Keep pushing!",
            sound: "submarine",
          },
          trigger: null,
        });
      } catch (error) {
        console.log("Notification error:", error);
      }
    }

    // Time cap reached
    if (remainingTime <= 0) {
      newState.isActive = false;
      newState.currentTime = timeCapSeconds;
      onTimerEvent?.('complete');
      
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
      
      // Initialize for Tabata
      if (blockType === 'tabata') {
        newState.currentInterval = 1;
        newState.isWorkPhase = true;
      }
      
      onTimerUpdate(newState);
      onTimerEvent?.('start');
    } else {
      // Toggle pause/resume
      const isPausing = !timerState.isPaused;
      const newState: CircuitTimerState = {
        ...timerState,
        isPaused: isPausing,
      };

      if (isPausing) {
        newState.pausedAt = new Date();
        onTimerEvent?.('pause');
      } else {
        if (timerState.pausedAt) {
          const pauseDuration = Math.floor((Date.now() - timerState.pausedAt.getTime()) / 1000);
          newState.totalPausedTime = timerState.totalPausedTime + pauseDuration;
        }
        newState.pausedAt = undefined;
        onTimerEvent?.('resume');
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
            onTimerEvent?.('reset');
          },
        },
      ]
    );
  };

  const displayTime = getDisplayTime();
  const timerLabel = getTimerLabel();
  const isRunning = timerState.isActive && !timerState.isPaused;

  return (
    <View className="items-center">
      {/* Timer Display */}
      <View className="items-center mb-6">
        <Text className="text-sm font-semibold text-text-muted mb-2">
          {timerLabel}
        </Text>
        
        <View
          className={`w-32 h-32 rounded-full items-center justify-center border-4 ${
            isRunning
              ? 'border-brand-primary bg-brand-light-1'
              : timerState.isActive
              ? 'border-orange-400 bg-orange-50'
              : 'border-neutral-medium-1 bg-background'
          }`}
        >
          <Text
            className={`text-2xl font-bold ${
              isRunning
                ? 'text-brand-primary'
                : timerState.isActive
                ? 'text-orange-600'
                : 'text-text-primary'
            }`}
          >
            {formatTime(displayTime)}
          </Text>
          
          {/* Phase indicator for Tabata */}
          {blockType === 'tabata' && timerState.isActive && (
            <Text
              className={`text-xs font-semibold mt-1 ${
                timerState.isWorkPhase ? 'text-red-600' : 'text-blue-600'
              }`}
            >
              {timerState.isWorkPhase ? 'WORK' : 'REST'}
            </Text>
          )}
          
          {/* Interval indicator */}
          {timerState.currentInterval && (
            <Text className="text-xs text-text-muted mt-1">
              {blockType === 'tabata' 
                ? `Round ${timerState.currentInterval}/8`
                : blockType === 'emom'
                ? `Minute ${timerState.currentInterval}${rounds ? `/${rounds}` : ''}`
                : `Interval ${timerState.currentInterval}`
              }
            </Text>
          )}
        </View>
      </View>

      {/* Control Buttons */}
      <View className="flex-row gap-4">
        <TouchableOpacity
          className={`flex-row items-center py-3 px-6 rounded-xl ${
            disabled
              ? 'bg-neutral-light-2'
              : isRunning
              ? 'bg-orange-500'
              : 'bg-brand-primary'
          }`}
          onPress={handleStartPause}
          disabled={disabled}
        >
          <Ionicons
            name={
              !timerState.isActive
                ? 'play'
                : timerState.isPaused
                ? 'play'
                : 'pause'
            }
            size={20}
            color={disabled ? colors.text.muted : 'white'}
          />
          <Text
            className={`text-sm font-semibold ml-2 ${
              disabled ? 'text-text-muted' : 'text-white'
            }`}
          >
            {!timerState.isActive
              ? 'Start'
              : timerState.isPaused
              ? 'Resume'
              : 'Pause'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-row items-center py-3 px-6 rounded-xl border ${
            disabled
              ? 'border-neutral-medium-1 bg-neutral-light-1'
              : 'border-neutral-medium-2 bg-background'
          }`}
          onPress={handleReset}
          disabled={disabled}
        >
          <Ionicons
            name="refresh"
            size={20}
            color={disabled ? colors.text.muted : colors.text.secondary}
          />
          <Text
            className={`text-sm font-semibold ml-2 ${
              disabled ? 'text-text-muted' : 'text-text-secondary'
            }`}
          >
            Reset
          </Text>
        </TouchableOpacity>
      </View>

      {/* Additional Info */}
      {timerState.isActive && (
        <View className="mt-4 items-center">
          <Text className="text-xs text-text-muted">
            Total Elapsed: {formatTime(timerState.currentTime)}
          </Text>
          {timerState.totalPausedTime > 0 && (
            <Text className="text-xs text-text-muted">
              Paused Time: {formatTime(timerState.totalPausedTime)}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}