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
      const currentDate = new Date().toLocaleDateString("en-CA");
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
        <Text
          className="mt-md text-sm font-medium"
          style={{ color: colors.text.primary }}
        >
          One moment...
        </Text>
      </View>
    );
  }

  if (!activeWorkout) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
          }}
        >
          <Ionicons name="fitness" size={64} color={colors.text.muted} />
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: colors.text.primary,
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            No Active Workout
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.text.muted,
              textAlign: "center",
              lineHeight: 20,
              marginBottom: 16,
            }}
          >
            You don't have an active workout plan for today. Visit the Calendar
            tab to start a new workout.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: colors.brand.primary,
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 24,
            }}
            onPress={refreshWorkout}
          >
            <Text
              style={{
                color: colors.brand.secondary,
                fontWeight: "600",
                fontSize: 14,
              }}
            >
              Refresh
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isWorkoutCompleted) {
    const currentDate = new Date().toLocaleDateString("en-CA");
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
          }}
        >
          <Ionicons
            name="checkmark-circle"
            size={64}
            color={colors.brand.primary}
          />
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: colors.brand.primary,
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            Workout Complete!
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.text.muted,
              textAlign: "center",
              lineHeight: 20,
              marginBottom: 8,
            }}
          >
            Great job! You've completed all exercises in today's workout.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: 24 }}
    >
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        ref={scrollViewRef}
      >
        {/* Exercise Hero Image/Video */}
        <ExerciseLink
          link={currentExercise?.exercise.link}
          exerciseName={currentExercise?.exercise.name}
          variant="hero"
        />

        <View style={{ paddingHorizontal: 24 }}>
          {/* Exercise Title */}
          <View style={{ paddingVertical: 16 }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: colors.text.primary,
                marginBottom: 4,
              }}
            >
              {currentExercise?.exercise.name || "Bodyweight Squats"}
            </Text>
            <Text style={{ fontSize: 14, color: colors.text.muted }}>
              Focus on knee alignment and control
            </Text>
          </View>

          {/* Progress Card */}
          <View
            style={{
              backgroundColor: colors.background,
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              shadowColor: colors.neutral.dark[1],
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              elevation: 3,
              borderWidth: 1,
              borderColor: colors.neutral.light[2],
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: "rgba(187, 222, 81, 0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "bold",
                      color: colors.brand.primary,
                    }}
                  >
                    {Math.round(progressPercentage)}%
                  </Text>
                </View>
                <View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: colors.text.primary,
                    }}
                  >
                    {completedCount}/{totalExercises} Exercises
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.text.muted }}>
                    {getRemainingTime()} min remaining
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Exercise Details Card */}
          <View
            style={{
              backgroundColor: colors.background,
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              shadowColor: colors.neutral.dark[1],
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              elevation: 3,
              borderWidth: 1,
              borderColor: colors.neutral.light[2],
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                color: colors.text.primary,
                marginBottom: 12,
              }}
            >
              {currentExercise?.exercise.name || "Bodyweight Squats"}
            </Text>

            {/* Logging Section */}
            {currentData && isWorkoutActive && (
              <View
                style={{
                  backgroundColor: colors.neutral.light[1],
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: colors.text.primary,
                    marginBottom: 12,
                    textAlign: "center",
                  }}
                >
                  Track Your Progress
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  {/* Set Tracker */}
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: colors.text.primary,
                        marginBottom: 8,
                        textAlign: "center",
                      }}
                    >
                      Sets ({currentData.setsCompleted}/{currentData.targetSets}
                      )
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      {Array.from(
                        { length: currentData.targetSets },
                        (_, i) => {
                          const isCompleted = i < currentData.setsCompleted;
                          return (
                            <TouchableOpacity
                              key={i}
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                alignItems: "center",
                                justifyContent: "center",
                                borderWidth: 2,
                                borderColor: isCompleted
                                  ? colors.brand.primary
                                  : colors.neutral.medium[1],
                                backgroundColor: isCompleted
                                  ? colors.brand.primary
                                  : colors.background,
                              }}
                              onPress={() =>
                                updateExerciseData("setsCompleted", i + 1)
                              }
                            >
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: "600",
                                  color: isCompleted
                                    ? colors.brand.secondary
                                    : colors.text.muted,
                                }}
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
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: colors.text.primary,
                        marginBottom: 8,
                        textAlign: "center",
                      }}
                    >
                      Reps ({currentData.repsCompleted}/{currentData.targetReps}
                      )
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        gap: 4,
                      }}
                    >
                      {Array.from(
                        { length: Math.min(currentData.targetReps, 20) },
                        (_, i) => {
                          const isCompleted = i < currentData.repsCompleted;
                          return (
                            <TouchableOpacity
                              key={i}
                              style={{
                                width: 18,
                                height: 18,
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              onPress={() =>
                                updateExerciseData("repsCompleted", i + 1)
                              }
                            >
                              <View
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: 5,
                                  backgroundColor: isCompleted
                                    ? colors.brand.primary
                                    : colors.background,
                                }}
                              />
                            </TouchableOpacity>
                          );
                        }
                      )}
                      {currentData.targetReps > 20 && (
                        <Text
                          style={{
                            fontSize: 10,
                            color: colors.text.muted,
                            marginTop: 4,
                          }}
                        >
                          +{currentData.targetReps - 20} more
                        </Text>
                      )}
                    </View>
                  </View>
                </View>

                {/* Weight Input */}
                {currentData.targetWeight !== undefined && (
                  <View style={{ alignItems: "center", paddingHorizontal: 10 }}>
                    {/* Weight Slider */}
                    <View style={{ width: "100%", paddingHorizontal: 10 }}>
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

            <Text
              style={{
                fontSize: 13,
                color: colors.text.muted,
                lineHeight: 18,
                marginBottom: 12,
              }}
            >
              {currentExercise?.exercise.instructions ||
                "Keep your knees aligned with your toes. Lower until thighs are parallel to the floor. Engage your core throughout the movement."}
            </Text>

            {/* Equipment Pills */}
            {currentExercise?.exercise.equipment &&
              currentExercise.exercise.equipment !== "none" && (
                <View style={{ marginTop: 12 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <Ionicons
                      name="fitness-outline"
                      size={14}
                      color={colors.text.muted}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.text.muted,
                        marginLeft: 6,
                        fontWeight: "500",
                      }}
                    >
                      Equipment needed
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                    {currentExercise.exercise.equipment
                      .split(",")
                      .map((equipment, index) => (
                        <View
                          key={index}
                          style={{
                            backgroundColor: colors.neutral.light[1],
                            borderRadius: 16,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            marginRight: 8,
                            marginBottom: 6,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "500",
                              color: colors.text.primary,
                            }}
                          >
                            {formatEquipment(equipment.trim())}
                          </Text>
                        </View>
                      ))}
                  </View>
                </View>
              )}
          </View>

          {/* Workout Plan */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                color: colors.text.primary,
                marginBottom: 12,
              }}
            >
              Workout Plan
            </Text>

            <View>
              {activeWorkout.exercises.map((exercise, index) => {
                const status = getExerciseStatus(index);
                return (
                  <View
                    key={index}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 12,
                      marginBottom: 6,
                      borderRadius: 12,
                      backgroundColor:
                        status === "Current"
                          ? "rgba(187, 222, 81, 0.1)"
                          : "white",
                      borderWidth: 1,
                      borderColor:
                        status === "Current"
                          ? "rgba(187, 222, 81, 0.3)"
                          : colors.neutral.light[2],
                    }}
                  >
                    {/* Exercise Icon */}
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: colors.neutral.light[1],
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      <Ionicons
                        name="fitness"
                        size={18}
                        color={colors.text.muted}
                      />
                    </View>

                    {/* Exercise Info */}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: colors.text.primary,
                          marginBottom: 2,
                        }}
                      >
                        {exercise.exercise.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.text.muted,
                        }}
                      >
                        {exercise.sets || 3} sets × {exercise.reps || 12} reps
                        {exercise.reps ? "" : " each leg"}
                      </Text>
                    </View>

                    {/* Status Badge */}
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 10,
                        backgroundColor:
                          status === "Completed"
                            ? colors.neutral.light[1]
                            : status === "Current"
                            ? "rgba(187, 222, 81, 0.2)"
                            : status === "Next"
                            ? colors.neutral.light[1]
                            : colors.neutral.light[1],
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "500",
                          color:
                            status === "Completed"
                              ? colors.brand.primary
                              : status === "Current"
                              ? colors.brand.primary
                              : status === "Next"
                              ? colors.brand.primary
                              : colors.text.muted,
                        }}
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
          <View style={{ marginBottom: 16 }}>
            {!isWorkoutActive ? (
              <TouchableOpacity
                style={{
                  backgroundColor: colors.brand.primary,
                  borderRadius: 20,
                  paddingVertical: 14,
                  marginBottom: 16,
                }}
                onPress={async () => await startWorkout()}
              >
                <Text
                  style={{
                    color: colors.brand.secondary,
                    fontWeight: "bold",
                    textAlign: "center",
                    fontSize: 16,
                  }}
                >
                  Start Workout
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                {/* Media Controls with Timer */}
                <View style={{ alignItems: "center", marginBottom: 16 }}>
                  {/* Exercise Timer */}
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.text.muted,
                      marginBottom: 8,
                      textAlign: "center",
                    }}
                  >
                    Exercise: {formatTime(exerciseTimer)}
                  </Text>

                  {/* Pause/Play Button */}
                  <TouchableOpacity
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: colors.brand.primary,
                      alignItems: "center",
                      justifyContent: "center",
                      shadowColor: colors.neutral.dark[1],
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 4,
                      marginVertical: 8,
                    }}
                    onPress={togglePause}
                  >
                    <Ionicons
                      name={isPaused ? "play" : "pause"}
                      size={20}
                      color={colors.brand.secondary}
                    />
                  </TouchableOpacity>

                  {/* Total Timer */}
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.text.muted,
                      marginTop: 8,
                      textAlign: "center",
                    }}
                  >
                    Total: {formatTime(workoutTimer)}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View
                  style={{ flexDirection: "row", marginBottom: 16, gap: 8 }}
                >
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.brand.primary,
                      borderRadius: 20,
                      paddingVertical: 14,
                      flex: 1,
                      alignItems: "center",
                    }}
                    onPress={() => setShowCompleteModal(true)}
                  >
                    <Text
                      style={{
                        color: colors.background,
                        fontWeight: "bold",
                        fontSize: 14,
                      }}
                    >
                      Complete Exercise
                    </Text>
                  </TouchableOpacity>

                  {/* <TouchableOpacity
                    style={{
                      backgroundColor: "colors.brand.primary",
                      borderRadius: 20,
                      paddingVertical: 14,
                      flex: 1,
                      alignItems: "center",
                    }}
                    onPress={() => setShowEndWorkoutModal(true)}
                  >
                    <Text
                      style={{
                        color: colors.background,
                        fontWeight: "bold",
                        fontSize: 14,
                      }}
                    >
                      End Workout
                    </Text>
                  </TouchableOpacity> */}
                </View>
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Complete Exercise Modal */}
      <Modal visible={showCompleteModal} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 24,
              width: "100%",
              maxWidth: 400,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                color: colors.text.primary,
                marginBottom: 4,
              }}
            >
              Complete Exercise
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.text.muted,
                marginBottom: 16,
                lineHeight: 20,
              }}
            >
              Mark this exercise as complete? Your progress will be saved.
            </Text>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <TouchableOpacity
                style={{
                  backgroundColor: isCompletingExercise
                    ? colors.neutral.light[2]
                    : colors.neutral.light[1],
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  flex: 1,
                  alignItems: "center",
                  marginRight: 8,
                  opacity: isCompletingExercise ? 0.6 : 1,
                }}
                onPress={() => setShowCompleteModal(false)}
                disabled={isCompletingExercise}
              >
                <Text
                  style={{
                    color: colors.text.muted,
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: isCompletingExercise
                    ? colors.brand.primary
                    : colors.brand.primary,
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  flex: 1,
                  alignItems: "center",
                  marginLeft: 8,
                  opacity: isCompletingExercise ? 0.8 : 1,
                  flexDirection: "row",
                  justifyContent: "center",
                }}
                onPress={handleCompleteExercise}
                disabled={isCompletingExercise}
              >
                {isCompletingExercise && (
                  <ActivityIndicator
                    size="small"
                    color="white"
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text
                  style={{
                    color: "white",
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  {isCompletingExercise ? "Completing..." : "Complete"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* End Workout Modal */}
      {/* <Modal visible={showEndWorkoutModal} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 24,
              width: "100%",
              maxWidth: 400,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                color: {colors.text.primary},
                marginBottom: 4,
              }}
            >
              End Workout
            </Text>
            <Text style={{ fontSize: 14, color: "colors.text.muted", marginBottom: 16 }}>
              Add any notes about your workout:
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.neutral.light[1],
                borderRadius: 12,
                padding: 12,
                fontSize: 14,
                minHeight: 80,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: {colors.neutral.medium[1]},
              }}
              value={workoutNotes}
              onChangeText={setWorkoutNotes}
              placeholder="How did the workout feel? Any observations..."
              placeholderTextColor={colors.text.muted}
              multiline
              textAlignVertical="top"
            />
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <TouchableOpacity
                style={{
                  backgroundColor: colors.neutral.light[1],
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  flex: 1,
                  alignItems: "center",
                  marginRight: 8,
                }}
                onPress={() => setShowEndWorkoutModal(false)}
              >
                <Text
                  style={{ color: "colors.text.muted", fontWeight: "600", fontSize: 14 }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: "colors.brand.primary",
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  flex: 1,
                  alignItems: "center",
                  marginLeft: 8,
                }}
                onPress={handleEndWorkout}
              >
                <Text
                  style={{ color: "white", fontWeight: "600", fontSize: 14 }}
                >
                  End Workout
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal> */}
    </View>
  );
}
