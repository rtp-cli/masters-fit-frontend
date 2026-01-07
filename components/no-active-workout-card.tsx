import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/theme";

interface NoActiveWorkoutCardProps {
  isGenerating: boolean;
  onRepeatWorkout: () => void;
  onGenerateWorkout: () => void;
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
  title = "No Active Workout",
  subtitle = "You don't have a workout scheduled for this week.",
  variant = "dashboard",
  showActionsOnlyForToday = false,
  isToday = true,
}: NoActiveWorkoutCardProps) {
  const colors = useThemeColors();
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
      <View className="w-16 h-16 bg-neutral-light-2 rounded-full items-center justify-center mb-4">
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
              color={isGenerating ? colors.text.secondary : colors.text.secondary}
            />
            <Text className={`font-semibold text-sm ml-2 ${
              isGenerating ? "text-secondary/70" : "text-secondary"
            }`}>
              Repeat a Previous Workout Plan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`rounded-xl py-3 px-6 flex-row items-center justify-center ${
              isGenerating
                ? "bg-neutral-light-2/50 opacity-50"
                : "bg-neutral-light-2"
            }`}
            onPress={isGenerating ? undefined : onGenerateWorkout}
            disabled={isGenerating}
          >
            <Ionicons
              name="sparkles"
              size={18}
              color={isGenerating ? colors.text.muted : colors.text.primary}
            />
            <Text className={`font-semibold text-sm ml-2 ${
              isGenerating ? "text-text-muted" : "text-text-primary"
            }`}>
              {isGenerating
                ? "Generating a New Workout Plan"
                : "Generate a New Workout Plan"
              }
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}