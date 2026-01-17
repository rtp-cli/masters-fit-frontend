import React from "react";
import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from "react-native";
import { useThemeColors } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";

interface CompleteExerciseModalProps {
  visible: boolean;
  isCircuit: boolean;
  isWarmupCooldown: boolean;
  blockType?: string;
  blockName?: string;
  exerciseName?: string;
  isLastExercise: boolean;
  isCompleting: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function CompleteExerciseModal({
  visible,
  isCircuit,
  isWarmupCooldown,
  blockType,
  blockName,
  exerciseName,
  isLastExercise,
  isCompleting,
  onClose,
  onComplete,
}: CompleteExerciseModalProps) {
  const colors = useThemeColors();
  const { isDark } = useTheme();

  const getTitle = () => {
    if (isCircuit) return "Complete Circuit";
    if (isWarmupCooldown) {
      return `Complete ${blockType === "warmup" ? "Warmup" : "Cooldown"}`;
    }
    return "Complete Exercise";
  };

  const getDescription = () => {
    if (isCircuit) {
      return `Complete "${blockName || "Circuit Block"}"? All rounds and exercises will be logged.`;
    }
    if (isWarmupCooldown) {
      return `Mark "${exerciseName}" as complete and move to the next ${
        isLastExercise ? "phase" : "exercise"
      }?`;
    }
    return `Mark "${exerciseName}" as complete? Your progress will be saved.`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        className={`flex-1 bg-black/50 justify-center items-center px-6 ${
          isDark ? "dark" : ""
        }`}
      >
        <View className="bg-surface rounded-2xl p-6 w-full max-w-sm shadow-xl">
          <Text className="text-xl font-bold text-text-primary mb-4 text-center">
            {getTitle()}
          </Text>
          <Text className="text-base text-text-secondary text-center mb-6 leading-6">
            {getDescription()}
          </Text>

          <View className="flex-row gap-3">
            <TouchableOpacity
              className="bg-neutral-light-2 rounded-xl py-3 px-6 flex-1"
              onPress={onClose}
            >
              <Text className="text-text-primary font-semibold text-center">
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`bg-primary rounded-xl py-3 px-6 flex-1 ${
                isCompleting ? "opacity-75" : ""
              }`}
              onPress={onComplete}
              disabled={isCompleting}
            >
              {isCompleting ? (
                <View className="flex-row items-center justify-center">
                  <ActivityIndicator
                    size="small"
                    color={colors.contentOnPrimary}
                  />
                  <Text className="text-content-on-primary font-semibold ml-2">
                    Saving...
                  </Text>
                </View>
              ) : (
                <Text className="text-content-on-primary font-semibold text-center">
                  Complete
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}


