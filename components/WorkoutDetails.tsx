import React from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Text from "./Text";
import Card from "./Card";
import ExerciseLink from "./ExerciseLink";
import { colors } from "../lib/theme";

interface Exercise {
  id: number;
  name: string;
  description: string;
  muscleGroups: string[];
  equipment: string[];
  difficulty: string;
  imageUrl?: string;
  link?: string;
}

interface WorkoutExercise {
  id: number;
  workoutId: number;
  exerciseId: number;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;
  order?: number;
  completed: boolean;
  exercise: Exercise;
}

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

interface WorkoutDetailsProps {
  workout: Workout;
  exercises: WorkoutExercise[];
  onStartWorkout?: () => void;
  onClose?: () => void;
}

const WorkoutDetails: React.FC<WorkoutDetailsProps> = ({
  workout,
  exercises,
  onStartWorkout,
  onClose,
}) => {
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getIntensityText = (intensity: number): string => {
    if (intensity <= 3) return "Low";
    if (intensity <= 7) return "Moderate";
    return "High";
  };

  const totalSets = exercises.reduce((sum, ex) => sum + (ex.sets || 0), 0);
  const totalReps = exercises.reduce(
    (sum, ex) => sum + (ex.sets || 0) * (ex.reps || 0),
    0
  );

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-light-1">
        <TouchableOpacity onPress={onClose} className="p-1">
          <Ionicons name="close" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text variant="h3" center>
          {workout.name}
        </Text>
        <View className="w-7" />
      </View>

      <ScrollView className="flex-1 p-5">
        {workout.description && (
          <Text variant="body" color={colors.text.secondary} className="mb-5">
            {workout.description}
          </Text>
        )}

        <View className="flex-row mb-5">
          <View className="flex-1 bg-neutral-light-1 rounded-md p-4 mr-2">
            <Text variant="bodySmall" color={colors.text.muted}>
              Duration
            </Text>
            <Text variant="h4" color={colors.brand.primary}>
              {formatDuration(workout.duration)}
            </Text>
          </View>

          <View className="flex-1 bg-neutral-light-1 rounded-md p-4 mx-1">
            <Text variant="bodySmall" color={colors.text.muted}>
              Intensity
            </Text>
            <Text variant="h4" color={colors.brand.primary}>
              {typeof workout.intensity === "number"
                ? getIntensityText(workout.intensity)
                : workout.intensity.charAt(0).toUpperCase() +
                  workout.intensity.slice(1)}
            </Text>
          </View>

          <View className="flex-1 bg-neutral-light-1 rounded-md p-4 ml-2">
            <Text variant="bodySmall" color={colors.text.muted}>
              Exercises
            </Text>
            <Text variant="h4" color={colors.brand.primary}>
              {exercises.length}
            </Text>
          </View>
        </View>

        <View className="mb-6">
          <View className="flex-row items-center mb-2">
            <Ionicons
              name="layers-outline"
              size={20}
              color={colors.text.muted}
            />
            <Text variant="body" className="ml-2 text-text-secondary">
              {totalSets} total sets
            </Text>
          </View>

          <View className="flex-row items-center mb-2">
            <Ionicons
              name="repeat-outline"
              size={20}
              color={colors.text.muted}
            />
            <Text variant="body" className="ml-2 text-text-secondary">
              {totalReps} total reps
            </Text>
          </View>

          {workout.caloriesBurned && (
            <View className="flex-row items-center">
              <Ionicons
                name="flame-outline"
                size={20}
                color={colors.text.muted}
              />
              <Text variant="body" className="ml-2 text-text-secondary">
                {workout.caloriesBurned} calories
              </Text>
            </View>
          )}
        </View>

        <View>
          <Text variant="title" className="mb-4">
            Exercise List
          </Text>

          {exercises.map((exerciseItem, index) => (
            <Card key={exerciseItem.id} className="mb-3">
              <View className="flex-row items-center mb-3">
                <View className="w-6 h-6 bg-primary rounded-full items-center justify-center mr-3">
                  <Text variant="bodySmall" color={colors.neutral.white}>
                    {index + 1}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text variant="subtitle">{exerciseItem.exercise.name}</Text>
                  <Text variant="caption" color={colors.text.muted}>
                    {exerciseItem.exercise.muscleGroups.join(", ")}
                  </Text>
                </View>
              </View>

              <View className="flex-row flex-wrap">
                {exerciseItem.sets && exerciseItem.reps && (
                  <View className="bg-neutral-light-1 rounded-xs px-3 py-1 mr-2 mb-2">
                    <Text variant="bodySmall" weight="semibold">
                      {exerciseItem.sets} sets × {exerciseItem.reps} reps
                    </Text>
                  </View>
                )}

                {exerciseItem.weight && (
                  <View className="bg-neutral-light-1 rounded-xs px-3 py-1 mr-2 mb-2">
                    <Text variant="bodySmall">{exerciseItem.weight} lbs</Text>
                  </View>
                )}

                {exerciseItem.duration && (
                  <View className="bg-neutral-light-1 rounded-xs px-3 py-1 mr-2 mb-2">
                    <Text variant="bodySmall">{exerciseItem.duration} sec</Text>
                  </View>
                )}
              </View>

              {/* Exercise Link */}
              {exerciseItem.exercise.link && (
                <View className="px-3 py-2">
                  <ExerciseLink
                    link={exerciseItem.exercise.link}
                    exerciseName={exerciseItem.exercise.name}
                  />
                </View>
              )}
            </Card>
          ))}
        </View>
      </ScrollView>

      <View className="p-5 border-t border-neutral-light-1">
        <TouchableOpacity
          className="bg-primary py-4 px-6 rounded-md flex-row items-center justify-center"
          onPress={onStartWorkout}
        >
          <Ionicons name="play" size={20} color={colors.neutral.white} />
          <Text
            variant="body"
            color={colors.neutral.white}
            weight="semibold"
            className="ml-2"
          >
            Start Workout
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default WorkoutDetails;
