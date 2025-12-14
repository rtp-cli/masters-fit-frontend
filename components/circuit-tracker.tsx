import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { colors } from "@/lib/theme";
import CircularTimerDisplay from "./circular-timer-display";
import {
  CircuitTrackerProps,
  CircuitExerciseLog,
  CircuitRound,
  UseCircuitSessionReturn,
} from "@/types/api/circuit.types";
import { WorkoutBlockWithExercise } from "@/types/api/workout.types";
import { getRoundCompleteButtonText } from "@/utils/circuit-utils";
import CircuitTimer from "./circuit-timer";

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
  // TIMER DISPLAY HIDDEN: Override shouldShowTimer to false
  const hideTimers = false;
  const currentRoundData = sessionData.rounds[sessionData.currentRound - 1];
  const isCurrentRoundCompleted = currentRoundData?.isCompleted || false;

  // Navigation state
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

  // Timer visibility state
  const [showTimer, setShowTimer] = useState(false);

  // Local state for round notes to prevent re-rendering issues
  const [localRoundNotes, setLocalRoundNotes] = useState(
    currentRoundData?.notes || ""
  );

  // Horizontal scroll ref for exercise navigation
  const exerciseScrollRef = useRef<ScrollView>(null);
  const [containerWidth, setContainerWidth] = useState(
    Dimensions.get("window").width
  );
  const cardSpacing = 16;
  const cardWidth = Math.min(containerWidth * 0.88, containerWidth);
  const sideInset = (containerWidth - cardWidth) / 2;

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

  // Format timer display for compact view
  const formatTimerDisplay = () => {
    const minutes = Math.floor(sessionData.timer.currentTime / 60);
    const seconds = sessionData.timer.currentTime % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Handle scroll to specific exercise
  const scrollToExercise = (index: number) => {
    if (exerciseScrollRef.current) {
      exerciseScrollRef.current.scrollTo({
        x: sideInset + index * (cardWidth + cardSpacing),
        animated: true,
      });
    }
  };

  // Handle scroll end to update current exercise index
  const handleScrollEnd = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const adjustedX = contentOffsetX - sideInset;
    const newIndex = Math.round(adjustedX / (cardWidth + cardSpacing));
    if (
      newIndex !== currentExerciseIndex &&
      newIndex >= 0 &&
      newIndex < (currentRoundData?.exercises.length || 0)
    ) {
      setCurrentExerciseIndex(newIndex);
    }
  };

  const goToNextExercise = () => {
    if (canGoNext) {
      const nextIndex = currentExerciseIndex + 1;
      setCurrentExerciseIndex(nextIndex);
      scrollToExercise(nextIndex);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const goToPrevExercise = () => {
    if (canGoPrev) {
      const prevIndex = currentExerciseIndex - 1;
      setCurrentExerciseIndex(prevIndex);
      scrollToExercise(prevIndex);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Reset exercise index when round changes
  useEffect(() => {
    setCurrentExerciseIndex(0);
    scrollToExercise(0);
    setShowExerciseWork(false);
    setExerciseWorkActive(false);
    setExerciseWorkPaused(false);
    setExerciseWorkCountdown(0);
    // Update local notes when round changes
    setLocalRoundNotes(currentRoundData?.notes || "");
  }, [sessionData.currentRound, currentRoundData?.notes]);

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
        await circuitActions.completeRound(localRoundNotes);
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
            notes: localRoundNotes,
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
      // TIMER DISABLED: Exercise work timer timeout commented out
      // exerciseWorkTimerRef.current = setTimeout(() => {
      //   setExerciseWorkCountdown((prev) => {
      //     const newValue = prev - 1;
      //     if (newValue <= 0) {
      //       setExerciseWorkActive(false);
      //       setExerciseWorkPaused(false);
      //       setShowExerciseWork(false);
      //       try {
      //         Haptics.notificationAsync(
      //           Haptics.NotificationFeedbackType.Success
      //         );
      //         Notifications.scheduleNotificationAsync({
      //           content: {
      //             title: "Work Interval Complete!",
      //             body: "Great effort on that interval",
      //             sound: "tri-tone",
      //           },
      //           trigger: null,
      //         });
      //       } catch (error) {
      //         console.log("Notification error:", error);
      //       }
      //       return 0;
      //     }
      //     return newValue;
      //   });
      // }, 1000);
    } else {
      if (exerciseWorkTimerRef.current) {
        // TIMER DISABLED: Clear timeout commented out
        // clearTimeout(exerciseWorkTimerRef.current);
        exerciseWorkTimerRef.current = null;
      }
    }

    return () => {
      if (exerciseWorkTimerRef.current) {
        // TIMER DISABLED: Clear timeout commented out
        // clearTimeout(exerciseWorkTimerRef.current);
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

      {/* Exercise Navigation */}
      {currentRoundData && !isCurrentRoundCompleted && (
        <View className="mb-6">
          {/* Horizontal ScrollView for Exercise Cards */}
          <ScrollView
            ref={exerciseScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScrollEnd}
            snapToInterval={cardWidth + cardSpacing}
            snapToAlignment="start"
            decelerationRate="fast"
            contentInsetAdjustmentBehavior="never"
            contentContainerStyle={{ paddingHorizontal: sideInset }}
            scrollEventThrottle={16}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
            style={{ marginBottom: 16 }}
          >
            {currentRoundData.exercises.map((exercise, index) => {
              const blockExercise = block.exercises.find(
                (ex) => ex.id === exercise.planDayExerciseId
              );
              if (!blockExercise) return null;

              return (
                <View
                  key={exercise.planDayExerciseId}
                  style={{
                    width: cardWidth,
                    marginRight: cardSpacing,
                  }}
                >
                  <View className="p-5 rounded-lg border border-neutral-medium-1 bg-background">
                    <View className="flex-row items-center justify-between mb-5">
                      <View
                        className="w-8 h-8 rounded-full items-center justify-center"
                        style={{ backgroundColor: colors.brand.primary + "30" }}
                      >
                        <Text
                          className="text-sm font-semibold"
                          style={{ color: colors.brand.primary }}
                        >
                          {index + 1}
                        </Text>
                      </View>
                      <View className="flex-1 mx-3">
                        <Text className="text-base font-semibold text-text-primary">
                          {blockExercise.exercise.name}
                        </Text>
                        <Text className="text-xs text-text-muted mt-1">
                          Target: {exercise.targetReps} reps ×{" "}
                          {blockExercise.weight || 0} lbs
                        </Text>
                      </View>
                      <TouchableOpacity
                        className="p-2"
                        onPress={() => {
                          updateExerciseReps(
                            exercise.exerciseId,
                            exercise.targetReps
                          );
                          updateExerciseWeight(exercise.exerciseId, 0);
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
                    <View className="mb-5">
                      <Text className="text-xs mb-3 text-text-muted font-semibold">
                        Weight
                      </Text>
                      <View className="flex-row items-center justify-center gap-5">
                        <TouchableOpacity
                          className="w-10 h-10 rounded-full bg-neutral-light-2 items-center justify-center"
                          onPress={() =>
                            updateExerciseWeight(
                              exercise.exerciseId,
                              Math.max(0, (exercise.weight || 0) - 5)
                            )
                          }
                        >
                          <Text className="text-sm font-semibold text-text-primary">
                            -5
                          </Text>
                        </TouchableOpacity>

                        <View className="bg-background rounded-full px-4 py-3 border border-dashed border-neutral-medium-2 min-w-[80px] items-center">
                          <TextInput
                            className="text-lg font-bold text-center text-text-primary"
                            value={(exercise.weight || 0).toString()}
                            onChangeText={(text) =>
                              updateExerciseWeight(
                                exercise.exerciseId,
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
                              exercise.exerciseId,
                              (exercise.weight || 0) + 5
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
                      <View className="flex-row items-center justify-center gap-5">
                        <TouchableOpacity
                          className="w-10 h-10 rounded-full bg-neutral-light-2 items-center justify-center"
                          onPress={() =>
                            updateExerciseReps(
                              exercise.exerciseId,
                              Math.max(0, exercise.actualReps - 1)
                            )
                          }
                        >
                          <Ionicons
                            name="remove"
                            size={20}
                            color={colors.text.primary}
                          />
                        </TouchableOpacity>

                        <View className="bg-background rounded-full px-4 py-3 border border-dashed border-neutral-medium-2 min-w-[80px] items-center">
                          <TextInput
                            className="text-lg font-bold text-center text-text-primary"
                            value={exercise.actualReps.toString()}
                            onChangeText={(text) =>
                              updateExerciseReps(
                                exercise.exerciseId,
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
                              exercise.exerciseId,
                              exercise.actualReps + 1
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

                    {/* TIMER DISPLAY HIDDEN: Exercise Work Timer commented out */}
                    {/* {block.blockType === "tabata" &&
                      showExerciseWork &&
                      index === currentExerciseIndex && (
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
                      )} */}

                    {/* Start Exercise Work Button (Tabata) */}
                    {block.blockType === "tabata" &&
                      !showExerciseWork &&
                      index === currentExerciseIndex && (
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
                </View>
              );
            })}
          </ScrollView>

          {/* Progress Indicator Dots */}
          {currentRoundData.exercises.length > 1 && (
            <View className="flex-row justify-center items-center mb-4">
              {currentRoundData.exercises.map((_, index) => (
                <View
                  key={index}
                  className="rounded-full mx-1"
                  style={{
                    width: 8,
                    height: 8,
                    backgroundColor:
                      index === currentExerciseIndex
                        ? colors.brand.primary
                        : colors.neutral.medium[1],
                  }}
                />
              ))}
            </View>
          )}
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
            value={localRoundNotes}
            onChangeText={setLocalRoundNotes}
            multiline
            numberOfLines={2}
          />
        </View>
      )}

      {hideTimers && (
        <View className="mb-3">
          {/* Timer Toggle Button */}
          <TouchableOpacity
            className={`py-3 px-6 rounded-lg items-center border-2 ${
              showTimer
                ? "bg-brand-primary border-brand-primary"
                : "border-brand-primary bg-transparent"
            }`}
            onPress={() => setShowTimer(!showTimer)}
          >
            <Text
              className={`text-sm font-semibold ${
                showTimer ? "text-white" : ""
              }`}
              style={!showTimer ? { color: colors.brand.primary } : {}}
            >
              {showTimer ? "Hide Circuit Timer" : "Show Circuit Timer"}
            </Text>
          </TouchableOpacity>

          {/* Timer */}
          {showTimer && (
            <View className="bg-card rounded-2xl mt-2 p-6 border border-neutral-light-2">
              <CircuitTimer
                blockType={block.blockType || "circuit"}
                timeCapMinutes={block.timeCapMinutes}
                rounds={block.rounds}
                timerState={sessionData.timer}
                onTimerUpdate={updateTimerState}
                onTimerEvent={async (event) => {
                  if (
                    event === "completeRound" &&
                    circuitActions?.completeRound
                  ) {
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
            {/* Show both buttons for AMRAP after first round, or for circuits beyond prescribed rounds */}
            {(block.blockType === "amrap" && sessionData.currentRound >= 1) ||
            (sessionData.targetRounds &&
              sessionData.currentRound > sessionData.targetRounds &&
              block.blockType === "circuit") ? (
              <View className="gap-2">
                <TouchableOpacity
                  className={`py-3 px-4 rounded-lg items-center bg-brand-primary`}
                  onPress={handleCompleteRound}
                >
                  <Text className={`text-sm font-semibold text-white`}>
                    {getRoundCompleteButtonText(
                      block.blockType || "circuit",
                      sessionData.currentRound,
                      sessionData.targetRounds
                    )}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                className={`py-3 px-4 rounded-lg items-center bg-brand-primary`}
                onPress={
                  // For AMRAP, always complete round. For others, follow original logic
                  block.blockType === "amrap"
                    ? handleCompleteRound
                    : !sessionData.targetRounds ||
                      sessionData.currentRound >= sessionData.targetRounds
                    ? handleCompleteCircuit
                    : handleCompleteRound
                }
              >
                <Text className={`text-sm font-semibold text-white`}>
                  {getRoundCompleteButtonText(
                    block.blockType || "circuit",
                    sessionData.currentRound,
                    sessionData.targetRounds
                  )}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
    </ScrollView>
  );
}
