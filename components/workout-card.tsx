import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { TouchableOpacity, View } from "react-native";

import { useThemeColors } from "../lib/theme";
import { formatDuration, getIntensityText } from "../utils";
import Card from "./card";
import Text from "./text";

interface Workout {
  id: number;
  name: string;
  description?: string;
  type?: string;
  duration: number;
  intensity: string;
  date: string;
  completed: boolean;
  caloriesBurned?: number;
}

interface WorkoutCardProps {
  workout: Workout;
  onPress?: (workout: Workout) => void;
  selected?: boolean;
  showActions?: boolean;
  onStartWorkout?: (workout: Workout) => void;
  onEditWorkout?: (workout: Workout) => void;
}

const WorkoutCard: React.FC<WorkoutCardProps> = ({
  workout,
  onPress,
  selected = false,
  showActions = false,
  onStartWorkout,
  onEditWorkout,
}) => {
  const colors = useThemeColors();
  const handlePress = () => {
    if (onPress) {
      onPress(workout);
    }
  };

  const handleStartWorkout = () => {
    if (onStartWorkout) {
      onStartWorkout(workout);
    }
  };

  const handleEditWorkout = () => {
    if (onEditWorkout) {
      onEditWorkout(workout);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      className={`mb-3 ${selected ? "shadow-card-hover" : ""}`}
    >
      <Card variant={selected ? "outlined" : "default"}>
        <View className="p-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text variant="title">{workout.name}</Text>
            {workout.completed && (
              <View className="px-2 py-1 rounded-xl bg-primary">
                <Text variant="caption" color={colors.brand.primary}>
                  Completed
                </Text>
              </View>
            )}
          </View>

          <View className="flex-row flex-wrap mb-3">
            <View className="flex-row items-center mr-4 mb-1">
              <Ionicons
                name="time-outline"
                size={16}
                color={colors.text.muted}
              />
              <Text variant="bodySmall" className="ml-1 text-text-muted">
                {formatDuration(workout.duration)}
              </Text>
            </View>

            {workout.type && (
              <View className="flex-row items-center mr-4 mb-1">
                <Ionicons
                  name="barbell-outline"
                  size={16}
                  color={colors.text.muted}
                />
                <Text variant="bodySmall" className="ml-1 text-text-muted">
                  {workout.type.charAt(0).toUpperCase() + workout.type.slice(1)}
                </Text>
              </View>
            )}

            <View className="flex-row items-center mr-4 mb-1">
              <Ionicons
                name="flame-outline"
                size={16}
                color={colors.text.muted}
              />
              <Text variant="bodySmall" className="ml-1 text-text-muted">
                {typeof workout.intensity === "number"
                  ? getIntensityText(workout.intensity)
                  : workout.intensity.charAt(0).toUpperCase() +
                    workout.intensity.slice(1)}
              </Text>
            </View>

            {workout.caloriesBurned && (
              <View className="flex-row items-center mr-4 mb-1">
                <Ionicons
                  name="flash-outline"
                  size={16}
                  color={colors.text.muted}
                />
                <Text variant="bodySmall" className="ml-1 text-text-muted">
                  {workout.caloriesBurned} kcal
                </Text>
              </View>
            )}
          </View>

          {workout.description && (
            <Text
              variant="bodySmall"
              color={colors.text.secondary}
              className="mb-3"
            >
              {workout.description}
            </Text>
          )}

          {showActions && (
            <View className="flex-row mt-1">
              <TouchableOpacity
                className="flex-1 py-2 px-4 rounded-md items-center mr-2 bg-primary"
                onPress={handleStartWorkout}
              >
                <Text
                  variant="bodySmall"
                  color={colors.background}
                  weight="semibold"
                >
                  Start Workout
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="py-2 px-4 rounded-md items-center border border-primary flex-1/2"
                onPress={handleEditWorkout}
              >
                <Text
                  variant="bodySmall"
                  color={colors.brand.primary}
                  weight="semibold"
                >
                  Edit
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
};

export default WorkoutCard;
