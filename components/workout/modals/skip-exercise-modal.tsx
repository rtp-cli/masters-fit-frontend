import React from "react";
import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from "react-native";
import { useThemeColors } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";

interface SkipExerciseModalProps {
  visible: boolean;
  exerciseName?: string;
  isSkipping: boolean;
  onClose: () => void;
  onSkip: () => void;
}

export function SkipExerciseModal({
  visible,
  exerciseName,
  isSkipping,
  onClose,
  onSkip,
}: SkipExerciseModalProps) {
  const colors = useThemeColors();
  const { isDark } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        className={`flex-1 bg-black/50 justify-center items-center px-6 ${
          isDark ? "dark" : ""
        }`}
      >
        <View className="bg-surface rounded-2xl p-6 w-full max-w-sm shadow-xl">
          <Text className="text-xl font-bold text-text-primary mb-4 text-center">
            Skip Exercise
          </Text>
          <Text className="text-base text-text-secondary text-center mb-6 leading-6">
            Skip "{exerciseName}"? This exercise will be marked as incomplete.
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
                isSkipping ? "opacity-75" : ""
              }`}
              onPress={onSkip}
              disabled={isSkipping}
            >
              {isSkipping ? (
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
  );
}


