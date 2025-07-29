import React, { useState, useEffect, useMemo } from "react";
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
import { useAppDataContext } from "@contexts/AppDataContext";
import {
  TotalVolumeMetrics,
  WeightAccuracyMetrics,
  WorkoutTypeMetrics,
} from "@/types/api";
import { SimpleCircularProgress } from "@components/charts/CircularProgress";
import { LineChart } from "@components/charts/LineChart";
import { PieChart } from "@components/charts/PieChart";
import {
  formatDate,
  formatNumber,
  formatDuration,
  calculateWorkoutDuration,
  calculatePlanDayDuration,
  formatWorkoutDuration,
  getCurrentDate,
  formatDateAsString,
} from "../../utils";
import { fetchActiveWorkout } from "@lib/workouts";
import {
  WorkoutWithDetails,
  PlanDayWithExercises,
  PlanDayWithBlocks,
  PlanDayWithExercise,
} from "../types";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../lib/theme";

// Goal name mappings
const goalNames: Record<string, string> = {
  general_fitness: "General Fitness",
  fat_loss: "Fat Loss",
  endurance: "Endurance",
  muscle_gain: "Muscle Gain",
  strength: "Strength",
  mobility_flexibility: "Mobility & Flexibility",
  balance: "Balance",
  recovery: "Recovery",
};

// Dynamic color palette for donut chart (green gradient from light to dark)
const DONUT_COLORS = [
  colors.brand.dark[0],
  colors.brand.dark[1],
  colors.brand.dark[2],
  colors.brand.dark[3],
  colors.brand.dark[4],
  colors.brand.dark[5],
];

function formatWorkoutTypeLabel(tag: string): string {
  if (!tag) return "";
  const specialCases: Record<string, string> = {
    amrap: "AMRAP",
    emom: "EMOM",
    tabata: "Tabata",
    hiit: "HIIT",
    rft: "RFT",
    ladder: "Ladder",
    pyramid: "Pyramid",
    superset: "Superset",
    circuit: "Circuit",
  };
  if (specialCases[tag.toLowerCase()]) return specialCases[tag.toLowerCase()];
  return tag.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

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

  // Filtering state for individual charts
  const [strengthFilter, setStrengthFilter] = useState<"1W" | "1M" | "3M">(
    "3M"
  );
  const [workoutTypeFilter, setWorkoutTypeFilter] = useState<
    "1W" | "1M" | "3M"
  >("1M");
  const [weightPerformanceFilter, setWeightPerformanceFilter] = useState<
    "1W" | "1M" | "3M"
  >("1M");

  // Separate data state for filtered charts
  const [filteredStrengthData, setFilteredStrengthData] = useState<
    TotalVolumeMetrics[]
  >([]);
  const [weightProgressionData, setWeightProgressionData] = useState<
    { date: string; avgWeight: number; maxWeight: number; label: string }[]
  >([]);
  const [rawWeightProgressionData, setRawWeightProgressionData] = useState<
    { date: string; avgWeight: number; maxWeight: number; label: string }[]
  >([]);
  const [rawWeightAccuracyData, setRawWeightAccuracyData] = useState<
    {
      date: string;
      totalSets: number;
      exactMatches: number;
      higherWeight: number;
      lowerWeight: number;
      label: string;
    }[]
  >([]);
  const [rawWorkoutTypeData, setRawWorkoutTypeData] = useState<
    {
      date: string;
      workoutTypes: {
        tag: string;
        label: string;
        totalSets: number;
        totalReps: number;
        exerciseCount: number;
      }[];
      label: string;
    }[]
  >([]);
  const [filteredWeightAccuracy, setFilteredWeightAccuracy] =
    useState<WeightAccuracyMetrics | null>(null);
  const [filteredWorkoutTypeMetrics, setFilteredWorkoutTypeMetrics] =
    useState<WorkoutTypeMetrics | null>(null);

  // State to track if we've loaded initial data
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const {
    // Data
    data: {
      weeklySummary,
      workoutConsistency,
      weightMetrics,
      weightAccuracy,
      goalProgress,
      totalVolumeMetrics,
      dailyWorkoutProgress,
      workoutTypeMetrics,
    },

    // State
    loading,
    error,

    // Actions
    refresh: {
      refreshDashboard: fetchDashboardMetrics,
      refreshWeightAccuracy,
      refreshTotalVolumeMetrics,
      refreshWorkoutTypeMetrics,
      fetchWeightProgression,
      fetchWeightAccuracyByDate,
      fetchWorkoutTypeByDate,
      refreshAll: refreshAllData,
    },
  } = useAppDataContext();

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
            const planDate = formatDateAsString(day.date);
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

  useEffect(() => {
    if (user?.id && !hasLoadedInitialData && weeklySummary) {
      setIsInitialLoad(true);

      // Just load today's workout - dashboard data comes from preload
      fetchTodaysWorkout().then(() => {
        setHasLoadedInitialData(true);
        setIsInitialLoad(false);
      });
    }
  }, [user?.id, hasLoadedInitialData, weeklySummary]);

  // Wide date range function for getting all data
  const calculateWideDataRange = () => {
    return {
      startDate: "2020-01-01",
      endDate: "2030-12-31",
    };
  };

  // Frontend filtering function for weight accuracy data
  const filterWeightAccuracyData = (
    data: {
      date: string;
      totalSets: number;
      exactMatches: number;
      higherWeight: number;
      lowerWeight: number;
      label: string;
    }[],
    filter: "1W" | "1M" | "3M"
  ): WeightAccuracyMetrics | null => {
    if (!data || data.length === 0) return null;

    // Filter data by date range
    const filteredData = filterDataByDateRange(data, filter);

    // Aggregate the filtered data
    const totalSets = filteredData.reduce((sum, day) => sum + day.totalSets, 0);
    const exactMatches = filteredData.reduce(
      (sum, day) => sum + day.exactMatches,
      0
    );
    const higherWeight = filteredData.reduce(
      (sum, day) => sum + day.higherWeight,
      0
    );
    const lowerWeight = filteredData.reduce(
      (sum, day) => sum + day.lowerWeight,
      0
    );

    if (totalSets === 0) return null;

    const accuracyRate = (exactMatches / totalSets) * 100;

    // Create chart data
    const chartData = [];
    if (exactMatches > 0) {
      chartData.push({
        label: "As Planned",
        value: Math.round((exactMatches / totalSets) * 100 * 100) / 100,
        color: colors.brand.medium[1], // Light green #E8F8B8
        count: exactMatches,
      });
    }
    if (higherWeight > 0) {
      chartData.push({
        label: "Progressed",
        value: Math.round((higherWeight / totalSets) * 100 * 100) / 100,
        color: colors.brand.primary, // Main green #9BB875
        count: higherWeight,
      });
    }
    if (lowerWeight > 0) {
      chartData.push({
        label: "Adapted",
        value: Math.round((lowerWeight / totalSets) * 100 * 100) / 100,
        color: colors.brand.dark[1], // Dark green #8CAF25
        count: lowerWeight,
      });
    }

    return {
      accuracyRate: Math.round(accuracyRate * 100) / 100,
      totalSets,
      exactMatches,
      higherWeight,
      lowerWeight,
      avgWeightDifference: 0, // Not calculated in raw data
      chartData,
      hasPlannedWeights: totalSets > 0,
      hasExerciseData: totalSets > 0,
    };
  };

  // Frontend filtering function for workout type data
  const filterWorkoutTypeData = (
    data: {
      date: string;
      workoutTypes: {
        tag: string;
        label: string;
        totalSets: number;
        totalReps: number;
        exerciseCount: number;
      }[];
      label: string;
    }[],
    filter: "1W" | "1M" | "3M"
  ): WorkoutTypeMetrics | null => {
    if (!data || data.length === 0) return null;

    // Filter data by date range
    const filteredData = filterDataByDateRange(data, filter);

    // Aggregate workout types across all days
    const typeAggregates = new Map<
      string,
      {
        tag: string;
        label: string;
        totalSets: number;
        totalReps: number;
        exerciseCount: number;
        completedWorkouts: number;
      }
    >();

    filteredData.forEach((day) => {
      day.workoutTypes
        .filter(
          (type) =>
            // Filter out warm-up and cool-down exercises
            type.tag !== "warmup" &&
            type.tag !== "cooldown" &&
            type.tag !== "warm-up" &&
            type.tag !== "cool-down"
        )
        .forEach((type) => {
          if (!typeAggregates.has(type.tag)) {
            typeAggregates.set(type.tag, {
              tag: type.tag,
              label: type.label,
              totalSets: 0,
              totalReps: 0,
              exerciseCount: 0,
              completedWorkouts: 0,
            });
          }

          const aggregate = typeAggregates.get(type.tag)!;
          aggregate.totalSets += type.totalSets;
          aggregate.totalReps += type.totalReps;
          aggregate.exerciseCount += type.exerciseCount;
          aggregate.completedWorkouts += 1; // Count days where this type appeared
        });
    });

    const totalSets = Array.from(typeAggregates.values()).reduce(
      (sum, type) => sum + type.totalSets,
      0
    );
    const totalExercises = Array.from(typeAggregates.values()).reduce(
      (sum, type) => sum + type.exerciseCount,
      0
    );

    if (totalSets === 0) return null;

    // Create distribution with percentages and colors
    const distribution = Array.from(typeAggregates.values())
      .filter(
        (type) =>
          // Filter out warm-up and cool-down exercises
          type.tag !== "warmup" &&
          type.tag !== "cooldown" &&
          type.tag !== "warm-up" &&
          type.tag !== "cool-down"
      )
      .map((type) => ({
        ...type,
        percentage:
          totalSets > 0
            ? Math.round((type.totalSets / totalSets) * 100 * 10) / 10
            : 0,
        color: colors.text.muted, // Default color using theme
      }))
      .sort((a, b) => b.totalSets - a.totalSets);

    const dominantType =
      distribution.length > 0 ? distribution[0].label : "None";

    return {
      distribution,
      totalExercises,
      totalSets,
      dominantType,
      hasData: distribution.length > 0 && totalSets > 0,
    };
  };

  // Helper function to filter date-based data by time range
  const filterDataByDateRange = <T extends { date: string }>(
    data: T[],
    filter: "1W" | "1M" | "3M"
  ): T[] => {
    if (!data || data.length === 0) return data;

    // Sort data by date (oldest first)
    const sortedData = [...data].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Use current date as reference point
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of day for inclusive comparison
    let cutoffDate = new Date(today);

    switch (filter) {
      case "1W":
        cutoffDate.setDate(today.getDate() - 7);
        break;
      case "1M":
        cutoffDate.setDate(today.getDate() - 30);
        break;
      case "3M":
        cutoffDate.setDate(today.getDate() - 90);
        break;
      default:
        cutoffDate.setDate(today.getDate() - 30);
    }
    cutoffDate.setHours(0, 0, 0, 0); // Set to start of day for inclusive comparison

    console.log(
      `🔍 Filtering data from ${cutoffDate.toISOString().split("T")[0]} to ${today.toISOString().split("T")[0]} for ${filter}`
    );

    // Filter data to only include dates within the range
    const filteredData = sortedData.filter((item) => {
      const itemDate = new Date(item.date);
      return itemDate >= cutoffDate && itemDate <= today;
    });

    console.log(
      `📊 Original data: ${sortedData.length} points, Filtered: ${filteredData.length} points`
    );

    // If no data matches the filter, return the most recent data points as fallback
    if (filteredData.length === 0) {
      const fallback = sortedData.slice(-Math.min(sortedData.length, 5));
      console.log(
        `⚠️ No data in range, using fallback: ${fallback.length} points`
      );
      return fallback;
    }

    return filteredData;
  };

  // Load weight accuracy data - reload when dashboard data changes
  useEffect(() => {
    const loadWeightAccuracyData = async () => {
      try {
        const data = await fetchWeightAccuracyByDate(calculateWideDataRange());
        setRawWeightAccuracyData(data);
      } catch (error) {
        console.error("Error loading weight accuracy data:", error);
      }
    };

    if (user?.id && hasLoadedInitialData) {
      loadWeightAccuracyData();
    }
  }, [
    user?.id,
    hasLoadedInitialData,
    weeklySummary,
    dailyWorkoutProgress,
    fetchWeightAccuracyByDate,
  ]);

  // Filter weight accuracy data when filter changes
  useEffect(() => {
    if (rawWeightAccuracyData.length > 0) {
      const filteredData = filterWeightAccuracyData(
        rawWeightAccuracyData,
        weightPerformanceFilter
      );
      setFilteredWeightAccuracy(filteredData);
      console.log(
        `📊 Filtered weight accuracy data for ${weightPerformanceFilter}:`,
        filteredData
      );
    } else {
      // Clear filtered data when no raw data
      setFilteredWeightAccuracy(null);
    }
  }, [rawWeightAccuracyData, weightPerformanceFilter]);

  // Load workout type data - reload when dashboard data changes
  useEffect(() => {
    const loadWorkoutTypeData = async () => {
      try {
        const data = await fetchWorkoutTypeByDate(calculateWideDataRange());
        setRawWorkoutTypeData(data);
      } catch (error) {
        console.error("Error loading workout type data:", error);
      }
    };

    if (user?.id && hasLoadedInitialData) {
      loadWorkoutTypeData();
    }
  }, [
    user?.id,
    hasLoadedInitialData,
    weeklySummary,
    dailyWorkoutProgress,
    fetchWorkoutTypeByDate,
  ]);

  // Filter workout type data when filter changes
  useEffect(() => {
    if (rawWorkoutTypeData.length > 0) {
      const filteredData = filterWorkoutTypeData(
        rawWorkoutTypeData,
        workoutTypeFilter
      );
      setFilteredWorkoutTypeMetrics(filteredData);
      console.log(
        `📊 Filtered workout type data for ${workoutTypeFilter}:`,
        filteredData
      );
    } else {
      // Clear filtered data when no raw data
      setFilteredWorkoutTypeMetrics(null);
    }
  }, [rawWorkoutTypeData, workoutTypeFilter]);

  // Load weight progression data - reload when dashboard data changes
  useEffect(() => {
    const loadWeightProgressionData = async () => {
      try {
        const data = await fetchWeightProgression(calculateWideDataRange());
        setRawWeightProgressionData(data);
      } catch (error) {
        console.error("Error loading weight progression data:", error);
      }
    };

    if (user?.id && hasLoadedInitialData) {
      loadWeightProgressionData();
    }
  }, [
    user?.id,
    hasLoadedInitialData,
    weeklySummary,
    dailyWorkoutProgress,
    fetchWeightProgression,
  ]);

  // Filter weight progression data when filter changes
  useEffect(() => {
    if (rawWeightProgressionData.length > 0) {
      const filteredData = filterDataByDateRange(
        rawWeightProgressionData,
        strengthFilter
      );
      setWeightProgressionData(filteredData);
      console.log(
        `📊 Filtered weight progression data for ${strengthFilter}:`,
        filteredData.length,
        "points"
      );
    } else {
      // Clear filtered data when no raw data
      setWeightProgressionData([]);
    }
  }, [rawWeightProgressionData, strengthFilter]);

  if (loading.dashboardLoading || loadingToday || isInitialLoad) {
    return (
      <View className="flex-1 bg-background">
        <SafeAreaView className="flex-1">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header Skeleton */}
            <View className="px-5 pt-3 pb-4">
              <View className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2" />
              <View className="h-5 w-48 bg-gray-100 rounded animate-pulse" />
            </View>

            {/* Today's Schedule Skeleton */}
            <View className="px-5 mb-6">
              <View className="bg-white rounded-2xl p-5 shadow-sm">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
                  <View className="h-8 w-20 bg-gray-100 rounded animate-pulse" />
                </View>
                <View className="h-20 bg-gray-100 rounded animate-pulse mb-3" />
                <View className="flex-row justify-between">
                  <View className="h-12 w-24 bg-gray-100 rounded animate-pulse" />
                  <View className="h-12 w-24 bg-gray-100 rounded animate-pulse" />
                  <View className="h-12 w-24 bg-gray-100 rounded animate-pulse" />
                </View>
              </View>
            </View>

            {/* Weekly Progress Skeleton */}
            <View className="px-5 mb-6">
              <View className="h-6 w-36 bg-gray-200 rounded animate-pulse mb-4" />
              <View className="bg-white rounded-2xl p-5 shadow-sm">
                <View className="h-40 bg-gray-100 rounded animate-pulse" />
              </View>
            </View>

            {/* Progress Charts Skeleton */}
            <View className="px-5 mb-6">
              <View className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4" />
              <View className="flex-row justify-between">
                <View className="bg-white rounded-2xl p-4 shadow-sm flex-1 mr-3">
                  <View className="h-32 bg-gray-100 rounded animate-pulse" />
                </View>
                <View className="bg-white rounded-2xl p-4 shadow-sm flex-1">
                  <View className="h-32 bg-gray-100 rounded animate-pulse" />
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  const handleRefresh = () => {
    if (user?.id) {
      // Use 30-day lookback + 7-day lookahead for manual refresh to include planned workouts
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 30);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 7); // Include upcoming planned workouts

      const refreshDateRange = {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      };

      // Just refresh dashboard data - this includes all dashboard metrics
      refreshAllData(refreshDateRange);

      // Refresh today's workout
      fetchTodaysWorkout();
    }
  };

  if (error) {
    Alert.alert("Error", error);
  }

  // Show message if user is not authenticated
  if (!isAuthenticated || !user?.id) {
    return (
      <View className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center py-12">
          <Text className="text-base text-text-muted">
            Please log in to view your dashboard
          </Text>
        </View>
      </View>
    );
  }

  // Helper function to calculate duration for both legacy and new workout structures
  const calculateTotalDuration = (
    workout: PlanDayWithExercises | null
  ): number => {
    if (!workout) return 0;

    // Check if this is the new structure with blocks
    if ((workout as any).blocks) {
      return calculatePlanDayDuration(workout as any);
    }

    // Legacy structure with exercises directly
    if (workout.exercises) {
      const durationSeconds = calculateWorkoutDuration(workout.exercises);
      return Math.round(durationSeconds / 60); // Convert to minutes
    }

    return 0;
  };

  // Calculate total workout duration
  const totalDurationMinutes = calculateTotalDuration(todaysWorkout);

  // Calculate workout completion rate for today
  const todayCompletionRate = (todaysWorkout as any)?.blocks
    ? (todaysWorkout as any).blocks.reduce((total: number, block: any) => {
        const blockExercises = block.exercises || [];
        const blockCompletion = blockExercises.reduce(
          (sum: number, exercise: any) => {
            return sum + (exercise.completed ? 100 : 0);
          },
          0
        );
        return total + blockCompletion;
      }, 0) /
      ((todaysWorkout as any).blocks.reduce(
        (total: number, block: any) => total + (block.exercises?.length || 0),
        0
      ) || 1)
    : todaysWorkout?.exercises
      ? todaysWorkout.exercises.reduce((sum, exercise) => {
          // Use completed status instead of completionRate property
          return sum + (exercise.completed ? 100 : 0);
        }, 0) / todaysWorkout.exercises.length
      : 0;

  const isWorkoutCompleted = todayCompletionRate >= 100;

  // Prepare chart data (computed on each render - will update when dependencies change)
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

  // Compute weekly progress data (will update when dependencies change)
  const getWeeklyProgressData = () => {
    if (!dailyWorkoutProgress) {
      console.log("No dailyWorkoutProgress data available");
      return [];
    }

    console.log("Computing weekly progress with data:", dailyWorkoutProgress);

    // Use the workout start date as the base, not the current week's Monday
    let weekStartDate = new Date();

    // Use the actual workout start date from the API response
    if (workoutInfo?.startDate) {
      // Use safe date parsing to avoid timezone issues
      if (/^\d{4}-\d{2}-\d{2}$/.test(workoutInfo.startDate)) {
        const [year, month, day] = workoutInfo.startDate.split("-").map(Number);
        weekStartDate = new Date(year, month - 1, day); // month is 0-indexed
      } else {
        weekStartDate = new Date(workoutInfo.startDate);
      }
    } else {
      // Fallback: use current week's Monday
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      weekStartDate.setDate(today.getDate() - daysFromMonday);
    }

    const workout7Days = [];
    const today = new Date();
    const todayStr = formatDateAsString(today);

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDate);
      date.setDate(weekStartDate.getDate() + i);

      // Generate day name dynamically based on actual date using safe method
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      // Use manual date string formatting to avoid timezone issues
      const dateStr =
        date.getFullYear() +
        "-" +
        String(date.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(date.getDate()).padStart(2, "0");

      // Get day name safely - match with planned workout dates
      let dayName = dayNames[date.getDay()];

      // Double-check with the actual planned workout dates to ensure consistency
      const plannedWorkoutDay = dailyWorkoutProgress.find(
        (day) => day.date === dateStr
      );
      if (plannedWorkoutDay && plannedWorkoutDay.date === dateStr) {
        // If we have a planned workout for this date, verify the day matches expectations
        const safeDayCheck = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate()
        );
        dayName = dayNames[safeDayCheck.getDay()];
      }

      // Find corresponding data from dailyWorkoutProgress
      const dayData = dailyWorkoutProgress.find((day) => {
        return day.date === dateStr;
      });

      // Check if there's a planned workout for this day
      const hasPlannedWorkout = dayData?.hasPlannedWorkout || false;

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

    return workout7Days;
  };

  const weeklyProgressData = getWeeklyProgressData();

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={loading.dashboardLoading}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* Header with Streak */}
        <View className="px-4 pt-6 mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <View className="px-5">
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
                <Ionicons name="flame" size={16} color={colors.brand.primary} />
                <Text className="text-sm font-bold text-secondary ml-2">
                  {weeklySummary.streak} day streak
                </Text>
              </View>
            )}
          </View>
        </View>

        {loading.dashboardLoading && !totalVolumeMetrics ? (
          <View className="flex-1 justify-center items-center py-12">
            <ActivityIndicator size="large" color={colors.brand.primary} />
            <Text className="mt-3 text-sm text-text-muted">
              Loading your progress...
            </Text>
          </View>
        ) : (
          <>
            {/* Today's Workout Card */}
            <View className="px-4 mb-6">
              <View className="bg-white rounded-2xl p-5 shadow-sm">
                {/* Header with title and duration */}
                <View className="flex-row items-center justify-between mb-6">
                  <Text className="text-base font-semibold text-text-primary mb-1">
                    Active Workout
                  </Text>
                  {todaysWorkout && totalDurationMinutes > 0 ? (
                    <Text className="text-base font-semibold text-text-primary">
                      {formatWorkoutDuration(totalDurationMinutes)}
                    </Text>
                  ) : (
                    <Text className="text-base font-semibold text-text-muted">
                      Rest Day
                    </Text>
                  )}
                  {loadingToday && (
                    <ActivityIndicator
                      size="small"
                      color={colors.brand.primary}
                    />
                  )}
                </View>

                {workoutInfo || todaysWorkout ? (
                  <View>
                    {/* Icon and workout details */}
                    <View className="flex-row items-center mb-6">
                      <View className="w-16 h-16 rounded-full items-center justify-center mr-4 bg-primary">
                        <Ionicons
                          name={todaysWorkout ? "heart-outline" : "bed-outline"}
                          size={24}
                          color={colors.neutral.light[1]}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-bold text-text-primary mb-1">
                          {workoutInfo?.name || "Workout Session"}
                        </Text>
                        <Text className="text-sm text-text-muted leading-5">
                          {todaysWorkout
                            ? workoutInfo?.description ||
                              `${
                                (todaysWorkout as any)?.blocks
                                  ? (todaysWorkout as any).blocks.reduce(
                                      (total: number, block: any) =>
                                        total + (block.exercises?.length || 0),
                                      0
                                    )
                                  : todaysWorkout.exercises?.length || 0
                              } exercises planned`
                            : "Rest day - Recovery is just as important as training"}
                        </Text>
                      </View>
                    </View>

                    {/* Action button */}
                    {!todaysWorkout ? (
                      // Rest day
                      <View className="bg-neutral-light-2/50 border border-neutral-light-2 rounded-xl p-4 flex-row items-center">
                        <Ionicons
                          name="bed"
                          size={24}
                          color={colors.text.muted}
                        />
                        <View className="ml-3 flex-1">
                          <Text className="text-sm font-semibold text-text-muted">
                            Rest Day
                          </Text>
                          <Text className="text-xs text-text-muted">
                            Take time to recover and recharge
                          </Text>
                        </View>
                      </View>
                    ) : isWorkoutCompleted ? (
                      <View className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex-row items-center">
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color={colors.brand.dark[1]}
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
                      <Ionicons
                        name="bed-outline"
                        size={24}
                        color={colors.text.muted}
                      />
                    </View>
                    <Text className="text-base font-semibold text-text-primary mb-2">
                      No Active Workout
                    </Text>
                    <Text className="text-sm text-text-muted text-center">
                      Start a new workout plan to begin your fitness journey
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Weekly Progress */}
            {weeklySummary && (
              <View className="px-4 mb-6">
                <View className="px-4">
                  <Text className="text-base font-semibold text-text-primary mb-1">
                    Weekly Progress
                  </Text>
                  <Text className="text-xs text-text-muted mb-4">
                    Your workout completion for this week
                  </Text>
                </View>
                <View className="bg-white rounded-2xl px-4 pt-5 shadow-sm">
                  {/* Chart Section */}
                  <View className="mb-4">
                    <View className="flex-row justify-between items-end mb-4 h-30">
                      {(() => {
                        const FULL_HEIGHT = 100; // Full bar height in pixels
                        const BASE_HEIGHT = 20; // Base height for incomplete/upcoming days

                        return weeklyProgressData.map((day, index) => (
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
                                      ? colors.brand.primary // Complete - Green
                                      : day.status === "partial"
                                        ? colors.brand.medium[2] // Partial - Primary[1]
                                        : day.status === "rest"
                                          ? colors.brand.secondary // Rest - Black
                                          : colors.neutral.medium[3], // Upcoming/Incomplete - Grey
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

            {/* Weight Performance */}
            {filteredWeightAccuracy &&
              filteredWeightAccuracy.hasExerciseData &&
              filteredWeightAccuracy.totalSets > 0 && (
                <View className="px-4 mb-5">
                  <View className="px-4">
                    <Text className="text-base font-semibold text-text-primary mb-1">
                      Weight Performance
                    </Text>
                    <Text className="text-xs text-text-muted mb-3">
                      How you're progressing with your planned weights (
                      {weightPerformanceFilter === "3M"
                        ? "Last 3 months"
                        : weightPerformanceFilter === "1M"
                          ? "Last 1 month"
                          : "Last 1 week"}
                      )
                    </Text>
                  </View>

                  {/* Time Filter Buttons - Centered below subtitle */}
                  <View className="items-center mb-4">
                    <View className="flex-row bg-neutral-light-2 rounded-lg p-1">
                      {(["1W", "1M", "3M"] as const).map((filter) => (
                        <TouchableOpacity
                          key={filter}
                          className={`px-3 py-1 rounded-md ${
                            weightPerformanceFilter === filter
                              ? "bg-primary"
                              : "bg-transparent"
                          }`}
                          onPress={() => setWeightPerformanceFilter(filter)}
                        >
                          <Text
                            className={`text-xs font-medium ${
                              weightPerformanceFilter === filter
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
                    {/* Main Pie Chart Display */}
                    <View className="items-center mb-6">
                      <PieChart
                        data={
                          filteredWeightAccuracy.chartData &&
                          filteredWeightAccuracy.chartData.length > 0
                            ? filteredWeightAccuracy.chartData
                            : [
                                {
                                  label: "As Planned",
                                  value: 35,
                                  color: colors.brand.medium[1], // Light green #E8F8B8
                                  count: 35,
                                },
                                {
                                  label: "Progressed",
                                  value: 40,
                                  color: colors.brand.primary, // Main green #9BB875
                                  count: 40,
                                },
                                {
                                  label: "Adapted",
                                  value: 25,
                                  color: colors.brand.dark[1], // Dark green #8CAF25
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
                        <Text className="text-lg font-bold text-brand-medium-1">
                          {filteredWeightAccuracy.exactMatches || 0}
                        </Text>
                        <Text className="text-xs text-text-muted text-center">
                          As Planned
                        </Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-lg font-bold text-primary">
                          {filteredWeightAccuracy.higherWeight || 0}
                        </Text>
                        <Text className="text-xs text-text-muted text-center">
                          Progressed
                        </Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-lg font-bold text-brand-dark-1">
                          {filteredWeightAccuracy.lowerWeight || 0}
                        </Text>
                        <Text className="text-xs text-text-muted text-center">
                          Adapted
                        </Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-lg font-bold text-text-primary">
                          {filteredWeightAccuracy.totalSets || 0}
                        </Text>
                        <Text className="text-xs text-text-muted text-center">
                          Total Sets
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

            {/* Show message when no weight performance data is available for the selected time range */}
            {filteredWeightAccuracy &&
              (!filteredWeightAccuracy.hasExerciseData ||
                filteredWeightAccuracy.totalSets === 0) && (
                <View className="px-4 mb-6">
                  <View className="px-4">
                    <Text className="text-base font-semibold text-text-primary mb-1">
                      Weight Performance
                    </Text>
                    <Text className="text-xs text-text-muted mb-3">
                      How you're progressing with your planned weights (
                      {weightPerformanceFilter === "3M"
                        ? "Last 3 months"
                        : weightPerformanceFilter === "1M"
                          ? "Last 1 month"
                          : "Last 1 week"}
                      )
                    </Text>
                  </View>

                  {/* Time Filter Buttons */}
                  <View className="items-center mb-4">
                    <View className="flex-row bg-neutral-light-2 rounded-lg p-1">
                      {(["1W", "1M", "3M"] as const).map((filter) => (
                        <TouchableOpacity
                          key={filter}
                          className={`px-3 py-1 rounded-md ${
                            weightPerformanceFilter === filter
                              ? "bg-primary"
                              : "bg-transparent"
                          }`}
                          onPress={() => setWeightPerformanceFilter(filter)}
                        >
                          <Text
                            className={`text-xs font-medium ${
                              weightPerformanceFilter === filter
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
                    <View className="items-center py-8">
                      <Text className="text-sm text-text-muted text-center mb-2">
                        No weight data available for {weightPerformanceFilter}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setWeightPerformanceFilter("3M")}
                        className="mt-2"
                      >
                        <Text className="text-sm text-primary font-medium">
                          View all data (3M)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

            {/* Strength Progress Chart */}
            {weightProgressionData && weightProgressionData.length > 0 && (
              <View className="px-4 mb-6">
                <View className="px-4">
                  <Text className="text-base font-semibold text-text-primary mb-1">
                    Strength Progress
                  </Text>

                  <Text className="text-xs text-text-muted mb-3">
                    Your weight progression over time (
                    {strengthFilter === "3M"
                      ? "Last 3 months"
                      : strengthFilter === "1M"
                        ? "Last 1 month"
                        : "Last 1 week"}
                    )
                  </Text>
                </View>

                {/* Time Filter Buttons - Centered below subtitle */}
                <View className="items-center mb-4">
                  <View className="flex-row bg-neutral-light-2 rounded-lg p-1">
                    {(["1W", "1M", "3M"] as const).map((filter) => (
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
                  {/* Line Chart */}
                  <View className="mb-4">
                    <LineChart
                      data={weightProgressionData.map((item, index) => {
                        // Create more strategic labeling to avoid clutter
                        let displayLabel = "";
                        const totalPoints = weightProgressionData.length;

                        if (totalPoints <= 3) {
                          // If 3 or fewer points, show all labels
                          displayLabel = item.label;
                        } else if (totalPoints <= 7) {
                          // If 7 or fewer points, show first, middle, and last
                          if (
                            index === 0 ||
                            index === Math.floor(totalPoints / 2) ||
                            index === totalPoints - 1
                          ) {
                            displayLabel = item.label;
                          }
                        } else {
                          // If more than 7 points, show first, quarter, middle, three-quarter, and last
                          if (
                            index === 0 ||
                            index === Math.floor(totalPoints / 4) ||
                            index === Math.floor(totalPoints / 2) ||
                            index === Math.floor((3 * totalPoints) / 4) ||
                            index === totalPoints - 1
                          ) {
                            displayLabel = item.label;
                          }
                        }

                        return {
                          label: displayLabel,
                          value: item.avgWeight,
                          date: item.date,
                        };
                      })}
                      height={200}
                      color={colors.brand.dark[1]}
                      showValues={true}
                      showLabels={true}
                    />
                  </View>

                  {/* Progress Stats */}
                  <View className="flex-row justify-around pt-4 border-t border-neutral-light-2">
                    <View className="items-center">
                      <Text className="text-base font-bold text-text-primary">
                        {weightProgressionData.length > 0
                          ? Math.round(
                              weightProgressionData[
                                weightProgressionData.length - 1
                              ]?.avgWeight || 0
                            )
                          : 0}{" "}
                        lbs
                      </Text>
                      <Text className="text-xs text-text-muted">
                        Latest Avg
                      </Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-base font-bold text-accent">
                        {weightProgressionData.length > 0
                          ? Math.max(
                              ...weightProgressionData.map((d) => d.maxWeight)
                            )
                          : 0}{" "}
                        lbs
                      </Text>
                      <Text className="text-xs text-text-muted">
                        Peak Weight
                      </Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-base font-bold text-primary">
                        {(() => {
                          if (weightProgressionData.length < 2) return "0%";
                          const first = weightProgressionData[0].avgWeight;
                          const last =
                            weightProgressionData[
                              weightProgressionData.length - 1
                            ].avgWeight;
                          const growth =
                            first > 0 ? ((last - first) / first) * 100 : 0;
                          return `${growth > 0 ? "+" : ""}${Math.round(
                            growth
                          )}%`;
                        })()}
                      </Text>
                      <Text className="text-xs text-text-muted">Growth</Text>
                    </View>
                  </View>

                  {/* Show message for limited data */}
                  {weightProgressionData.length === 0 && (
                    <View className="items-center py-8">
                      <Text className="text-sm text-text-muted text-center mb-2">
                        No weight data available for the selected time period
                      </Text>
                      <TouchableOpacity
                        onPress={() => setStrengthFilter("3M")}
                        className="mt-2"
                      >
                        <Text className="text-sm text-primary font-medium">
                          View all data
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {weightProgressionData.length === 1 && (
                    <View className="items-center py-4">
                      <Text className="text-sm text-text-muted text-center mb-2">
                        Complete more workouts to see your weight progression
                        trends
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Workout Type Progress/Distribution Chart */}
            {filteredWorkoutTypeMetrics &&
              filteredWorkoutTypeMetrics.hasData &&
              filteredWorkoutTypeMetrics.totalSets > 0 &&
              filteredWorkoutTypeMetrics.distribution.length > 0 && (
                <View className="px-4 mb-6">
                  <View className="px-4">
                    <Text className="text-base font-semibold text-text-primary mb-1">
                      General Fitness Progress
                    </Text>

                    <Text className="text-xs text-text-muted mb-3">
                      Types of exercises you've been completing (
                      {workoutTypeFilter === "3M"
                        ? "Last 3 months"
                        : workoutTypeFilter === "1M"
                          ? "Last 1 month"
                          : "Last 1 week"}
                      )
                    </Text>
                  </View>

                  {/* Time Filter Buttons - Centered below subtitle */}
                  <View className="items-center mb-4">
                    <View className="flex-row bg-neutral-light-2 rounded-lg p-1">
                      {(["1W", "1M", "3M"] as const).map((filter) => (
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
                    <View className="items-center mb-4">
                      <PieChart
                        data={(() => {
                          // Get top 5 and group the rest under "Other"
                          const allTypes =
                            filteredWorkoutTypeMetrics!.distribution;
                          const topTypes = allTypes.slice(0, 5);
                          const otherTypes = allTypes.slice(5);

                          let chartData = topTypes.map((item, index) => ({
                            label: item.label,
                            value: item.percentage,
                            color: DONUT_COLORS[index], // Use dynamic colors
                            count: item.totalSets,
                          }));

                          // If there are more than 5 types, create "Other" category
                          if (otherTypes.length > 0) {
                            const otherPercentage = otherTypes.reduce(
                              (sum, item) => sum + item.percentage,
                              0
                            );
                            const otherCount = otherTypes.reduce(
                              (sum, item) => sum + item.totalSets,
                              0
                            );

                            chartData.push({
                              label: "Other",
                              value: Math.round(otherPercentage * 10) / 10,
                              color: DONUT_COLORS[5], // Last color for "Other"
                              count: otherCount,
                            });
                          }

                          return chartData;
                        })()}
                        size={140}
                        donut={true}
                        innerRadius={35}
                        showLabels={false}
                      />
                    </View>

                    {/* Legend - Now directly below donut */}
                    <View className="mb-4">
                      <Text className="text-sm font-semibold text-text-primary mb-3 text-center">
                        Exercise Types
                      </Text>
                      <View className="flex-row flex-wrap justify-center">
                        {(() => {
                          // Get top 5 and group the rest under "Other" for legend too
                          const allTypes =
                            filteredWorkoutTypeMetrics!.distribution;
                          const topTypes = allTypes.slice(0, 5);
                          const otherTypes = allTypes.slice(5);

                          let legendData = topTypes.map((item, index) => ({
                            ...item,
                            color: DONUT_COLORS[index], // Use dynamic colors
                          }));

                          // If there are more than 5 types, create "Other" category
                          if (otherTypes.length > 0) {
                            const otherPercentage = otherTypes.reduce(
                              (sum, item) => sum + item.percentage,
                              0
                            );

                            legendData.push({
                              tag: "other",
                              label: "Other",
                              percentage: Math.round(otherPercentage * 10) / 10,
                              color: DONUT_COLORS[5], // Last color for "Other"
                              totalSets: otherTypes.reduce(
                                (sum, item) => sum + item.totalSets,
                                0
                              ),
                              totalReps: otherTypes.reduce(
                                (sum, item) => sum + item.totalReps,
                                0
                              ),
                              exerciseCount: otherTypes.reduce(
                                (sum, item) => sum + item.exerciseCount,
                                0
                              ),
                              completedWorkouts: otherTypes.reduce(
                                (sum, item) => sum + item.completedWorkouts,
                                0
                              ),
                            });
                          }

                          return legendData.map((item, index) => (
                            <View
                              key={index}
                              className="flex-row items-center mx-2 mb-2"
                            >
                              <View
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: item.color }}
                              />
                              <Text className="text-xs text-text-primary font-medium">
                                {item.label}
                              </Text>
                              <Text className="text-xs text-text-muted ml-1">
                                {item.percentage}%
                              </Text>
                            </View>
                          ));
                        })()}
                      </View>
                      {/* Show additional info if "Other" category exists */}
                      {filteredWorkoutTypeMetrics &&
                        filteredWorkoutTypeMetrics.distribution.length > 5 && (
                          <Text className="text-xs text-text-muted text-center mt-2">
                            "Other" includes{" "}
                            {filteredWorkoutTypeMetrics.distribution.length - 5}{" "}
                            additional exercise types
                          </Text>
                        )}
                    </View>

                    {/* Dominant Type - Now below legend */}
                    <View className="items-center mb-6">
                      <Text className="text-lg font-bold text-text-primary">
                        {filteredWorkoutTypeMetrics?.dominantType || "N/A"}
                      </Text>
                      <Text className="text-sm text-text-muted">
                        Most Common Type
                      </Text>
                    </View>

                    {/* Stats Breakdown */}
                    <View className="flex-row justify-around pt-4 border-t border-neutral-light-2">
                      <View className="items-center">
                        <Text className="text-lg font-bold text-text-primary">
                          {filteredWorkoutTypeMetrics?.totalExercises || 0}
                        </Text>
                        <Text className="text-xs text-text-muted text-center">
                          Exercises
                        </Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-lg font-bold text-accent">
                          {filteredWorkoutTypeMetrics?.distribution.length || 0}
                        </Text>
                        <Text className="text-xs text-text-muted text-center">
                          Types
                        </Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-lg font-bold text-secondary">
                          {filteredWorkoutTypeMetrics &&
                          filteredWorkoutTypeMetrics.distribution.length > 0
                            ? Math.round(
                                filteredWorkoutTypeMetrics.distribution.reduce(
                                  (sum, item) => sum + item.completedWorkouts,
                                  0
                                ) /
                                  filteredWorkoutTypeMetrics.distribution.length
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

            {/* Empty State Message - Only show when no charts are visible */}
            {!hasLoadedInitialData && (
              <View className="px-4 mb-6">
                <View className="bg-white rounded-2xl p-6 shadow-sm items-center">
                  <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center mb-4">
                    <Ionicons
                      name="analytics-outline"
                      size={32}
                      color={colors.brand.primary}
                    />
                  </View>
                  <Text className="text-lg font-semibold text-text-primary mb-2 text-center">
                    Loading Your Progress...
                  </Text>
                  <Text className="text-sm text-text-muted text-center mb-4 leading-5">
                    Please wait while we load your fitness data.
                  </Text>
                </View>
              </View>
            )}

            {/* No data state - show when loaded but no workout data */}
            {hasLoadedInitialData &&
              (!filteredWeightAccuracy ||
                !filteredWeightAccuracy.hasExerciseData ||
                filteredWeightAccuracy.totalSets === 0) &&
              (!filteredWorkoutTypeMetrics ||
                !filteredWorkoutTypeMetrics.hasData ||
                filteredWorkoutTypeMetrics.totalSets === 0) &&
              (!weightProgressionData || weightProgressionData.length === 0) &&
              (!weeklySummary || weeklySummary.totalWorkouts === 0) && (
                <View className="px-4 mb-6">
                  <View className="bg-white rounded-2xl p-6 shadow-sm items-center">
                    <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center mb-4">
                      <Ionicons
                        name="analytics-outline"
                        size={32}
                        color={colors.brand.primary}
                      />
                    </View>
                    <Text className="text-lg font-semibold text-text-primary mb-2 text-center">
                      Start Your Fitness Journey
                    </Text>
                    <Text className="text-sm text-text-muted text-center mb-4 leading-5">
                      Complete your first workout to see personalized analytics
                      and track your progress over time.
                    </Text>
                    <TouchableOpacity
                      className="bg-primary rounded-lg px-6 py-3"
                      onPress={() => router.push("/(tabs)/workout")}
                    >
                      <Text className="text-text-primary font-semibold text-sm">
                        Start Workout
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
