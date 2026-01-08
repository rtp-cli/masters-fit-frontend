import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/theme";

interface CircularTimerDisplayProps {
  countdown: number;
  targetDuration: number;
  isActive: boolean;
  isPaused?: boolean;
  isCompleted: boolean;
  startButtonText: string;
  onStartPause: () => void;
  onReset: () => void;
  onCancel?: () => void;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default function CircularTimerDisplay({
  countdown,
  targetDuration,
  isActive,
  isPaused = false,
  isCompleted,
  startButtonText,
  onStartPause,
  onReset,
  onCancel,
}: CircularTimerDisplayProps) {
  const colors = useThemeColors();
  // TIMER DISPLAY HIDDEN: CircularTimerDisplay component hidden
  return null;

  const progress = targetDuration > 0 ? ((targetDuration - countdown) / targetDuration) * 100 : 0;

  return (
    <View className="items-center mb-3">
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
            borderColor: 'transparent',
            borderTopColor: isCompleted
              ? colors.brand.primary 
              : isActive 
                ? colors.brand.primary 
                : colors.neutral.medium[2],
            transform: [{ 
              rotate: `${-90 + (progress * 3.6)}deg`
            }],
          }}
        />
        
        {/* Timer Text */}
        <View className="absolute items-center justify-center">
          <Text 
            className="text-lg font-bold"
            style={{ color: isCompleted
              ? colors.brand.primary 
              : isActive 
                ? colors.text.primary 
                : colors.text.muted
            }}
          >
            {formatTime(countdown)}
          </Text>
          {isActive && (
            <Text className="text-xs mt-1" style={{ color: colors.text.muted }}>
              {isPaused ? 'PAUSED' : isCompleted ? 'COMPLETE' : 'ACTIVE'}
            </Text>
          )}
        </View>
      </View>

      {/* Control Buttons */}
      {isActive ? (
        <View className="flex-row gap-2 w-full">
          <TouchableOpacity
            className="flex-1 rounded-xl py-2 px-3 flex-row items-center justify-center"
            onPress={onStartPause}
          >
            <Ionicons
              name={isCompleted ? 'checkmark' : isPaused ? 'play' : 'pause'}
              size={14}
              color={colors.text.primary}
            />
            <Text className="text-text-primary text-xs font-semibold ml-1">
              {isCompleted ? 'Done' : isPaused ? 'Resume' : 'Pause'}
            </Text>
          </TouchableOpacity>

          {!isCompleted && (
            <TouchableOpacity
              className="flex-1 rounded-xl py-2 px-3 flex-row items-center justify-center"
              onPress={onReset}
            >
              <Ionicons
                name="refresh"
                size={14}
                color={colors.text.primary}
              />
              <Text className="text-text-primary text-xs font-semibold ml-1">
                Reset
              </Text>
            </TouchableOpacity>
          )}

          {onCancel && !isCompleted && (
            <TouchableOpacity
              className="flex-1 rounded-xl py-2 px-3 flex-row items-center justify-center"
              onPress={onCancel}
            >
              <Ionicons
                name="close"
                size={14}
                color="#ef4444"
              />
              <Text className="text-red-500 text-xs font-semibold ml-1">
                Cancel
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <TouchableOpacity
          className="w-full flex-row items-center justify-center py-3 px-6 rounded-lg border"
          style={{
            borderColor: colors.brand.primary,
            backgroundColor: colors.brand.primary + "10",
          }}
          onPress={onStartPause}
        >
          <Ionicons
            name="timer-outline"
            size={20}
            color={colors.brand.primary}
          />
          <Text 
            className="text-sm font-semibold ml-2"
            style={{ color: colors.brand.primary }}
          >
            {startButtonText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}