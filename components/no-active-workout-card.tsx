import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/theme";

interface NoActiveWorkoutCardProps {
  isGenerating: boolean;
  onRepeatWorkout: () => void;
  onGenerateWorkout: () => void;
  onGenerateSingleDay?: () => void;
  title?: string;
  subtitle?: string;
  variant?: "dashboard" | "workout" | "calendar";
  showActionsOnlyForToday?: boolean;
  isToday?: boolean;
}

export default function NoActiveWorkoutCard({
  isGenerating,
  onRepeatWorkout,
  onGenerateWorkout,
  onGenerateSingleDay,
  title = "No Active Workout",
  subtitle = "You don't have a workout scheduled for this week.",
  variant = "dashboard",
  showActionsOnlyForToday = false,
  isToday = true,
}: NoActiveWorkoutCardProps) {
  const colors = useThemeColors();
  const [showGenerateChoice, setShowGenerateChoice] = useState(false);
  // Variant-specific styling and icons
  const getVariantStyles = () => {
    switch (variant) {
      case "workout":
        return {
          icon: "fitness-outline" as const,
          iconColor: colors.text.muted,
          title: "No Workout Plan",
          subtitle: "You don't have an active workout plan for this week.",
        };
      case "calendar":
        return {
          icon: "fitness-outline" as const,
          iconColor: colors.text.muted,
          title: "No Active Workout",
          subtitle: "You don't have a workout scheduled for this week.",
        };
      default: // dashboard
        return {
          icon: "fitness-outline" as const,
          iconColor: colors.text.muted,
          title: "No Active Workout",
          subtitle: "You don't have a workout scheduled for this week.",
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <View className="items-center py-6">
      <View className="w-16 h-16 bg-surface-elevated rounded-full items-center justify-center mb-4">
        <Ionicons
          name={variantStyles.icon}
          size={24}
          color={variantStyles.iconColor}
        />
      </View>
      <Text className="text-base font-semibold text-text-primary mb-2">
        {title || variantStyles.title}
      </Text>
      <Text className="text-sm text-text-muted text-center mb-6 leading-5">
        {isGenerating
          ? "Generating a new workout plan..."
          : (subtitle || variantStyles.subtitle)
        }
      </Text>

      {/* Show action buttons when appropriate conditions are met */}
      {(!showActionsOnlyForToday || isToday) && (
        <View className="w-full space-y-3">
          <TouchableOpacity
            className={`rounded-xl py-3 px-6 mb-2 flex-row items-center justify-center ${
              isGenerating
                ? "bg-primary/50 opacity-50"
                : "bg-primary"
            }`}
            onPress={isGenerating ? undefined : onRepeatWorkout}
            disabled={isGenerating}
          >
            <Ionicons
              name="repeat"
              size={18}
              color={isGenerating ? colors.contentOnPrimary + "70" : colors.contentOnPrimary}
            />
            <Text className={`font-semibold text-sm ml-2 ${
              isGenerating ? "text-content-on-primary/70" : "text-content-on-primary"
            }`}>
              Repeat a Previous Workout Plan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`rounded-xl py-3 px-6 flex-row items-center justify-center ${
              isGenerating
                ? "bg-secondary/50 opacity-50"
                : "bg-secondary"
            }`}
            onPress={isGenerating ? undefined : () => setShowGenerateChoice(true)}
            disabled={isGenerating}
          >
            <Ionicons
              name="sparkles"
              size={18}
              color={isGenerating ? colors.background + "80" : colors.background}
            />
            <Text className={`font-semibold text-sm ml-2 ${
              isGenerating ? "text-background/50" : "text-background"
            }`}>
              {isGenerating
                ? "Generating a New Workout Plan"
                : "Generate a New Workout Plan"
              }
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={showGenerateChoice}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGenerateChoice(false)}
      >
        <Pressable
          className="flex-1 justify-center items-center"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onPress={() => setShowGenerateChoice(false)}
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
                <Ionicons name="sparkles" size={22} color={colors.brand.primary} />
              </View>
              <Text className="text-lg font-semibold text-text-primary mb-1">
                Generate Workout
              </Text>
              <Text className="text-sm text-text-muted text-center">
                Choose how you'd like to generate your workout plan
              </Text>
            </View>

            <View className="px-5 pb-5 space-y-3">
              <TouchableOpacity
                className="bg-primary rounded-xl py-4 px-4 flex-row items-center"
                onPress={() => {
                  setShowGenerateChoice(false);
                  onGenerateSingleDay?.();
                }}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                >
                  <Ionicons name="today-outline" size={20} color={colors.contentOnPrimary} />
                </View>
                <View className="flex-1">
                  <Text className="text-content-on-primary font-semibold text-base">
                    Single Day
                  </Text>
                  <Text className="text-content-on-primary/70 text-xs mt-0.5">
                    Generate a workout for today only
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.contentOnPrimary} />
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-secondary rounded-xl py-4 px-4 mt-2 flex-row items-center"
                onPress={() => {
                  setShowGenerateChoice(false);
                  onGenerateWorkout();
                }}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
                >
                  <Ionicons name="calendar-outline" size={20} color={colors.background} />
                </View>
                <View className="flex-1">
                  <Text className="text-background font-semibold text-base">
                    Full Week
                  </Text>
                  <Text className="text-background/70 text-xs mt-0.5">
                    Generate a complete weekly plan
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.background} />
              </TouchableOpacity>

              <TouchableOpacity
                className="py-3 items-center mt-1"
                onPress={() => setShowGenerateChoice(false)}
              >
                <Text className="text-text-muted font-medium text-sm">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}