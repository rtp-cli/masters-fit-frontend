import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { colors } from "@/lib/theme";
import CircularTimerDisplay from "./CircularTimerDisplay";
import {
  CircuitTrackerProps,
  CircuitExerciseLog,
  CircuitRound,
} from "@/types/api/circuit.types";
import { getRoundCompleteButtonText } from "@/utils/circuitUtils";

export default function CircuitTracker({
  block,
  sessionData,
  onSessionUpdate,
  onRoundComplete,
  onCircuitComplete,
  isActive,
  circuitActions, // Add circuit actions from the hook
}: CircuitTrackerProps & { circuitActions?: any }) {
  const currentRoundData = sessionData.rounds[sessionData.currentRound - 1];
  const isCurrentRoundCompleted = currentRoundData?.isCompleted || false;

  // Navigation state
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

  // Rest timer state
  const [exerciseRestActive, setExerciseRestActive] = useState(false);
  const [exerciseRestPaused, setExerciseRestPaused] = useState(false);
  const [exerciseRestCountdown, setExerciseRestCountdown] = useState(0);
  const [roundRestActive, setRoundRestActive] = useState(false);
  const [roundRestPaused, setRoundRestPaused] = useState(false);
  const [roundRestCountdown, setRoundRestCountdown] = useState(0);
  const [showExerciseRest, setShowExerciseRest] = useState(false);
  const [showRoundRest, setShowRoundRest] = useState(false);
  const exerciseRestTimerRef = useRef<NodeJS.Timeout | null>(null);
  const roundRestTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Tabata exercise work timer state
  const [exerciseWorkActive, setExerciseWorkActive] = useState(false);
  const [exerciseWorkPaused, setExerciseWorkPaused] = useState(false);
  const [exerciseWorkCountdown, setExerciseWorkCountdown] = useState(0);
  const [showExerciseWork, setShowExerciseWork] = useState(false);
  const exerciseWorkTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get current exercise
  const currentExercise = currentRoundData?.exercises[currentExerciseIndex];
  const currentBlockExercise = currentExercise
    ? block.exercises.find((ex) => ex.id === currentExercise.planDayExerciseId)
    : null;

  // Navigation functions
  const canGoNext =
    currentExerciseIndex < (currentRoundData?.exercises.length || 0) - 1;
  const canGoPrev = currentExerciseIndex > 0;

  const goToNextExercise = () => {
    if (canGoNext) {
      setCurrentExerciseIndex((prev) => prev + 1);
      setShowExerciseRest(false); // Hide rest timer when navigating
    }
  };

  const goToPrevExercise = () => {
    if (canGoPrev) {
      setCurrentExerciseIndex((prev) => prev - 1);
      setShowExerciseRest(false); // Hide rest timer when navigating
    }
  };

  // Reset exercise index when round changes
  useEffect(() => {
    setCurrentExerciseIndex(0);
    setShowExerciseRest(false);
    setShowRoundRest(false);
    setShowExerciseWork(false);
    setExerciseWorkActive(false);
    setExerciseWorkPaused(false);
    setExerciseWorkCountdown(0);
  }, [sessionData.currentRound]);

  // Get rest timer duration based on exercise or default
  const getExerciseRestDuration = () => {
    return currentBlockExercise?.restTime || 45; // Use exercise rest time or default 45s
  };

  const getRoundRestDuration = () => {
    return 90; // Standard 90s rest between rounds
  };

  // Tabata: work duration per exercise (seconds)
  const getExerciseWorkDuration = () => {
    if (block.blockType === "tabata") {
      return currentBlockExercise?.duration || 20; // default 20s for Tabata work
    }
    return currentBlockExercise?.duration || 0;
  };

  // Calculate metrics
  const completedRounds = sessionData.rounds.filter(
    (r) => r.isCompleted
  ).length;

  // Update exercise reps in current round
  const updateExerciseReps = (exerciseId: number, newReps: number) => {
    if (circuitActions?.updateExerciseReps) {
      circuitActions.updateExerciseReps(exerciseId, newReps);
    } else {
      // Fallback to manual update if actions not provided
      const updatedRounds = [...sessionData.rounds];
      const currentRoundIndex = sessionData.currentRound - 1;

      if (updatedRounds[currentRoundIndex]) {
        const exerciseIndex = updatedRounds[
          currentRoundIndex
        ].exercises.findIndex((ex) => ex.exerciseId === exerciseId);

        if (exerciseIndex !== -1) {
          updatedRounds[currentRoundIndex].exercises[exerciseIndex].actualReps =
            Math.max(0, newReps);
          updatedRounds[currentRoundIndex].exercises[exerciseIndex].completed =
            newReps > 0;

          const updatedSessionData = {
            ...sessionData,
            rounds: updatedRounds,
          };

          onSessionUpdate(updatedSessionData);
        }
      }
    }
  };

  // Update exercise weight in current round
  const updateExerciseWeight = (exerciseId: number, newWeight: number) => {
    if (circuitActions?.updateExerciseWeight) {
      circuitActions.updateExerciseWeight(exerciseId, newWeight);
    } else {
      // Fallback to manual update if actions not provided
      const updatedRounds = [...sessionData.rounds];
      const currentRoundIndex = sessionData.currentRound - 1;

      if (updatedRounds[currentRoundIndex]) {
        const exerciseIndex = updatedRounds[
          currentRoundIndex
        ].exercises.findIndex((ex) => ex.exerciseId === exerciseId);

        if (exerciseIndex !== -1) {
          updatedRounds[currentRoundIndex].exercises[exerciseIndex].weight =
            Math.max(0, newWeight);

          const updatedSessionData = {
            ...sessionData,
            rounds: updatedRounds,
          };

          onSessionUpdate(updatedSessionData);
        }
      }
    }
  };

  // Handle round completion
  const handleCompleteRound = async () => {
    if (isCurrentRoundCompleted) return;

    try {
      if (circuitActions?.completeRound) {
        await circuitActions.completeRound(currentRoundData?.notes);
      } else {
        // Fallback manual completion
        const updatedRounds = [...sessionData.rounds];
        const currentRoundIndex = sessionData.currentRound - 1;

        if (updatedRounds[currentRoundIndex]) {
          updatedRounds[currentRoundIndex] = {
            ...updatedRounds[currentRoundIndex],
            isCompleted: true,
            completedAt: new Date(),
            roundTimeSeconds: sessionData.timer.currentTime,
          };

          onRoundComplete(updatedRounds[currentRoundIndex]);

          // Check if we should advance to next round or complete circuit
          const nextRound = sessionData.currentRound + 1;
          const hasMoreRounds =
            !sessionData.targetRounds || nextRound <= sessionData.targetRounds;

          if (hasMoreRounds && block.blockType !== "for_time") {
            // Advance to next round for AMRAP, circuit, etc.
            const updatedSessionData = {
              ...sessionData,
              rounds: updatedRounds,
              currentRound: nextRound,
            };

            // Create next round if it doesn't exist
            if (!updatedSessionData.rounds[nextRound - 1]) {
              updatedSessionData.rounds.push(
                createNewRound(nextRound, block.exercises)
              );
            }

            onSessionUpdate(updatedSessionData);
          } else {
            // Complete circuit
            const completedSessionData = {
              ...sessionData,
              rounds: updatedRounds,
              isCompleted: true,
              completedAt: new Date(),
            };

            onSessionUpdate(completedSessionData);
            onCircuitComplete(completedSessionData);
          }

          // Start round rest timer if advancing to next round
          if (hasMoreRounds && block.blockType !== "for_time") {
            setTimeout(() => {
              startRoundRest();
            }, 1000); // Small delay after completing round
          }
        }
      }
    } catch (error) {
      console.error("Error completing round:", error);
    }
  };

  // Create a new round with all exercises
  const createNewRound = (
    roundNumber: number,
    exercises: any[]
  ): CircuitRound => ({
    roundNumber,
    exercises: exercises.map(
      (exercise): CircuitExerciseLog => ({
        exerciseId: exercise.exerciseId,
        planDayExerciseId: exercise.id,
        targetReps: exercise.reps || 0,
        actualReps: 0,
        weight: exercise.weight,
        completed: false,
        notes: "",
      })
    ),
    isCompleted: false,
    notes: "",
  });

  // Rest timer effects
  useEffect(() => {
    if (
      exerciseRestActive &&
      !exerciseRestPaused &&
      exerciseRestCountdown > 0
    ) {
      exerciseRestTimerRef.current = setTimeout(() => {
        setExerciseRestCountdown((prev) => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            setExerciseRestActive(false);
            setExerciseRestPaused(false);
            setShowExerciseRest(false);

            try {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              Notifications.scheduleNotificationAsync({
                content: {
                  title: "Exercise Rest Complete!",
                  body: "Ready for the next exercise",
                  sound: "tri-tone",
                },
                trigger: null,
              });
            } catch (error) {
              console.log("Notification error:", error);
            }

            return 0;
          }
          return newValue;
        });
      }, 1000);
    } else {
      if (exerciseRestTimerRef.current) {
        clearTimeout(exerciseRestTimerRef.current);
        exerciseRestTimerRef.current = null;
      }
    }

    return () => {
      if (exerciseRestTimerRef.current) {
        clearTimeout(exerciseRestTimerRef.current);
        exerciseRestTimerRef.current = null;
      }
    };
  }, [exerciseRestActive, exerciseRestPaused, exerciseRestCountdown]);

  useEffect(() => {
    if (roundRestActive && !roundRestPaused && roundRestCountdown > 0) {
      roundRestTimerRef.current = setTimeout(() => {
        setRoundRestCountdown((prev) => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            setRoundRestActive(false);
            setRoundRestPaused(false);
            setShowRoundRest(false);

            try {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              Notifications.scheduleNotificationAsync({
                content: {
                  title: "Round Rest Complete!",
                  body: "Ready for the next round",
                  sound: "tri-tone",
                },
                trigger: null,
              });
            } catch (error) {
              console.log("Notification error:", error);
            }

            return 0;
          }
          return newValue;
        });
      }, 1000);
    } else {
      if (roundRestTimerRef.current) {
        clearTimeout(roundRestTimerRef.current);
        roundRestTimerRef.current = null;
      }
    }

    return () => {
      if (roundRestTimerRef.current) {
        clearTimeout(roundRestTimerRef.current);
        roundRestTimerRef.current = null;
      }
    };
  }, [roundRestActive, roundRestPaused, roundRestCountdown]);

  // Exercise work timer effects (Tabata)
  useEffect(() => {
    if (
      exerciseWorkActive &&
      !exerciseWorkPaused &&
      exerciseWorkCountdown > 0
    ) {
      exerciseWorkTimerRef.current = setTimeout(() => {
        setExerciseWorkCountdown((prev) => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            setExerciseWorkActive(false);
            setExerciseWorkPaused(false);
            setShowExerciseWork(false);

            try {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              Notifications.scheduleNotificationAsync({
                content: {
                  title: "Work Interval Complete!",
                  body: "Great effort on that interval",
                  sound: "tri-tone",
                },
                trigger: null,
              });
            } catch (error) {
              console.log("Notification error:", error);
            }

            return 0;
          }
          return newValue;
        });
      }, 1000);
    } else {
      if (exerciseWorkTimerRef.current) {
        clearTimeout(exerciseWorkTimerRef.current);
        exerciseWorkTimerRef.current = null;
      }
    }

    return () => {
      if (exerciseWorkTimerRef.current) {
        clearTimeout(exerciseWorkTimerRef.current);
        exerciseWorkTimerRef.current = null;
      }
    };
  }, [exerciseWorkActive, exerciseWorkPaused, exerciseWorkCountdown]);

  // Master cleanup effect - ensures all timers are cleared on unmount
  useEffect(() => {
    return () => {
      // Clear all timer references on unmount
      if (exerciseRestTimerRef.current) {
        clearTimeout(exerciseRestTimerRef.current);
        exerciseRestTimerRef.current = null;
      }
      if (roundRestTimerRef.current) {
        clearTimeout(roundRestTimerRef.current);
        roundRestTimerRef.current = null;
      }
      if (exerciseWorkTimerRef.current) {
        clearTimeout(exerciseWorkTimerRef.current);
        exerciseWorkTimerRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount

  // Rest timer control functions
  const startExerciseRest = () => {
    const duration = getExerciseRestDuration();
    setExerciseRestCountdown(duration);
    setExerciseRestActive(true);
    setExerciseRestPaused(false);
    setShowExerciseRest(true);
  };

  const startRoundRest = () => {
    const duration = getRoundRestDuration();
    setRoundRestCountdown(duration);
    setRoundRestActive(true);
    setRoundRestPaused(false);
    setShowRoundRest(true);
  };

  const handleExerciseRestStartPause = () => {
    if (exerciseRestCountdown === 0) return;
    if (exerciseRestActive) {
      setExerciseRestPaused(!exerciseRestPaused);
    } else {
      startExerciseRest();
    }
  };

  const handleRoundRestStartPause = () => {
    if (roundRestCountdown === 0) return;
    if (roundRestActive) {
      setRoundRestPaused(!roundRestPaused);
    } else {
      startRoundRest();
    }
  };

  const handleExerciseRestReset = () => {
    const duration = getExerciseRestDuration();
    setExerciseRestCountdown(duration);
    setExerciseRestActive(true);
    setExerciseRestPaused(false);
  };

  const handleRoundRestReset = () => {
    const duration = getRoundRestDuration();
    setRoundRestCountdown(duration);
    setRoundRestActive(true);
    setRoundRestPaused(false);
  };

  const handleExerciseRestCancel = () => {
    setExerciseRestActive(false);
    setExerciseRestPaused(false);
    const duration = getExerciseRestDuration();
    setExerciseRestCountdown(duration);
    setShowExerciseRest(false);
  };

  const handleRoundRestCancel = () => {
    setRoundRestActive(false);
    setRoundRestPaused(false);
    const duration = getRoundRestDuration();
    setRoundRestCountdown(duration);
    setShowRoundRest(false);
  };

  // Check if current round can be completed (at least one exercise has reps)
  const canCompleteRound =
    currentRoundData?.exercises.some((ex) => ex.actualReps > 0) || false;

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {/* Round Progress */}
      {sessionData.targetRounds && sessionData.targetRounds > 1 && (
        <View className="mb-6">
          <View className="items-center">
            <Text className="text-lg font-bold text-text-primary">
              Round {sessionData.currentRound}/{sessionData.targetRounds}
            </Text>
            <Text className="text-sm text-text-muted mt-1">
              {sessionData.rounds.filter((r) => r.isCompleted).length} completed
            </Text>
          </View>
        </View>
      )}

      {/* Target Information */}
      <View className="mb-4">
        <Text className="text-xs text-text-muted">
          {currentRoundData.exercises.filter((ex) => ex.completed).length} /{" "}
          {currentRoundData.exercises.length} exercises completed
        </Text>
        <View className="h-0.5 mt-2 bg-neutral-medium-1" />
      </View>

      {/* Exercise Navigation */}
      {currentRoundData &&
        !isCurrentRoundCompleted &&
        currentExercise &&
        currentBlockExercise && (
          <View className="mb-6">
            {/* Current Exercise Card */}
            <View className="p-4 rounded-lg border border-neutral-medium-1 bg-background mb-4">
              <View className="flex-row items-center justify-between mb-4">
                <View
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: colors.brand.primary + "30" }}
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: colors.brand.primary }}
                  >
                    {currentExerciseIndex + 1}
                  </Text>
                </View>
                <View className="flex-1 mx-3">
                  <Text className="text-base font-semibold text-text-primary">
                    {currentBlockExercise.exercise.name}
                  </Text>
                  <Text className="text-xs text-text-muted mt-1">
                    Target: {currentExercise.targetReps} reps ×{" "}
                    {currentBlockExercise.weight || 0} lbs
                  </Text>
                </View>
                <TouchableOpacity
                  className="p-2"
                  onPress={() => {
                    updateExerciseReps(
                      currentExercise.exerciseId,
                      currentExercise.targetReps
                    );
                    updateExerciseWeight(
                      currentExercise.exerciseId,
                      currentBlockExercise.weight || 0
                    );
                  }}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={18}
                    color={colors.brand.primary}
                  />
                </TouchableOpacity>
              </View>

              {/* Weight Input */}
              <View className="mb-4">
                <Text className="text-xs mb-3 text-text-muted font-semibold">
                  Weight
                </Text>
                <View className="flex-row items-center justify-center gap-3">
                  <TouchableOpacity
                    className="w-10 h-10 rounded-full bg-neutral-light-2 items-center justify-center"
                    onPress={() =>
                      updateExerciseWeight(
                        currentExercise.exerciseId,
                        Math.max(0, (currentExercise.weight || 0) - 5)
                      )
                    }
                  >
                    <Text className="text-sm font-semibold text-text-primary">
                      -5
                    </Text>
                  </TouchableOpacity>

                  <View className="bg-background rounded-full px-6 py-4 border border-neutral-medium-1 min-w-[100px] items-center">
                    <Text className="text-xl font-bold text-center text-text-primary">
                      {currentExercise.weight || 0}
                    </Text>
                  </View>

                  <TouchableOpacity
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: colors.brand.primary }}
                    onPress={() =>
                      updateExerciseWeight(
                        currentExercise.exerciseId,
                        (currentExercise.weight || 0) + 5
                      )
                    }
                  >
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: colors.brand.secondary }}
                    >
                      +5
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Reps Input */}
              <View>
                <Text className="text-xs mb-3 text-text-muted font-semibold">
                  Reps
                </Text>
                <View className="flex-row items-center justify-center gap-4">
                  <TouchableOpacity
                    className="w-10 h-10 rounded-full bg-neutral-light-2 items-center justify-center"
                    onPress={() =>
                      updateExerciseReps(
                        currentExercise.exerciseId,
                        Math.max(0, currentExercise.actualReps - 1)
                      )
                    }
                  >
                    <Ionicons
                      name="remove"
                      size={20}
                      color={colors.text.primary}
                    />
                  </TouchableOpacity>

                  <View className="bg-background rounded-full px-6 py-4 border border-neutral-medium-1 min-w-[100px] items-center">
                    <Text className="text-xl font-bold text-center text-text-primary">
                      {currentExercise.actualReps}
                    </Text>
                  </View>

                  <TouchableOpacity
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: colors.brand.primary }}
                    onPress={() =>
                      updateExerciseReps(
                        currentExercise.exerciseId,
                        currentExercise.actualReps + 1
                      )
                    }
                  >
                    <Ionicons
                      name="add"
                      size={20}
                      color={colors.brand.secondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Exercise Work Timer (Tabata) */}
              {block.blockType === "tabata" && showExerciseWork && (
                <View className="mt-6">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-sm font-semibold text-text-primary flex-row items-center">
                      Work Timer
                    </Text>
                  </View>
                  <CircularTimerDisplay
                    countdown={exerciseWorkCountdown}
                    targetDuration={getExerciseWorkDuration()}
                    isActive={exerciseWorkActive}
                    isPaused={exerciseWorkPaused}
                    isCompleted={exerciseWorkCountdown === 0}
                    startButtonText="Start Work"
                    onStartPause={() => {
                      if (exerciseWorkCountdown === 0) {
                        const duration = getExerciseWorkDuration();
                        setExerciseWorkCountdown(duration);
                        setExerciseWorkActive(true);
                        setExerciseWorkPaused(false);
                      } else {
                        setExerciseWorkPaused(!exerciseWorkPaused);
                      }
                    }}
                    onReset={() => {
                      const duration = getExerciseWorkDuration();
                      setExerciseWorkCountdown(duration);
                      setExerciseWorkActive(true);
                      setExerciseWorkPaused(false);
                    }}
                    onCancel={() => {
                      setExerciseWorkActive(false);
                      setExerciseWorkPaused(false);
                      const duration = getExerciseWorkDuration();
                      setExerciseWorkCountdown(duration);
                      setShowExerciseWork(false);
                    }}
                  />
                </View>
              )}

              {/* Start Exercise Work Button (Tabata) */}
              {block.blockType === "tabata" && !showExerciseWork && (
                <View className="mt-4">
                  <TouchableOpacity
                    className="flex-row items-center justify-center py-3 px-6 rounded-lg border"
                    style={{
                      borderColor: colors.brand.primary,
                      backgroundColor: colors.brand.primary + "10",
                    }}
                    onPress={() => {
                      const duration = getExerciseWorkDuration();
                      setExerciseWorkCountdown(duration);
                      setExerciseWorkActive(true);
                      setExerciseWorkPaused(false);
                      setShowExerciseWork(true);
                    }}
                  >
                    <Ionicons
                      name="timer-outline"
                      size={20}
                      color={colors.brand.primary}
                    />
                    <Text
                      className="text-sm font-semibold ml-2"
                      style={{ color: colors.brand.primary }}
                    >
                      Start Work ({getExerciseWorkDuration()}s)
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Exercise Rest Timer */}
              {showExerciseRest && (
                <View className="mt-6">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-sm font-semibold text-text-primary flex-row items-center">
                      Exercise Rest Timer
                    </Text>
                  </View>
                  <CircularTimerDisplay
                    countdown={exerciseRestCountdown}
                    targetDuration={getExerciseRestDuration()}
                    isActive={exerciseRestActive}
                    isPaused={exerciseRestPaused}
                    isCompleted={exerciseRestCountdown === 0}
                    startButtonText="Start Rest"
                    onStartPause={handleExerciseRestStartPause}
                    onReset={handleExerciseRestReset}
                    onCancel={handleExerciseRestCancel}
                  />
                </View>
              )}

              {/* Start Exercise Rest Button */}
              {!showExerciseRest && (
                <View className="mt-4">
                  <TouchableOpacity
                    className="flex-row items-center justify-center py-3 px-6 rounded-lg border"
                    style={{
                      borderColor: colors.brand.primary,
                      backgroundColor: colors.brand.primary + "10",
                    }}
                    onPress={startExerciseRest}
                  >
                    <Ionicons
                      name="timer-outline"
                      size={20}
                      color={colors.brand.primary}
                    />
                    <Text
                      className="text-sm font-semibold ml-2"
                      style={{ color: colors.brand.primary }}
                    >
                      Start Rest ({getExerciseRestDuration()}s)
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Navigation Buttons Below Card */}
            <View className="flex-row items-center justify-center gap-4">
              <TouchableOpacity
                className={`w-12 h-12 rounded-full items-center justify-center border-2 ${
                  canGoPrev
                    ? "border-brand-primary bg-brand-primary"
                    : "border-neutral-medium-1 bg-neutral-light-2"
                }`}
                onPress={goToPrevExercise}
                disabled={!canGoPrev}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={canGoPrev ? colors.brand.secondary : colors.text.muted}
                />
              </TouchableOpacity>

              <View className="flex-row items-center px-3">
                <Text className="text-sm font-semibold text-text-primary">
                  {currentExerciseIndex + 1} of{" "}
                  {currentRoundData.exercises.length}
                </Text>
              </View>

              <TouchableOpacity
                className={`w-12 h-12 rounded-full items-center justify-center border-2 ${
                  canGoNext
                    ? "border-brand-primary bg-brand-primary"
                    : "border-neutral-medium-1 bg-neutral-light-2"
                }`}
                onPress={goToNextExercise}
                disabled={!canGoNext}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={canGoNext ? colors.brand.secondary : colors.text.muted}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

      {/* Round Rest Timer - Between rounds */}
      {!showRoundRest && !isCurrentRoundCompleted && (
        <View className="mb-6">
          <TouchableOpacity
            className="flex-row items-center justify-center py-3 px-6 rounded-lg border"
            style={{
              borderColor: colors.brand.primary,
              backgroundColor: colors.brand.primary + "10",
            }}
            onPress={startRoundRest}
          >
            <Ionicons
              name="timer-outline"
              size={20}
              color={colors.brand.primary}
            />
            <Text
              className="text-sm font-semibold ml-2"
              style={{ color: colors.brand.primary }}
            >
              Start Round Rest ({getRoundRestDuration()}s)
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* EMOM manual finish button below navigation */}
      {isActive && !isCurrentRoundCompleted && block.blockType === "emom" && (
        <View className="mb-6">
          <TouchableOpacity
            className={`py-4 rounded-xl items-center ${
              canCompleteRound ? "bg-brand-primary" : "bg-neutral-light-2"
            }`}
            onPress={handleCompleteRound}
            disabled={!canCompleteRound}
          >
            <Text
              className={`text-lg font-semibold ${
                canCompleteRound ? "text-white" : "text-text-muted"
              }`}
            >
              {getRoundCompleteButtonText(
                "for_time",
                sessionData.currentRound,
                sessionData.targetRounds
              )}
            </Text>
          </TouchableOpacity>

          {!canCompleteRound && (
            <View className="flex-row items-center">
              <Text className="text-xs text-text-muted text-center mt-2">
                Log reps for at least one exercise to complete the round
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Active Round Rest Timer */}
      {showRoundRest && (
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-semibold text-text-primary">
              Round Rest Timer
            </Text>
          </View>
          <CircularTimerDisplay
            countdown={roundRestCountdown}
            targetDuration={getRoundRestDuration()}
            isActive={roundRestActive}
            isPaused={roundRestPaused}
            isCompleted={roundRestCountdown === 0}
            startButtonText="Start Round Rest"
            onStartPause={handleRoundRestStartPause}
            onReset={handleRoundRestReset}
            onCancel={handleRoundRestCancel}
          />
        </View>
      )}

      {/* Completed Rounds Summary */}
      {completedRounds > 0 && (
        <View className="mb-6">
          <Text className="text-base font-semibold text-text-primary mb-3">
            Completed Rounds ({completedRounds})
          </Text>

          {sessionData.rounds
            .filter((round) => round.isCompleted)
            .map((round) => {
              const roundReps = round.exercises.reduce(
                (total, ex) => total + ex.actualReps,
                0
              );

              return (
                <View
                  key={round.roundNumber}
                  className="border border-neutral-medium-1 rounded-lg p-3 mb-2 bg-background"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View
                        className="w-6 h-6 rounded-full items-center justify-center mr-2"
                        style={{ backgroundColor: colors.brand.primary }}
                      >
                        <Ionicons
                          name="checkmark"
                          size={12}
                          color={colors.brand.secondary}
                        />
                      </View>
                      <Text className="text-sm font-semibold text-text-primary">
                        Round {round.roundNumber}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Text className="text-sm text-text-secondary">
                        {roundReps} reps
                      </Text>
                    </View>
                  </View>

                  {round.roundTimeSeconds && (
                    <View className="flex-row items-center">
                      <Text className="text-xs text-text-muted mt-1 ml-8">
                        Time: {Math.floor(round.roundTimeSeconds / 60)}:
                        {(round.roundTimeSeconds % 60)
                          .toString()
                          .padStart(2, "0")}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
        </View>
      )}

      {/* Complete Round Button - Hidden for EMOM (auto-completes) */}
      {isActive &&
        !isCurrentRoundCompleted &&
        !sessionData.isCompleted &&
        getRoundCompleteButtonText(
          block.blockType || "circuit",
          sessionData.currentRound,
          sessionData.targetRounds
        ) && (
          <View className="mb-6">
            <TouchableOpacity
              className={`py-4 rounded-xl items-center ${
                canCompleteRound ? "bg-brand-primary" : "bg-neutral-light-2"
              }`}
              onPress={handleCompleteRound}
              disabled={!canCompleteRound}
            >
              <Text
                className={`text-lg font-semibold ${
                  canCompleteRound ? "text-white" : "text-text-muted"
                }`}
              >
                {getRoundCompleteButtonText(
                  block.blockType || "circuit",
                  sessionData.currentRound,
                  sessionData.targetRounds
                )}
              </Text>
            </TouchableOpacity>

            {!canCompleteRound && (
              <View className="flex-row items-center">
                <Text className="text-xs text-text-muted text-center mt-2">
                  Log reps for at least one exercise to complete the round
                </Text>
              </View>
            )}
          </View>
        )}

      {/* Round Notes */}
      {isActive && currentRoundData && !isCurrentRoundCompleted && (
        <View className="mb-6">
          <Text className="text-sm font-semibold text-text-primary mb-2">
            Round Notes (Optional)
          </Text>
          <TextInput
            className="bg-background border border-neutral-light-2 rounded-xl p-3 text-text-primary text-sm"
            placeholder="Add notes about this round..."
            placeholderTextColor={colors.text.muted}
            value={currentRoundData.notes}
            onChangeText={(text) => {
              const updatedRounds = [...sessionData.rounds];
              const currentRoundIndex = sessionData.currentRound - 1;
              if (updatedRounds[currentRoundIndex]) {
                updatedRounds[currentRoundIndex].notes = text;
                onSessionUpdate({
                  ...sessionData,
                  rounds: updatedRounds,
                });
              }
            }}
            multiline
            numberOfLines={2}
          />
        </View>
      )}
    </ScrollView>
  );
}
