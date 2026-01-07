import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../contexts/auth-context";
import { useAppDataContext } from "@/contexts/app-data-context";
import {
  fetchHeartRateSamples,
  fetchCaloriesToday,
  fetchWorkoutDuration,
  connectHealth as connectHealthAPI,
  fetchStepsToday as fetchStepsTodayAPI,
  fetchNutritionCaloriesToday,
  getHealthConnection,
} from "@utils/health";
import Header from "@/components/header";
import { SkeletonLoader } from "@/components/skeletons/skeleton-loader";
import { generateWorkoutPlanAsync, fetchActiveWorkout } from "@lib/workouts";
import { registerForPushNotifications } from "@/lib/notifications";
import { useBackgroundJobs } from "@/contexts/background-job-context";
import {
  WeightAccuracyMetrics,
  WorkoutTypeMetrics,
  TodayWorkout,
  PlanDayWithBlocks,
  PlanDayWithExercises,
  WorkoutBlockWithExercises,
  WorkoutBlockWithExercise,
} from "@/types/api";
import {
  formatDate,
  formatNumber,
  calculateWorkoutDuration,
  calculatePlanDayDuration,
  formatWorkoutDuration,
  getCurrentDate,
  formatDateAsString,
} from "../../utils";
import { useThemeColors } from "../../lib/theme";
import HealthMetricsCarousel from "./sections/health-metrics-carousel";
import ActiveWorkoutCard from "./sections/active-workout-card";
import WeeklyProgressSection from "./sections/weekly-progress";
import WeightPerformanceSection from "./sections/weight-performance";
import StrengthProgressSection from "./sections/strength-progress";
import WorkoutTypeDistributionSection from "./sections/workout-type-distribution";
import DashboardEmptyStateSection from "./sections/dashboard-empty-state";
import WorkoutRepeatModal from "@/components/workout-repeat-modal";
import { TIME_RANGE_FILTER } from "@/constants/global.enum";

export default function DashboardScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { addJob, reloadJobs, isGenerating } = useBackgroundJobs();
  const scrollViewRef = useRef<ScrollView>(null);
  const [todaysWorkout, setTodaysWorkout] = useState<TodayWorkout | null>(null);
  const [workoutInfo, setWorkoutInfo] = useState<{
    name: string;
    description: string;
    startDate?: string;
    endDate?: string;
    planDays?: PlanDayWithBlocks[];
  } | null>(null);
  const [loadingToday, setLoadingToday] = useState(false);
  const [stepsCount, setStepsCount] = useState<number | null>(null);
  const [maxHeartRate, setMaxHeartRate] = useState<number | null>(null);
  const [avgHeartRate, setAvgHeartRate] = useState<number | null>(null);
  const [caloriesBurned, setCaloriesBurned] = useState<number | null>(null);
  const [nutritionCaloriesConsumed, setNutritionCaloriesConsumed] = useState<
    number | null
  >(null);
  const [workoutDuration, setWorkoutDuration] = useState<number | null>(null);
  const [healthReady, setHealthReady] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [strengthFilter, setStrengthFilter] = useState<TIME_RANGE_FILTER>(
    TIME_RANGE_FILTER.THREE_MONTHS
  );
  const [workoutTypeFilter, setWorkoutTypeFilter] = useState<TIME_RANGE_FILTER>(
    TIME_RANGE_FILTER.ONE_MONTH
  );
  const [weightPerformanceFilter, setWeightPerformanceFilter] =
    useState<TIME_RANGE_FILTER>(TIME_RANGE_FILTER.ONE_MONTH);

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

  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);

  const {
    data: {
      weeklySummary,
      workoutConsistency,
      weightMetrics,
      totalVolumeMetrics,
      dailyWorkoutProgress,
    },
    loading,
    refresh: {
      fetchWeightProgression,
      fetchWeightAccuracyByDate,
      fetchWorkoutTypeByDate,
      refreshAll: refreshAllData,
      reset,
    },
  } = useAppDataContext();

  const fetchTodaysWorkout = async () => {
    try {
      setLoadingToday(true);
      const workoutPlan = await fetchActiveWorkout();
      if (workoutPlan) {
        setWorkoutInfo({
          name: workoutPlan.name || "Workout Plan",
          description: workoutPlan.description || "A plan for your workouts.",
          startDate: workoutPlan.startDate?.toString(),
          endDate: workoutPlan.endDate?.toString(),
          planDays: workoutPlan.planDays,
        });
        const today = getCurrentDate();
        const todaysPlanDay = workoutPlan.planDays?.find(
          (day: PlanDayWithBlocks) => formatDateAsString(day.date) === today
        );
        setTodaysWorkout(todaysPlanDay || null);
      } else {
        setWorkoutInfo(null);
        setTodaysWorkout(null);
      }
    } catch (err) {
      setWorkoutInfo(null);
      setTodaysWorkout(null);
    } finally {
      setLoadingToday(false);
    }
  };

  const isPlanDayWithExercises = (
    w: TodayWorkout | null
  ): w is PlanDayWithExercises => {
    return !!w && "exercises" in w && Array.isArray((w as any).exercises);
  };

  const isPlanDayWithBlocks = (
    w: TodayWorkout | null
  ): w is PlanDayWithBlocks => {
    return !!w && "blocks" in w && Array.isArray((w as any).blocks);
  };

  useEffect(() => {
    if (user?.id && !hasLoadedInitialData) {
      fetchTodaysWorkout().then(() => setHasLoadedInitialData(true));
    }
  }, [user?.id, hasLoadedInitialData]);

  useEffect(() => {
    if (user?.id && !hasLoadedInitialData && weeklySummary !== null) {
      setHasLoadedInitialData(true);
    }
  }, [user?.id, hasLoadedInitialData, weeklySummary]);

  useEffect(() => {
    if (!user && !authLoading && hasLoadedInitialData) {
      reset();
      setHasLoadedInitialData(false);
      setTodaysWorkout(null);
      setWorkoutInfo(null);
    }
  }, [user, authLoading, hasLoadedInitialData, reset]);

  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      reloadJobs();
    }, [reloadJobs])
  );

  const resetHealthMetrics = useCallback(() => {
    setStepsCount(null);
    setMaxHeartRate(null);
    setAvgHeartRate(null);
    setCaloriesBurned(null);
    setNutritionCaloriesConsumed(null);
    setWorkoutDuration(null);
  }, []);

  const loadHealthConnectionStatus = useCallback(async () => {
    try {
      const connected = await getHealthConnection();
      setHealthReady(connected);
      if (!connected) {
        setHealthError(null);
        resetHealthMetrics();
      }
    } catch {
      setHealthReady(false);
    }
  }, [resetHealthMetrics]);

  useEffect(() => {
    loadHealthConnectionStatus();
  }, [loadHealthConnectionStatus]);

  useFocusEffect(
    useCallback(() => {
      loadHealthConnectionStatus();
    }, [loadHealthConnectionStatus])
  );

  useEffect(() => {
    const handleScrollToTop = () => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    };
    const { tabEvents } = require("../../lib/tab-events");
    tabEvents.on("scrollToTop:dashboard", handleScrollToTop);
    return () => {
      tabEvents.off("scrollToTop:dashboard", handleScrollToTop);
    };
  }, []);

  const fetchHealthData = useCallback(async () => {
    if (!healthReady) return;
    setHealthLoading(true);
    try {
      const steps = await fetchStepsTodayAPI();
      setStepsCount(Math.round(steps));
      const { max, avg } = await fetchHeartRateSamples();
      setMaxHeartRate(max !== null ? Math.round(max) : null);
      setAvgHeartRate(avg !== null ? Math.round(avg) : null);
      const calories = await fetchCaloriesToday();
      setCaloriesBurned(calories !== null ? Math.round(calories) : null);
      const nutritionCalories = await fetchNutritionCaloriesToday();
      setNutritionCaloriesConsumed(
        nutritionCalories !== null ? Math.round(nutritionCalories) : null
      );
      const duration = await fetchWorkoutDuration();
      setWorkoutDuration(duration !== null ? Math.round(duration) : null);
    } catch (error) {
      setHealthError("Failed to fetch health data.");
    } finally {
      setHealthLoading(false);
    }
  }, [healthReady]);

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  const calculateWideDataRange = () => ({
    startDate: "2020-01-01",
    endDate: "2030-12-31",
  });

  const filterDataByDateRange = <T extends { date: string }>(
    data: T[],
    filter: TIME_RANGE_FILTER
  ): T[] => {
    if (!data || data.length === 0) return data;
    const sortedData = [...data].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    let cutoffDate = new Date(today);
    switch (filter) {
      case TIME_RANGE_FILTER.ONE_WEEK:
        cutoffDate.setDate(today.getDate() - 7);
        break;
      case TIME_RANGE_FILTER.ONE_MONTH:
        cutoffDate.setDate(today.getDate() - 30);
        break;
      case TIME_RANGE_FILTER.THREE_MONTHS:
        cutoffDate.setDate(today.getDate() - 90);
        break;
      default:
        cutoffDate.setDate(today.getDate() - 30);
    }
    cutoffDate.setHours(0, 0, 0, 0);
    const filteredData = sortedData.filter((item) => {
      const itemDate = new Date(item.date);
      return itemDate >= cutoffDate && itemDate <= today;
    });
    if (filteredData.length === 0) {
      const fallback = sortedData.slice(-Math.min(sortedData.length, 5));
      return fallback;
    }
    return filteredData;
  };

  const filterWeightAccuracyData = (
    data: {
      date: string;
      totalSets: number;
      exactMatches: number;
      higherWeight: number;
      lowerWeight: number;
      label: string;
    }[],
    filter: TIME_RANGE_FILTER
  ): WeightAccuracyMetrics | null => {
    if (!data || data.length === 0) return null;
    const filteredData = filterDataByDateRange(data, filter);
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
    const chartData: {
      label: string;
      value: number;
      color: string;
      count: number;
    }[] = [];
    if (exactMatches > 0)
      chartData.push({
        label: "As Planned",
        value: Math.round((exactMatches / totalSets) * 100 * 100) / 100,
        color: colors.brand.medium[1],
        count: exactMatches,
      });
    if (higherWeight > 0)
      chartData.push({
        label: "Progressed",
        value: Math.round((higherWeight / totalSets) * 100 * 100) / 100,
        color: colors.brand.primary,
        count: higherWeight,
      });
    if (lowerWeight > 0)
      chartData.push({
        label: "Adapted",
        value: Math.round((lowerWeight / totalSets) * 100 * 100) / 100,
        color: colors.brand.dark[1],
        count: lowerWeight,
      });
    return {
      accuracyRate: Math.round(accuracyRate * 100) / 100,
      totalSets,
      exactMatches,
      higherWeight,
      lowerWeight,
      avgWeightDifference: 0,
      chartData,
      hasPlannedWeights: totalSets > 0,
      hasExerciseData: totalSets > 0,
    };
  };

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
    filter: TIME_RANGE_FILTER
  ): WorkoutTypeMetrics | null => {
    if (!data || data.length === 0) return null;
    const filteredData = filterDataByDateRange(data, filter);
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
          aggregate.completedWorkouts += 1;
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
    const distribution = Array.from(typeAggregates.values())
      .filter(
        (type) =>
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
        color: colors.text.muted,
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

  useEffect(() => {
    const loadWeightAccuracyData = async () => {
      try {
        const data = await fetchWeightAccuracyByDate(calculateWideDataRange());
        setRawWeightAccuracyData(data);
      } catch {}
    };
    if (user?.id && hasLoadedInitialData) loadWeightAccuracyData();
  }, [
    user?.id,
    hasLoadedInitialData,
    weeklySummary,
    dailyWorkoutProgress,
    fetchWeightAccuracyByDate,
  ]);

  useEffect(() => {
    if (rawWeightAccuracyData.length > 0) {
      setFilteredWeightAccuracy(
        filterWeightAccuracyData(rawWeightAccuracyData, weightPerformanceFilter)
      );
    } else {
      setFilteredWeightAccuracy(null);
    }
  }, [rawWeightAccuracyData, weightPerformanceFilter]);

  useEffect(() => {
    const loadWorkoutTypeData = async () => {
      try {
        const data = await fetchWorkoutTypeByDate(calculateWideDataRange());
        setRawWorkoutTypeData(data);
      } catch {}
    };
    if (user?.id && hasLoadedInitialData) loadWorkoutTypeData();
  }, [
    user?.id,
    hasLoadedInitialData,
    weeklySummary,
    dailyWorkoutProgress,
    fetchWorkoutTypeByDate,
  ]);

  useEffect(() => {
    if (rawWorkoutTypeData.length > 0) {
      setFilteredWorkoutTypeMetrics(
        filterWorkoutTypeData(rawWorkoutTypeData, workoutTypeFilter)
      );
    } else {
      setFilteredWorkoutTypeMetrics(null);
    }
  }, [rawWorkoutTypeData, workoutTypeFilter]);

  useEffect(() => {
    const loadWeightProgressionData = async () => {
      try {
        const data = await fetchWeightProgression(calculateWideDataRange());
        setRawWeightProgressionData(data);
      } catch {}
    };
    if (user?.id && hasLoadedInitialData) loadWeightProgressionData();
  }, [
    user?.id,
    hasLoadedInitialData,
    weeklySummary,
    dailyWorkoutProgress,
    fetchWeightProgression,
  ]);

  useEffect(() => {
    if (rawWeightProgressionData.length > 0) {
      setWeightProgressionData(
        filterDataByDateRange(rawWeightProgressionData, strengthFilter)
      );
    } else {
      setWeightProgressionData([]);
    }
  }, [rawWeightProgressionData, strengthFilter]);

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

  const handleRefresh = () => {
    if (user?.id) {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 30);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 7);
      const refreshDateRange = {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      };
      refreshAllData(refreshDateRange);
      fetchTodaysWorkout();
      fetchHealthData();
    }
  };

  const handleGenerateNewWorkout = async () => {
    if (!user?.id) return;
    if (isGenerating) {
      Alert.alert(
        "Generation in Progress",
        "A workout is already being generated. Please wait for it to complete.",
        [{ text: "OK" }]
      );
      return;
    }
    try {
      await registerForPushNotifications();
      const result = await generateWorkoutPlanAsync(user.id);
      if (result?.success && result.jobId) {
        await addJob(result.jobId, "generation");
      } else {
        Alert.alert(
          "Generation Failed",
          "Unable to start workout generation. Please check your connection and try again.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      Alert.alert(
        "Generation Error",
        "An error occurred while starting workout generation. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const handleRepeatWorkoutSuccess = () => {
    handleRefresh();
  };

  const handleFetchStepsToday = async () => {
    setHealthError(null);
    setHealthLoading(true);
    try {
      const count = await fetchStepsTodayAPI();
      setStepsCount(count);
    } catch (e: any) {
      setHealthError(e?.message || "Failed to read steps");
    } finally {
      setHealthLoading(false);
    }
  };

  const handleConnectHealth = async () => {
    setHealthError(null);
    setHealthLoading(true);
    try {
      const granted = await connectHealthAPI();
      if (granted) {
        setHealthReady(true);
        await handleFetchStepsToday();
      } else {
        setHealthReady(false);
        setHealthError("Health permissions not granted");
      }
    } catch (e: any) {
      setHealthError(e?.message || "Health permissions failed");
      setHealthReady(false);
    } finally {
      setHealthLoading(false);
    }
  };

  const calculateTotalDuration = (workout: TodayWorkout | null): number => {
    if (!workout) return 0;
    if (isPlanDayWithBlocks(workout)) return calculatePlanDayDuration(workout);
    if (isPlanDayWithExercises(workout)) {
      const durationSeconds = calculateWorkoutDuration(workout.exercises);
      return Math.round(durationSeconds / 60);
    }
    return 0;
  };

  const totalDurationMinutes = calculateTotalDuration(todaysWorkout);

  const todayCompletionRate = (() => {
    if (!todaysWorkout) return 0;
    if (isPlanDayWithBlocks(todaysWorkout)) {
      const totalExercises = todaysWorkout.blocks.reduce(
        (total: number, block: WorkoutBlockWithExercises) =>
          total + (block.exercises?.length || 0),
        0
      );
      if (totalExercises === 0) return 0;
      const completedExercises = todaysWorkout.blocks.reduce(
        (total: number, block: WorkoutBlockWithExercises) => {
          return (
            total +
            (block.exercises?.reduce(
              (sum: number, exercise: WorkoutBlockWithExercise) =>
                sum + (exercise.completed ? 1 : 0),
              0
            ) || 0)
          );
        },
        0
      );
      return (completedExercises / totalExercises) * 100;
    }
    if (isPlanDayWithExercises(todaysWorkout)) {
      if (todaysWorkout.exercises.length === 0) return 0;
      const completedCount = todaysWorkout.exercises.reduce(
        (sum, exercise) => sum + (exercise.completed ? 1 : 0),
        0
      );
      return (completedCount / todaysWorkout.exercises.length) * 100;
    }
    return 0;
  })();

  const isWorkoutCompleted = todayCompletionRate >= 100;

  const weeklyProgressData = (() => {
    if (!dailyWorkoutProgress) return [] as any[];
    let weekStartDate = new Date();
    if (workoutInfo?.startDate) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(workoutInfo.startDate)) {
        const [year, month, day] = workoutInfo.startDate.split("-").map(Number);
        weekStartDate = new Date(year, month - 1, day);
      } else {
        weekStartDate = new Date(workoutInfo.startDate);
      }
    } else {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      weekStartDate.setDate(today.getDate() - daysFromMonday);
    }
    const workout7Days: any[] = [];
    const today = new Date();
    const todayStr = formatDateAsString(today);
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDate);
      date.setDate(weekStartDate.getDate() + i);
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dateStr =
        date.getFullYear() +
        "-" +
        String(date.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(date.getDate()).padStart(2, "0");
      let dayName = dayNames[date.getDay()];
      const plannedWorkoutDay = dailyWorkoutProgress.find(
        (day) => day.date === dateStr
      );
      if (plannedWorkoutDay && plannedWorkoutDay.date === dateStr) {
        const safeDayCheck = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate()
        );
        dayName = dayNames[safeDayCheck.getDay()];
      }
      const dayData = dailyWorkoutProgress.find((day) => day.date === dateStr);
      const hasPlannedWorkout = dayData?.hasPlannedWorkout || false;
      const isToday = dateStr === todayStr;
      const isFuture = date > today;
      let completionRate = 0;
      let status: any = "incomplete";
      if (!hasPlannedWorkout) {
        status = "rest";
        completionRate = 0;
      } else if (dayData) {
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
  })();

  if (loading.dashboardLoading || loadingToday) {
    return (
      <View className="flex-1 bg-background">
        <SafeAreaView className="flex-1">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="px-5 pt-3 pb-4">
              <SkeletonLoader
                height={32}
                width={128}
                style={{ marginBottom: 8 }}
              />
              <SkeletonLoader height={20} width={192} />
            </View>
            <View className="px-5 mb-6">
              <SkeletonLoader height={200} width="100%" />
            </View>
            <View className="px-5 mb-6">
              <View className="bg-white rounded-2xl p-5">
                <View className="flex-row items-center justify-between mb-4">
                  <SkeletonLoader height={24} width={160} />
                  <SkeletonLoader height={32} width={80} />
                </View>
                <SkeletonLoader
                  height={80}
                  width="100%"
                  style={{ marginBottom: 12 }}
                />
                <View className="flex-row justify-between">
                  <SkeletonLoader height={48} width={96} />
                  <SkeletonLoader height={48} width={96} />
                  <SkeletonLoader height={48} width={96} />
                </View>
              </View>
            </View>
            <View className="px-5 mb-6">
              <SkeletonLoader
                height={24}
                width={144}
                style={{ marginBottom: 16 }}
              />
              <View className="bg-white rounded-2xl p-5">
                <SkeletonLoader height={160} width="100%" />
              </View>
            </View>
            <View className="px-5 mb-6">
              <SkeletonLoader
                height={24}
                width={160}
                style={{ marginBottom: 16 }}
              />
              <View className="flex-row justify-between">
                <View className="bg-white rounded-2xl p-4 flex-1 mr-3">
                  <SkeletonLoader height={128} width="100%" />
                </View>
                <View className="bg-white rounded-2xl p-4 flex-1">
                  <SkeletonLoader height={128} width="100%" />
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  const showLoadingEmpty = !hasLoadedInitialData;
  const showNoDataEmpty =
    hasLoadedInitialData &&
    (!filteredWeightAccuracy ||
      !filteredWeightAccuracy.hasExerciseData ||
      filteredWeightAccuracy.totalSets === 0) &&
    (!filteredWorkoutTypeMetrics ||
      !filteredWorkoutTypeMetrics.hasData ||
      filteredWorkoutTypeMetrics.totalSets === 0) &&
    (!weightProgressionData || weightProgressionData.length === 0) &&
    (!weeklySummary || weeklySummary.totalWorkoutsThisWeek === 0);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={loading.dashboardLoading}
            onRefresh={handleRefresh}
          />
        }
      >
        <Header
          currentDate={formatDate(new Date(), {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        />

        <ActiveWorkoutCard
          workoutInfo={
            workoutInfo
              ? { name: workoutInfo.name, description: workoutInfo.description }
              : null
          }
          todaysWorkout={todaysWorkout}
          totalDurationMinutes={totalDurationMinutes}
          loadingToday={loadingToday}
          isWorkoutCompleted={isWorkoutCompleted}
          todayCompletionRate={todayCompletionRate}
          isGenerating={isGenerating}
          onViewWorkout={() => router.push("/workout")}
          onRepeatWorkout={() => setShowRepeatModal(true)}
          onGenerateWorkout={handleGenerateNewWorkout}
        />

        {weeklySummary && (
          <WeeklyProgressSection
            weeklyProgressData={weeklyProgressData as any}
            streak={weeklySummary?.streak || 0}
          />
        )}

        {healthReady && (
          <HealthMetricsCarousel
            stepsCount={stepsCount}
            nutritionCaloriesConsumed={nutritionCaloriesConsumed}
            caloriesBurned={caloriesBurned}
            maxHeartRate={maxHeartRate}
            healthReady={healthReady}
            healthLoading={healthLoading}
            onConnect={handleConnectHealth}
          />
        )}

        <WeightPerformanceSection
          filteredWeightAccuracy={filteredWeightAccuracy}
          weightPerformanceFilter={weightPerformanceFilter}
          onChangeFilter={setWeightPerformanceFilter}
        />

        {weightProgressionData && weightProgressionData.length > 0 && (
          <StrengthProgressSection
            data={weightProgressionData}
            filter={strengthFilter}
            onChangeFilter={setStrengthFilter}
          />
        )}

        <WorkoutTypeDistributionSection
          metrics={filteredWorkoutTypeMetrics}
          filter={workoutTypeFilter}
          onChangeFilter={setWorkoutTypeFilter}
        />

        <DashboardEmptyStateSection
          showLoading={showLoadingEmpty}
          showNoData={showNoDataEmpty}
          onStartWorkout={() => router.push("/(tabs)/workout")}
        />
      </ScrollView>

      <WorkoutRepeatModal
        visible={showRepeatModal}
        onClose={() => setShowRepeatModal(false)}
        onSuccess={handleRepeatWorkoutSuccess}
      />
    </View>
  );
}
