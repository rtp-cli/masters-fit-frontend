import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/theme";
import {
  PlanDayWithBlocks,
  WorkoutBlockWithExercises,
  getBlockTypeDisplayName,
} from "@/types/api/workout.types";
import { ExerciseLog, PlanDayLog } from "@/types/api/logs.types";
import { isCircuitBlock, isWarmupCooldownBlock } from "@/utils/circuit-utils";
import { getPlanDayLog, fetchExerciseLogsForPlanDay } from "@/lib/workouts";
import { SkeletonLoader } from "@/components/skeletons/skeleton-loader";

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const getBlockIcon = (blockType?: string) => {
  const icons: Record<string, string> = {
    traditional: "barbell-outline",
    amrap: "timer-outline",
    emom: "stopwatch-outline",
    for_time: "flash-outline",
    circuit: "refresh-circle-outline",
    tabata: "pulse-outline",
    warmup: "sunny-outline",
    cooldown: "moon-outline",
    superset: "layers-outline",
    flow: "water-outline",
  };
  return icons[blockType || ""] || "fitness-outline";
};

function SummarySkeleton({ compact }: { compact: boolean }) {
  return (
    <View className="flex-1 bg-background">
      {/* Header skeleton */}
      {compact ? (
        <View className="px-4 pt-4 pb-4">
          <View className="flex-row items-center mb-2">
            <SkeletonLoader width={18} height={18} variant="circular" />
            <View className="ml-2 flex-1">
              <SkeletonLoader width="60%" height={18} variant="text" />
            </View>
          </View>
          <View className="ml-7">
            <SkeletonLoader width="40%" height={12} variant="text" />
          </View>
        </View>
      ) : (
        <View className="items-center pt-10 pb-6 px-6">
          <SkeletonLoader width={48} height={48} variant="circular" />
          <View className="mt-4 mb-2 w-full items-center">
            <SkeletonLoader width="50%" height={24} variant="text" />
          </View>
          <SkeletonLoader width="35%" height={14} variant="text" />
        </View>
      )}
      {/* Block skeletons */}
      <View className="px-4">
        {[1, 2, 3].map((i) => (
          <View key={i} className="mb-4">
            <SkeletonLoader
              width="100%"
              height={56}
              style={{
                borderRadius: 12,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
              }}
            />
            <View className="bg-surface rounded-b-xl border border-t-0 border-neutral-light-2 p-4">
              <SkeletonLoader
                width="70%"
                height={14}
                variant="text"
                style={{ marginBottom: 8 }}
              />
              <SkeletonLoader width="50%" height={14} variant="text" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

interface WorkoutSummaryProps {
  workout: PlanDayWithBlocks;
  footer?: React.ReactNode;
  /** Compact header for inline use (e.g. calendar tab) */
  compact?: boolean;
}

export default function WorkoutSummary({
  workout,
  footer,
  compact = false,
}: WorkoutSummaryProps) {
  const colors = useThemeColors();
  const [planDayLog, setPlanDayLog] = useState<PlanDayLog | null>(null);
  const [exerciseLogs, setExerciseLogs] = useState<
    Record<number, ExerciseLog[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [collapsedBlocks, setCollapsedBlocks] = useState<
    Record<number, boolean>
  >({});

  const toggleBlock = (blockId: number) => {
    setCollapsedBlocks((prev) => ({
      ...prev,
      [blockId]: !prev[blockId],
    }));
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [log, logs] = await Promise.all([
        getPlanDayLog(workout.id),
        fetchExerciseLogsForPlanDay(workout.id),
      ]);
      setPlanDayLog(log);
      setExerciseLogs(logs);
      setLoading(false);
    };
    loadData();
  }, [workout.id]);

  if (loading) {
    return <SummarySkeleton compact={compact} />;
  }

  // Determine skip/complete status from logs
  const allExercises = workout.blocks.flatMap((b) => b.exercises);
  const completedCount = allExercises.filter(
    (e) => (exerciseLogs[e.id] || []).length > 0
  ).length;
  const skippedCount = allExercises.filter(
    (e) => (exerciseLogs[e.id] || []).length === 0
  ).length;
  const duration = planDayLog?.totalTimeSeconds || 0;

  const isExerciseSkipped = (exerciseId: number): boolean => {
    return (exerciseLogs[exerciseId] || []).length === 0;
  };

  const getRoundCount = (block: WorkoutBlockWithExercises): number => {
    if (!isCircuitBlock(block.blockType)) return 0;
    const firstExercise = block.exercises[0];
    if (!firstExercise) return 0;
    return (exerciseLogs[firstExercise.id] || []).length;
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        {compact ? (
          <View className="px-4 pt-4 pb-2 flex-row">
            <Ionicons
              name="checkmark-circle"
              size={28}
              color={colors.brand.primary}
              style={{ marginTop: 2 }}
            />
            <View className="flex-1 ml-3">
              <Text className="text-lg font-bold text-text-primary">
                {workout.name || "Workout"}
              </Text>
              <View className="flex-row items-center mt-1">
                {duration > 0 && (
                  <>
                    <Text className="text-text-muted text-xs">
                      {formatTime(duration)}
                    </Text>
                    <Text className="text-text-muted text-xs mx-1.5">·</Text>
                  </>
                )}
                <Text className="text-text-muted text-xs">
                  {completedCount} exercise{completedCount !== 1 ? "s" : ""}
                </Text>
                {skippedCount > 0 && (
                  <Text className="text-text-muted text-xs">
                    {" "}· {skippedCount} skipped
                  </Text>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View className="items-center pt-10 pb-6 px-6">
            <Ionicons
              name="checkmark-circle"
              size={48}
              color={colors.brand.primary}
            />
            <Text className="text-2xl font-bold text-text-primary text-center mt-4 mb-2">
              Workout Complete!
            </Text>
            <View className="flex-row items-center justify-center">
              {duration > 0 && (
                <>
                  <Ionicons name="time-outline" size={14} color={colors.text.muted} />
                  <Text className="text-text-muted text-sm ml-1">
                    {formatTime(duration)}
                  </Text>
                  <Text className="text-text-muted text-sm mx-1.5">·</Text>
                </>
              )}
              <Text className="text-text-muted text-sm">
                {completedCount} exercise{completedCount !== 1 ? "s" : ""}
              </Text>
              {skippedCount > 0 && (
                <Text className="text-text-muted text-sm">
                  {" "}· {skippedCount} skipped
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Block & Exercise Breakdown */}
        <View className={compact ? "px-4 mt-4" : "px-4"}>
          {workout.blocks.map((block) => {
            const blockExercises = block.exercises;
            const roundCount = getRoundCount(block);
            const isCircuit = isCircuitBlock(block.blockType);
            const isWarmupCooldown = isWarmupCooldownBlock(block.blockType);
            const isCollapsed = collapsedBlocks[block.id] ?? false;

            return (
              <View key={block.id} className="mb-4">
                {/* Block Header — tappable to collapse */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => toggleBlock(block.id)}
                  className={`bg-brand-light-2 p-4 ${isCollapsed ? "rounded-xl" : "rounded-t-xl"}`}
                >
                  <View className="flex-row items-center">
                    <View className="size-8 rounded-full bg-white/20 items-center justify-center mr-3">
                      <Ionicons
                        name={getBlockIcon(block.blockType) as any}
                        size={16}
                        color={colors.text.primary}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-text-primary text-base">
                        {block.blockName ||
                          getBlockTypeDisplayName(block.blockType)}
                      </Text>
                      {isCircuit && roundCount > 0 && (
                        <Text className="text-text-secondary text-sm mt-1">
                          {roundCount} round{roundCount !== 1 ? "s" : ""}{" "}
                          completed
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Exercises in Block — collapsible */}
                {!isCollapsed && (
                  <View className="bg-surface rounded-b-xl border border-t-0 border-neutral-light-2">
                    {blockExercises.map((exercise, exerciseIndex) => {
                      const logs = exerciseLogs[exercise.id] || [];
                      const skipped = isExerciseSkipped(exercise.id);
                      const isLast =
                        exerciseIndex === blockExercises.length - 1;

                      const allSets = logs.flatMap((log) =>
                        (log.sets || []).map((set) => ({
                          ...set,
                          logRoundNumber: log.roundNumber,
                        }))
                      );

                      return (
                        <View
                          key={exercise.id}
                          className={`p-4 ${!isLast ? "border-b border-neutral-light-2" : ""}`}
                        >
                          {/* Exercise Header */}
                          <View className="flex-row items-center mb-1">
                            <View
                              className={`size-6 rounded-full items-center justify-center mr-2 ${
                                skipped
                                  ? "bg-neutral-medium-1"
                                  : "bg-brand-primary"
                              }`}
                            >
                              <Ionicons
                                name={
                                  skipped ? "play-skip-forward" : "checkmark"
                                }
                                size={12}
                                color={colors.contentOnPrimary}
                              />
                            </View>
                            <Text className="font-semibold text-text-primary text-sm flex-1">
                              {exercise.exercise.name}
                            </Text>
                          </View>

                          {/* Logged Data */}
                          {skipped ? (
                            <Text className="text-text-muted text-xs ml-8">
                              Skipped
                            </Text>
                          ) : isWarmupCooldown ? (
                            <Text className="text-text-muted text-xs ml-8">
                              Completed
                            </Text>
                          ) : isCircuit && allSets.length > 0 ? (
                            <Text className="text-text-muted text-xs ml-8">
                              {allSets[0]?.weight &&
                              Number(allSets[0].weight) > 0
                                ? `${allSets[0].weight} lbs × `
                                : ""}
                              {allSets[0]?.reps || 0} reps × {logs.length} round
                              {logs.length !== 1 ? "s" : ""}
                            </Text>
                          ) : allSets.length > 0 ? (
                            <View className="ml-8">
                              {allSets.map((set, setIdx) => (
                                <Text
                                  key={setIdx}
                                  className="text-text-muted text-xs leading-5"
                                >
                                  Set {set.setNumber}:{" "}
                                  {set.weight && Number(set.weight) > 0
                                    ? `${set.weight} lbs × `
                                    : ""}
                                  {set.reps} reps
                                </Text>
                              ))}
                            </View>
                          ) : logs.length > 0 && logs[0].durationCompleted ? (
                            <Text className="text-text-muted text-xs ml-8">
                              Duration: {logs[0].durationCompleted}s
                            </Text>
                          ) : logs.length > 0 ? (
                            <Text className="text-text-muted text-xs ml-8">
                              Completed
                            </Text>
                          ) : (
                            <Text className="text-text-muted text-xs ml-8">
                              No data
                            </Text>
                          )}

                          {/* Notes */}
                          {logs.length > 0 && logs[0].notes ? (
                            <Text className="text-text-muted text-xs italic ml-8 mt-1">
                              {logs[0].notes}
                            </Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Footer */}
        {footer}
      </ScrollView>
    </View>
  );
}
