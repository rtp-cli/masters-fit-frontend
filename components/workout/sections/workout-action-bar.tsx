import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/theme";

interface WorkoutActionBarProps {
  isWorkoutStarted: boolean;
  isPaused: boolean;
  isWarmupCooldown: boolean;
  isCircuit: boolean;
  onStartWorkout: () => void;
  onTogglePause: () => void;
  onShowSkipModal: () => void;
  onShowCompleteModal: () => void;
}

export function WorkoutActionBar({
  isWorkoutStarted,
  isPaused,
  isWarmupCooldown,
  isCircuit,
  onStartWorkout,
  onTogglePause,
  onShowSkipModal,
  onShowCompleteModal,
}: WorkoutActionBarProps) {
  const colors = useThemeColors();

  const getCompleteButtonText = () => {
    if (isCircuit) return "Complete Circuit";
    if (isWarmupCooldown) return "Complete";
    return "Complete";
  };

  return (
    <View className="bg-card p-6">
      {!isWorkoutStarted ? (
        <TouchableOpacity
          className="bg-primary rounded-2xl py-4 flex-row items-center justify-center"
          onPress={onStartWorkout}
        >
          <Ionicons name="play" size={20} color={colors.contentOnPrimary} />
          <Text className="text-content-on-primary font-bold text-lg ml-2">
            Start Workout
          </Text>
        </TouchableOpacity>
      ) : (
        <View className="flex-row gap-2">
          {/* Skip button - only show for warmup/cooldown */}
          {isWarmupCooldown && (
            <TouchableOpacity
              className="bg-primary rounded-2xl py-4 flex-1 flex-row items-center justify-center"
              onPress={onShowSkipModal}
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
            onPress={onTogglePause}
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
            onPress={onShowCompleteModal}
          >
            <Ionicons
              name="checkmark"
              size={20}
              color={colors.contentOnPrimary}
            />
            <Text className="text-content-on-primary font-semibold ml-2">
              {getCompleteButtonText()}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}


