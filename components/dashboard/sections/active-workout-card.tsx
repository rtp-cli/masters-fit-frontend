import React from "react";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../lib/theme";
import NoActiveWorkoutCard from "@/components/no-active-workout-card";
import { formatNumber, formatWorkoutDuration } from "../../../utils";
import {
  TodayWorkout,
  PlanDayWithExercises,
  WorkoutBlockWithExercises,
} from "@/types/api";

type ActiveWorkoutCardProps = {
  workoutInfo: { name: string; description: string } | null;
  todaysWorkout: TodayWorkout | null;
  totalDurationMinutes: number;
  loadingToday: boolean;
  isWorkoutCompleted: boolean;
  todayCompletionRate: number;
  isGenerating: boolean;
  onViewWorkout: () => void;
  onRepeatWorkout: () => void;
  onGenerateWorkout: () => void;
};

const ActiveWorkoutCard: React.FC<ActiveWorkoutCardProps> = ({
  workoutInfo,
  todaysWorkout,
  totalDurationMinutes,
  loadingToday,
  isWorkoutCompleted,
  todayCompletionRate,
  isGenerating,
  onViewWorkout,
  onRepeatWorkout,
  onGenerateWorkout,
}) => {
  const getPlannedExercisesCount = (workout: TodayWorkout | null): number => {
    if (!workout) return 0;
    if ("blocks" in workout && workout.blocks) {
      return workout.blocks.reduce(
        (total: number, block: WorkoutBlockWithExercises) =>
          total + (block.exercises?.length || 0),
        0
      );
    }
    if ("exercises" in workout && (workout as PlanDayWithExercises).exercises) {
      return (workout as PlanDayWithExercises).exercises.length;
    }
    return 0;
  };

  return (
    <View className="px-4 mb-6">
      <View className="bg-white rounded-2xl p-5">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-base font-semibold text-text-primary mb-1">
            Active Workout
          </Text>
          {todaysWorkout && totalDurationMinutes > 0 ? (
            <Text className="text-base font-semibold text-text-primary">
              {formatWorkoutDuration(totalDurationMinutes)}
            </Text>
          ) : (
            <Text className="text-base font-semibold text-text-muted">
              Rest Day
            </Text>
          )}
          {loadingToday && (
            <ActivityIndicator size="small" color={colors.brand.primary} />
          )}
        </View>

        {workoutInfo || todaysWorkout ? (
          <View>
            <View className="flex-row items-center mb-6">
              <View className="w-16 h-16 rounded-full items-center justify-center mr-4 bg-primary">
                <Ionicons
                  name={todaysWorkout ? "heart-outline" : "bed-outline"}
                  size={24}
                  color={colors.neutral.light[1]}
                />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-text-primary mb-1">
                  {workoutInfo?.name || "Workout Session"}
                </Text>
                <Text className="text-sm text-text-muted leading-5">
                  {todaysWorkout
                    ? workoutInfo?.description ||
                      `${getPlannedExercisesCount(
                        todaysWorkout
                      )} exercises planned`
                    : "Rest day - Recovery is just as important as training"}
                </Text>
              </View>
            </View>

            {!todaysWorkout ? (
              <View className="bg-neutral-light-2/50 border border-neutral-light-2 rounded-xl p-4 flex-row items-center">
                <Ionicons name="bed" size={24} color={colors.text.muted} />
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-semibold text-text-muted">
                    Rest Day
                  </Text>
                  <Text className="text-xs text-text-muted">
                    Take time to recover and recharge
                  </Text>
                </View>
              </View>
            ) : isWorkoutCompleted ? (
              <View className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex-row items-center">
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={colors.brand.dark[1]}
                />
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-semibold text-accent">
                    Workout Completed!
                  </Text>
                  <Text className="text-xs text-accent/70">
                    Great job! {formatNumber(todayCompletionRate)}% completed
                  </Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                className="bg-secondary rounded-xl p-4 items-center"
                onPress={onViewWorkout}
              >
                <Text className="text-white font-semibold text-sm">
                  View Workout
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <NoActiveWorkoutCard
            isGenerating={isGenerating}
            onRepeatWorkout={onRepeatWorkout}
            onGenerateWorkout={onGenerateWorkout}
            variant="dashboard"
          />
        )}
      </View>
    </View>
  );
};

export default ActiveWorkoutCard;
