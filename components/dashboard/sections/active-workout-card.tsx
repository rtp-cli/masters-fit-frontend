import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity,View } from "react-native";

import NoActiveWorkoutCard, {
  type PlanEndedRecap,
} from "@/components/no-active-workout-card";
import {
  type PlanDayWithBlocks,
  type PlanDayWithExercises,
  type TodayWorkout,
  type WorkoutBlockWithExercises,
} from "@/types/api";

import { useThemeColors } from "../../../lib/theme";
import { formatNumber, formatWorkoutDuration } from "../../../utils";
import { derivePlanCycle, TrainingDayStrip } from "./training-day-strip";

type ActiveWorkoutCardProps = {
  workoutInfo: { name: string; description: string } | null;
  /** The active plan's days, used to build the rest-day training strip. */
  planDays?: PlanDayWithBlocks[];
  todaysWorkout: TodayWorkout | null;
  totalDurationMinutes: number;
  loadingToday: boolean;
  isWorkoutCompleted: boolean;
  todayCompletionRate: number;
  isGenerating: boolean;
  /** Recap of the most-recent finished plan, shown when no plan is active. */
  endedPlanRecap?: PlanEndedRecap | null;
  /** The recap is still being fetched (no-plan state) — show a skeleton. */
  endedPlanRecapLoading?: boolean;
  onViewWorkout: () => void;
  onShowWorkoutChoice: () => void;
  /** Rest-day escape hatch: open the "generate an optional workout" form
      directly, skipping the Workout tab + choice modal (saves two taps). */
  onGenerateRestDayWorkout: () => void;
  /** Training-locations 1a: the place today's session is built for (e.g. "My
      usual place"). Null hides the row (no location resolved yet). */
  todayLocationName?: string | null;
  /** Opens the location picker (1b). */
  onChangeLocation?: () => void;
  /** Rule 3: once the session is active the row disappears entirely — not
      disabled, gone. The dashboard passes workoutInProgress from context. */
  isSessionActive?: boolean;
};

const ActiveWorkoutCard: React.FC<ActiveWorkoutCardProps> = ({
  workoutInfo,
  planDays = [],
  todaysWorkout,
  totalDurationMinutes,
  loadingToday,
  isWorkoutCompleted,
  todayCompletionRate,
  isGenerating,
  endedPlanRecap,
  endedPlanRecapLoading,
  onViewWorkout,
  onShowWorkoutChoice,
  onGenerateRestDayWorkout,
  todayLocationName,
  onChangeLocation,
  isSessionActive,
}) => {
  const colors = useThemeColors();
  const getPlannedExercisesCount = (workout: TodayWorkout | null): number => {
    if (!workout) return 0;
    if ("blocks" in workout && workout.blocks) {
      return workout.blocks.reduce(
        (total: number, block: WorkoutBlockWithExercises) =>
          total + (block.exercises?.length || 0),
        0
      );
    }
    if ("exercises" in workout && (workout as PlanDayWithExercises).exercises) {
      return (workout as PlanDayWithExercises).exercises.length;
    }
    return 0;
  };

  const hasPlan = !!(workoutInfo || todaysWorkout);
  // Rest day = there's an active plan but nothing scheduled for today.
  const isRestDay = hasPlan && !todaysWorkout;
  const cycle = isRestDay ? derivePlanCycle(planDays) : null;

  return (
    <View className="px-4 mb-6">
      <View className="bg-surface rounded-2xl p-5 border border-neutral-medium-1">
        {/* No plan (1b) has neither an "Active Plan" title nor a right label —
            there's no plan to be resting from, so the header row is omitted. */}
        {hasPlan && (
          <View className="flex-row items-center justify-between mb-6">
            {/* "Plan" is the codebase's noun for this object (workoutPlan.name);
                the card shows the plan, not a single workout. */}
            <Text className="text-base font-semibold text-text-primary mb-1">
              Active Plan
            </Text>
            {todaysWorkout && totalDurationMinutes > 0 ? (
              <Text className="text-base font-semibold text-text-primary">
                {formatWorkoutDuration(totalDurationMinutes)}
              </Text>
            ) : workoutInfo ? (
              // Rest day: the right slot names the plan (not "Rest Day", which
              // the body already says once). Truncated so a long name can't
              // shove the "Active Plan" label off the row.
              <Text
                className="text-sm font-semibold text-text-muted"
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{ maxWidth: 190 }}
              >
                {workoutInfo.name}
              </Text>
            ) : null}
            {loadingToday && (
              <ActivityIndicator size="small" color={colors.brand.primary} />
            )}
          </View>
        )}

        {!hasPlan ? (
          <NoActiveWorkoutCard
            isGenerating={isGenerating}
            onShowWorkoutChoice={onShowWorkoutChoice}
            variant="dashboard"
            recap={endedPlanRecap ?? undefined}
            recapLoading={endedPlanRecapLoading}
          />
        ) : isRestDay && cycle ? (
          <View>
            <Text
              className="text-xl font-bold text-text-primary"
              style={{ letterSpacing: -0.2, lineHeight: 26 }}
            >
              Rest day.
            </Text>
            <Text
              className="text-sm text-text-secondary leading-6"
              style={{ marginTop: 6 }}
            >
              This one&rsquo;s scheduled. You&rsquo;ve done {cycle.doneCount} of
              your {cycle.totalCount} training days.
            </Text>

            {cycle.segments.length > 0 && (
              <TrainingDayStrip segments={cycle.segments} />
            )}

            {cycle.upNext && (
              <>
                <View
                  className="border-t border-neutral-medium-1"
                  style={{ marginTop: 18 }}
                />
                <TouchableOpacity
                  className="flex-row items-center justify-between pt-md"
                  onPress={onViewWorkout}
                  accessibilityRole="button"
                  accessibilityLabel={`Up next: ${cycle.upNext.name} on ${cycle.upNext.weekday}`}
                >
                  <View className="flex-1 mr-3">
                    <Text
                      className="text-xs font-bold text-text-muted uppercase mb-1"
                      style={{ letterSpacing: 0.78 }}
                    >
                      Up Next
                    </Text>
                    <Text className="text-base font-semibold text-text-primary">
                      {cycle.upNext.name} · {cycle.upNext.weekday}
                    </Text>
                    <Text className="text-xs text-text-muted">
                      {cycle.upNext.exerciseCount > 0
                        ? `${cycle.upNext.exerciseCount} exercises`
                        : "Exercises"}
                      {cycle.upNext.durationMinutes > 0
                        ? ` · about ${cycle.upNext.durationMinutes} min`
                        : ""}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.text.muted}
                  />
                </TouchableOpacity>
              </>
            )}

            {/* Secondary on purpose: on a scheduled rest day the app shouldn't
                shout down its own advice with a solid ink button. Goes straight
                to the "generate an optional workout" form rather than the
                Workout tab, so training on a rest day is one tap, not three. */}
            <TouchableOpacity
              className="border border-neutral-medium-2 rounded-md items-center justify-center mt-md"
              style={{ minHeight: 48 }}
              onPress={onGenerateRestDayWorkout}
              accessibilityRole="button"
              accessibilityLabel="Train anyway — generate an optional workout for today"
            >
              <Text className="text-sm font-semibold text-text-primary">
                Train anyway
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View className="flex-row items-center mb-6">
              <View className="size-16 rounded-full items-center justify-center mr-4 bg-primary">
                <Ionicons
                  name="heart-outline"
                  size={24}
                  color={colors.neutral.light[1]}
                />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-text-primary mb-1">
                  {workoutInfo?.name || "Workout Session"}
                </Text>
                <Text className="text-sm text-text-muted leading-5">
                  {workoutInfo?.description ||
                    `${getPlannedExercisesCount(
                      todaysWorkout
                    )} exercises planned`}
                </Text>
              </View>
            </View>

            {/* Training-locations 1a: states which place this session was built
                for. Renders even for a single-location user (the only place the
                plan states its assumption); disappears once the session starts
                (Rule 3) and after completion. */}
            {!isSessionActive &&
              !isWorkoutCompleted &&
              !!todayLocationName &&
              !!onChangeLocation && (
                <TouchableOpacity
                  onPress={onChangeLocation}
                  accessibilityRole="button"
                  accessibilityLabel={`Training at ${todayLocationName}. Change location.`}
                  className="flex-row items-center rounded-xl mb-4 border border-neutral-medium-1 bg-neutral-light-2"
                  style={{ paddingHorizontal: 18, paddingVertical: 14, minHeight: 44 }}
                >
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={colors.text.secondary}
                  />
                  <Text
                    className="text-base font-semibold text-text-primary ml-2 flex-1"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {todayLocationName}
                  </Text>
                  <Text className="text-sm text-text-muted mr-1">Change</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.text.muted}
                  />
                </TouchableOpacity>
              )}

            {isWorkoutCompleted ? (
              <View
                className="rounded-xl p-4 flex-row items-center"
                style={{ backgroundColor: colors.brand.primary + "15", borderColor: colors.brand.primary + "30", borderWidth: 1 }}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={colors.brand.primary}
                />
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-semibold text-text-primary">
                    Workout Completed!
                  </Text>
                  <Text className="text-xs text-text-muted">
                    Great job! {formatNumber(todayCompletionRate)}% completed
                  </Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                className="bg-primary rounded-xl p-4 items-center"
                onPress={onViewWorkout}
              >
                <Text className="text-content-on-primary font-semibold text-sm">
                  View Workout
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

export default ActiveWorkoutCard;
