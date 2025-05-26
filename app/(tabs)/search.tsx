import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  
  // Sample exercises data - would be fetched from API in a real app
  const exercises = [
    {
      id: 1,
      name: 'Push-ups',
      description: 'A classic bodyweight exercise for building upper body strength.',
      muscleGroups: ['Chest', 'Shoulders', 'Triceps'],
      equipment: ['None'],
      difficulty: 'Beginner',
      imageUrl: 'https://example.com/pushup.jpg'
    },
    {
      id: 2,
      name: 'Squats',
      description: 'A fundamental lower body exercise for building leg strength.',
      muscleGroups: ['Quadriceps', 'Hamstrings', 'Glutes'],
      equipment: ['None'],
      difficulty: 'Beginner',
      imageUrl: 'https://example.com/squat.jpg'
    },
    {
      id: 3,
      name: 'Bench Press',
      description: 'A compound exercise for developing upper body strength.',
      muscleGroups: ['Chest', 'Shoulders', 'Triceps'],
      equipment: ['Barbell', 'Bench'],
      difficulty: 'Intermediate',
      imageUrl: 'https://example.com/benchpress.jpg'
    },
    {
      id: 4,
      name: 'Deadlift',
      description: 'A powerful compound exercise for total body strength.',
      muscleGroups: ['Lower Back', 'Hamstrings', 'Glutes', 'Traps'],
      equipment: ['Barbell'],
      difficulty: 'Advanced',
      imageUrl: 'https://example.com/deadlift.jpg'
    },
    {
      id: 5,
      name: 'Pull-ups',
      description: 'A challenging upper body exercise for back and arm strength.',
      muscleGroups: ['Back', 'Biceps', 'Forearms'],
      equipment: ['Pull-up Bar'],
      difficulty: 'Intermediate',
      imageUrl: 'https://example.com/pullup.jpg'
    },
  ];

  // Filter categories
  const filters = ['All', 'Beginner', 'Intermediate', 'Advanced', 'No Equipment'];

  // Sample workouts
  const workouts = [
    {
      id: 1,
      name: 'Full Body Strength',
      exercises: 8,
      duration: 45,
      intensity: 'Medium'
    },
    {
      id: 2,
      name: 'Upper Body Blast',
      exercises: 6,
      duration: 30,
      intensity: 'High'
    },
    {
      id: 3,
      name: 'Core Crusher',
      exercises: 5,
      duration: 20,
      intensity: 'Medium'
    },
  ];

  // Filter exercises based on search and category filter
  const filteredExercises = exercises.filter((exercise) => {
    // Filter by search query
    const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          exercise.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          exercise.muscleGroups.some(muscle => muscle.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filter by category
    let matchesFilter = true;
    if (activeFilter === 'Beginner' || activeFilter === 'Intermediate' || activeFilter === 'Advanced') {
      matchesFilter = exercise.difficulty === activeFilter;
    } else if (activeFilter === 'No Equipment') {
      matchesFilter = exercise.equipment.includes('None') || exercise.equipment.length === 0;
    }
    
    return matchesSearch && matchesFilter;
  });

  // Handle exercise selection
  const handleExerciseSelect = (exercise: any) => {
    setSelectedExercise(exercise === selectedExercise ? null : exercise);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises, muscle groups..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9ca3af"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                activeFilter === filter && styles.activeFilterButton,
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter && styles.activeFilterText,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.resultsContainer}>
          <Text style={styles.sectionTitle}>Exercises</Text>
          {filteredExercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="fitness" size={40} color="#d1d5db" />
              <Text style={styles.emptyStateText}>No exercises found</Text>
              <Text style={styles.emptyStateSubtext}>Try adjusting your search or filters</Text>
            </View>
          ) : (
            <>
              {filteredExercises.map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  style={[
                    styles.exerciseCard,
                    selectedExercise?.id === exercise.id && styles.selectedExerciseCard,
                  ]}
                  onPress={() => handleExerciseSelect(exercise)}
                >
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseDetails}>
                      {exercise.muscleGroups.join(', ')} • {exercise.difficulty}
                    </Text>
                    {selectedExercise?.id === exercise.id && (
                      <View style={styles.exerciseDescription}>
                        <Text style={styles.descriptionText}>{exercise.description}</Text>
                        <View style={styles.exerciseTags}>
                          {exercise.equipment.map((item, index) => (
                            <View key={index} style={styles.equipmentTag}>
                              <Text style={styles.equipmentTagText}>{item}</Text>
                            </View>
                          ))}
                        </View>
                        <TouchableOpacity style={styles.addToWorkoutButton}>
                          <Text style={styles.addToWorkoutText}>Add to Workout</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>

        <View style={styles.workoutsSection}>
          <Text style={styles.sectionTitle}>Suggested Workouts</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.workoutsContainer}
          >
            {workouts.map((workout) => (
              <TouchableOpacity key={workout.id} style={styles.workoutCard}>
                <Text style={styles.workoutName}>{workout.name}</Text>
                <View style={styles.workoutDetails}>
                  <View style={styles.workoutDetail}>
                    <Ionicons name="barbell-outline" size={16} color="#6b7280" />
                    <Text style={styles.workoutDetailText}>{workout.exercises} exercises</Text>
                  </View>
                  <View style={styles.workoutDetail}>
                    <Ionicons name="time-outline" size={16} color="#6b7280" />
                    <Text style={styles.workoutDetailText}>{workout.duration} min</Text>
                  </View>
                  <View style={styles.workoutDetail}>
                    <Ionicons name="flame-outline" size={16} color="#6b7280" />
                    <Text style={styles.workoutDetailText}>{workout.intensity}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.viewWorkoutButton}>
                  <Text style={styles.viewWorkoutText}>View Workout</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    padding: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 4,
  },
  filtersContainer: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    marginRight: 10,
  },
  activeFilterButton: {
    backgroundColor: '#4f46e5',
  },
  filterText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#ffffff',
  },
  resultsContainer: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: 40,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  exerciseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedExerciseCard: {
    borderColor: '#4f46e5',
    borderWidth: 1,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  exerciseDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  exerciseDescription: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  descriptionText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  exerciseTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  equipmentTag: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  equipmentTagText: {
    fontSize: 12,
    color: '#4b5563',
  },
  addToWorkoutButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
  },
  addToWorkoutText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  workoutsSection: {
    padding: 15,
    paddingTop: 5,
  },
  workoutsContainer: {
    paddingRight: 15,
  },
  workoutCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    width: 250,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  workoutDetails: {
    marginTop: 8,
    marginBottom: 12,
  },
  workoutDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  workoutDetailText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
  },
  viewWorkoutButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4f46e5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  viewWorkoutText: {
    color: '#4f46e5',
    fontWeight: '600',
  },
});