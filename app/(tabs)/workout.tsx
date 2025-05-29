import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useWorkoutSession } from "@hooks/useWorkoutSession";
import { getCompletedExercises } from "@lib/workouts";

export default function WorkoutScreen() {
  const {
    activeWorkout,
    currentExerciseIndex,
    exerciseTimer,
    workoutTimer,
    isWorkoutActive,
    exerciseData,
    isLoading,
    startWorkout,
    completeExercise,
    endWorkout,
    updateExerciseData,
    moveToNextExercise,
    resetSession,
    currentExercise,
    currentData,
    completedCount,
    totalExercises,
    progressPercentage,
    formatTime,
  } = useWorkoutSession();

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showEndWorkoutModal, setShowEndWorkoutModal] = useState(false);
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [exerciseNotes, setExerciseNotes] = useState("");
  const [isWorkoutCompleted, setIsWorkoutCompleted] = useState(false);

  useEffect(() => {
    // Check if workout is completed based on actual data, not just local state
    const checkWorkoutCompletion = async () => {
      if (activeWorkout && totalExercises > 0) {
        try {
          const completedData = await getCompletedExercises(
            activeWorkout.workoutId
          );
          const completedCount = completedData.count || 0;

          if (completedCount === totalExercises) {
            setIsWorkoutCompleted(true);
          } else {
            setIsWorkoutCompleted(false);
          }
        } catch (error) {
          console.error("Error checking workout completion:", error);
          // Fallback to local state
          setIsWorkoutCompleted(completedCount === totalExercises);
        }
      } else {
        setIsWorkoutCompleted(false);
      }
    };

    checkWorkoutCompletion();
  }, [activeWorkout, completedCount, totalExercises]);

  const handleCompleteExercise = async () => {
    const success = await completeExercise(exerciseNotes);
    if (success) {
      setShowCompleteModal(false);
      setExerciseNotes("");

      // Check if this was the last exercise
      const nextExerciseIndex = currentExerciseIndex + 1;
      if (nextExerciseIndex >= totalExercises) {
        // All exercises completed - end workout automatically
        const workoutSuccess = await endWorkout(workoutNotes);
        if (workoutSuccess) {
          Alert.alert("Workout Complete", "Your workout has been saved!");
          setIsWorkoutCompleted(true);
        } else {
          Alert.alert("Error", "Failed to save workout completion");
        }
      } else {
        // Move to next exercise
        moveToNextExercise();
      }
    } else {
      Alert.alert("Error", "Failed to save exercise completion");
    }
  };

  const handleEndWorkout = async () => {
    // Only end the workout, don't complete current exercise again
    const success = await endWorkout(workoutNotes);
    if (success) {
      setShowEndWorkoutModal(false);
      Alert.alert("Workout Ended", "Your workout progress has been saved!");
      resetSession();
      setWorkoutNotes("");
      setExerciseNotes("");
    } else {
      Alert.alert("Error", "Failed to save workout");
    }
  };

  const renderSetTracker = () => {
    if (!currentData) return null;

    const sets = [];
    for (let i = 0; i < currentData.targetSets; i++) {
      const isCompleted = i < currentData.setsCompleted;
      sets.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.setIndicator,
            isCompleted && styles.setIndicatorCompleted,
          ]}
          onPress={() => updateExerciseData("setsCompleted", i + 1)}
        >
          <Text
            style={[
              styles.setIndicatorText,
              isCompleted && styles.setIndicatorTextCompleted,
            ]}
          >
            {i + 1}
          </Text>
        </TouchableOpacity>
      );
    }
    return sets;
  };

  const renderRepTracker = () => {
    if (!currentData) return null;

    const reps = [];
    for (let i = 0; i < currentData.targetReps; i++) {
      const isCompleted = i < currentData.repsCompleted;
      reps.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.repIndicator,
            isCompleted && styles.repIndicatorCompleted,
          ]}
          onPress={() => updateExerciseData("repsCompleted", i + 1)}
        >
          <View
            style={[styles.repDot, isCompleted && styles.repDotCompleted]}
          />
        </TouchableOpacity>
      );
    }
    return reps;
  };

  const renderExerciseTimeline = () => {
    if (!activeWorkout) return null;

    return (
      <View style={styles.timelineContainer}>
        <Text style={styles.timelineTitle}>Exercise Progress</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.timelineScroll}
        >
          {activeWorkout.exercises.map((exercise, index) => {
            const isCompleted = exerciseData[index]?.isCompleted;
            const isCurrent = index === currentExerciseIndex;
            const isPast = index < currentExerciseIndex;

            return (
              <View key={exercise.id} style={styles.timelineItem}>
                <View
                  style={[
                    styles.timelineCircle,
                    isCompleted && styles.timelineCircleCompleted,
                    isCurrent && styles.timelineCircleCurrent,
                    isPast && !isCompleted && styles.timelineCirclePast,
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                  ) : (
                    <Text
                      style={[
                        styles.timelineCircleText,
                        isCurrent && styles.timelineCircleTextCurrent,
                      ]}
                    >
                      {index + 1}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.timelineExerciseName,
                    isCurrent && styles.timelineExerciseNameCurrent,
                  ]}
                  numberOfLines={2}
                >
                  {exercise.exercise.name}
                </Text>
                {index < activeWorkout.exercises.length - 1 && (
                  <View
                    style={[
                      styles.timelineLine,
                      (isCompleted || isPast) && styles.timelineLineCompleted,
                    ]}
                  />
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Loading workout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!activeWorkout) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noWorkoutContainer}>
          <Ionicons name="fitness" size={64} color="#6b7280" />
          <Text style={styles.noWorkoutTitle}>No Active Workout</Text>
          <Text style={styles.noWorkoutText}>
            You don't have an active workout plan. Visit the Calendar tab to
            start a new workout.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{activeWorkout.name}</Text>
          <TouchableOpacity style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Exercise Timeline */}
        {renderExerciseTimeline()}

        {/* Workout Completed State */}
        {isWorkoutCompleted && (
          <View style={styles.completedContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#10b981" />
            <Text style={styles.completedTitle}>Workout Complete!</Text>
            <Text style={styles.completedText}>
              Great job! You've completed all exercises in today's workout.
            </Text>
          </View>
        )}

        {/* Exercise Image */}
        {!isWorkoutCompleted && (
          <View style={styles.exerciseImageContainer}>
            <Image
              source={{
                uri: "https://via.placeholder.com/400x200/4f46e5/ffffff?text=Exercise+Demo",
              }}
              style={styles.exerciseImage}
            />
            <View style={styles.exerciseOverlay}>
              <Text style={styles.exerciseName}>
                {currentExercise?.exercise.name}
              </Text>
              <Text style={styles.exerciseDescription}>
                {currentExercise?.exercise.description ||
                  "Focus on proper form and controlled movement"}
              </Text>
            </View>
          </View>
        )}

        {/* Progress Indicator */}
        {!isWorkoutCompleted && (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>
                {completedCount}/{totalExercises} Exercises
              </Text>
              <Text style={styles.progressSubtext}>
                {Math.floor(workoutTimer / 60)} min elapsed
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercentage}%` },
                ]}
              />
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="flame" size={16} color="#ef4444" />
                <Text style={styles.statText}>87 kcal</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="heart" size={16} color="#ef4444" />
                <Text style={styles.statText}>125 bpm</Text>
              </View>
            </View>
          </View>
        )}

        {/* Exercise Details */}
        {!isWorkoutCompleted && (
          <View style={styles.exerciseDetails}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseTitle}>
                {currentExercise?.exercise.name}
              </Text>
              <View style={styles.exerciseSpecs}>
                <Text style={styles.specText}>
                  {currentData?.targetSets} sets × {currentData?.targetReps}{" "}
                  reps
                </Text>
                <Text style={styles.restText}>30 sec rest</Text>
              </View>
            </View>

            <Text style={styles.exerciseInstructions}>
              {currentExercise?.exercise.instructions ||
                "Keep your knees aligned with your toes. Lower until thighs are parallel to the floor. Engage your core throughout the movement."}
            </Text>

            <View style={styles.equipmentInfo}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color="#6b7280"
              />
              <Text style={styles.equipmentText}>
                {currentExercise?.exercise.equipment || "No equipment needed"}
              </Text>
            </View>
          </View>
        )}

        {/* Exercise Tracking - Only show when workout is active */}
        {isWorkoutActive && !isWorkoutCompleted && (
          <View style={styles.trackingContainer}>
            {/* Sets Tracking */}
            <View style={styles.trackingSection}>
              <Text style={styles.trackingSectionTitle}>
                Sets ({currentData?.setsCompleted || 0}/
                {currentData?.targetSets || 0})
              </Text>
              <View style={styles.setTrackerContainer}>
                {renderSetTracker()}
              </View>
            </View>

            {/* Reps Tracking */}
            <View style={styles.trackingSection}>
              <Text style={styles.trackingSectionTitle}>
                Reps ({currentData?.repsCompleted || 0}/
                {currentData?.targetReps || 0})
              </Text>
              <View style={styles.repTrackerContainer}>
                {renderRepTracker()}
              </View>
            </View>

            {/* Weight Input */}
            <View style={styles.trackingSection}>
              <Text style={styles.trackingSectionTitle}>Weight (lbs)</Text>
              <TextInput
                style={styles.weightInputLarge}
                value={currentData?.weightUsed?.toString() || "0"}
                onChangeText={(text) =>
                  updateExerciseData("weightUsed", parseFloat(text) || 0)
                }
                keyboardType="numeric"
                placeholder="Enter weight"
              />
            </View>

            {/* Notes */}
            <View style={styles.trackingSection}>
              <Text style={styles.trackingSectionTitle}>Notes</Text>
              <TextInput
                style={styles.notesInputLarge}
                value={exerciseNotes}
                onChangeText={setExerciseNotes}
                placeholder="Add notes about this exercise..."
                multiline
              />
            </View>

            {/* Timer */}
            <View style={styles.timerContainer}>
              <Text style={styles.timerLabel}>Exercise Time</Text>
              <Text style={styles.timerValue}>{formatTime(exerciseTimer)}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {!isWorkoutActive && !isWorkoutCompleted ? (
          <TouchableOpacity
            style={styles.startButton}
            onPress={async () => await startWorkout()}
          >
            <Ionicons name="play" size={24} color="#ffffff" />
            <Text style={styles.startButtonText}>Start Workout</Text>
          </TouchableOpacity>
        ) : isWorkoutActive && !isWorkoutCompleted ? (
          <View style={styles.activeControls}>
            <TouchableOpacity
              style={styles.completeExerciseButton}
              onPress={() => setShowCompleteModal(true)}
            >
              <Text style={styles.completeExerciseText}>Complete Exercise</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.endWorkoutButton}
              onPress={() => setShowEndWorkoutModal(true)}
            >
              <Text style={styles.endWorkoutText}>End Workout</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* Complete Exercise Modal */}
      <Modal visible={showCompleteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Complete Exercise</Text>
            <Text style={styles.modalText}>
              Mark this exercise as complete? Your progress will be saved.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowCompleteModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleCompleteExercise}
              >
                <Text style={styles.modalConfirmText}>Complete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* End Workout Modal */}
      <Modal visible={showEndWorkoutModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>End Workout</Text>
            <Text style={styles.modalText}>
              Add any notes about your workout:
            </Text>
            <TextInput
              style={styles.modalNotesInput}
              value={workoutNotes}
              onChangeText={setWorkoutNotes}
              placeholder="How did the workout feel? Any observations..."
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowEndWorkoutModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleEndWorkout}
              >
                <Text style={styles.modalConfirmText}>End Workout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 12,
  },
  noWorkoutContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  noWorkoutTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  noWorkoutText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  // Timeline Styles
  timelineContainer: {
    backgroundColor: "#ffffff",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  timelineScroll: {
    flexDirection: "row",
  },
  timelineItem: {
    alignItems: "center",
    marginRight: 20,
    position: "relative",
  },
  timelineCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  timelineCircleCompleted: {
    backgroundColor: "#10b981",
  },
  timelineCircleCurrent: {
    backgroundColor: "#4f46e5",
  },
  timelineCirclePast: {
    backgroundColor: "#f3f4f6",
    borderWidth: 2,
    borderColor: "#d1d5db",
  },
  timelineCircleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  timelineCircleTextCurrent: {
    color: "#ffffff",
  },
  timelineExerciseName: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    maxWidth: 80,
  },
  timelineExerciseNameCurrent: {
    color: "#4f46e5",
    fontWeight: "600",
  },
  timelineLine: {
    position: "absolute",
    top: 16,
    left: 32,
    width: 20,
    height: 2,
    backgroundColor: "#e5e7eb",
  },
  timelineLineCompleted: {
    backgroundColor: "#10b981",
  },
  // Completed State
  completedContainer: {
    backgroundColor: "#ffffff",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#10b981",
    marginTop: 16,
    marginBottom: 8,
  },
  completedText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
  },
  exerciseImageContainer: {
    position: "relative",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  exerciseImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#e5e7eb",
  },
  exerciseOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 16,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  exerciseDescription: {
    fontSize: 14,
    color: "#e5e7eb",
    lineHeight: 20,
  },
  progressContainer: {
    backgroundColor: "#ffffff",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  progressSubtext: {
    fontSize: 14,
    color: "#6b7280",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    marginBottom: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4f46e5",
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    fontSize: 14,
    color: "#6b7280",
    marginLeft: 4,
  },
  exerciseDetails: {
    backgroundColor: "#ffffff",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  exerciseHeader: {
    marginBottom: 12,
  },
  exerciseTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  exerciseSpecs: {
    flexDirection: "row",
    alignItems: "center",
  },
  specText: {
    fontSize: 14,
    color: "#4f46e5",
    fontWeight: "600",
  },
  restText: {
    fontSize: 14,
    color: "#6b7280",
    marginLeft: 12,
  },
  exerciseInstructions: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  equipmentInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  equipmentText: {
    fontSize: 14,
    color: "#6b7280",
    marginLeft: 4,
  },
  // New Tracking Styles
  trackingContainer: {
    backgroundColor: "#ffffff",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  trackingSection: {
    marginBottom: 20,
  },
  trackingSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  setTrackerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  setIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  setIndicatorCompleted: {
    backgroundColor: "#4f46e5",
    borderColor: "#4f46e5",
  },
  setIndicatorText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
  },
  setIndicatorTextCompleted: {
    color: "#ffffff",
  },
  repTrackerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  repIndicator: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  repIndicatorCompleted: {
    backgroundColor: "#10b981",
  },
  repDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#e5e7eb",
  },
  repDotCompleted: {
    backgroundColor: "#10b981",
  },
  weightInputLarge: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  notesInputLarge: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  timerContainer: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
  },
  timerLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  timerValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#4f46e5",
  },
  bottomControls: {
    padding: 20,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  startButton: {
    backgroundColor: "#4f46e5",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  startButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  activeControls: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  completeExerciseButton: {
    backgroundColor: "#4f46e5",
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginRight: 8,
    alignItems: "center",
  },
  completeExerciseText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  endWorkoutButton: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginLeft: 8,
    alignItems: "center",
  },
  endWorkoutText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
    lineHeight: 20,
  },
  modalNotesInput: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalCancelButton: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginRight: 8,
    alignItems: "center",
  },
  modalCancelText: {
    color: "#6b7280",
    fontSize: 16,
    fontWeight: "600",
  },
  modalConfirmButton: {
    backgroundColor: "#4f46e5",
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginLeft: 8,
    alignItems: "center",
  },
  modalConfirmText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
