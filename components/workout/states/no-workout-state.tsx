import React from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/theme";
import NoActiveWorkoutCard from "@/components/no-active-workout-card";
import WorkoutRepeatModal from "@/components/workout-repeat-modal";

interface NoWorkoutStateProps {
  hasActiveWorkoutPlan: boolean;
  isGenerating: boolean;
  refreshing: boolean;
  showRepeatModal: boolean;
  onRefresh: () => void;
  onRepeatWorkout: () => void;
  onGenerateWorkout: () => void;
  onCloseRepeatModal: () => void;
  onRepeatWorkoutSuccess: () => void;
}

export function NoWorkoutState({
  hasActiveWorkoutPlan,
  isGenerating,
  refreshing,
  showRepeatModal,
  onRefresh,
  onRepeatWorkout,
  onGenerateWorkout,
  onCloseRepeatModal,
  onRepeatWorkoutSuccess,
}: NoWorkoutStateProps) {
  const colors = useThemeColors();

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
          />
        }
        contentContainerStyle={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <View className="items-center">
          {hasActiveWorkoutPlan ? (
            // Rest day - we have an active workout plan but no workout today
            <>
              <Ionicons
                name="bed-outline"
                size={64}
                color={colors.brand.primary}
              />
              <Text className="text-lg font-bold text-text-primary text-center mt-4 mb-2">
                Rest Day
              </Text>
              <Text className="text-text-muted text-center mb-8 leading-6">
                No workout scheduled for today. Take time to rest and recover!
              </Text>
            </>
          ) : (
            // No active workout plan at all
            <NoActiveWorkoutCard
              isGenerating={isGenerating}
              onRepeatWorkout={onRepeatWorkout}
              onGenerateWorkout={onGenerateWorkout}
              variant="workout"
            />
          )}
        </View>
      </ScrollView>

      {/* Workout Repeat Modal */}
      <WorkoutRepeatModal
        visible={showRepeatModal}
        onClose={onCloseRepeatModal}
        onSuccess={onRepeatWorkoutSuccess}
      />
    </View>
  );
}


