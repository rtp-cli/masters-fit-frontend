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

export interface DashboardMetrics {
  weeklySummary: WeeklySummary;
  workoutConsistency: WorkoutConsistency[];
  weightMetrics: WeightMetrics[];
  weightAccuracy: WeightAccuracyMetrics;
  goalProgress: GoalProgress[];
  totalVolumeMetrics: TotalVolumeMetrics[];
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardMetrics = useCallback(
    async (filters?: DashboardFilters) => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams();
        if (filters?.startDate)
          queryParams.append("startDate", filters.startDate);
        if (filters?.endDate) queryParams.append("endDate", filters.endDate);
        if (filters?.timeRange)
          queryParams.append("timeRange", filters.timeRange);

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
        const queryParams = new URLSearchParams();
        if (filters?.startDate)
          queryParams.append("startDate", filters.startDate);
        if (filters?.endDate) queryParams.append("endDate", filters.endDate);
        if (filters?.timeRange)
          queryParams.append("timeRange", filters.timeRange);

        const data = await apiRequest<{
          success: boolean;
          data: WeightAccuracyMetrics;
        }>(`/dashboard/${userId}/weight-accuracy?${queryParams.toString()}`);

        if (data.success) {
          setWeightAccuracy(data.data);
        }
      } catch (err) {
        console.error("Error fetching weight accuracy:", err);
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
    refreshAllData,
  };
};
