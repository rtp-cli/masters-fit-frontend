import { useState, useCallback, useMemo } from "react";
import { apiRequest } from "@/lib/api";
import { fetchActiveWorkout, fetchWorkoutHistory } from "@lib/workouts";
import { fetchUserProfile } from "@lib/profile";
import {
  searchByDateAPI,
  searchExerciseAPI,
  searchExercisesAPI,
} from "@lib/search";
import { useAuth } from "@contexts/AuthContext";
import {
  DashboardMetrics,
  DashboardFilters,
  WeeklySummary,
  WorkoutConsistency,
  WeightMetrics,
  WeightAccuracyMetrics,
  GoalProgress,
  TotalVolumeMetrics,
  WorkoutTypeMetrics,
  DailyWorkoutProgress,
  WorkoutWithDetails,
  Profile,
} from "@/types/api";

// Centralized app data state
interface AppDataState {
  dashboardData: DashboardMetrics | null;
  weeklySummary: WeeklySummary | null;
  workoutConsistency: WorkoutConsistency[];
  weightMetrics: WeightMetrics[];
  weightAccuracy: WeightAccuracyMetrics | null;
  goalProgress: GoalProgress[];
  totalVolumeMetrics: TotalVolumeMetrics[];
  workoutTypeMetrics: WorkoutTypeMetrics | null;
  dailyWorkoutProgress: DailyWorkoutProgress[];
  workoutData: WorkoutWithDetails | null;
  profileData: Profile | null;
  historyData: any[] | null; // Historical workout data
}

// Loading states
interface LoadingState {
  dashboardLoading: boolean;
  workoutLoading: boolean;
  profileLoading: boolean;
  searchLoading: boolean;
  historyLoading: boolean;
}

// Refresh functions
interface RefreshFunctions {
  refreshDashboard: (filters?: DashboardFilters) => Promise<void>;
  refreshWorkout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  refreshAll: (filters?: DashboardFilters) => Promise<void>;
  reset: () => void;

  // Individual dashboard metric refreshes
  refreshWeeklySummary: () => Promise<void>;
  refreshWorkoutConsistency: (filters?: DashboardFilters) => Promise<void>;
  refreshWeightMetrics: (filters?: DashboardFilters) => Promise<void>;
  refreshWeightAccuracy: (filters?: DashboardFilters) => Promise<void>;
  refreshGoalProgress: (filters?: DashboardFilters) => Promise<void>;
  refreshTotalVolumeMetrics: (filters?: DashboardFilters) => Promise<void>;
  refreshWorkoutTypeMetrics: (filters?: DashboardFilters) => Promise<void>;
  refreshDailyWorkoutProgress: (filters?: DashboardFilters) => Promise<void>;

  // Chart data functions
  fetchWeightProgression: (filters?: DashboardFilters) => Promise<any[]>;
  fetchWeightAccuracyByDate: (filters?: DashboardFilters) => Promise<any[]>;
  fetchWorkoutTypeByDate: (filters?: DashboardFilters) => Promise<any[]>;

  // Search functions
  searchByDate: (date: string) => Promise<any>;
  searchExercise: (exerciseId: number) => Promise<any>;
  searchExercises: (query: string) => Promise<any>;
}

export const useAppData = () => {
  const { user } = useAuth();
  const userId = user?.id || 0;

  // Data states
  const [data, setData] = useState<AppDataState>({
    dashboardData: null,
    weeklySummary: null,
    workoutConsistency: [],
    weightMetrics: [],
    weightAccuracy: null,
    goalProgress: [],
    totalVolumeMetrics: [],
    workoutTypeMetrics: null,
    dailyWorkoutProgress: [],
    workoutData: null,
    profileData: null,
    historyData: null,
  });

  // Loading states
  const [loading, setLoading] = useState<LoadingState>({
    dashboardLoading: false,
    workoutLoading: false,
    profileLoading: false,
    searchLoading: false,
    historyLoading: false,
  });

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Dashboard data refresh
  const refreshDashboard = useCallback(
    async (filters?: DashboardFilters) => {
      if (!userId) return;

      setLoading((prev) => ({ ...prev, dashboardLoading: true }));
      setError(null);

      try {
        const queryParams = new URLSearchParams();

        // Use last 30 days + next 7 days as default to include planned workouts
        if (!filters?.startDate && !filters?.endDate && !filters?.timeRange) {
          const today = new Date();
          const startDate = new Date(today);
          startDate.setDate(today.getDate() - 30);
          const endDate = new Date(today);
          endDate.setDate(today.getDate() + 7); // Include upcoming planned workouts

          queryParams.append(
            "startDate",
            startDate.toISOString().split("T")[0]
          );
          queryParams.append("endDate", endDate.toISOString().split("T")[0]);
        } else {
          if (filters?.startDate)
            queryParams.append("startDate", filters.startDate);
          if (filters?.endDate) queryParams.append("endDate", filters.endDate);
          if (filters?.timeRange)
            queryParams.append("timeRange", filters.timeRange);
        }

        const response = await apiRequest<{
          success: boolean;
          data: DashboardMetrics;
        }>(`/dashboard/${userId}/metrics?${queryParams.toString()}`);

        if (response.success) {
          setData((prev) => ({
            ...prev,
            dashboardData: response.data,
            weeklySummary: response.data.weeklySummary,
            workoutConsistency: response.data.workoutConsistency,
            weightMetrics: response.data.weightMetrics,
            weightAccuracy: response.data.weightAccuracy,
            goalProgress: response.data.goalProgress,
            totalVolumeMetrics: response.data.totalVolumeMetrics,
            workoutTypeMetrics: response.data.workoutTypeMetrics || {
              distribution: [],
              totalExercises: 0,
              totalSets: 0,
              dominantType: "",
              hasData: false,
            },
            dailyWorkoutProgress: response.data.dailyWorkoutProgress,
          }));
        } else {
          throw new Error("Failed to fetch dashboard metrics");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading((prev) => ({ ...prev, dashboardLoading: false }));
      }
    },
    [userId]
  );

  // Workout data refresh
  const refreshWorkout = useCallback(async () => {
    if (!userId) return;

    setLoading((prev) => ({ ...prev, workoutLoading: true }));
    setError(null);

    try {
      const response = await fetchActiveWorkout();
      setData((prev) => ({
        ...prev,
        workoutData: response || null,
      }));
    } catch (err) {
      // Only set error for actual failures, not "no workout" states
      console.error("Failed to refresh workout data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch workout data"
      );
    } finally {
      setLoading((prev) => ({ ...prev, workoutLoading: false }));
    }
  }, [userId]);

  // Profile data refresh
  const refreshProfile = useCallback(async () => {
    if (!userId) return;

    setLoading((prev) => ({ ...prev, profileLoading: true }));
    setError(null);

    try {
      const profile = await fetchUserProfile();
      setData((prev) => ({
        ...prev,
        profileData: profile,
      }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch profile data"
      );
    } finally {
      setLoading((prev) => ({ ...prev, profileLoading: false }));
    }
  }, [userId]);

  // History data refresh
  const refreshHistory = useCallback(async () => {
    if (!userId) return;

    setLoading((prev) => ({ ...prev, historyLoading: true }));
    try {
      const history = await fetchWorkoutHistory(userId);
      setData((prev) => ({
        ...prev,
        historyData: history || [],
      }));
    } catch (err) {
      console.error("Failed to fetch workout history:", err);
      // Don't set error for history as it's not critical - just set empty array
      setData((prev) => ({
        ...prev,
        historyData: [],
      }));
    } finally {
      setLoading((prev) => ({ ...prev, historyLoading: false }));
    }
  }, [userId]);

  // Individual dashboard metric refresh functions
  const refreshWeeklySummary = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await apiRequest<{
        success: boolean;
        data: WeeklySummary;
      }>(`/dashboard/${userId}/weekly-summary`);

      if (response.success) {
        setData((prev) => ({
          ...prev,
          weeklySummary: response.data,
        }));
      }
    } catch (err) {
      console.error("Error fetching weekly summary:", err);
    }
  }, [userId]);

  const refreshWorkoutConsistency = useCallback(
    async (filters?: DashboardFilters) => {
      if (!userId) return;

      try {
        const queryParams = new URLSearchParams();
        if (filters?.startDate)
          queryParams.append("startDate", filters.startDate);
        if (filters?.endDate) queryParams.append("endDate", filters.endDate);
        if (filters?.timeRange)
          queryParams.append("timeRange", filters.timeRange);

        const response = await apiRequest<{
          success: boolean;
          data: WorkoutConsistency[];
        }>(
          `/dashboard/${userId}/workout-consistency?${queryParams.toString()}`
        );

        if (response.success) {
          setData((prev) => ({
            ...prev,
            workoutConsistency: response.data,
          }));
        }
      } catch (err) {
        console.error("Error fetching workout consistency:", err);
      }
    },
    [userId]
  );

  const refreshWeightMetrics = useCallback(
    async (filters?: DashboardFilters) => {
      if (!userId) return;

      try {
        const queryParams = new URLSearchParams();
        if (filters?.startDate)
          queryParams.append("startDate", filters.startDate);
        if (filters?.endDate) queryParams.append("endDate", filters.endDate);
        if (filters?.timeRange)
          queryParams.append("timeRange", filters.timeRange);
        if (filters?.groupBy) queryParams.append("groupBy", filters.groupBy);

        const response = await apiRequest<{
          success: boolean;
          data: WeightMetrics[];
        }>(`/dashboard/${userId}/weight-metrics?${queryParams.toString()}`);

        if (response.success) {
          setData((prev) => ({
            ...prev,
            weightMetrics: response.data,
          }));
        }
      } catch (err) {
        console.error("Error fetching weight metrics:", err);
      }
    },
    [userId]
  );

  const refreshWeightAccuracy = useCallback(
    async (filters?: DashboardFilters) => {
      if (!userId) return;

      try {
        const queryParams = new URLSearchParams();
        if (filters?.startDate)
          queryParams.append("startDate", filters.startDate);
        if (filters?.endDate) queryParams.append("endDate", filters.endDate);
        if (filters?.timeRange)
          queryParams.append("timeRange", filters.timeRange);

        queryParams.append("_t", Date.now().toString());

        const response = await apiRequest<{
          success: boolean;
          data: WeightAccuracyMetrics;
        }>(`/dashboard/${userId}/weight-accuracy?${queryParams.toString()}`);

        if (response.success) {
          setData((prev) => ({
            ...prev,
            weightAccuracy: response.data,
          }));
        } else {
          setData((prev) => ({
            ...prev,
            weightAccuracy: {
              accuracyRate: 0,
              totalSets: 0,
              exactMatches: 0,
              higherWeight: 0,
              lowerWeight: 0,
              avgWeightDifference: 0,
              chartData: [],
              hasPlannedWeights: false,
              hasExerciseData: false,
            },
          }));
        }
      } catch (err) {
        console.error("Error fetching weight accuracy:", err);
        setData((prev) => ({
          ...prev,
          weightAccuracy: {
            accuracyRate: 0,
            totalSets: 0,
            exactMatches: 0,
            higherWeight: 0,
            lowerWeight: 0,
            avgWeightDifference: 0,
            chartData: [],
            hasPlannedWeights: false,
            hasExerciseData: false,
          },
        }));
      }
    },
    [userId]
  );

  const refreshGoalProgress = useCallback(
    async (filters?: DashboardFilters) => {
      if (!userId) return;

      try {
        const queryParams = new URLSearchParams();
        if (filters?.startDate)
          queryParams.append("startDate", filters.startDate);
        if (filters?.endDate) queryParams.append("endDate", filters.endDate);
        if (filters?.timeRange)
          queryParams.append("timeRange", filters.timeRange);

        const response = await apiRequest<{
          success: boolean;
          data: GoalProgress[];
        }>(`/dashboard/${userId}/goal-progress?${queryParams.toString()}`);

        if (response.success) {
          setData((prev) => ({
            ...prev,
            goalProgress: response.data,
          }));
        }
      } catch (err) {
        console.error("Error fetching goal progress:", err);
      }
    },
    [userId]
  );

  const refreshTotalVolumeMetrics = useCallback(
    async (filters?: DashboardFilters) => {
      if (!userId) return;

      try {
        const queryParams = new URLSearchParams();
        if (filters?.startDate)
          queryParams.append("startDate", filters.startDate);
        if (filters?.endDate) queryParams.append("endDate", filters.endDate);
        if (filters?.timeRange)
          queryParams.append("timeRange", filters.timeRange);

        const response = await apiRequest<{
          success: boolean;
          data: TotalVolumeMetrics[];
        }>(`/dashboard/${userId}/total-volume?${queryParams.toString()}`);

        if (response.success) {
          setData((prev) => ({
            ...prev,
            totalVolumeMetrics: response.data,
          }));
        }
      } catch (err) {
        console.error("Error fetching total volume metrics:", err);
      }
    },
    [userId]
  );

  const refreshWorkoutTypeMetrics = useCallback(
    async (filters?: DashboardFilters) => {
      if (!userId) return;

      try {
        const queryParams = new URLSearchParams();
        if (filters?.startDate)
          queryParams.append("startDate", filters.startDate);
        if (filters?.endDate) queryParams.append("endDate", filters.endDate);
        if (filters?.timeRange)
          queryParams.append("timeRange", filters.timeRange);

        queryParams.append("_t", Date.now().toString());

        const response = await apiRequest<{
          success: boolean;
          data: WorkoutTypeMetrics;
        }>(
          `/dashboard/${userId}/workout-type-metrics?${queryParams.toString()}`
        );

        if (response.success) {
          setData((prev) => ({
            ...prev,
            workoutTypeMetrics: response.data,
          }));
        } else {
          setData((prev) => ({
            ...prev,
            workoutTypeMetrics: {
              distribution: [],
              totalExercises: 0,
              totalSets: 0,
              dominantType: "",
              hasData: false,
            },
          }));
        }
      } catch (err) {
        console.error("Error fetching workout type metrics:", err);
        setData((prev) => ({
          ...prev,
          workoutTypeMetrics: {
            distribution: [],
            totalExercises: 0,
            totalSets: 0,
            dominantType: "",
            hasData: false,
          },
        }));
      }
    },
    [userId]
  );

  const refreshDailyWorkoutProgress = useCallback(
    async (filters?: DashboardFilters) => {
      if (!userId) return;

      try {
        const queryParams = new URLSearchParams();
        if (filters?.startDate)
          queryParams.append("startDate", filters.startDate);
        if (filters?.endDate) queryParams.append("endDate", filters.endDate);
        if (filters?.timeRange)
          queryParams.append("timeRange", filters.timeRange);

        const response = await apiRequest<{
          success: boolean;
          data: DailyWorkoutProgress[];
        }>(
          `/dashboard/${userId}/daily-workout-progress?${queryParams.toString()}`
        );

        if (response.success) {
          setData((prev) => ({
            ...prev,
            dailyWorkoutProgress: response.data,
          }));
        }
      } catch (err) {
        console.error("Error fetching daily workout progress:", err);
      }
    },
    [userId]
  );

  // Chart data functions
  const fetchWeightProgression = useCallback(
    async (filters?: DashboardFilters) => {
      if (!userId) return [];

      try {
        const queryParams = new URLSearchParams();
        if (filters?.startDate)
          queryParams.append("startDate", filters.startDate);
        if (filters?.endDate) queryParams.append("endDate", filters.endDate);
        if (filters?.timeRange)
          queryParams.append("timeRange", filters.timeRange);

        const response = await apiRequest<{
          success: boolean;
          data: {
            date: string;
            avgWeight: number;
            maxWeight: number;
            label: string;
          }[];
        }>(`/dashboard/${userId}/weight-progression?${queryParams.toString()}`);

        if (response.success) {
          return response.data;
        }
        return [];
      } catch (err) {
        console.error("Error fetching weight progression:", err);
        return [];
      }
    },
    [userId]
  );

  const fetchWeightAccuracyByDate = useCallback(
    async (filters?: DashboardFilters) => {
      if (!userId) return [];

      try {
        const queryParams = new URLSearchParams();
        if (filters?.startDate)
          queryParams.append("startDate", filters.startDate);
        if (filters?.endDate) queryParams.append("endDate", filters.endDate);
        if (filters?.timeRange)
          queryParams.append("timeRange", filters.timeRange);

        const response = await apiRequest<{
          success: boolean;
          data: {
            date: string;
            totalSets: number;
            exactMatches: number;
            higherWeight: number;
            lowerWeight: number;
            label: string;
          }[];
        }>(
          `/dashboard/${userId}/weight-accuracy-by-date?${queryParams.toString()}`
        );

        if (response.success) {
          return response.data;
        }
        return [];
      } catch (err) {
        console.error("Error fetching weight accuracy by date:", err);
        return [];
      }
    },
    [userId]
  );

  const fetchWorkoutTypeByDate = useCallback(
    async (filters?: DashboardFilters) => {
      if (!userId) return [];

      try {
        const queryParams = new URLSearchParams();
        if (filters?.startDate)
          queryParams.append("startDate", filters.startDate);
        if (filters?.endDate) queryParams.append("endDate", filters.endDate);
        if (filters?.timeRange)
          queryParams.append("timeRange", filters.timeRange);

        const response = await apiRequest<{
          success: boolean;
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
          }[];
        }>(
          `/dashboard/${userId}/workout-type-by-date?${queryParams.toString()}`
        );

        if (response.success) {
          return response.data;
        }
        return [];
      } catch (err) {
        console.error("Error fetching workout type by date:", err);
        return [];
      }
    },
    [userId]
  );

  // Search functions
  const searchByDate = useCallback(
    async (date: string) => {
      if (!userId) return null;

      setLoading((prev) => ({ ...prev, searchLoading: true }));
      try {
        const result = await searchByDateAPI(userId, date);
        return result;
      } catch (err) {
        console.error("Error searching by date:", err);
        return null;
      } finally {
        setLoading((prev) => ({ ...prev, searchLoading: false }));
      }
    },
    [userId]
  );

  const searchExercise = useCallback(
    async (exerciseId: number) => {
      if (!userId) return null;

      setLoading((prev) => ({ ...prev, searchLoading: true }));
      try {
        const result = await searchExerciseAPI(userId, exerciseId);
        return result;
      } catch (err) {
        console.error("Error searching exercise:", err);
        return null;
      } finally {
        setLoading((prev) => ({ ...prev, searchLoading: false }));
      }
    },
    [userId]
  );

  const searchExercises = useCallback(async (query: string) => {
    setLoading((prev) => ({ ...prev, searchLoading: true }));
    try {
      const result = await searchExercisesAPI(query);
      return result;
    } catch (err) {
      console.error("Error searching exercises:", err);
      return null;
    } finally {
      setLoading((prev) => ({ ...prev, searchLoading: false }));
    }
  }, []);

  // Reset all data to initial state
  const reset = useCallback(() => {
    setData({
      dashboardData: null,
      weeklySummary: null,
      workoutConsistency: [],
      weightMetrics: [],
      weightAccuracy: null,
      goalProgress: [],
      totalVolumeMetrics: [],
      workoutTypeMetrics: null,
      dailyWorkoutProgress: [],
      workoutData: null,
      profileData: null,
      historyData: null,
    });
    setLoading({
      dashboardLoading: false,
      workoutLoading: false,
      profileLoading: false,
      searchLoading: false,
      historyLoading: false,
    });
    setError(null);
  }, []);

  // Refresh all data
  const refreshAll = useCallback(
    async (filters?: DashboardFilters) => {

      try {
        await Promise.all([
          refreshDashboard(filters),
          refreshWorkout(),
          refreshProfile(),
          refreshHistory(),
        ]);

      } catch (err) {
        console.error("Error refreshing all data:", err);
      }
    },
    [refreshDashboard, refreshWorkout, refreshProfile, refreshHistory]
  );

  // Memoized refresh functions object to prevent infinite loops
  const refresh: RefreshFunctions = useMemo(
    () => ({
      refreshDashboard,
      refreshWorkout,
      refreshProfile,
      refreshHistory,
      refreshAll,
      reset,
      refreshWeeklySummary,
      refreshWorkoutConsistency,
      refreshWeightMetrics,
      refreshWeightAccuracy,
      refreshGoalProgress,
      refreshTotalVolumeMetrics,
      refreshWorkoutTypeMetrics,
      refreshDailyWorkoutProgress,
      fetchWeightProgression,
      fetchWeightAccuracyByDate,
      fetchWorkoutTypeByDate,
      searchByDate,
      searchExercise,
      searchExercises,
    }),
    [
      refreshDashboard,
      refreshWorkout,
      refreshProfile,
      refreshAll,
      reset,
      refreshWeeklySummary,
      refreshWorkoutConsistency,
      refreshWeightMetrics,
      refreshWeightAccuracy,
      refreshGoalProgress,
      refreshTotalVolumeMetrics,
      refreshWorkoutTypeMetrics,
      refreshDailyWorkoutProgress,
      fetchWeightProgression,
      fetchWeightAccuracyByDate,
      fetchWorkoutTypeByDate,
      searchByDate,
      searchExercise,
      searchExercises,
    ]
  );

  return {
    data,
    refresh,
    loading,
    error,
  };
};
