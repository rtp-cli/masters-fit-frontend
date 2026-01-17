import React from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/theme";
import { formatEquipment } from "@/utils";
import AdaptiveSetTracker from "@/components/adaptive-set-tracker";
import {
  WorkoutBlockWithExercise,
  WorkoutBlockWithExercises,
} from "@/types/api/workout.types";
import { ExerciseSet } from "@/components/set-tracker";

interface ExerciseProgress {
  setsCompleted: number;
  repsCompleted: number;
  roundsCompleted: number;
  weightUsed: number;
  sets: ExerciseSet[];
  duration: number;
  restTime: number;
  notes: string;
  isSkipped?: boolean;
}

interface CurrentExerciseCardProps {
  exercise: WorkoutBlockWithExercise;
  progress: ExerciseProgress;
  block: WorkoutBlockWithExercises | null;
  isWorkoutStarted: boolean;
  isWarmupCooldown: boolean;
  scrollViewRef: React.RefObject<ScrollView | null>;
  exerciseHeadingRef: React.RefObject<View | null>;
  onUpdateProgress: <K extends keyof ExerciseProgress>(
    field: K,
    value: ExerciseProgress[K]
  ) => void;
}

export function CurrentExerciseCard({
  exercise,
  progress,
  block,
  isWorkoutStarted,
  isWarmupCooldown,
  scrollViewRef,
  exerciseHeadingRef,
  onUpdateProgress,
}: CurrentExerciseCardProps) {
  const colors = useThemeColors();

  return (
    <View
      ref={exerciseHeadingRef}
      className="bg-card rounded-2xl mb-6 p-6 border font-bold border-neutral-light-2"
    >
      <Text className="text-xl font-bold text-text-primary mb-3">
        {exercise.exercise.name}
      </Text>

      {exercise.exercise.link && (
        <TouchableOpacity
          onPress={() =>
            scrollViewRef.current?.scrollTo({
              y: 0,
              animated: true,
            })
          }
          className="flex-row items-center gap-1 px-2 py-1 bg-brand-primary/10 rounded-full self-start mb-3"
        >
          <Ionicons
            name="play-circle-outline"
            size={14}
            color={colors.brand.primary}
          />
          <Text className="text-xs text-brand-primary">Video Available</Text>
        </TouchableOpacity>
      )}

      <Text className="text-sm text-text-primary leading-6 mb-3">
        {exercise.exercise.description}
      </Text>

      {/* Equipment */}
      {exercise.exercise.equipment ? (
        <View className="flex-row justify-start items-center">
          <View className="flex-col items-start justify-center mb-2">
            <View className="flex-row items-center mb-2">
              <Ionicons
                name="fitness-outline"
                size={16}
                color={colors.text.muted}
              />
              <Text className="text-sm font-semibold text-text-muted mx-2">
                Equipment
              </Text>
            </View>
            <View className="flex-row items-center justify-center flex-wrap">
              {exercise.exercise.equipment.split(",").map((equipment, index) => (
                <View
                  key={index}
                  className=" bg-brand-primary rounded-full px-3 py-1 mr-2"
                >
                  <Text className="text-xs text-content-on-primary font-semibold">
                    {formatEquipment(equipment.trim())}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : null}

      {isWorkoutStarted && progress ? (
        <View className="space-y-4">
          {/* Show simplified interface for warmup/cooldown */}
          {isWarmupCooldown ? (
            <WarmupCooldownInterface
              exercise={exercise}
              blockType={block?.blockType}
            />
          ) : (
            /* Traditional Exercise Logging Interface for main workout */
            <TraditionalExerciseInterface
              exercise={exercise}
              progress={progress}
              block={block}
              onUpdateProgress={onUpdateProgress}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

// Sub-component for warmup/cooldown
function WarmupCooldownInterface({
  exercise,
  blockType,
}: {
  exercise: WorkoutBlockWithExercise;
  blockType?: string;
}) {
  return (
    <View>
      {/* Show target parameters in a structured layout matching the main interface */}
      {(exercise.duration || exercise.reps || exercise.sets) && (
        <View className="flex items-center bg-background rounded-xl pt-6">
          <View className="flex-row flex-wrap gap-3">
            {exercise.sets && (
              <View className="flex-row items-center">
                <Text className="text-sm text-text-muted mr-1">Sets:</Text>
                <Text className="text-sm font-semibold text-text-primary">
                  {exercise.sets}
                </Text>
              </View>
            )}
            {exercise.reps && (
              <View className="flex-row items-center">
                <Text className="text-sm text-text-muted mr-1">Reps:</Text>
                <Text className="text-sm font-semibold text-text-primary">
                  {exercise.reps}
                </Text>
              </View>
            )}
            {exercise.duration && (
              <View className="flex-row items-center">
                <Text className="text-sm text-text-muted mr-1">Duration:</Text>
                <Text className="text-sm font-semibold text-text-primary">
                  {exercise.duration}s
                </Text>
              </View>
            )}
          </View>
          <Text className="text-xs text-text-muted mt-2 leading-4">
            {blockType === "warmup"
              ? "Prepare your muscles and joints for the workout ahead."
              : "Focus on stretching and recovery to wind down."}
          </Text>
        </View>
      )}

      {/* Show message when no specific targets are set */}
      {!exercise.duration && !exercise.reps && !exercise.sets && (
        <View className="bg-background rounded-xl p-3 border border-neutral-light-2">
          <Text className="text-sm text-text-secondary text-center leading-5">
            {blockType === "warmup"
              ? "Take your time to properly warm up your muscles and prepare for the workout."
              : "Focus on stretching and recovery. Take the time you need to cool down properly."}
          </Text>
        </View>
      )}
    </View>
  );
}

// Sub-component for traditional exercise logging
function TraditionalExerciseInterface({
  exercise,
  progress,
  block,
  onUpdateProgress,
}: {
  exercise: WorkoutBlockWithExercise;
  progress: ExerciseProgress;
  block: WorkoutBlockWithExercises | null;
  onUpdateProgress: <K extends keyof ExerciseProgress>(
    field: K,
    value: ExerciseProgress[K]
  ) => void;
}) {
  const colors = useThemeColors();

  return (
    <>
      {/* Rounds - Show if block has multiple rounds */}
      {block && block.rounds && block.rounds > 1 ? (
        <View className="rounded-2xl p-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-semibold text-text-primary">
              Rounds
            </Text>
            <Text className="text-xs text-text-muted">
              Target: {block.rounds} Rounds
            </Text>
          </View>
          <View className="flex-row justify-center gap-2">
            {Array.from({ length: block.rounds }, (_, i) => {
              const isCompleted = i < (progress?.roundsCompleted || 0);
              return (
                <TouchableOpacity
                  key={i}
                  className={`w-9 h-9 rounded-full items-center justify-center border-2 ${
                    isCompleted
                      ? "border-primary bg-primary"
                      : "border-neutral-medium-1 bg-background"
                  }`}
                  onPress={() => onUpdateProgress("roundsCompleted", i + 1)}
                >
                  {isCompleted ? (
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color={colors.contentOnPrimary}
                    />
                  ) : (
                    <Text className="text-xs font-semibold text-text-muted">
                      {i + 1}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Traditional Exercise Logging Interface */}
      <View className="rounded-2xl p-4">
        <AdaptiveSetTracker
          exercise={exercise}
          sets={progress.sets}
          onSetsChange={(sets) => onUpdateProgress("sets", sets)}
          onProgressUpdate={(progressUpdate) => {
            onUpdateProgress("setsCompleted", progressUpdate.setsCompleted);
            onUpdateProgress("duration", progressUpdate.duration);
          }}
          blockType={block?.blockType}
        />
      </View>

      {/* Notes - Compact with quick chips */}
      <View className="rounded-2xl p-4">
        <Text className="text-sm font-semibold text-text-primary mb-3">
          Notes
        </Text>
        <TextInput
          className="bg-background border border-neutral-light-2 rounded-xl p-3 text-text-primary text-sm"
          placeholder="Add a note... (Optional)"
          placeholderTextColor={colors.text.muted}
          value={progress.notes}
          onChangeText={(text) => onUpdateProgress("notes", text)}
          multiline
          numberOfLines={2}
        />
      </View>
    </>
  );
}


