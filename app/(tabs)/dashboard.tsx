import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { useDashboard } from "@hooks/useDashboard";
import { SimpleCircularProgress } from "@components/charts/CircularProgress";
import { BarChart } from "@components/charts/BarChart";
import { LineChart } from "@components/charts/LineChart";
import { PieChart } from "@components/charts/PieChart";
import {
  formatDate,
  formatNumber,
  formatDuration,
  calculateWorkoutDuration,
  getCurrentDate,
} from "../../utils";
import { fetchActiveWorkout } from "@lib/workouts";
import {
  WorkoutWithDetails,
  PlanDayWithExercises,
  PlanDayWithExercise,
} from "../types";
import { Ionicons } from "@expo/vector-icons";

// Goal name mappings
const goalNames: Record<string, string> = {
  weight_loss: "Weight Loss",
  muscle_gain: "Muscle Gain",
  strength: "Strength",
  endurance: "Endurance",
  flexibility: "Flexibility",
  general_fitness: "General Fitness",
  mobility: "Mobility",
  balance: "Balance",
  recovery: "Recovery",
};

export default function DashboardScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  // Today's schedule state
  const [todaysWorkout, setTodaysWorkout] =
    useState<PlanDayWithExercises | null>(null);
  const [workoutInfo, setWorkoutInfo] = useState<{
    name: string;
    description: string;
    startDate?: string;
    endDate?: string;
    planDays?: PlanDayWithExercises[];
  } | null>(null);
  const [loadingToday, setLoadingToday] = useState(false);

  const {
    // Data
    weeklySummary,
    workoutConsistency,
    weightMetrics,
    weightAccuracy,
    goalProgress,
    totalVolumeMetrics,
    dailyWorkoutProgress,

    // State
    loading,
    error,

    // Actions
    fetchDashboardMetrics,
    refreshAllData,
  } = useDashboard(user?.id || 0);

  useEffect(() => {
    if (user?.id) {
      refreshAllData();
      fetchTodaysWorkout();
    }
  }, [refreshAllData, user?.id]);

  const fetchTodaysWorkout = async () => {
    try {
      setLoadingToday(true);
      const workoutPlan = await fetchActiveWorkout();
      if (workoutPlan) {
        // Store workout info (name and description are at workout level)
        setWorkoutInfo({
          name: workoutPlan.workout.name,
          description: workoutPlan.workout.description,
          startDate: workoutPlan.workout.startDate,
          endDate: workoutPlan.workout.endDate,
          planDays: workoutPlan.workout.planDays,
        });

        const today = getCurrentDate();
        const todaysPlanDay = workoutPlan.workout.planDays.find(
          (day: PlanDayWithExercises) => {
            const planDate = new Date(day.date).toISOString().split("T")[0];
            return planDate === today;
          }
        );
        setTodaysWorkout(todaysPlanDay || null);
      }
    } catch (err) {
      console.error("Error fetching today's workout:", err);
    } finally {
      setLoadingToday(false);
    }
  };

  const handleRefresh = () => {
    if (user?.id) {
      refreshAllData();
      fetchTodaysWorkout();
    }
  };

  if (error) {
    Alert.alert("Error", error);
  }

  // Show message if user is not authenticated
  if (!isAuthenticated || !user?.id) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center py-12">
          <Text className="text-base text-text-muted">
            Please log in to view your dashboard
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate total workout duration (properly accounting for sets and rest)
  const totalDuration = todaysWorkout?.exercises
    ? calculateWorkoutDuration(todaysWorkout.exercises)
    : 0;

  // Calculate workout completion rate for today
  const todayCompletionRate = todaysWorkout?.exercises
    ? todaysWorkout.exercises.reduce((sum, exercise) => {
        // Use completed status instead of completionRate property
        return sum + (exercise.completed ? 100 : 0);
      }, 0) / todaysWorkout.exercises.length
    : 0;

  const isWorkoutCompleted = todayCompletionRate >= 100;

  // Prepare chart data
  const consistencyChartData = workoutConsistency.map((week) => ({
    label: formatDate(new Date(week.week), { month: "short", day: "numeric" }),
    value: week.completionRate,
  }));

  const weightChartData = weightMetrics.slice(0, 10).map((metric) => ({
    label:
      metric.name.length > 10
        ? metric.name.substring(0, 10) + "..."
        : metric.name,
    value: metric.totalWeight,
  }));

  // Debug logging for dailyWorkoutProgress
  console.log("\n=== DAILY WORKOUT PROGRESS DATA ===", dailyWorkoutProgress);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
        }
      >
        {/* Header with Streak */}
        <View className="px-5 py-5 pt-3">
          <View className="flex-row items-center justify-between mb-2">
            <View>
              <Text className="text-lg font-bold text-text-primary">
                Hello, {user?.name || "User"}
              </Text>
              <Text className="text-sm text-text-muted mt-1">
                {formatDate(new Date(), {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            </View>
            {weeklySummary && weeklySummary.streak > 0 && (
              <View className="flex-row items-center bg-primary/10 px-3 py-2 rounded-full">
                <Ionicons name="flame" size={16} color="#BBDE51" />
                <Text className="text-sm font-bold text-secondary ml-2">
                  {weeklySummary.streak} day streak
                </Text>
              </View>
            )}
          </View>
        </View>

        {loading && !totalVolumeMetrics ? (
          <View className="flex-1 justify-center items-center py-12">
            <ActivityIndicator size="large" color="#BBDE51" />
            <Text className="mt-3 text-sm text-text-muted">
              Loading your progress...
            </Text>
          </View>
        ) : (
          <>
            {/* Today's Workout Card */}
            <View className="px-5 mb-6">
              <View className="bg-white rounded-2xl p-5 shadow-sm">
                {/* Header with title and duration */}
                <View className="flex-row items-center justify-between mb-6">
                  <Text className="text-base font-bold text-text-primary">
                    Today's Workout
                  </Text>
                  {todaysWorkout && totalDuration > 0 ? (
                    <Text className="text-base font-semibold text-text-primary">
                      {Math.floor(totalDuration / 60)} min
                    </Text>
                  ) : (
                    <Text className="text-base font-semibold text-text-muted">
                      Rest Day
                    </Text>
                  )}
                  {loadingToday && (
                    <ActivityIndicator size="small" color="#BBDE51" />
                  )}
                </View>

                {todaysWorkout ? (
                  <View>
                    {/* Icon and workout details */}
                    <View className="flex-row items-center mb-6">
                      <View className="w-16 h-16 bg-primary rounded-full items-center justify-center mr-4">
                        <Ionicons
                          name="heart-outline"
                          size={24}
                          color="#181917"
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-bold text-text-primary mb-1">
                          {workoutInfo?.name || "Workout Session"}
                        </Text>
                        <Text className="text-sm text-text-muted leading-5">
                          {workoutInfo?.description ||
                            `${
                              todaysWorkout.exercises?.length || 0
                            } exercises planned`}
                        </Text>
                      </View>
                    </View>

                    {/* Action button */}
                    {isWorkoutCompleted ? (
                      <View className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex-row items-center">
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color="#10B981"
                        />
                        <View className="ml-3 flex-1">
                          <Text className="text-sm font-semibold text-accent">
                            Workout Completed!
                          </Text>
                          <Text className="text-xs text-accent/70">
                            Great job! {formatNumber(todayCompletionRate)}%
                            completed
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        className="bg-secondary rounded-xl p-4 items-center"
                        onPress={() => {
                          router.push("/workout");
                        }}
                      >
                        <Text className="text-white font-semibold text-sm">
                          Start Workout
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View className="items-center py-8">
                    <View className="w-16 h-16 bg-neutral-light-2 rounded-full items-center justify-center mb-4">
                      <Ionicons name="bed-outline" size={24} color="#8A93A2" />
                    </View>
                    <Text className="text-base font-semibold text-text-primary mb-2">
                      Rest Day
                    </Text>
                    <Text className="text-sm text-text-muted text-center">
                      Recovery is just as important as training
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Weekly Progress */}
            {weeklySummary && (
              <View className="px-5 mb-6">
                <Text className="text-base font-semibold text-text-primary mb-4">
                  Weekly Progress
                </Text>
                <View className="bg-white rounded-2xl p-5 shadow-sm">
                  {/* Stats Row */}
                  {/* <View className="flex-row justify-around mb-6 pb-4 border-b border-neutral-light-2">
                    <View className="items-center">
                      <Text className="text-lg font-bold text-accent">
                        {weeklySummary.completedWorkoutsThisWeek}
                      </Text>
                      <Text className="text-xs text-text-muted">Completed</Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-lg font-bold text-text-primary">
                        {weeklySummary.totalWorkoutsThisWeek}
                      </Text>
                      <Text className="text-xs text-text-muted">Planned</Text>
                    </View>
                  </View> */}

                  {/* Chart Section */}
                  <View className="mb-4">
                    <View
                      className="flex-row justify-between items-end mb-4"
                      style={{ height: 120 }}
                    >
                      {(() => {
                        // Use the workout start date as the base, not the current week's Monday
                        let weekStartDate = new Date();

                        // Use the actual workout start date from the API response
                        if (workoutInfo?.startDate) {
                          weekStartDate = new Date(workoutInfo.startDate);
                        } else {
                          // Fallback: use current week's Monday
                          const today = new Date();
                          const dayOfWeek = today.getDay();
                          const daysFromMonday =
                            dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                          weekStartDate.setDate(
                            today.getDate() - daysFromMonday
                          );
                        }

                        const workout7Days = [];

                        for (let i = 0; i < 7; i++) {
                          const date = new Date(weekStartDate);
                          date.setDate(weekStartDate.getDate() + i);

                          // Generate day name dynamically based on actual date
                          const dayName = date.toLocaleDateString("en-US", {
                            weekday: "short",
                          });
                          const dateStr = date.toISOString().split("T")[0];
                          const today = new Date();
                          const todayStr = today.toISOString().split("T")[0];

                          // Find corresponding data from dailyWorkoutProgress
                          const dayData = dailyWorkoutProgress.find((day) => {
                            return day.date === dateStr;
                          });

                          // Check if there's a planned workout for this day
                          const hasPlannedWorkout =
                            dayData?.hasPlannedWorkout || false;

                          const isToday = dateStr === todayStr;
                          const isFuture = date > today;

                          let completionRate = 0;
                          let status = "incomplete";

                          // Debug logging
                          console.log(
                            `\n=== Day ${i}: ${dayName} (${dateStr}) ===`
                          );
                          console.log("dayData:", dayData);
                          console.log("hasPlannedWorkout:", hasPlannedWorkout);
                          console.log("isToday:", isToday);
                          console.log("isFuture:", isFuture);

                          // First check if it's a rest day (no planned workout)
                          if (!hasPlannedWorkout) {
                            status = "rest";
                            completionRate = 0;
                            console.log("→ Setting as REST DAY");
                          } else if (dayData) {
                            // Only process completion rate if there's a planned workout
                            completionRate = dayData.completionRate;
                            if (completionRate === 100) status = "complete";
                            else if (completionRate > 0) status = "partial";
                            else if (isFuture) status = "upcoming";
                            else status = "incomplete";
                            console.log(
                              `→ Setting as WORKOUT DAY: ${status}, completion: ${completionRate}%`
                            );
                          } else if (isFuture) {
                            status = "upcoming";
                            console.log("→ Setting as UPCOMING");
                          }

                          console.log(
                            `Final status: ${status}, completion: ${completionRate}%`
                          );

                          workout7Days.push({
                            dayName,
                            dateStr,
                            completionRate,
                            status,
                            isToday,
                            isFuture,
                          });
                        }

                        const FULL_HEIGHT = 100; // Full bar height in pixels
                        const BASE_HEIGHT = 20; // Base height for incomplete/upcoming days

                        return workout7Days.map((day, index) => (
                          <View
                            key={index}
                            className="items-center flex-1 mx-1"
                          >
                            <View className="flex-1 justify-end mb-2">
                              <View
                                className="w-8 rounded-lg"
                                style={{
                                  height:
                                    day.status === "rest"
                                      ? FULL_HEIGHT // Rest days are full height
                                      : day.status === "upcoming" ||
                                        day.status === "incomplete"
                                      ? BASE_HEIGHT // Base height for incomplete/upcoming
                                      : Math.max(
                                          (day.completionRate / 100) *
                                            FULL_HEIGHT,
                                          BASE_HEIGHT
                                        ), // Proportional to completion
                                  backgroundColor:
                                    day.status === "complete"
                                      ? "#10B981" // Complete - Green
                                      : day.status === "partial"
                                      ? "#FCD34D" // Partial - Yellow
                                      : day.status === "rest"
                                      ? "#000000" // Rest - Black
                                      : "#9CA3AF", // Upcoming/Incomplete - Grey
                                }}
                              />
                            </View>
                            <Text
                              className={`text-xs font-medium mb-1 ${
                                day.isToday
                                  ? "text-primary"
                                  : "text-text-primary"
                              }`}
                            >
                              {day.dayName}
                            </Text>
                            {day.status === "rest" ? (
                              <Text className="text-xs text-primary font-medium">
                                Rest
                              </Text>
                            ) : day.status === "upcoming" ? (
                              <Text className="text-xs text-text-muted">-</Text>
                            ) : day.completionRate > 0 ? (
                              <Text className="text-xs text-accent font-medium">
                                {Math.round(day.completionRate)}%
                              </Text>
                            ) : (
                              <Text className="text-xs text-text-muted">
                                0%
                              </Text>
                            )}
                          </View>
                        ));
                      })()}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Total Volume Chart */}
            {totalVolumeMetrics && totalVolumeMetrics.length > 0 && (
              <View className="px-5 mb-6">
                <Text className="text-base font-semibold text-text-primary mb-4">
                  {totalVolumeMetrics[0]?.totalVolume > 1000
                    ? "Strength Progress"
                    : "Workout Volume"}
                </Text>
                <View className="bg-white rounded-2xl p-4 shadow-sm">
                  <Text className="text-xs text-text-muted mb-4">
                    {totalVolumeMetrics[0]?.totalVolume > 1000
                      ? "Total weight lifted over time (sets × reps × weight in lbs)"
                      : "Total workout volume over time (sets × reps)"}
                  </Text>

                  {/* Always show LineChart, regardless of data points */}
                  <LineChart
                    data={totalVolumeMetrics.map((metric) => ({
                      label: metric.label,
                      value: metric.totalVolume,
                      date: metric.date,
                    }))}
                    height={200}
                    color="#BBDE51"
                  />

                  {/* Show message for single data point */}
                  {totalVolumeMetrics.length === 1 && (
                    <View className="items-center py-4">
                      <Text className="text-sm text-text-muted text-center mb-2">
                        Complete more workouts to see your progress trends over
                        time
                      </Text>
                    </View>
                  )}

                  <View className="flex-row justify-around mt-4 pt-4 border-t border-neutral-light-2">
                    <View className="items-center">
                      <Text className="text-base font-bold text-text-primary">
                        {formatNumber(
                          totalVolumeMetrics[totalVolumeMetrics.length - 1]
                            ?.totalVolume || 0
                        )}
                        {(totalVolumeMetrics[totalVolumeMetrics.length - 1]
                          ?.totalVolume || 0) > 1000
                          ? " lbs"
                          : ""}
                      </Text>
                      <Text className="text-xs text-text-muted">Latest</Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-base font-bold text-accent">
                        {formatNumber(
                          Math.max(
                            ...totalVolumeMetrics.map((m) => m.totalVolume)
                          )
                        )}
                        {Math.max(
                          ...totalVolumeMetrics.map((m) => m.totalVolume)
                        ) > 1000
                          ? " lbs"
                          : ""}
                      </Text>
                      <Text className="text-xs text-text-muted">Peak</Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-base font-bold text-primary">
                        {formatNumber(
                          totalVolumeMetrics.reduce(
                            (sum, m) => sum + m.totalVolume,
                            0
                          ) / totalVolumeMetrics.length
                        )}
                        {totalVolumeMetrics.reduce(
                          (sum, m) => sum + m.totalVolume,
                          0
                        ) /
                          totalVolumeMetrics.length >
                        1000
                          ? " lbs"
                          : ""}
                      </Text>
                      <Text className="text-xs text-text-muted">Average</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Weight Progression */}
            {weightAccuracy && (
              <View className="px-5 mb-6">
                <Text className="text-base font-semibold text-text-primary mb-4">
                  Weight Progression
                </Text>
                <View className="bg-white rounded-2xl p-5 shadow-sm">
                  {weightAccuracy.hasPlannedWeights &&
                  weightAccuracy.totalSets > 0 ? (
                    <>
                      <View className="flex-row items-center mb-5">
                        <View className="mr-5">
                          <View className="items-center mb-3">
                            <Text className="text-2xl font-bold text-primary">
                              {weightAccuracy.avgWeightDifference > 0
                                ? "+"
                                : ""}
                              {formatNumber(weightAccuracy.avgWeightDifference)}{" "}
                              lbs
                            </Text>
                            <Text className="text-sm text-text-muted">
                              Avg Progression
                            </Text>
                          </View>
                          <Text className="text-xs text-text-muted text-center">
                            vs planned weights
                          </Text>
                        </View>
                        <View className="flex-1">
                          {weightAccuracy.chartData &&
                            weightAccuracy.chartData.length > 0 && (
                              <PieChart
                                data={weightAccuracy.chartData}
                                size={100}
                              />
                            )}
                        </View>
                      </View>
                      <View className="flex-row justify-around pt-4 border-t border-neutral-light-2">
                        <View className="items-center">
                          <Text className="text-sm font-bold text-accent">
                            {weightAccuracy.exactMatches}
                          </Text>
                          <Text className="text-xs text-text-muted">
                            As Planned
                          </Text>
                        </View>
                        <View className="items-center">
                          <Text className="text-sm font-bold text-orange-500">
                            {weightAccuracy.higherWeight}
                          </Text>
                          <Text className="text-xs text-text-muted">
                            Progressed
                          </Text>
                        </View>
                        <View className="items-center">
                          <Text className="text-sm font-bold text-red-500">
                            {weightAccuracy.lowerWeight}
                          </Text>
                          <Text className="text-xs text-text-muted">
                            Adapted
                          </Text>
                        </View>
                        <View className="items-center">
                          <Text className="text-sm font-bold text-text-primary">
                            {weightAccuracy.totalSets}
                          </Text>
                          <Text className="text-xs text-text-muted">
                            Total Sets
                          </Text>
                        </View>
                      </View>
                    </>
                  ) : weightAccuracy.hasPlannedWeights ? (
                    <View className="items-center py-8">
                      <View className="w-16 h-16 bg-neutral-light-2 rounded-full items-center justify-center mb-4">
                        <Ionicons
                          name="barbell-outline"
                          size={24}
                          color="#8A93A2"
                        />
                      </View>
                      <Text className="text-base font-semibold text-text-primary mb-2">
                        Start Logging Weights
                      </Text>
                      <Text className="text-sm text-text-muted text-center">
                        Complete workouts with weights to track your progression
                      </Text>
                    </View>
                  ) : (
                    <View className="items-center py-8">
                      <View className="w-16 h-16 bg-neutral-light-2 rounded-full items-center justify-center mb-4">
                        <Ionicons
                          name="fitness-outline"
                          size={24}
                          color="#8A93A2"
                        />
                      </View>
                      <Text className="text-base font-semibold text-text-primary mb-2">
                        Bodyweight Focus
                      </Text>
                      <Text className="text-sm text-text-muted text-center">
                        This plan emphasizes bodyweight exercises for strength
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Workout Summary Stats */}
            <View className="px-5 mb-6">
              <Text className="text-base font-semibold text-text-primary mb-4">
                Workout Summary
              </Text>
              <View className="bg-white rounded-2xl p-5 shadow-sm">
                <View className="flex-row justify-around">
                  <View className="items-center">
                    <Text className="text-lg font-bold text-primary">
                      {formatNumber(
                        goalProgress.reduce((sum, g) => sum + g.totalSets, 0) /
                          4
                      )}
                    </Text>
                    <Text className="text-xs text-text-muted text-center">
                      Avg Sets/Goal
                    </Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-lg font-bold text-accent">
                      {formatNumber(
                        goalProgress.reduce((sum, g) => sum + g.totalReps, 0) /
                          4
                      )}
                    </Text>
                    <Text className="text-xs text-text-muted text-center">
                      Avg Reps/Goal
                    </Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-lg font-bold text-secondary">
                      {formatNumber(
                        goalProgress.reduce(
                          (sum, g) => sum + g.totalWeight,
                          0
                        ) / 1000,
                        1
                      )}{" "}
                      lbs
                    </Text>
                    <Text className="text-xs text-text-muted text-center">
                      Total Weight
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Goal Progress */}
            {goalProgress.length > 0 && (
              <View className="px-5 mb-6">
                <Text className="text-base font-semibold text-text-primary mb-4">
                  Goals
                </Text>
                <View className="space-y-3">
                  {goalProgress.slice(0, 4).map((goal, index) => (
                    <View
                      key={index}
                      className="bg-white rounded-2xl p-5 shadow-sm"
                    >
                      <View className="flex-row items-center justify-between mb-4">
                        <View className="flex-row items-center">
                          <View className="w-10 h-10 bg-primary/10 rounded-xl items-center justify-center mr-3">
                            <Ionicons
                              name={
                                goal.goal === "weight_loss"
                                  ? "trending-down"
                                  : goal.goal === "muscle_gain"
                                  ? "trending-up"
                                  : goal.goal === "strength"
                                  ? "barbell"
                                  : "fitness"
                              }
                              size={18}
                              color="#BBDE51"
                            />
                          </View>
                          <View>
                            <Text className="text-sm font-semibold text-text-primary">
                              {goalNames[goal.goal] || goal.goal}
                            </Text>
                            <Text className="text-xs text-text-muted">
                              {goal.completedWorkouts} workouts completed
                            </Text>
                          </View>
                        </View>
                        <View className="items-end">
                          <Text className="text-base font-bold text-secondary">
                            {goal.progressScore}%
                          </Text>
                          <Text className="text-xs text-text-muted">
                            Progress
                          </Text>
                        </View>
                      </View>

                      <View className="h-2 bg-neutral-light-2 rounded-full mb-4 overflow-hidden">
                        <View
                          className="h-full bg-secondary rounded-full"
                          style={{ width: `${goal.progressScore}%` }}
                        />
                      </View>

                      <View className="flex-row justify-around">
                        <View className="items-center">
                          <Text className="text-sm font-bold text-text-primary">
                            {goal.totalSets}
                          </Text>
                          <Text className="text-xs text-text-muted">Sets</Text>
                        </View>
                        <View className="items-center">
                          <Text className="text-sm font-bold text-text-primary">
                            {goal.totalWeight >= 1000
                              ? `${formatNumber(goal.totalWeight / 1000, 1)}`
                              : formatNumber(goal.totalWeight)}{" "}
                            lbs
                          </Text>
                          <Text className="text-xs text-text-muted">
                            Total Weight
                          </Text>
                        </View>
                        <View className="items-center">
                          <Text className="text-sm font-bold text-accent">
                            {goal.completedWorkouts > 0
                              ? goal.totalWeight / goal.completedWorkouts >=
                                1000
                                ? `${formatNumber(
                                    goal.totalWeight /
                                      goal.completedWorkouts /
                                      1000,
                                    1
                                  )}`
                                : formatNumber(
                                    goal.totalWeight / goal.completedWorkouts
                                  )
                              : "0"}{" "}
                            lbs
                          </Text>
                          <Text className="text-xs text-text-muted">
                            Avg/Workout
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
