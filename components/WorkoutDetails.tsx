import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from './Text';
import Card from './Card';
import { formatDuration, getIntensityText } from '@/utils';

interface Exercise {
  id: number;
  name: string;
  description: string;
  muscleGroups: string[];
  equipment: string[];
  difficulty: string;
  imageUrl?: string;
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
  const totalReps = exercises.reduce((sum, ex) => sum + (ex.sets || 0) * (ex.reps || 0), 0);
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#111827" />
        </TouchableOpacity>
        <Text variant="h3" center>{workout.name}</Text>
        <View style={styles.spacer} />
      </View>
      
      <ScrollView style={styles.content}>
        {workout.description && (
          <Text variant="body" color="#4b5563" style={styles.description}>
            {workout.description}
          </Text>
        )}
        
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text variant="bodySmall" color="#6b7280">Duration</Text>
            <Text variant="h4" color="#4f46e5">{formatDuration(workout.duration)}</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text variant="bodySmall" color="#6b7280">Intensity</Text>
            <Text variant="h4" color="#4f46e5">
              {typeof workout.intensity === 'number' 
                ? getIntensityText(workout.intensity) 
                : workout.intensity.charAt(0).toUpperCase() + workout.intensity.slice(1)}
            </Text>
          </View>
          
          <View style={styles.statCard}>
            <Text variant="bodySmall" color="#6b7280">Exercises</Text>
            <Text variant="h4" color="#4f46e5">{exercises.length}</Text>
          </View>
        </View>
        
        <View style={styles.additionalStats}>
          <View style={styles.additionalStat}>
            <Ionicons name="layers-outline" size={20} color="#6b7280" />
            <Text variant="body" style={styles.additionalStatText}>
              {totalSets} total sets
            </Text>
          </View>
          
          <View style={styles.additionalStat}>
            <Ionicons name="repeat-outline" size={20} color="#6b7280" />
            <Text variant="body" style={styles.additionalStatText}>
              {totalReps} total reps
            </Text>
          </View>
          
          {workout.caloriesBurned && (
            <View style={styles.additionalStat}>
              <Ionicons name="flame-outline" size={20} color="#6b7280" />
              <Text variant="body" style={styles.additionalStatText}>
                {workout.caloriesBurned} calories
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.exercisesContainer}>
          <Text variant="title" style={styles.sectionTitle}>Exercise List</Text>
          
          {exercises.map((exerciseItem, index) => (
            <Card key={exerciseItem.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseNumberContainer}>
                  <Text variant="bodySmall" color="#ffffff">{index + 1}</Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text variant="subtitle">{exerciseItem.exercise.name}</Text>
                  <Text variant="caption" color="#6b7280">
                    {exerciseItem.exercise.muscleGroups.join(', ')}
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
                    <Text variant="bodySmall">
                      {exerciseItem.weight} kg
                    </Text>
                  </View>
                )}
                
                {exerciseItem.duration && (
                  <View style={styles.exerciseDetail}>
                    <Text variant="bodySmall">
                      {exerciseItem.duration} sec
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
      
      <View style={styles.actionBar}>
        <TouchableOpacity 
          style={styles.startButton} 
          onPress={onStartWorkout}
        >
          <Ionicons name="play" size={20} color="#ffffff" />
          <Text variant="body" color="#ffffff" weight="semibold" style={styles.startButtonText}>
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
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    width: '31%',
    alignItems: 'center',
  },
  additionalStats: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  additionalStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  additionalStatText: {
    marginLeft: 8,
    color: '#4b5563',
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  exerciseNumberContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseDetails: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    padding: 12,
  },
  exerciseDetail: {
    marginRight: 16,
  },
  actionBar: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    padding: 16,
  },
  startButton: {
    backgroundColor: '#4f46e5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  startButtonText: {
    marginLeft: 8,
  },
});

export default WorkoutDetails;