import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useThemeColors } from "@/lib/theme";
import {
  type CircuitTrackerProps,
  type UseCircuitSessionReturn,
} from "@/types/api/circuit.types";


// Type alias for circuit actions
type CircuitActions = UseCircuitSessionReturn["actions"];

export default function CircuitTracker({
  block,
  sessionData,
  onSessionUpdate,
  isActive,
  circuitActions,
}: CircuitTrackerProps & {
  circuitActions?: CircuitActions;
  // Still passed by the caller but the round-action UI (and its Undo) now lives
  // in the workout screen's fixed footer via CircuitRoundAction.
  canUndoRound?: boolean;
}) {
  const colors = useThemeColors();
  // [T5-3/MF-003] The circuit timer (toggle + CircuitTimer render) was removed
  // entirely — timers are not supported (owner decision).
  const currentRoundData = sessionData.rounds[sessionData.currentRound - 1];
  const isCurrentRoundCompleted = currentRoundData?.isCompleted || false;

  // Navigation state
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

  // Local state for round notes to prevent re-rendering issues
  const [localRoundNotes, setLocalRoundNotes] = useState(
    currentRoundData?.notes || ""
  );
  // Notes are collapsed behind an "Add a note" row until used — matches the
  // strength block (MF-012) so the Complete Round button stays above the fold.
  const [isRoundNotesExpanded, setIsRoundNotesExpanded] = useState(false);

  // Horizontal scroll ref for exercise navigation
  const exerciseScrollRef = useRef<ScrollView>(null);
  const [containerWidth, setContainerWidth] = useState(
    Dimensions.get("window").width
  );
  const cardSpacing = 16;
  const cardWidth = Math.min(containerWidth * 0.88, containerWidth);
  const sideInset = (containerWidth - cardWidth) / 2;

  // [T5-3/MF-003] The Tabata work timer (state + countdown + "Start Work"
  // button) was removed entirely — the countdown interval had long been
  // disabled, so the button was a live affordance that did nothing.


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

  // Reset exercise index when round changes
  useEffect(() => {
    setCurrentExerciseIndex(0);
    scrollToExercise(0);
    // Update local notes when round changes
    setLocalRoundNotes(currentRoundData?.notes || "");
  }, [sessionData.currentRound, currentRoundData?.notes]);

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

  // Round/circuit completion moved to CircuitRoundAction in the fixed footer
  // (see workout-screen.tsx). Notes typed here are flushed to the session via
  // updateRoundNotes on blur so that footer button preserves them.

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {/* Round Progress */}
      {(sessionData.targetRounds || sessionData.currentRound >= 1) && (
        <View className="mb-6">
          <View className="items-center">
            <Text className="text-lg font-bold text-text-primary">
              Round {sessionData.currentRound}
              {sessionData.targetRounds &&
                block.blockType !== "amrap" &&
                `/${sessionData.targetRounds}`}
            </Text>
            {/* Rep scheme (21-15-9): show the full ladder so the user
                knows what's coming; the current round's target prefills */}
            {block.protocolConfig?.repScheme && (
              <Text className="text-sm text-text-muted mt-1">
                Rep scheme: {block.protocolConfig.repScheme.join("-")}
              </Text>
            )}
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
                        className="size-8 rounded-full items-center justify-center"
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
                          className="size-10 rounded-full bg-neutral-light-2 items-center justify-center"
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
                          className="size-10 rounded-full items-center justify-center"
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
                            style={{ color: colors.contentOnPrimary }}
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
                          className="size-10 rounded-full bg-neutral-light-2 items-center justify-center"
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
                          className="size-10 rounded-full items-center justify-center"
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
                            color={colors.contentOnPrimary}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

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

      {/* Round Notes — collapsed behind an "Add a note" row unless already
          used, mirroring the strength block so the two block types match. */}
      {isActive && currentRoundData && !isCurrentRoundCompleted && (
        <View className="mb-6">
          {isRoundNotesExpanded || localRoundNotes ? (
            <>
              <Text className="text-sm font-semibold text-text-primary mb-2">
                Round Notes (Optional)
              </Text>
              <TextInput
                className="bg-background border border-neutral-light-2 rounded-xl p-3 text-text-primary text-sm"
                placeholder="Add notes about this round..."
                placeholderTextColor={colors.text.muted}
                value={localRoundNotes}
                onChangeText={setLocalRoundNotes}
                // Flush to the session on blur so the Complete Round button in
                // the footer (CircuitRoundAction) records the note.
                onEndEditing={() =>
                  circuitActions?.updateRoundNotes?.(localRoundNotes)
                }
                multiline
                numberOfLines={2}
              />
            </>
          ) : (
            <TouchableOpacity
              className="flex-row items-center justify-between"
              onPress={() => setIsRoundNotesExpanded(true)}
              accessibilityRole="button"
              accessibilityLabel="Add a note"
            >
              <Text className="text-sm font-semibold text-text-secondary">
                Add a note
              </Text>
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={colors.text.muted}
              />
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}
