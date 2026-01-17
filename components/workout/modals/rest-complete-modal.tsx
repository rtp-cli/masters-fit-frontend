import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { useTheme } from "@/lib/theme-context";
import { ExerciseSet } from "@/components/set-tracker";

interface RestCompleteModalProps {
  visible: boolean;
  restTime?: number;
  currentSetsCount: number;
  targetSets: number;
  isCircuit: boolean;
  onClose: () => void;
  onContinue: () => void;
  onComplete: () => void;
}

export function RestCompleteModal({
  visible,
  restTime,
  currentSetsCount,
  targetSets,
  isCircuit,
  onClose,
  onContinue,
  onComplete,
}: RestCompleteModalProps) {
  const { isDark } = useTheme();
  const showContinueButton = currentSetsCount < targetSets;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        className={`flex-1 bg-black/50 justify-center items-center px-6 ${
          isDark ? "dark" : ""
        }`}
      >
        <View className="bg-surface rounded-2xl p-6 w-full max-w-sm shadow-xl">
          <Text className="text-xl font-bold text-text-primary mb-4 text-center">
            Rest Complete!
          </Text>
          <Text className="text-base text-text-secondary text-center mb-6 leading-6">
            Your {restTime}s rest is finished. What would you like to do next?
          </Text>

          {/* Show current progress */}
          <View className="bg-neutral-light-1 rounded-xl p-3 mb-6">
            <Text className="text-sm font-semibold text-text-primary mb-2 text-center">
              Current Progress
            </Text>
            <View className="flex-row justify-center items-center space-x-4">
              <View className="items-center">
                <Text className="text-lg font-bold text-text-primary">
                  {currentSetsCount}
                </Text>
                <Text className="text-xs text-text-muted">
                  of {targetSets} sets
                </Text>
              </View>
            </View>
          </View>

          <View className="space-y-3">
            {/* Continue button - only show if more sets are needed */}
            {showContinueButton && (
              <TouchableOpacity
                className="bg-primary rounded-xl py-3 mb-3 px-6"
                onPress={onContinue}
              >
                <Text className="text-content-on-primary font-semibold text-center">
                  Continue Exercise
                </Text>
              </TouchableOpacity>
            )}

            {/* Complete exercise button */}
            <TouchableOpacity
              className="bg-neutral-light-2 rounded-xl py-3 px-6"
              onPress={onComplete}
            >
              <Text className="text-text-primary font-semibold text-center">
                {isCircuit ? "Complete Circuit" : "Complete Exercise"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}


