import React from "react";
import { View, Text, TouchableOpacity, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";

interface WorkoutChoiceModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerateNew: () => void;
  onRepeatPast: () => void;
}

export default function WorkoutChoiceModal({
  visible,
  onClose,
  onGenerateNew,
  onRepeatPast,
}: WorkoutChoiceModalProps) {
  const colors = useThemeColors();
  const { isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className={`flex-1 justify-center items-center ${isDark ? "dark" : ""}`}
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onPress={onClose}
      >
        <Pressable
          className="bg-surface rounded-2xl mx-6 w-[85%] overflow-hidden"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <View className="px-6 pt-6 pb-4 items-center">
            <View
              className="w-12 h-12 rounded-full items-center justify-center mb-3"
              style={{ backgroundColor: colors.brand.primary + "15" }}
            >
              <Ionicons
                name="fitness-outline"
                size={22}
                color={colors.brand.primary}
              />
            </View>
            <Text className="text-lg font-semibold text-text-primary mb-1">
              Create a New Workout
            </Text>
            <Text className="text-sm text-text-muted text-center">
              Generate a fresh workout or repeat one you've done before
            </Text>
          </View>

          <View className="px-5 pb-5 space-y-3">
            <TouchableOpacity
              className="bg-primary rounded-xl py-4 px-4 flex-row items-center"
              onPress={() => {
                onClose();
                onGenerateNew();
              }}
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
              >
                <Ionicons
                  name="sparkles"
                  size={20}
                  color={colors.contentOnPrimary}
                />
              </View>
              <View className="flex-1">
                <Text className="text-content-on-primary font-semibold text-base">
                  Generate New
                </Text>
                <Text className="text-content-on-primary/70 text-xs mt-0.5">
                  AI creates a workout based on your preferences
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.contentOnPrimary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-secondary rounded-xl py-4 px-4 mt-2 flex-row items-center"
              onPress={() => {
                onClose();
                onRepeatPast();
              }}
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
              >
                <Ionicons
                  name="repeat"
                  size={20}
                  color={colors.background}
                />
              </View>
              <View className="flex-1">
                <Text className="text-background font-semibold text-base">
                  Repeat a Past Workout
                </Text>
                <Text className="text-background/70 text-xs mt-0.5">
                  Pick from one of your completed workouts
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.background}
              />
            </TouchableOpacity>

            <TouchableOpacity
              className="py-3 items-center mt-1"
              onPress={onClose}
            >
              <Text className="text-text-muted font-medium text-sm">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
