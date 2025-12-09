import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../lib/theme";

type DashboardEmptyStateSectionProps = {
  showLoading: boolean;
  showNoData: boolean;
  onStartWorkout: () => void;
};

const DashboardEmptyStateSection: React.FC<DashboardEmptyStateSectionProps> = ({ showLoading, showNoData, onStartWorkout }) => {
  if (showLoading) {
    return (
      <View className="px-4 mb-6">
        <View className="bg-white rounded-2xl p-6 items-center">
          <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center mb-4">
            <Ionicons name="analytics-outline" size={32} color={colors.brand.primary} />
          </View>
          <Text className="text-lg font-semibold text-text-primary mb-2 text-center">Loading Your Progress...</Text>
          <Text className="text-sm text-text-muted text-center mb-4 leading-5">Please wait while we load your fitness data.</Text>
        </View>
      </View>
    );
  }

  if (showNoData) {
    return (
      <View className="px-4 mb-6">
        <View className="bg-white rounded-2xl p-6 items-center">
          <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center mb-4">
            <Ionicons name="analytics-outline" size={32} color={colors.brand.primary} />
          </View>
          <Text className="text-lg font-semibold text-text-primary mb-2 text-center">Start Your Fitness Journey</Text>
          <Text className="text-sm text-text-muted text-center mb-4 leading-5">
            Complete your first workout to see personalized analytics and track your progress over time.
          </Text>
          <TouchableOpacity className="bg-primary rounded-lg px-6 py-3" onPress={onStartWorkout}>
            <Text className="text-text-primary font-semibold text-sm">Start Workout</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
};

export default DashboardEmptyStateSection;