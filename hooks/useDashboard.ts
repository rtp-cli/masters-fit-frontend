import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "../lib/api";

export interface WeeklySummary {
  workoutCompletionRate: number;
  exerciseCompletionRate: number;
  streak: number;
  totalWorkoutsThisWeek: number;
  completedWorkoutsThisWeek: number;
}

export interface WorkoutConsistency {
  week: string;
  totalWorkouts: number;
  completedWorkouts: number;
  completionRate: number;
}

export interface WeightMetrics {
  name: string;
  totalWeight: number;
  muscleGroups: string[];
}

export interface WeightAccuracyMetrics {
  accuracyRate: number;
  totalSets: number;
  exactMatches: number;
  higherWeight: number;
  lowerWeight: number;
  avgWeightDifference: number;
  chartData?: Array<{
    label: string;
    value: number;
    color: string;
    count?: number;
  }>;
  hasPlannedWeights?: boolean;
  hasExerciseData?: boolean;
}

export interface GoalProgress {
  goal: string;
  progressScore: number;
  totalSets: number;
  totalReps: number;
  totalWeight: number;
  completedWorkouts: number;
}

export interface TotalVolumeMetrics {
  date: string;
  totalVolume: number;
  exerciseCount: number;
  label: string;
}

export interface WorkoutTypeDistribution {
  tag: string;
  label: string;
  totalSets: number;
  totalReps: number;
  exerciseCount: number;
  completedWorkouts: number;
  percentage: number;
  color: string;
}

export interface WorkoutTypeMetrics {
  distribution: WorkoutTypeDistribution[];
  totalExercises: number;
  totalSets: number;
  dominantType: string;
  hasData: boolean;
}

export interface DailyWorkoutProgress {
  date: string;
  completionRate: number;
  hasPlannedWorkout: boolean;
}

export interface DashboardMetrics {
  weeklySummary: WeeklySummary;
  workoutConsistency: WorkoutConsistency[];
  weightMetrics: WeightMetrics[];
  weightAccuracy: WeightAccuracyMetrics;
  goalProgress: GoalProgress[];
  totalVolumeMetrics: TotalVolumeMetrics[];
  workoutTypeMetrics: WorkoutTypeMetrics;
  dailyWorkoutProgress: DailyWorkoutProgress[];
}

export interface DashboardFilters {
  startDate?: string;
  endDate?: string;
  timeRange?: "1w" | "1m" | "3m" | "6m" | "1y";
  groupBy?: "exercise" | "day" | "muscle_group";
}

export const useDashboard = (userId: number) => {
  const [dashboardData, setDashboardData] = useState<DashboardMetrics | null>(
    null
  );
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(
    null
  );
  const [workoutConsistency, setWorkoutConsistency] = useState<
    WorkoutConsistency[]
  >([]);
  const [weightMetrics, setWeightMetrics] = useState<WeightMetrics[]>([]);
  const [weightAccuracy, setWeightAccuracy] =
    useState<WeightAccuracyMetrics | null>(null);
  const [goalProgress, setGoalProgress] = useState<GoalProgress[]>([]);
  const [totalVolumeMetrics, setTotalVolumeMetrics] = useState<
    TotalVolumeMetrics[]
  >([]);
  const [workoutTypeMetrics, setWorkoutTypeMetrics] =
    useState<WorkoutTypeMetrics | null>(null);
  const [dailyWorkoutProgress, setDailyWorkoutProgress] = useState<
    DailyWorkoutProgress[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardMetrics = useCallback(
    async (filters?: DashboardFilters) => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams();

        // If no filters are provided, use wide date range to get all data
        if (!filters?.startDate && !filters?.endDate && !filters?.timeRange) {
          queryParams.append("startDate", "2020-01-01");
          queryParams.append("endDate", "2030-12-31");
        } else {
          if (filters?.startDate)
            queryParams.append("startDate", filters.startDate);
          if (filters?.endDate) queryParams.append("endDate", filters.endDate);
          if (filters?.timeRange)
            queryParams.append("timeRange", filters.timeRange);
        }

        const data = await apiRequest<{
          success: boolean;
          data: DashboardMetrics;
        }>(`/dashboard/${userId}/metrics?${queryParams.toString()}`);

        if (data.success) {
          setDashboardData(data.data);
          setWeeklySummary(data.data.weeklySummary);
          setWorkoutConsistency(data.data.workoutConsistency);
          setWeightMetrics(data.data.weightMetrics);
          setWeightAccuracy(data.data.weightAccuracy);
          setGoalProgress(data.data.goalProgress);
          setTotalVolumeMetrics(data.data.totalVolumeMetrics);

          // Handle workoutTypeMetrics with fallback
          const workoutTypeData = data.data.workoutTypeMetrics || {
            distribution: [],
            totalExercises: 0,
            totalSets: 0,
            dominantType: "",
            hasData: false,
          };
          setWorkoutTypeMetrics(workoutTypeData);

          setDailyWorkoutProgress(data.data.dailyWorkoutProgress);
        } else {
          throw new Error("Failed to fetch dashboard metrics");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  const fetchWeeklySummary = useCallback(async () => {
    try {
      const data = await apiRequest<{ success: boolean; data: WeeklySummary }>(
        `/dashboard/${userId}/weekly-summary`
      );

      if (data.success) {
        setWeeklySummary(data.data);
      }
    } catch (err) {
      console.error("Error fetching weekly summary:", err);
    }
  }, [userId]);

  const fetchWorkoutConsistency = useCallback(
    async (filters?: DashboardFilters) => {
      try {
        const queryParams = new URLSearchParams();
        if (filters?.startDate)
          queryParams.append("startDate", filters.startDate);
        if (filters?.endDate) queryParams.append("endDate", filters.endDate);
        if (filters?.timeRange)
          queryParams.append("timeRange", filters.timeRange);

        const data = await apiRequest<{
          success: boolean;
          data: WorkoutConsistency[];
        }>(
          `/dashboard/${userId}/workout-consistency?${queryParams.toString()}`
        );

        if (data.success) {
          setWorkoutConsistency(data.data);
        }
      } catch (err) {
        console.error("Error fetching workout consistency:", err);
      }
    },
    [userId]
  );

  const fetchWeightMetrics = useCallback(
    async (filters?: DashboardFilters) => {
      try {
        const queryParams = new URLSearchParams();
        if (filters?.startDate)
          queryParams.append("startDate", filters.startDate);
        if (filters?.endDate) queryParams.append("endDate", filters.endDate);
        if (filters?.timeRange)
          queryParams.append("timeRange", filters.timeRange);
        if (filters?.groupBy) queryParams.append("groupBy", filters.groupBy);

        const data = await apiRequest<{
          success: boolean;
          data: WeightMetrics[];
        }>(`/dashboard/${userId}/weight-metrics?${queryParams.toString()}`);

        if (data.success) {
          setWeightMetrics(data.data);
        }
      } catch (err) {
        console.error("Error fetching weight metrics:", err);
      }
    },
    [userId]
  );

  const fetchWeightAccuracy = useCallback(
    async (filters?: DashboardFilters) => {
      try {
        console.log(`🔄 fetchWeightAccuracy called with filters:`, filters);

        // Clear current state to prevent stale data display
        setWeightAccuracy(null);

        const queryParams = new URLSearchParams();
        if (filters?.startDate)
          queryParams.append("startDate", filters.startDate);
        if (filters?.endDate) queryParams.append("endDate", filters.endDate);
        if (filters?.timeRange)
          queryParams.append("timeRange", filters.timeRange);

        // Add cache busting parameter to ensure fresh data
        queryParams.append("_t", Date.now().toString());

        console.log(
          `🌐 Making API call to: /dashboard/${userId}/weight-accuracy?${queryParams.toString()}`
        );

        const data = await apiRequest<{
          success: boolean;
          data: WeightAccuracyMetrics;
        }>(`/dashboard/${userId}/weight-accuracy?${queryParams.toString()}`);

        console.log(`📊 Received weight accuracy data:`, data);

        if (data.success) {
          setWeightAccuracy(data.data);
        } else {
          // Fallback to empty state if request fails
          setWeightAccuracy({
            accuracyRate: 0,
            totalSets: 0,
            exactMatches: 0,
            higherWeight: 0,
            lowerWeight: 0,
            avgWeightDifference: 0,
            chartData: [],
            hasPlannedWeights: false,
            hasExerciseData: false,
          });
        }
      } catch (err) {
        console.error("Error fetching weight accuracy:", err);
        // Set fallback state on error to prevent UI glitching
        setWeightAccuracy({
          accuracyRate: 0,
          totalSets: 0,
          exactMatches: 0,
          higherWeight: 0,
          lowerWeight: 0,
          avgWeightDifference: 0,
          chartData: [],
          hasPlannedWeights: false,
          hasExerciseData: false,
        });
      }
    },
    [userId]
  );

  const fetchGoalProgress = useCallback(
    async (filters?: DashboardFilters) => {
      try {
        const queryParams = new URLSearchParams();
        if (filters?.startDate)
          queryParams.append("startDate", filters.startDate);
        if (filters?.endDate) queryParams.append("endDate", filters.endDate);
        if (filters?.timeRange)
          queryParams.append("timeRange", filters.timeRange);

        const data = await apiRequest<{
          success: boolean;
          data: GoalProgress[];
        }>(`/dashboard/${userId}/goal-progress?${queryParams.toString()}`);

        if (data.success) {
          setGoalProgress(data.data);
        }
      } catch (err) {
        console.error("Error fetching goal progress:", err);
      }
    },
    [userId]
  );

  const fetchTotalVolumeMetrics = useCallback(
    async (filters?: DashboardFilters) => {
      try {
        const queryParams = new URLSearchParams();
        if (filters?.startDate)
          queryParams.append("startDate", filters.startDate);
        if (filters?.endDate) queryParams.append("endDate", filters.endDate);
        if (filters?.timeRange)
          queryParams.append("timeRange", filters.timeRange);

        const data = await apiRequest<{
          success: boolean;
          data: TotalVolumeMetrics[];
        }>(`/dashboard/${userId}/total-volume?${queryParams.toString()}`);

        if (data.success) {
          setTotalVolumeMetrics(data.data);
        }
      } catch (err) {
        console.error("Error fetching total volume metrics:", err);
      }
    },
    [userId]
  );

  const fetchWorkoutTypeMetrics = useCallback(
    async (filters?: DashboardFilters) => {
      try {
        console.log(`🔄 fetchWorkoutTypeMetrics called with filters:`, filters);

        // Clear current state to prevent stale data display
        setWorkoutTypeMetrics(null);

        const queryParams = new URLSearchParams();
        if (filters?.startDate)
          queryParams.append("startDate", filters.startDate);
        if (filters?.endDate) queryParams.append("endDate", filters.endDate);
        if (filters?.timeRange)
          queryParams.append("timeRange", filters.timeRange);

        // Add cache busting parameter to ensure fresh data
        queryParams.append("_t", Date.now().toString());

        console.log(
          `🌐 Making API call to: /dashboard/${userId}/workout-type-metrics?${queryParams.toString()}`
        );

        const data = await apiRequest<{
          success: boolean;
          data: WorkoutTypeMetrics;
        }>(
          `/dashboard/${userId}/workout-type-metrics?${queryParams.toString()}`
        );

        console.log(`📊 Received workout type data:`, data);

        if (data.success) {
          setWorkoutTypeMetrics(data.data);
        } else {
          // Fallback to empty state if request fails
          setWorkoutTypeMetrics({
            distribution: [],
            totalExercises: 0,
            totalSets: 0,
            dominantType: "",
            hasData: false,
          });
        }
      } catch (err) {
        console.error("Error fetching workout type metrics:", err);
        // Set fallback state on error to prevent UI glitching
        setWorkoutTypeMetrics({
          distribution: [],
          totalExercises: 0,
          totalSets: 0,
          dominantType: "",
          hasData: false,
        });
      }
    },
    [userId]
  );

  const fetchDailyWorkoutProgress = useCallback(
    async (filters?: DashboardFilters) => {
      try {
        const queryParams = new URLSearchParams();
        if (filters?.startDate)
          queryParams.append("startDate", filters.startDate);
        if (filters?.endDate) queryParams.append("endDate", filters.endDate);
        if (filters?.timeRange)
          queryParams.append("timeRange", filters.timeRange);

        const data = await apiRequest<{
          success: boolean;
          data: DailyWorkoutProgress[];
        }>(
          `/dashboard/${userId}/daily-workout-progress?${queryParams.toString()}`
        );

        if (data.success) {
          setDailyWorkoutProgress(data.data);
        }
      } catch (err) {
        console.error("Error fetching daily workout progress:", err);
      }
    },
    [userId]
  );

  const fetchWeightProgression = useCallback(
    async (filters?: DashboardFilters) => {
      try {
        const queryParams = new URLSearchParams();
        if (filters?.startDate)
          queryParams.append("startDate", filters.startDate);
        if (filters?.endDate) queryParams.append("endDate", filters.endDate);
        if (filters?.timeRange)
          queryParams.append("timeRange", filters.timeRange);

        const data = await apiRequest<{
          success: boolean;
          data: {
            date: string;
            avgWeight: number;
            maxWeight: number;
            label: string;
          }[];
        }>(`/dashboard/${userId}/weight-progression?${queryParams.toString()}`);

        if (data.success) {
          return data.data;
        }
        return [];
      } catch (err) {
        console.error("Error fetching weight progression:", err);
        return [];
      }
    },
    [userId]
  );

  const refreshAllData = useCallback(
    (filters?: DashboardFilters) => {
      fetchDashboardMetrics(filters);
    },
    [fetchDashboardMetrics]
  );

  return {
    // Data
    dashboardData,
    weeklySummary,
    workoutConsistency,
    weightMetrics,
    weightAccuracy,
    goalProgress,
    totalVolumeMetrics,
    workoutTypeMetrics,
    dailyWorkoutProgress,

    // State
    loading,
    error,

    // Actions
    fetchDashboardMetrics,
    fetchWeeklySummary,
    fetchWorkoutConsistency,
    fetchWeightMetrics,
    fetchWeightAccuracy,
    fetchGoalProgress,
    fetchTotalVolumeMetrics,
    fetchWorkoutTypeMetrics,
    fetchDailyWorkoutProgress,
    fetchWeightProgression,
    refreshAllData,
  };
};
