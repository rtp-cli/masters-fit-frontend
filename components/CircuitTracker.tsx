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
  UseCircuitSessionReturn,
} from "@/types/api/circuit.types";
import { WorkoutBlockWithExercise } from "@/types/api/workout.types";
import { getRoundCompleteButtonText } from "@/utils/circuitUtils";
import CircuitTimer from "./CircuitTimer";

// Type alias for circuit actions
type CircuitActions = UseCircuitSessionReturn["actions"];

export default function CircuitTracker({
  block,
  sessionData,
  onSessionUpdate,
  onRoundComplete,
  onCircuitComplete,
  isActive,
  circuitActions, // Add circuit actions from the hook
  updateTimerState,
  shouldShowTimer,
}: CircuitTrackerProps & { circuitActions?: CircuitActions }) {
  const currentRoundData = sessionData.rounds[sessionData.currentRound - 1];
  const isCurrentRoundCompleted = currentRoundData?.isCompleted || false;

  // Navigation state
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

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
  const completedRounds = sessionData.rounds.filter(
    (r) => r.isCompleted
  ).length;

  const goToNextExercise = () => {
    if (canGoNext) {
      setCurrentExerciseIndex((prev) => prev + 1);
    }
  };

  const goToPrevExercise = () => {
    if (canGoPrev) {
      setCurrentExerciseIndex((prev) => prev - 1);
    }
  };

  // Reset exercise index when round changes
  useEffect(() => {
    setCurrentExerciseIndex(0);
    setShowExerciseWork(false);
    setExerciseWorkActive(false);
    setExerciseWorkPaused(false);
    setExerciseWorkCountdown(0);
  }, [sessionData.currentRound]);

  // Tabata: work duration per exercise (seconds)
  const getExerciseWorkDuration = () => {
    if (block.blockType === "tabata") {
      return currentBlockExercise?.duration || 20; // default 20s for Tabata work
    }
    return currentBlockExercise?.duration || 0;
  };

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
            // Don't complete circuit here - let the "Complete Circuit" button handle it
            // Just update the session with the completed round
            onSessionUpdate({
              ...sessionData,
              rounds: updatedRounds,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error completing round:", error);
    }
  };

  // Handle circuit completion
  const handleCompleteCircuit = async () => {
    try {
      if (circuitActions?.completeCircuit) {
        await circuitActions.completeCircuit();
        onCircuitComplete(sessionData);
      }
    } catch (error) {
      console.error("Error completing circuit:", error);
    }
  };

  // Create a new round with all exercises
  const createNewRound = (
    roundNumber: number,
    exercises: WorkoutBlockWithExercise[]
  ): CircuitRound => ({
    roundNumber,
    exercises: exercises.map(
      (exercise): CircuitExerciseLog => ({
        exerciseId: exercise.exerciseId,
        planDayExerciseId: exercise.id,
        targetReps: exercise.reps || 0,
        actualReps: exercise.reps || 0,
        weight: exercise.weight,
        completed: false,
        notes: "",
      })
    ),
    isCompleted: false,
    notes: "",
  });

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

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {/* Round Progress */}
      {(sessionData.targetRounds || sessionData.currentRound >= 1) && (
        <View className="mb-6">
          <View className="items-center">
            <Text className="text-lg font-bold text-text-primary">
              Round {sessionData.currentRound}
              {sessionData.targetRounds && `/${sessionData.targetRounds}`}
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

                  <View className="bg-background rounded-full px-6 py-4 border border-dashed border-neutral-medium-2 min-w-[100px] items-center">
                    <TextInput
                      className="text-xl font-bold text-center text-text-primary"
                      value={(currentExercise.weight || 0).toString()}
                      onChangeText={(text) =>
                        updateExerciseWeight(
                          currentExercise.exerciseId,
                          parseFloat(text) || 0
                        )
                      }
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.text.muted}
                    />
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

                  <View className="bg-background rounded-full px-6 py-4 border border-dashed border-neutral-medium-2 min-w-[100px] items-center">
                    <TextInput
                      className="text-xl font-bold text-center text-text-primary"
                      value={currentExercise.actualReps.toString()}
                      onChangeText={(text) =>
                        updateExerciseReps(
                          currentExercise.exerciseId,
                          parseInt(text) || 0
                        )
                      }
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.text.muted}
                    />
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

      {/* EMOM manual finish button below navigation */}
      {isActive && !isCurrentRoundCompleted && block.blockType === "emom" && (
        <View className="mb-6">
          <TouchableOpacity
            className={`py-4 rounded-xl items-center bg-brand-primary`}
            onPress={handleCompleteRound}
          >
            <Text className={`text-lg font-semibold text-white`}>
              {getRoundCompleteButtonText(
                "for_time",
                sessionData.currentRound,
                sessionData.targetRounds
              )}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {shouldShowTimer && (
        <View className="bg-card rounded-2xl p-6 border shadow-sm border-neutral-light-2">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-semibold text-text-primary">
              Circuit Timer
            </Text>
            <Text className="text-xs text-text-muted">
              {block.timeCapMinutes
                ? `${block.timeCapMinutes} minute time cap`
                : block.blockType === "for_time"
                ? "Complete as fast as possible"
                : "Elapsed time"}
            </Text>
          </View>
          <CircuitTimer
            blockType={block.blockType || "circuit"}
            timeCapMinutes={block.timeCapMinutes}
            rounds={block.rounds}
            timerState={sessionData.timer}
            onTimerUpdate={updateTimerState}
            onTimerEvent={async (event) => {
              if (event === "completeRound" && circuitActions?.completeRound) {
                try {
                  await circuitActions.completeRound(
                    "Auto-completed: minute ended"
                  );
                } catch (error) {
                  console.error("Error auto-completing EMOM round:", error);
                }
              }
            }}
            disabled={!isActive}
          />
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
              className={`py-4 rounded-xl items-center bg-brand-primary`}
              onPress={
                !sessionData.targetRounds ||
                sessionData.currentRound >= sessionData.targetRounds
                  ? handleCompleteCircuit
                  : handleCompleteRound
              }
            >
              <Text className={`text-lg font-semibold text-white`}>
                {getRoundCompleteButtonText(
                  block.blockType || "circuit",
                  sessionData.currentRound,
                  sessionData.targetRounds
                )}
              </Text>
            </TouchableOpacity>
          </View>
        )}
    </ScrollView>
  );
}
