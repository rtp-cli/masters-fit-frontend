import React from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Text from "./Text";
import Card from "./Card";
import ExerciseLink from "./ExerciseLink";
import { formatDuration, getIntensityText } from "@/utils";

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
  // Calculate total sets and total reps
  const totalSets = exercises.reduce((sum, ex) => sum + (ex.sets || 0), 0);
  const totalReps = exercises.reduce(
    (sum, ex) => sum + (ex.sets || 0) * (ex.reps || 0),
    0
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="neutral-dark-5" />
        </TouchableOpacity>
        <Text variant="h3" center>
          {workout.name}
        </Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView style={styles.content}>
        {workout.description && (
          <Text variant="body" color="neutral-dark-2" style={styles.description}>
            {workout.description}
          </Text>
        )}

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text variant="bodySmall" color="text-light">
              Duration
            </Text>
            <Text variant="h4" color="indigo">
              {formatDuration(workout.duration)}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text variant="bodySmall" color="text-light">
              Intensity
            </Text>
            <Text variant="h4" color="indigo">
              {typeof workout.intensity === "number"
                ? getIntensityText(workout.intensity)
                : workout.intensity.charAt(0).toUpperCase() +
                  workout.intensity.slice(1)}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text variant="bodySmall" color="text-light">
              Exercises
            </Text>
            <Text variant="h4" color="indigo">
              {exercises.length}
            </Text>
          </View>
        </View>

        <View style={styles.additionalStats}>
          <View style={styles.additionalStat}>
            <Ionicons name="layers-outline" size={20} color="text-light" />
            <Text variant="body" style={styles.additionalStatText}>
              {totalSets} total sets
            </Text>
          </View>

          <View style={styles.additionalStat}>
            <Ionicons name="repeat-outline" size={20} color="text-light" />
            <Text variant="body" style={styles.additionalStatText}>
              {totalReps} total reps
            </Text>
          </View>

          {workout.caloriesBurned && (
            <View style={styles.additionalStat}>
              <Ionicons name="flame-outline" size={20} color="text-light" />
              <Text variant="body" style={styles.additionalStatText}>
                {workout.caloriesBurned} calories
              </Text>
            </View>
          )}
        </View>

        <View style={styles.exercisesContainer}>
          <Text variant="title" style={styles.sectionTitle}>
            Exercise List
          </Text>

          {exercises.map((exerciseItem, index) => (
            <Card key={exerciseItem.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseNumberContainer}>
                  <Text variant="bodySmall" color="white">
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text variant="subtitle">{exerciseItem.exercise.name}</Text>
                  <Text variant="caption" color="text-light">
                    {exerciseItem.exercise.muscleGroups.join(", ")}
                  </Text>
                </View>
              </View>

              <View style={styles.exerciseDetails}>
                {exerciseItem.sets && exerciseItem.reps && (
                  <View style={styles.exerciseDetail}>
                    <Text variant="bodySmall" weight="semibold">
                      {exerciseItem.sets} sets × {exerciseItem.reps} reps
                    </Text>
                  </View>
                )}

                {exerciseItem.weight && (
                  <View style={styles.exerciseDetail}>
                    <Text variant="bodySmall">{exerciseItem.weight} lbs</Text>
                  </View>
                )}

                {exerciseItem.duration && (
                  <View style={styles.exerciseDetail}>
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

      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.startButton} onPress={onStartWorkout}>
          <Ionicons name="play" size={20} color="white" />
          <Text
            variant="body"
            color="white"
            weight="semibold"
            style={styles.startButtonText}
          >
            Start Workout
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "neutral-light-4",
  },
  closeButton: {
    padding: 4,
  },
  spacer: {
    width: 28,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  description: {
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: "neutral-light-3",
    borderRadius: 12,
    padding: 16,
    width: "31%",
    alignItems: "center",
  },
  additionalStats: {
    backgroundColor: "neutral-light-3",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  additionalStat: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  additionalStatText: {
    marginLeft: 8,
    color: "neutral-dark-2",
  },
  exercisesContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  exerciseCard: {
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  exerciseNumberContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "indigo",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseDetails: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "neutral-light-4",
    padding: 12,
  },
  exerciseDetail: {
    marginRight: 16,
  },
  actionBar: {
    borderTopWidth: 1,
    borderTopColor: "neutral-light-4",
    padding: 16,
  },
  startButton: {
    backgroundColor: "indigo",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
  },
  startButtonText: {
    marginLeft: 8,
  },
});

export default WorkoutDetails;
