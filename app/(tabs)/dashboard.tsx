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

  // Strength chart filtering state
  const [strengthFilter, setStrengthFilter] = useState<
    "1W" | "1M" | "3M" | "ALL"
  >("1M");

  // Workout type distribution filtering state
  const [workoutTypeFilter, setWorkoutTypeFilter] = useState<
    "1W" | "1M" | "3M" | "ALL"
  >("1M");

  const {
    // Data
    weeklySummary,
    workoutConsistency,
    weightMetrics,
    weightAccuracy,
    goalProgress,
    totalVolumeMetrics,
    dailyWorkoutProgress,
    workoutTypeMetrics,

    // State
    loading,
    error,

    // Actions
    fetchDashboardMetrics,
    refreshAllData,
  } = useDashboard(user?.id || 0);
  console.log("workout type metricxs", workoutTypeMetrics);

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

  // Filter strength data based on selected time period
  const getFilteredStrengthData = () => {
    if (!totalVolumeMetrics || totalVolumeMetrics.length === 0) return [];

    const now = new Date();
    let cutoffDate: Date;

    switch (strengthFilter) {
      case "1W":
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "1M":
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "3M":
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "ALL":
      default:
        return totalVolumeMetrics;
    }

    return totalVolumeMetrics.filter((metric) => {
      const metricDate = new Date(metric.date);
      return metricDate >= cutoffDate;
    });
  };

  const filteredStrengthData = getFilteredStrengthData();

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
                <Text className="text-base font-semibold text-text-primary mb-1">
                  Weekly Progress
                </Text>
                <Text className="text-xs text-text-muted mb-4">
                  Your workout completion for this week
                </Text>
                <View className="bg-white rounded-2xl p-5 shadow-sm">
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
                        const today = new Date();
                        const todayStr = today.toISOString().split("T")[0];

                        for (let i = 0; i < 7; i++) {
                          const date = new Date(weekStartDate);
                          date.setDate(weekStartDate.getDate() + i);

                          // Generate day name dynamically based on actual date
                          const dayName = date.toLocaleDateString("en-US", {
                            weekday: "short",
                          });
                          const dateStr = date.toISOString().split("T")[0];

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

                          // First check if it's a rest day (no planned workout)
                          if (!hasPlannedWorkout) {
                            status = "rest";
                            completionRate = 0;
                          } else if (dayData) {
                            // Only process completion rate if there's a planned workout
                            completionRate = dayData.completionRate;
                            if (completionRate === 100) status = "complete";
                            else if (completionRate > 0) status = "partial";
                            else if (isFuture) status = "upcoming";
                            else status = "incomplete";
                          } else if (isFuture) {
                            status = "upcoming";
                          }

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

            {/* Weight Progression */}
            {weightAccuracy && (
              <View className="px-5 mb-6">
                <Text className="text-base font-semibold text-text-primary mb-1">
                  Weight Performance
                </Text>
                <Text className="text-xs text-text-muted mb-4">
                  How you're progressing with your planned weights
                </Text>
                <View className="bg-white rounded-2xl p-5 shadow-sm">
                  {/* Main Pie Chart Display */}
                  <View className="items-center mb-6">
                    <PieChart
                      data={
                        weightAccuracy.chartData &&
                        weightAccuracy.chartData.length > 0
                          ? weightAccuracy.chartData
                          : [
                              {
                                label: "As Planned",
                                value: 35,
                                color: "#10b981",
                                count: 35,
                              },
                              {
                                label: "Progressed",
                                value: 40,
                                color: "#f59e0b",
                                count: 40,
                              },
                              {
                                label: "Adapted",
                                value: 25,
                                color: "#ef4444",
                                count: 25,
                              },
                            ]
                      }
                      size={160}
                    />
                  </View>

                  {/* Stats Breakdown */}
                  <View className="flex-row justify-around pt-4 border-t border-neutral-light-2">
                    <View className="items-center">
                      <Text className="text-lg font-bold text-accent">
                        {weightAccuracy.exactMatches || 0}
                      </Text>
                      <Text className="text-xs text-text-muted text-center">
                        As Planned
                      </Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-lg font-bold text-orange-500">
                        {weightAccuracy.higherWeight || 0}
                      </Text>
                      <Text className="text-xs text-text-muted text-center">
                        Progressed
                      </Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-lg font-bold text-red-500">
                        {weightAccuracy.lowerWeight || 0}
                      </Text>
                      <Text className="text-xs text-text-muted text-center">
                        Adapted
                      </Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-lg font-bold text-text-primary">
                        {weightAccuracy.totalSets || 0}
                      </Text>
                      <Text className="text-xs text-text-muted text-center">
                        Total Sets
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Strength Progress Chart */}
            {totalVolumeMetrics && totalVolumeMetrics.length > 0 && (
              <View className="px-5 mb-6">
                <Text className="text-base font-semibold text-text-primary mb-1">
                  Strength Progress
                </Text>

                <Text className="text-xs text-text-muted mb-3">
                  Your strength progression over time (
                  {strengthFilter === "ALL" ? "All time" : strengthFilter})
                </Text>

                {/* Time Filter Buttons - Centered below subtitle */}
                <View className="items-center mb-4">
                  <View className="flex-row bg-neutral-light-2 rounded-lg p-1">
                    {(["1W", "1M", "3M", "ALL"] as const).map((filter) => (
                      <TouchableOpacity
                        key={filter}
                        className={`px-3 py-1 rounded-md ${
                          strengthFilter === filter
                            ? "bg-primary"
                            : "bg-transparent"
                        }`}
                        onPress={() => setStrengthFilter(filter)}
                      >
                        <Text
                          className={`text-xs font-medium ${
                            strengthFilter === filter
                              ? "text-text-primary"
                              : "text-text-muted"
                          }`}
                        >
                          {filter}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View className="bg-white rounded-2xl p-4 shadow-sm">
                  {/* Bar Chart */}
                  <View className="mb-4">
                    <View
                      className="flex-row items-end justify-between px-4"
                      style={{ height: 200 }}
                    >
                      {filteredStrengthData.length > 0 ? (
                        filteredStrengthData.map((metric, index) => {
                          const maxValue = Math.max(
                            ...filteredStrengthData.map((m) => m.totalVolume)
                          );
                          const barHeight =
                            maxValue > 0
                              ? (metric.totalVolume / maxValue) * 160
                              : 0;
                          const isHighest = metric.totalVolume === maxValue;

                          return (
                            <View
                              key={index}
                              className="items-center flex-1 mx-1"
                            >
                              {/* Value label on top */}
                              <Text className="text-xs font-semibold text-text-primary mb-2">
                                {metric.totalVolume >= 1000
                                  ? `${(metric.totalVolume / 1000).toFixed(1)}k`
                                  : metric.totalVolume.toString()}
                              </Text>

                              {/* Bar */}
                              <View
                                className={`w-8 rounded-t-lg ${
                                  isHighest ? "bg-primary" : "bg-secondary"
                                } mb-2`}
                                style={{
                                  height: Math.max(barHeight, 8), // Minimum height of 8
                                  minHeight: 8,
                                }}
                              />

                              {/* Date label */}
                              <Text
                                className="text-xs text-text-muted text-center"
                                numberOfLines={1}
                              >
                                {metric.label.length > 6
                                  ? metric.label.substring(0, 6)
                                  : metric.label}
                              </Text>
                            </View>
                          );
                        })
                      ) : (
                        <View className="flex-1 items-center justify-center">
                          <Text className="text-text-muted">
                            No data available
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Y-axis reference lines */}
                    {filteredStrengthData.length > 0 && (
                      <View className="absolute left-0 top-0 bottom-0 w-full pointer-events-none">
                        {[0.25, 0.5, 0.75, 1].map((ratio, index) => (
                          <View
                            key={index}
                            className="absolute left-0 right-0 border-b border-neutral-light-2"
                            style={{
                              bottom: 40 + 160 * ratio, // 40px for labels, 160px is chart height
                              opacity: 0.3,
                            }}
                          />
                        ))}

                        {/* Y-axis labels */}
                        <View className="absolute left-0 top-0 bottom-0 w-12 justify-between py-10">
                          {(() => {
                            const maxValue = Math.max(
                              ...filteredStrengthData.map((m) => m.totalVolume)
                            );
                            return [1, 0.75, 0.5, 0.25, 0].map(
                              (ratio, index) => (
                                <Text
                                  key={index}
                                  className="text-xs text-text-muted text-right"
                                >
                                  {maxValue * ratio >= 1000
                                    ? `${((maxValue * ratio) / 1000).toFixed(
                                        1
                                      )}k`
                                    : Math.round(maxValue * ratio).toString()}
                                </Text>
                              )
                            );
                          })()}
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Progress Indicators */}
                  <View className="flex-row justify-around pt-4 border-t border-neutral-light-2">
                    <View className="items-center">
                      <Text className="text-base font-bold text-text-primary">
                        {formatNumber(
                          filteredStrengthData[filteredStrengthData.length - 1]
                            ?.totalVolume || 0
                        )}
                        {(filteredStrengthData[filteredStrengthData.length - 1]
                          ?.totalVolume || 0) > 1000
                          ? " lbs"
                          : ""}
                      </Text>
                      <Text className="text-xs text-text-muted">Latest</Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-base font-bold text-accent">
                        {formatNumber(
                          filteredStrengthData.length > 0
                            ? Math.max(
                                ...filteredStrengthData.map(
                                  (m) => m.totalVolume
                                )
                              )
                            : 0
                        )}
                        {filteredStrengthData.length > 0 &&
                        Math.max(
                          ...filteredStrengthData.map((m) => m.totalVolume)
                        ) > 1000
                          ? " lbs"
                          : ""}
                      </Text>
                      <Text className="text-xs text-text-muted">Peak</Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-base font-bold text-primary">
                        {(() => {
                          if (filteredStrengthData.length < 2) return "0%";
                          const first = filteredStrengthData[0].totalVolume;
                          const last =
                            filteredStrengthData[
                              filteredStrengthData.length - 1
                            ].totalVolume;
                          const growth =
                            first > 0 ? ((last - first) / first) * 100 : 0;
                          return `${growth > 0 ? "+" : ""}${formatNumber(
                            growth,
                            1
                          )}%`;
                        })()}
                      </Text>
                      <Text className="text-xs text-text-muted">Growth</Text>
                    </View>
                  </View>

                  {/* Show message for limited data */}
                  {filteredStrengthData.length === 0 && (
                    <View className="items-center py-8">
                      <Text className="text-sm text-text-muted text-center mb-2">
                        No data available for the selected time period
                      </Text>
                      <TouchableOpacity
                        onPress={() => setStrengthFilter("ALL")}
                        className="mt-2"
                      >
                        <Text className="text-sm text-primary font-medium">
                          View all data
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {filteredStrengthData.length === 1 && (
                    <View className="items-center py-4">
                      <Text className="text-sm text-text-muted text-center mb-2">
                        Complete more workouts to see your strength progress
                        trends
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Workout Type Distribution */}
            {workoutTypeMetrics && workoutTypeMetrics.hasData && (
              <View className="px-5 mb-6">
                <Text className="text-base font-semibold text-text-primary mb-1">
                  Workout Type Distribution
                </Text>

                <Text className="text-xs text-text-muted mb-3">
                  Types of exercises you've been completing (
                  {workoutTypeFilter === "ALL" ? "All time" : workoutTypeFilter}
                  )
                </Text>

                {/* Time Filter Buttons - Centered below subtitle */}
                <View className="items-center mb-4">
                  <View className="flex-row bg-neutral-light-2 rounded-lg p-1">
                    {(["1W", "1M", "3M", "ALL"] as const).map((filter) => (
                      <TouchableOpacity
                        key={filter}
                        className={`px-3 py-1 rounded-md ${
                          workoutTypeFilter === filter
                            ? "bg-primary"
                            : "bg-transparent"
                        }`}
                        onPress={() => setWorkoutTypeFilter(filter)}
                      >
                        <Text
                          className={`text-xs font-medium ${
                            workoutTypeFilter === filter
                              ? "text-text-primary"
                              : "text-text-muted"
                          }`}
                        >
                          {filter}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View className="bg-white rounded-2xl p-5 shadow-sm">
                  {/* Donut Chart */}
                  <View className="items-center mb-6">
                    <PieChart
                      data={workoutTypeMetrics.distribution.map((item) => ({
                        label: item.label,
                        value: item.percentage,
                        color: item.color,
                        count: item.totalSets,
                      }))}
                      size={140}
                      donut={true}
                      innerRadius={35}
                    />
                  </View>

                  {/* Center Stats - Total Info */}
                  <View className="items-center mb-6">
                    <Text className="text-2xl font-bold text-primary">
                      {workoutTypeMetrics.totalSets}
                    </Text>
                    <Text className="text-sm text-text-muted">Total Sets</Text>
                    <Text className="text-xs text-text-muted mt-1">
                      Dominant: {workoutTypeMetrics.dominantType}
                    </Text>
                  </View>

                  {/* Stats Breakdown */}
                  <View className="flex-row justify-around pt-4 border-t border-neutral-light-2">
                    <View className="items-center">
                      <Text className="text-lg font-bold text-text-primary">
                        {workoutTypeMetrics.totalExercises}
                      </Text>
                      <Text className="text-xs text-text-muted text-center">
                        Exercises
                      </Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-lg font-bold text-accent">
                        {workoutTypeMetrics.distribution.length}
                      </Text>
                      <Text className="text-xs text-text-muted text-center">
                        Types
                      </Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-lg font-bold text-secondary">
                        {workoutTypeMetrics.distribution.length > 0
                          ? Math.round(
                              workoutTypeMetrics.distribution.reduce(
                                (sum, item) => sum + item.completedWorkouts,
                                0
                              ) / workoutTypeMetrics.distribution.length
                            )
                          : 0}
                      </Text>
                      <Text className="text-xs text-text-muted text-center">
                        Avg Workouts
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

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
                                  )}k`
                                : formatNumber(
                                    goal.totalWeight / goal.completedWorkouts,
                                    0
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
