import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useWorkoutSession } from "@hooks/useWorkoutSession";
import { getCompletedExercises } from "@lib/workouts";
// import ExerciseLink from "@components/ExerciseLink";

export default function WorkoutScreen() {
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showEndWorkoutModal, setShowEndWorkoutModal] = useState(false);
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [exerciseNotes, setExerciseNotes] = useState("");
  const [isWorkoutCompleted, setIsWorkoutCompleted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [difficultyLevel, setDifficultyLevel] = useState(0.5);

  // Wrap the hook in a try-catch to handle potential errors
  let hookResult;
  try {
    hookResult = useWorkoutSession();
  } catch (error) {
    console.error("Error in useWorkoutSession:", error);
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center px-lg">
          <Text className="text-lg font-bold text-text-primary">
            Error loading workout session
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
    refreshWorkout,
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
        console.log("Date changed, refreshing workout...");
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
          const completedCount = completedData.count || 0;

          if (completedCount === totalExercises) {
            setIsWorkoutCompleted(true);
          } else {
            setIsWorkoutCompleted(false);
          }
        } catch (error) {
          console.error("Error checking workout completion:", error);
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

      const nextExerciseIndex = currentExerciseIndex + 1;
      if (nextExerciseIndex >= totalExercises) {
        const workoutSuccess = await endWorkout(workoutNotes);
        if (workoutSuccess) {
          Alert.alert("Workout Complete", "Your workout has been saved!");
          setIsWorkoutCompleted(true);
        } else {
          Alert.alert("Error", "Failed to save workout completion");
        }
      } else {
        moveToNextExercise();
      }
    } else {
      Alert.alert("Error", "Failed to save exercise completion");
    }
  };

  const handleEndWorkout = async () => {
    const success = await endWorkout(workoutNotes);
    if (success) {
      setShowEndWorkoutModal(false);
      setIsPaused(false);
      Alert.alert("Workout Ended", "Your workout progress has been saved!");
      resetSession();
      setWorkoutNotes("");
      setExerciseNotes("");
    } else {
      Alert.alert("Error", "Failed to save workout");
    }
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
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

  const getDifficultyText = () => {
    if (difficultyLevel < 0.33) return "Easier";
    if (difficultyLevel > 0.66) return "Harder";
    return "Moderate";
  };

  const getRemainingTime = () => {
    const totalDuration =
      activeWorkout?.exercises.reduce(
        (total, ex) => total + (ex.duration || 600),
        0
      ) || 0;
    const elapsed = workoutTimer;
    const remaining = Math.max(0, totalDuration - elapsed);
    return Math.round(remaining / 60);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#BBDE51" />
          <Text
            style={{
              marginTop: 16,
              fontSize: 14,
              color: "#BBDE51",
              fontWeight: "500",
            }}
          >
            Loading workout...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!activeWorkout) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
          }}
        >
          <Ionicons name="fitness" size={64} color="#8A93A2" />
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: "#000000",
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            No Active Workout
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#8A93A2",
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
              backgroundColor: "#BBDE51",
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 24,
            }}
            onPress={refreshWorkout}
          >
            <Text
              style={{
                color: "#181917",
                fontWeight: "600",
                fontSize: 14,
              }}
            >
              Refresh
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isWorkoutCompleted) {
    const currentDate = new Date().toLocaleDateString("en-CA");
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
          }}
        >
          <Ionicons name="checkmark-circle" size={64} color="#BBDE51" />
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: "#BBDE51",
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            Workout Complete!
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#8A93A2",
              textAlign: "center",
              lineHeight: 20,
              marginBottom: 8,
            }}
          >
            Great job! You've completed all exercises in today's workout.
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: "#8A93A2",
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            Current date: {currentDate}
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: "#BBDE51",
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 24,
            }}
            onPress={refreshWorkout}
          >
            <Text
              style={{
                color: "#181917",
                fontWeight: "600",
                fontSize: 14,
              }}
            >
              Refresh Workout
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Exercise Hero Image */}
        <View
          style={{
            position: "relative",
            height: 320,
            backgroundColor: "#f5f5f5",
          }}
        >
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
            }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.3)",
            }}
          />
        </View>

        <View style={{ paddingHorizontal: 24 }}>
          {/* Exercise Title */}
          <View style={{ paddingVertical: 16 }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: "#000000",
                marginBottom: 4,
              }}
            >
              {currentExercise?.exercise.name || "Bodyweight Squats"}
            </Text>
            <Text style={{ fontSize: 14, color: "#8A93A2" }}>
              Focus on knee alignment and control
            </Text>
          </View>

          {/* Progress Card */}
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              elevation: 3,
              borderWidth: 1,
              borderColor: "#f0f0f0",
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
                      color: "#BBDE51",
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
                      color: "#000000",
                    }}
                  >
                    {completedCount}/{totalExercises} Exercises
                  </Text>
                  <Text style={{ fontSize: 12, color: "#8A93A2" }}>
                    {getRemainingTime()} min remaining
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Exercise Details Card */}
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              elevation: 3,
              borderWidth: 1,
              borderColor: "#f0f0f0",
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                color: "#000000",
                marginBottom: 12,
              }}
            >
              {currentExercise?.exercise.name || "Bodyweight Squats"}
            </Text>

            {/* Logging Section */}
            {currentData && isWorkoutActive && (
              <View
                style={{
                  backgroundColor: "rgba(187, 222, 81, 0.1)",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#000000",
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
                        color: "#000000",
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
                                  ? "#BBDE51"
                                  : "#e0e0e0",
                                backgroundColor: isCompleted
                                  ? "#BBDE51"
                                  : "white",
                              }}
                              onPress={() =>
                                updateExerciseData("setsCompleted", i + 1)
                              }
                            >
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: "600",
                                  color: isCompleted ? "#181917" : "#8A93A2",
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
                        color: "#000000",
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
                                    ? "#BBDE51"
                                    : "#e0e0e0",
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
                            color: "#8A93A2",
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
                  <View style={{ alignItems: "center" }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: "#000000",
                        marginBottom: 8,
                      }}
                    >
                      Weight Used (kg)
                    </Text>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <TouchableOpacity
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: "#f0f0f0",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 16,
                        }}
                        onPress={() =>
                          updateExerciseData(
                            "weightUsed",
                            Math.max(0, (currentData.weightUsed || 0) - 1)
                          )
                        }
                      >
                        <Text
                          style={{
                            fontSize: 18,
                            color: "#8A93A2",
                            fontWeight: "bold",
                          }}
                        >
                          -
                        </Text>
                      </TouchableOpacity>

                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "bold",
                          color: "#000000",
                          minWidth: 50,
                          textAlign: "center",
                        }}
                      >
                        {currentData.weightUsed || 0}
                      </Text>

                      <TouchableOpacity
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: "#BBDE51",
                          alignItems: "center",
                          justifyContent: "center",
                          marginLeft: 16,
                        }}
                        onPress={() =>
                          updateExerciseData(
                            "weightUsed",
                            (currentData.weightUsed || 0) + 1
                          )
                        }
                      >
                        <Text
                          style={{
                            fontSize: 18,
                            color: "#181917",
                            fontWeight: "bold",
                          }}
                        >
                          +
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            <Text
              style={{
                fontSize: 13,
                color: "#8A93A2",
                lineHeight: 18,
                marginBottom: 12,
              }}
            >
              {currentExercise?.exercise.instructions ||
                "Keep your knees aligned with your toes. Lower until thighs are parallel to the floor. Engage your core throughout the movement."}
            </Text>

            {/* Exercise Link (YouTube video or image) */}
            {/* {currentExercise?.exercise.link && (
              <ExerciseLink
                link={currentExercise.exercise.link}
                exerciseName={currentExercise.exercise.name}
              />
            )} */}

            {currentExercise?.exercise.equipment &&
              currentExercise.exercise.equipment !== "none" && (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="fitness-outline" size={14} color="#8A93A2" />
                  <Text
                    style={{ fontSize: 12, color: "#8A93A2", marginLeft: 6 }}
                  >
                    Equipment needed:{" "}
                    {currentExercise.exercise.equipment
                      .split("_")
                      .map(
                        (word) => word.charAt(0).toUpperCase() + word.slice(1)
                      )
                      .join(" ")}
                  </Text>
                </View>
              )}
          </View>

          {/* Workout Plan */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                color: "#000000",
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
                          : "#f0f0f0",
                    }}
                  >
                    {/* Exercise Icon */}
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: "#f5f5f5",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      <Ionicons name="fitness" size={18} color="#8A93A2" />
                    </View>

                    {/* Exercise Info */}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: "#000000",
                          marginBottom: 2,
                        }}
                      >
                        {exercise.exercise.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#8A93A2",
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
                            ? "#dcfce7"
                            : status === "Current"
                            ? "rgba(187, 222, 81, 0.2)"
                            : status === "Next"
                            ? "#dbeafe"
                            : "#f5f5f5",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "500",
                          color:
                            status === "Completed"
                              ? "#16a34a"
                              : status === "Current"
                              ? "#BBDE51"
                              : status === "Next"
                              ? "#3b82f6"
                              : "#8A93A2",
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
                  backgroundColor: "#BBDE51",
                  borderRadius: 20,
                  paddingVertical: 14,
                  marginBottom: 16,
                }}
                onPress={async () => await startWorkout()}
              >
                <Text
                  style={{
                    color: "#181917",
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
                      color: "#8A93A2",
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
                      backgroundColor: "#BBDE51",
                      alignItems: "center",
                      justifyContent: "center",
                      shadowColor: "#000",
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
                      color="#181917"
                    />
                  </TouchableOpacity>

                  {/* Total Timer */}
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#8A93A2",
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
                      backgroundColor: "#16a34a",
                      borderRadius: 20,
                      paddingVertical: 14,
                      flex: 1,
                      alignItems: "center",
                    }}
                    onPress={() => setShowCompleteModal(true)}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontWeight: "bold",
                        fontSize: 14,
                      }}
                    >
                      Complete Exercise
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      backgroundColor: "#ef4444",
                      borderRadius: 20,
                      paddingVertical: 14,
                      flex: 1,
                      alignItems: "center",
                    }}
                    onPress={() => setShowEndWorkoutModal(true)}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontWeight: "bold",
                        fontSize: 14,
                      }}
                    >
                      End Workout
                    </Text>
                  </TouchableOpacity>
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
                color: "#000000",
                marginBottom: 4,
              }}
            >
              Complete Exercise
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#8A93A2",
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
                  backgroundColor: "#f5f5f5",
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  flex: 1,
                  alignItems: "center",
                  marginRight: 8,
                }}
                onPress={() => setShowCompleteModal(false)}
              >
                <Text
                  style={{ color: "#8A93A2", fontWeight: "600", fontSize: 14 }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: "#BBDE51",
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  flex: 1,
                  alignItems: "center",
                  marginLeft: 8,
                }}
                onPress={handleCompleteExercise}
              >
                <Text
                  style={{ color: "#181917", fontWeight: "600", fontSize: 14 }}
                >
                  Complete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* End Workout Modal */}
      <Modal visible={showEndWorkoutModal} transparent animationType="slide">
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
                color: "#000000",
                marginBottom: 4,
              }}
            >
              End Workout
            </Text>
            <Text style={{ fontSize: 14, color: "#8A93A2", marginBottom: 16 }}>
              Add any notes about your workout:
            </Text>
            <TextInput
              style={{
                backgroundColor: "#f5f5f5",
                borderRadius: 12,
                padding: 12,
                fontSize: 14,
                minHeight: 80,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: "#e0e0e0",
              }}
              value={workoutNotes}
              onChangeText={setWorkoutNotes}
              placeholder="How did the workout feel? Any observations..."
              placeholderTextColor="#A8A8A8"
              multiline
              textAlignVertical="top"
            />
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <TouchableOpacity
                style={{
                  backgroundColor: "#f5f5f5",
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
                  style={{ color: "#8A93A2", fontWeight: "600", fontSize: 14 }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: "#ef4444",
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
      </Modal>
    </SafeAreaView>
  );
}
