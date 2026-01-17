import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/theme";

interface WorkoutErrorStateProps {
  error: string;
  onRetry: () => void;
}

export function WorkoutErrorState({ error, onRetry }: WorkoutErrorStateProps) {
  const colors = useThemeColors();

  return (
    <View className="flex-1 bg-background justify-center items-center px-6">
      <Ionicons
        name="alert-circle-outline"
        size={64}
        color={colors.text.secondary}
      />
      <Text className="text-lg font-bold text-text-primary text-center mt-4 mb-2">
        Error Loading Workout
      </Text>
      <Text className="text-text-muted text-center mb-6 leading-6">
        {error}
      </Text>
      <TouchableOpacity
        className="bg-primary rounded-xl py-3 px-6"
        onPress={onRetry}
      >
        <Text className="text-content-on-primary font-semibold">Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}


