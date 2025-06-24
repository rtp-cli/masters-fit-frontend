import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomSlider from "@components/ui/Slider";
import { useWorkoutSession } from "@hooks/useWorkoutSession";
import { getCompletedExercises } from "@lib/workouts";
import { calculateWorkoutDuration, formatEquipment } from "../../utils";
import ExerciseLink from "@components/ExerciseLink";
import { colors } from "../../lib/theme";

export default function WorkoutScreen() {
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showEndWorkoutModal, setShowEndWorkoutModal] = useState(false);
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [exerciseNotes, setExerciseNotes] = useState("");
  const [isWorkoutCompleted, setIsWorkoutCompleted] = useState(false);
  const [isCompletingExercise, setIsCompletingExercise] = useState(false);

  // Wrap the hook in a try-catch to handle potential errors
  let hookResult;
  try {
    hookResult = useWorkoutSession();
  } catch (error) {
    console.error("Error in useWorkoutSession:", error);
    return (
      <View className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center px-lg">
          <Text className="text-lg font-bold text-text-primary">
            Error loading workout session
          </Text>
        </View>
      </View>
    );
  }

  const {
    activeWorkout,
    currentExerciseIndex,
    exerciseTimer,
    workoutTimer,
    isWorkoutActive,
    isPaused,
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
    refreshWorkout,
    togglePause,
  } = hookResult;

  // Refresh workout when tab is focused (to handle date changes and navigation)
  useFocusEffect(
    React.useCallback(() => {
      refreshWorkout();
    }, [refreshWorkout])
  );

  // Check for date changes every minute to refresh workout at midnight
  useEffect(() => {
    const checkDateChange = async () => {
      // Use safe date formatting
      const today = new Date();
      const currentDate =
        today.getFullYear() +
        "-" +
        String(today.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(today.getDate()).padStart(2, "0");
      const lastCheckDate = await AsyncStorage.getItem("lastWorkoutDate");

      if (lastCheckDate && lastCheckDate !== currentDate) {
        refreshWorkout();
      }

      await AsyncStorage.setItem("lastWorkoutDate", currentDate);
    };

    // Check immediately
    checkDateChange();

    // Check every minute for date changes
    const dateCheckInterval = setInterval(checkDateChange, 60000);

    return () => clearInterval(dateCheckInterval);
  }, [refreshWorkout]);

  useEffect(() => {
    const checkWorkoutCompletion = async () => {
      if (activeWorkout && totalExercises > 0) {
        try {
          const completedData = await getCompletedExercises(
            activeWorkout.workoutId
          );
          const completedExerciseIds = completedData.completedExercises || [];

          // Filter completed exercises to only those belonging to this plan day
          const todaysCompletedExercises = completedExerciseIds.filter(
            (exerciseId) =>
              activeWorkout.exercises.some((ex) => ex.id === exerciseId)
          );

          // Check if ALL exercises for this specific plan day are completed
          const allTodaysExercisesCompleted =
            activeWorkout.exercises.length > 0 &&
            activeWorkout.exercises.every((ex) =>
              todaysCompletedExercises.includes(ex.id)
            );

          setIsWorkoutCompleted(allTodaysExercisesCompleted);
        } catch (error) {
          console.error("Error checking workout completion:", error);
          setIsWorkoutCompleted(false);
        }
      } else {
        setIsWorkoutCompleted(false);
      }
    };

    checkWorkoutCompletion();
  }, [activeWorkout, completedCount, totalExercises]);

  const handleCompleteExercise = async () => {
    setIsCompletingExercise(true);
    try {
      const success = await completeExercise(exerciseNotes);
      if (success) {
        setShowCompleteModal(false);
        setExerciseNotes("");

        // Scroll to top of the page
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });

        const nextExerciseIndex = currentExerciseIndex + 1;
        if (nextExerciseIndex >= totalExercises) {
          // All exercises for TODAY are complete - don't end the entire workout!
          // Just refresh to check if there are more days available
          Alert.alert(
            "Day Complete!",
            "Great job! You've completed today's workout. Check back tomorrow for your next workout."
          );

          // Refresh the workout to potentially load the next day
          setTimeout(() => {
            refreshWorkout();
          }, 2000);
        } else {
          moveToNextExercise();
        }
      } else {
        Alert.alert("Error", "Failed to save exercise completion");
      }
    } finally {
      setIsCompletingExercise(false);
    }
  };

  const handleEndWorkout = async () => {
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

  const getExerciseStatus = (exerciseIndex: number) => {
    if (exerciseIndex < currentExerciseIndex) {
      return exerciseData[exerciseIndex]?.isCompleted ? "Completed" : "Skipped";
    } else if (exerciseIndex === currentExerciseIndex) {
      return "Current";
    } else if (exerciseIndex === currentExerciseIndex + 1) {
      return "Next";
    } else {
      return "Waiting";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "text-green-600";
      case "Current":
        return "text-primary";
      case "Next":
        return "text-blue-600";
      default:
        return "text-text-muted";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100";
      case "Current":
        return "bg-primary/20";
      case "Next":
        return "bg-blue-100";
      default:
        return "bg-neutral-light-2";
    }
  };

  const getRemainingTime = () => {
    const totalDuration = activeWorkout?.exercises
      ? calculateWorkoutDuration(activeWorkout.exercises)
      : 0;
    const elapsed = workoutTimer;
    const remaining = Math.max(0, totalDuration - elapsed);
    return Math.round(remaining / 60);
  };

  const scrollViewRef = useRef<ScrollView>(null);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color={colors.brand.primary} />
        <Text className="mt-md text-sm font-medium text-text-primary">
          One moment...
        </Text>
      </View>
    );
  }

  if (!activeWorkout) {
    return (
      <View className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="fitness" size={64} color={colors.text.muted} />
          <Text className="text-lg font-bold text-text-primary mt-4 mb-2">
            No Active Workout
          </Text>
          <Text className="text-sm text-text-muted text-center leading-5 mb-4">
            You don't have an active workout plan for today. Visit the Calendar
            tab to start a new workout.
          </Text>
          <TouchableOpacity
            className="bg-primary rounded-xl py-3 px-6"
            onPress={refreshWorkout}
          >
            <Text className="text-secondary font-semibold text-sm">
              Refresh
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isWorkoutCompleted) {
    // Use safe date formatting
    const today = new Date();
    const currentDate =
      today.getFullYear() +
      "-" +
      String(today.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(today.getDate()).padStart(2, "0");
    return (
      <View className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons
            name="checkmark-circle"
            size={64}
            color={colors.brand.primary}
          />
          <Text className="text-xl font-bold text-primary mt-4 mb-2">
            Workout Complete!
          </Text>
          <Text className="text-sm text-text-muted text-center leading-5 mb-2">
            Great job! You've completed all exercises in today's workout.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background pt-6">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        ref={scrollViewRef}
      >
        {/* Exercise Hero Image/Video */}
        <ExerciseLink
          link={currentExercise?.exercise.link}
          exerciseName={currentExercise?.exercise.name}
          variant="hero"
        />

        <View className="px-6">
          {/* Exercise Title */}
          <View className="py-4">
            <Text className="text-xl font-bold text-text-primary mb-1">
              {currentExercise?.exercise.name || "Bodyweight Squats"}
            </Text>
            <Text className="text-sm text-text-muted">
              Focus on knee alignment and control
            </Text>
          </View>

          {/* Progress Card */}
          <View className="bg-background rounded-xl p-4 mb-4 shadow-card border border-neutral-light-2">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center mr-3">
                  <Text className="text-sm font-bold text-primary">
                    {Math.round(progressPercentage)}%
                  </Text>
                </View>
                <View>
                  <Text className="text-sm font-semibold text-text-primary">
                    {completedCount}/{totalExercises} Exercises
                  </Text>
                  <Text className="text-xs text-text-muted">
                    {getRemainingTime()} min remaining
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Exercise Details Card */}
          <View className="bg-background rounded-xl p-4 mb-4 shadow-card border border-neutral-light-2">
            <Text className="text-base font-bold text-text-primary mb-3">
              {currentExercise?.exercise.name || "Bodyweight Squats"}
            </Text>

            {/* Logging Section */}
            {currentData && isWorkoutActive && (
              <View className="bg-neutral-light-1 rounded-lg p-3 mb-4">
                <Text className="text-sm font-semibold text-text-primary mb-3 text-center">
                  Track Your Progress
                </Text>

                <View className="flex-row justify-between mb-4">
                  {/* Set Tracker */}
                  <View className="flex-1 mr-2">
                    <Text className="text-xs font-semibold text-text-primary mb-2 text-center">
                      Sets ({currentData.setsCompleted}/{currentData.targetSets}
                      )
                    </Text>
                    <View className="flex-row flex-wrap justify-center gap-1.5">
                      {Array.from(
                        { length: currentData.targetSets },
                        (_, i) => {
                          const isCompleted = i < currentData.setsCompleted;
                          return (
                            <TouchableOpacity
                              key={i}
                              className={`w-8 h-8 rounded-full items-center justify-center border-2 ${
                                isCompleted
                                  ? "border-primary bg-primary"
                                  : "border-neutral-medium-1 bg-background"
                              }`}
                              onPress={() =>
                                updateExerciseData("setsCompleted", i + 1)
                              }
                            >
                              <Text
                                className={`text-xs font-semibold ${
                                  isCompleted
                                    ? "text-secondary"
                                    : "text-text-muted"
                                }`}
                              >
                                {i + 1}
                              </Text>
                            </TouchableOpacity>
                          );
                        }
                      )}
                    </View>
                  </View>

                  {/* Rep Tracker */}
                  <View className="flex-1 ml-2">
                    <Text className="text-xs font-semibold text-text-primary mb-2 text-center">
                      Reps ({currentData.repsCompleted}/{currentData.targetReps}
                      )
                    </Text>

                    {/* Compact Rep Controls - Single Row */}
                    <View className="flex-row flex-wrap justify-center gap-1.5">
                      {currentData.targetReps < 4 ? (
                        // For exercises with less than 4 target reps, show individual rep buttons
                        <>
                          <TouchableOpacity
                            className="bg-neutral-medium-1 rounded-full w-8 h-8 items-center justify-center"
                            onPress={() =>
                              updateExerciseData(
                                "repsCompleted",
                                Math.max(0, currentData.repsCompleted - 1)
                              )
                            }
                            disabled={currentData.repsCompleted <= 0}
                          >
                            <Ionicons
                              name="remove"
                              size={12}
                              color={
                                currentData.repsCompleted <= 0
                                  ? colors.text.muted
                                  : colors.text.primary
                              }
                            />
                          </TouchableOpacity>

                          {Array.from(
                            { length: currentData.targetReps },
                            (_, i) => {
                              const repValue = i + 1;
                              return (
                                <TouchableOpacity
                                  key={repValue}
                                  className={`w-8 h-8 rounded-full items-center justify-center border-2 ${
                                    currentData.repsCompleted === repValue
                                      ? "border-primary bg-primary"
                                      : "border-neutral-medium-1 bg-background"
                                  }`}
                                  onPress={() =>
                                    updateExerciseData(
                                      "repsCompleted",
                                      repValue
                                    )
                                  }
                                >
                                  <Text
                                    className={`text-xs font-semibold ${
                                      currentData.repsCompleted === repValue
                                        ? "text-secondary"
                                        : "text-text-muted"
                                    }`}
                                  >
                                    {repValue}
                                  </Text>
                                </TouchableOpacity>
                              );
                            }
                          )}

                          <TouchableOpacity
                            className="bg-primary rounded-full w-8 h-8 items-center justify-center"
                            onPress={() =>
                              updateExerciseData(
                                "repsCompleted",
                                Math.min(
                                  currentData.targetReps,
                                  currentData.repsCompleted + 1
                                )
                              )
                            }
                            disabled={
                              currentData.repsCompleted >=
                              currentData.targetReps
                            }
                          >
                            <Ionicons
                              name="add"
                              size={12}
                              color={colors.brand.secondary}
                            />
                          </TouchableOpacity>
                        </>
                      ) : (
                        // For exercises with 4 or more target reps, show the original quick-set buttons
                        <>
                          <TouchableOpacity
                            className="bg-neutral-medium-1 rounded-full w-8 h-8 items-center justify-center"
                            onPress={() =>
                              updateExerciseData(
                                "repsCompleted",
                                Math.max(0, currentData.repsCompleted - 1)
                              )
                            }
                            disabled={currentData.repsCompleted <= 0}
                          >
                            <Ionicons
                              name="remove"
                              size={12}
                              color={
                                currentData.repsCompleted <= 0
                                  ? colors.text.muted
                                  : colors.text.primary
                              }
                            />
                          </TouchableOpacity>

                          <TouchableOpacity
                            className={`w-8 h-8 rounded-full items-center justify-center border-2 ${
                              currentData.repsCompleted ===
                              Math.floor(currentData.targetReps / 3)
                                ? "border-primary bg-primary"
                                : "border-neutral-medium-1 bg-background"
                            }`}
                            onPress={() =>
                              updateExerciseData(
                                "repsCompleted",
                                Math.floor(currentData.targetReps / 3)
                              )
                            }
                          >
                            <Text
                              className={`text-xs font-semibold ${
                                currentData.repsCompleted ===
                                Math.floor(currentData.targetReps / 3)
                                  ? "text-secondary"
                                  : "text-text-muted"
                              }`}
                            >
                              {Math.floor(currentData.targetReps / 3)}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            className={`w-8 h-8 rounded-full items-center justify-center border-2 ${
                              currentData.repsCompleted ===
                              Math.floor((currentData.targetReps * 2) / 3)
                                ? "border-primary bg-primary"
                                : "border-neutral-medium-1 bg-background"
                            }`}
                            onPress={() =>
                              updateExerciseData(
                                "repsCompleted",
                                Math.floor((currentData.targetReps * 2) / 3)
                              )
                            }
                          >
                            <Text
                              className={`text-xs font-semibold ${
                                currentData.repsCompleted ===
                                Math.floor((currentData.targetReps * 2) / 3)
                                  ? "text-secondary"
                                  : "text-text-muted"
                              }`}
                            >
                              {Math.floor((currentData.targetReps * 2) / 3)}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            className={`w-8 h-8 rounded-full items-center justify-center border-2 ${
                              currentData.repsCompleted ===
                              currentData.targetReps
                                ? "border-primary bg-primary"
                                : "border-neutral-medium-1 bg-background"
                            }`}
                            onPress={() =>
                              updateExerciseData(
                                "repsCompleted",
                                currentData.targetReps
                              )
                            }
                          >
                            <Text
                              className={`text-xs font-semibold ${
                                currentData.repsCompleted ===
                                currentData.targetReps
                                  ? "text-secondary"
                                  : "text-text-muted"
                              }`}
                            >
                              {currentData.targetReps}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            className="bg-primary rounded-full w-8 h-8 items-center justify-center"
                            onPress={() =>
                              updateExerciseData(
                                "repsCompleted",
                                Math.min(
                                  currentData.targetReps,
                                  currentData.repsCompleted + 1
                                )
                              )
                            }
                            disabled={
                              currentData.repsCompleted >=
                              currentData.targetReps
                            }
                          >
                            <Ionicons
                              name="add"
                              size={12}
                              color={colors.brand.secondary}
                            />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                </View>

                {/* Weight Input */}
                {currentData.targetWeight !== undefined && (
                  <View className="mt-3 px-2">
                    {/* Weight Slider */}
                    <View className="w-full">
                      <CustomSlider
                        label="Weight Used"
                        value={Number(currentData.weightUsed || 0)}
                        minimumValue={0}
                        maximumValue={200}
                        step={5}
                        onValueChange={(value: number) =>
                          updateExerciseData(
                            "weightUsed",
                            Math.round(Number(value))
                          )
                        }
                        unit=" lbs"
                      />
                    </View>
                  </View>
                )}
              </View>
            )}

            <Text className="text-sm text-text-muted leading-5 mb-3">
              {currentExercise?.exercise.instructions ||
                "Keep your knees aligned with your toes. Lower until thighs are parallel to the floor. Engage your core throughout the movement."}
            </Text>

            {/* Equipment Pills */}
            {currentExercise?.exercise.equipment &&
              currentExercise.exercise.equipment !== "none" && (
                <View className="mt-2">
                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name="fitness-outline"
                      size={14}
                      color={colors.text.muted}
                    />
                    <Text className="text-xs text-text-muted ml-2 font-semibold">
                      Equipment needed
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap">
                    {currentExercise.exercise.equipment
                      .split(",")
                      .map((equipment, index) => (
                        <View
                          key={index}
                          className="bg-neutral-light-1 rounded-full px-2 py-1 mx-1 mb-1"
                        >
                          <Text className="text-xs font-semibold text-text-primary">
                            {formatEquipment(equipment.trim())}
                          </Text>
                        </View>
                      ))}
                  </View>
                </View>
              )}
          </View>

          {/* Workout Plan */}
          <View className="mb-4">
            <Text className="text-base font-bold text-text-primary mb-2">
              Workout Plan
            </Text>

            <View>
              {activeWorkout.exercises.map((exercise, index) => {
                const status = getExerciseStatus(index);
                return (
                  <View
                    key={index}
                    className={`flex-row items-center py-2 px-4 mb-2 rounded-xl border ${
                      status === "Current"
                        ? "bg-primary/10 border-primary/30"
                        : "bg-white border-neutral-light-2"
                    }`}
                  >
                    {/* Exercise Icon */}
                    <View className="w-12 h-12 rounded-full bg-neutral-light-1 items-center justify-center mr-4">
                      <Ionicons
                        name="fitness"
                        size={18}
                        color={colors.text.muted}
                      />
                    </View>

                    {/* Exercise Info */}
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-text-primary mb-1">
                        {exercise.exercise.name}
                      </Text>
                      <Text className="text-xs text-text-muted">
                        {exercise.sets || 3} sets × {exercise.reps || 12} reps
                        {exercise.reps ? "" : " each leg"}
                      </Text>
                    </View>

                    {/* Status Badge */}
                    <View
                      className={`px-2 py-1 rounded-full ${
                        status === "Current"
                          ? "bg-primary/20"
                          : "bg-neutral-light-1"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          status === "Completed" ||
                          status === "Current" ||
                          status === "Next"
                            ? "text-primary"
                            : "text-text-muted"
                        }`}
                      >
                        {status}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Controls */}
          <View className="mb-4">
            {!isWorkoutActive ? (
              <TouchableOpacity
                className="bg-primary rounded-xl py-4 w-full"
                onPress={async () => await startWorkout()}
              >
                <Text className="text-secondary font-semibold text-base text-center">
                  Start Workout
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                {/* Media Controls with Timer */}
                <View className="flex items-center mb-4">
                  {/* Exercise Timer */}
                  <Text className="text-xs text-text-muted mb-2 text-center">
                    Exercise: {formatTime(exerciseTimer)}
                  </Text>

                  {/* Pause/Play Button */}
                  <TouchableOpacity
                    className="w-16 h-16 rounded-full bg-primary items-center justify-center shadow-md"
                    onPress={togglePause}
                  >
                    <Ionicons
                      name={isPaused ? "play" : "pause"}
                      size={20}
                      color={colors.brand.secondary}
                    />
                  </TouchableOpacity>

                  {/* Total Timer */}
                  <Text className="text-xs text-text-muted mt-2 text-center">
                    Total: {formatTime(workoutTimer)}
                  </Text>
                </View>

                {/* Action Buttons */}
                <TouchableOpacity
                  className="bg-primary rounded-xl py-4 w-full"
                  onPress={() => setShowCompleteModal(true)}
                >
                  <Text className="text-secondary font-semibold text-base text-center">
                    Complete Exercise
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Complete Exercise Modal */}
      <Modal visible={showCompleteModal} transparent animationType="slide">
        <View className="flex-1 bg-black/20 justify-center items-center px-6">
          <View className="bg-white rounded-2xl p-8 shadow-xl border border-neutral-light-2 w-full max-w-md">
            <Text className="text-lg font-bold text-text-primary mb-4">
              Complete Exercise
            </Text>
            <Text className="text-base text-text-muted mb-6 leading-6">
              Mark this exercise as complete? Your progress will be saved.
            </Text>
            <View className="flex-row justify-between gap-4">
              <TouchableOpacity
                className="bg-neutral-light-1 rounded-xl py-4 px-6 flex-1"
                onPress={() => setShowCompleteModal(false)}
              >
                <Text className="text-text-muted font-semibold text-base text-center">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`bg-primary rounded-xl py-4 px-6 flex-1 ${
                  isCompletingExercise ? "opacity-75" : ""
                }`}
                onPress={handleCompleteExercise}
                disabled={isCompletingExercise}
              >
                {isCompletingExercise ? (
                  <View className="flex-row items-center justify-center">
                    <ActivityIndicator
                      size="small"
                      color={colors.brand.secondary}
                    />
                    <Text className="text-secondary font-semibold text-base ml-2">
                      Completing...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-secondary font-semibold text-base text-center">
                    Complete
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
