import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from './Text';
import Card from './Card';
import { formatDuration, getIntensityText } from '@/utils';

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
      style={[
        styles.container,
        selected && styles.selectedContainer,
      ]}
    >
      <Card variant={selected ? 'outlined' : 'default'}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text variant="title">{workout.name}</Text>
            {workout.completed && (
              <View style={styles.completedBadge}>
                <Text variant="caption" color="success">Completed</Text>
              </View>
            )}
          </View>
          
          <View style={styles.details}>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={16} color="text-light" />
              <Text variant="bodySmall" style={styles.detailText}>
                {formatDuration(workout.duration)}
              </Text>
            </View>
            
            {workout.type && (
              <View style={styles.detailItem}>
                <Ionicons name="barbell-outline" size={16} color="text-light" />
                <Text variant="bodySmall" style={styles.detailText}>
                  {workout.type.charAt(0).toUpperCase() + workout.type.slice(1)}
                </Text>
              </View>
            )}
            
            <View style={styles.detailItem}>
              <Ionicons name="flame-outline" size={16} color="text-light" />
              <Text variant="bodySmall" style={styles.detailText}>
                {typeof workout.intensity === 'number' 
                  ? getIntensityText(workout.intensity) 
                  : workout.intensity.charAt(0).toUpperCase() + workout.intensity.slice(1)}
              </Text>
            </View>
            
            {workout.caloriesBurned && (
              <View style={styles.detailItem}>
                <Ionicons name="flash-outline" size={16} color="text-light" />
                <Text variant="bodySmall" style={styles.detailText}>
                  {workout.caloriesBurned} kcal
                </Text>
              </View>
            )}
          </View>
          
          {workout.description && (
            <Text 
              variant="bodySmall" 
              color="neutral-dark-2" 
              style={styles.description}
            >
              {workout.description}
            </Text>
          )}
          
          {showActions && (
            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={handleStartWorkout}
              >
                <Text variant="bodySmall" color="white" weight="semibold">
                  Start Workout
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={handleEditWorkout}
              >
                <Text variant="bodySmall" color="indigo" weight="semibold">
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

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  selectedContainer: {
    shadowColor: 'indigo',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  completedBadge: {
    backgroundColor: 'green-50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  detailText: {
    marginLeft: 4,
    color: 'text-light',
  },
  description: {
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: 'indigo',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
    marginRight: 8,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: 'indigo',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    flex: 0.5,
  },
});

export default WorkoutCard;