import { apiRequest, PaywallError } from "./api";
import { getCurrentUser } from "./auth";
import { formatDateAsString, getTodayString } from "../utils";
import { TIMEOUTS, LIMITS } from "@/constants";
import {
  Workout,
  CreateWorkoutParams,
  UpdateWorkoutParams,
  CreateExerciseLogParams,
  CreateWorkoutLogParams,
  ExerciseLog,
  PlanDayWithBlocks,
  WorkoutLog,
  AsyncJobResponse,
  PlanDayLog,
  ApiResponse,
  WorkoutResponse,
  CompletedExercisesResponse,
  WorkoutsResponse,
  WorkoutWithDetails,
  ActiveWorkoutResponse,
} from "@/types/api";

// Simple cache for active workout
let activeWorkoutCache: {
  timestamp: number;
  workout: PlanDayWithBlocks | null;
} | null = null;

// Simple event system for workout data updates
const workoutUpdateListeners: Array<() => void> = [];

export const subscribeToWorkoutUpdates = (listener: () => void) => {
  // Prevent unbounded growth - remove oldest listeners if at max capacity
  if (workoutUpdateListeners.length >= LIMITS.MAX_LISTENERS) {
    console.warn(
      `[workouts.ts] Listener array at max capacity (${LIMITS.MAX_LISTENERS}), removing oldest listeners`
    );
    // Remove the first half to make room
    workoutUpdateListeners.splice(0, Math.floor(LIMITS.MAX_LISTENERS / 2));
  }

  workoutUpdateListeners.push(listener);

  return () => {
    const index = workoutUpdateListeners.indexOf(listener);
    if (index > -1) {
      workoutUpdateListeners.splice(index, 1);
    }
  };
};

// Cleanup function to remove all listeners (useful for testing or cleanup)
export const clearAllWorkoutListeners = () => {
  workoutUpdateListeners.length = 0;
};

export const notifyWorkoutUpdated = () => {
  workoutUpdateListeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error("Error in workout update listener:", error);
    }
  });
};

export const invalidateActiveWorkoutCache = () => {
  activeWorkoutCache = null;
  notifyWorkoutUpdated();
};

/**
 * Fetch all workouts for the current user
 */
export async function fetchWorkouts(): Promise<Workout[]> {
  try {
    const workouts = await apiRequest<Workout[]>("/api/workouts");
    return workouts;
  } catch (error) {
    console.error("Error fetching workouts:", error);
    return [];
  }
}

/**
 * Fetch a single workout by ID
 */
export async function fetchWorkoutById(id: number): Promise<Workout | null> {
  try {
    const workout = await apiRequest<Workout>(`/api/workouts/${id}`);
    return workout;
  } catch (error) {
    console.error(`Error fetching workout with id ${id}:`, error);
    return null;
  }
}

/**
 * Create a new workout
 */
export async function createWorkout(
  params: CreateWorkoutParams
): Promise<Workout | null> {
  try {
    const workout = await apiRequest<Workout>("/api/workouts", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return workout;
  } catch (error) {
    console.error("Error creating workout:", error);
    return null;
  }
}

/**
 * Update an existing workout
 */
export async function updateWorkout(
  id: number,
  params: UpdateWorkoutParams
): Promise<Workout | null> {
  try {
    const workout = await apiRequest<Workout>(`/api/workouts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(params),
    });
    return workout;
  } catch (error) {
    console.error(`Error updating workout with id ${id}:`, error);
    return null;
  }
}

/**
 * Mark a workout as complete
 */
export async function completeWorkout(
  id: number,
  { caloriesBurned, notes }: { caloriesBurned?: number; notes?: string }
): Promise<Workout | null> {
  try {
    // First update the workout
    const workout = await updateWorkout(id, {
      completed: true,
      caloriesBurned,
    });

    // Then create a workout log
    if (workout) {
      await apiRequest("/api/logs", {
        method: "POST",
        body: JSON.stringify({
          workoutId: id,
          date: formatDateAsString(new Date()),
          duration: workout.duration,
          caloriesBurned,
          notes,
          completed: true,
        }),
      });
    }

    return workout;
  } catch (error) {
    console.error(`Error completing workout with id ${id}:`, error);
    return null;
  }
}

/**
 * Get workouts for a specific date
 */
export function getWorkoutsForDate(
  workouts: Workout[],
  date: string
): Workout[] {
  return workouts.filter((workout) => workout.date === date);
}

/**
 * Get workouts for the current week
 */
export function getWorkoutsForWeek(
  workouts: Workout[],
  currentDate: Date = new Date()
): Workout[] {
  // Calculate the start of the week (Sunday)
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  // Calculate the end of the week (Saturday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Filter workouts within the week using string comparison to avoid timezone issues
  const startOfWeekString = formatDateAsString(startOfWeek);
  const endOfWeekString = formatDateAsString(endOfWeek);

  return workouts.filter((workout) => {
    const workoutDateString = formatDateAsString(workout.date);
    return (
      workoutDateString >= startOfWeekString &&
      workoutDateString <= endOfWeekString
    );
  });
}

/**
 * Generate a workout plan for the current user
 */
export async function generateWorkoutPlan(
  userId: number
): Promise<WorkoutResponse | null> {
  try {
    const response = await apiRequest<WorkoutResponse>(
      `/workouts/${userId}/generate`,
      {
        method: "POST",
      }
    );

    if (response?.success) {
      // Invalidate cache to force fresh data fetch
      invalidateActiveWorkoutCache();
      return response;
    } else {
      throw new Error(response?.message || "Failed to generate workout plan");
    }
  } catch (error) {
    console.error("Error generating workout plan:", error);
    return null;
  }
}

/**
 * Regenerate a workout plan with custom preferences and feedback
 */
export async function regenerateWorkoutPlan(
  userId: number,
  data: {
    customFeedback?: string;
    profileData?: {
      age?: number;
      height?: number;
      weight?: number;
      gender?: string;
      goals?: string[];
      limitations?: string[];
      fitnessLevel?: string;
      environment?: string[];
      equipment?: string[];
      workoutStyles?: string[];
      availableDays?: string[];
      workoutDuration?: number;
      intensityLevel?: number;
      medicalNotes?: string;
    };
  }
): Promise<AsyncJobResponse | null> {
  try {
    const response = await apiRequest<AsyncJobResponse>(
      `/workouts/${userId}/regenerate`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );

    if (response?.success) {
      // Invalidate cache to force fresh data fetch
      invalidateActiveWorkoutCache();
      return response;
    } else {
      throw new Error(response?.message || "Failed to regenerate workout plan");
    }
  } catch (error) {
    console.error("Error regenerating workout plan:", error);
    return null;
  }
}

/**
 * Get plan day log for a completed plan day
 */
export async function getPlanDayLog(
  planDayId: number
): Promise<PlanDayLog | null> {
  try {
    // First try to get the latest plan day log
    const response = await apiRequest<{ success: boolean; log: PlanDayLog }>(
      `/logs/plan-day/plan-day/${planDayId}/latest`
    );
    if (response?.log) {
      return response.log;
    }

    // If that fails, try getting all logs for the plan day and take the first one
    const allLogsResponse = await apiRequest<{
      success: boolean;
      logs: PlanDayLog[];
    }>(`/logs/plan-day/plan-day/${planDayId}`);
    const logs = allLogsResponse?.logs || [];
    return logs.length > 0 ? logs[0] : null;
  } catch (error) {
    console.error(`Error fetching plan day log for ${planDayId}:`, error);
    return null;
  }
}

/**
 * Mark a plan day as complete
 */
export async function markPlanDayAsComplete(
  planDayId: number,
  completionData?: {
    totalTimeSeconds?: number;
    exercisesCompleted?: number;
    blocksCompleted?: number;
    notes?: string;
  }
): Promise<ApiResponse | null> {
  try {
    const response = await apiRequest<ApiResponse>(
      `/logs/workout/day/${planDayId}/complete`,
      {
        method: "POST",
        body: completionData ? JSON.stringify(completionData) : undefined,
      }
    );
    // When a plan day is completed, the active workout cache should be invalidated
    // to reflect this change on next load.
    invalidateActiveWorkoutCache();
    return response;
  } catch (error) {
    console.error(`Error marking plan day ${planDayId} as complete:`, error);
    return null;
  }
}

/**
 * Fetch active workout
 */
export async function fetchActiveWorkout(
  forceRefresh = false
): Promise<WorkoutWithDetails | null> {
  const now = Date.now();

  if (
    !forceRefresh &&
    activeWorkoutCache &&
    now - activeWorkoutCache.timestamp < TIMEOUTS.CACHE_DURATION_MS
  ) {
    return activeWorkoutCache.workout;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }
    const response = await apiRequest<ActiveWorkoutResponse>(
      `/workouts/${user.id}/active-workout`
    );

    // Check if response indicates no active workout (this is normal, not an error)
    if (!response?.workout) {
      // Update cache with null workout
      activeWorkoutCache = {
        timestamp: now,
        workout: null,
      };
      return null;
    }

    // Update cache with workout data
    activeWorkoutCache = {
      timestamp: now,
      workout: response.workout,
    };

    return response.workout;
  } catch (error) {
    // Only log actual network/API errors, not expected "no workout" states
    if (error instanceof Error && error.message.includes("404")) {
      return null;
    }
    console.error("Actual error fetching active workout:", error);
    return null;
  }
}

/**
 * Get the next upcoming workout
 */
export function getNextWorkout(workouts: Workout[]): Workout | null {
  const today = getTodayString();

  // Filter future workouts that are not completed using string comparison
  const futureWorkouts = workouts.filter((workout) => {
    const workoutDateString = formatDateAsString(workout.date);
    return workoutDateString >= today && !workout.completed;
  });

  // Sort by date string (closest first)
  futureWorkouts.sort((a, b) => {
    const dateA = formatDateAsString(a.date);
    const dateB = formatDateAsString(b.date);
    return dateA.localeCompare(dateB);
  });

  return futureWorkouts.length > 0 ? futureWorkouts[0] : null;
}

// New API functions for workout session functionality

/**
 * Create an exercise log
 */
export async function createExerciseLog(
  params: CreateExerciseLogParams
): Promise<ExerciseLog | null> {
  try {
    const response = await apiRequest<ExerciseLog>("/logs/exercise", {
      method: "POST",
      body: JSON.stringify({
        planDayExerciseId: params.planDayExerciseId,
        sets: params.sets,
        durationCompleted: params.durationCompleted,
        isComplete: params.isComplete,
        timeTaken: params.timeTaken,
        notes: params.notes,
        difficulty: params.difficulty,
        rating: params.rating,
      }),
    });

    return response;
  } catch (error) {
    console.error("Error creating exercise log:", error);
    return null;
  }
}

/**
 * Create a workout log
 */
export async function createWorkoutLog(
  params: CreateWorkoutLogParams
): Promise<WorkoutLog | null> {
  try {
    const response = await apiRequest<{ success: boolean; log: WorkoutLog }>(
      "/logs/workout",
      {
        method: "POST",
        body: JSON.stringify(params),
      }
    );
    return response.log;
  } catch (error) {
    console.error("Error creating workout log:", error);
    return null;
  }
}

/**
 * Get exercise logs for a specific plan day exercise
 */
export async function getExerciseLogs(
  planDayExerciseId: number
): Promise<ExerciseLog[]> {
  try {
    const response = await apiRequest<{
      success: boolean;
      logs: ExerciseLog[];
    }>(`/logs/exercise/${planDayExerciseId}`);
    return response.logs || [];
  } catch (error) {
    console.error("Error fetching exercise logs:", error);
    return [];
  }
}

/**
 * Get workout logs for a specific workout
 */
export async function getWorkoutLogs(workoutId: number): Promise<WorkoutLog[]> {
  try {
    const response = await apiRequest<{ success: boolean; logs: WorkoutLog[] }>(
      `/logs/workout/${workoutId}/all`
    );
    return response.logs || [];
  } catch (error) {
    console.error("Error fetching workout logs:", error);
    return [];
  }
}

/**
 * Get existing workout log for a workout (without creating one)
 */
export async function getExistingWorkoutLog(
  workoutId: number
): Promise<WorkoutLog | null> {
  try {
    const response = await apiRequest<{
      success: boolean;
      log: WorkoutLog | null;
    }>(`/logs/workout/${workoutId}/existing`);
    return response.log || null;
  } catch (error) {
    console.error("Error fetching existing workout log:", error);
    return null;
  }
}

/**
 * Get or create workout log for a workout
 */
export async function getOrCreateWorkoutLog(
  workoutId: number
): Promise<WorkoutLog | null> {
  try {
    const response = await apiRequest<{ success: boolean; log: WorkoutLog }>(
      `/logs/workout/${workoutId}`
    );
    return response.log || null;
  } catch (error) {
    console.error("Error getting/creating workout log:", error);
    return null;
  }
}

/**
 * Update workout log
 */
export async function updateWorkoutLog(
  workoutId: number,
  params: {
    isComplete?: boolean;
    totalTimeMinutes?: number;
    completedExercises?: number[];
    notes?: string;
  }
): Promise<WorkoutLog | null> {
  try {
    const response = await apiRequest<{ success: boolean; log: WorkoutLog }>(
      `/logs/workout/${workoutId}`,
      {
        method: "PUT",
        body: JSON.stringify(params),
      }
    );
    return response.log || null;
  } catch (error) {
    console.error("Error updating workout log:", error);
    return null;
  }
}

/**
 * Get completed exercises for a workout
 */
export async function getCompletedExercises(workoutId: number): Promise<{
  completedExercises: number[];
  count: number;
}> {
  try {
    const response = await apiRequest<CompletedExercisesResponse>(
      `/logs/workout/${workoutId}/completed`
    );
    return {
      completedExercises: response.completedExercises || [],
      count: response.count || 0,
    };
  } catch (error) {
    console.error("Error fetching completed exercises:", error);
    return {
      completedExercises: [],
      count: 0,
    };
  }
}

/**
 * Mark exercise as completed in workout
 */
export async function markExerciseCompleted(
  workoutId: number,
  planDayExerciseId: number
): Promise<WorkoutLog | null> {
  invalidateActiveWorkoutCache();
  try {
    const response = await apiRequest<{ success: boolean; log: WorkoutLog }>(
      `/logs/workout/${workoutId}/exercise/${planDayExerciseId}`,
      {
        method: "POST",
      }
    );
    return response.log || null;
  } catch (error) {
    console.error("Error marking exercise as completed:", error);
    return null;
  }
}

/**
 * Mark workout as complete
 */
export async function markWorkoutComplete(
  workoutId: number,
  totalExerciseIds: number[]
): Promise<WorkoutLog | null> {
  try {
    const response = await apiRequest<{ success: boolean; log: WorkoutLog }>(
      `/logs/workout/${workoutId}/complete`,
      {
        method: "POST",
        body: JSON.stringify({ totalExerciseIds }),
      }
    );
    return response.log || null;
  } catch (error) {
    console.error("Error marking workout as complete:", error);
    return null;
  }
}

/**
 * Regenerate a single day's workout
 */
export async function regenerateDailyWorkout(
  userId: number,
  planDayId: number,
  regenerationReason: string
): Promise<{ success: boolean; planDay: PlanDayWithBlocks } | null> {
  invalidateActiveWorkoutCache();
  try {
    const response = await apiRequest<{
      success: boolean;
      planDay: PlanDayWithBlocks;
    }>(`/workouts/${userId}/days/${planDayId}/regenerate`, {
      method: "POST",
      body: JSON.stringify({ reason: regenerationReason }),
    });
    return response;
  } catch (error) {
    console.error("Error regenerating daily workout:", error);
    return null;
  }
}

/**
 * Skip an exercise
 */
export async function skipExercise(
  workoutId: number,
  planDayExerciseId: number
): Promise<WorkoutLog | null> {
  try {
    const response = await apiRequest<{ success: boolean; log: WorkoutLog }>(
      `/logs/workout/${workoutId}/exercise/${planDayExerciseId}/skip`,
      {
        method: "POST",
      }
    );
    invalidateActiveWorkoutCache();
    return response.log || null;
  } catch (error) {
    console.error("Error skipping exercise:", error);
    return null;
  }
}

/**
 * Skip a workout block
 */
export async function skipWorkoutBlock(
  workoutId: number,
  workoutBlockId: number
): Promise<WorkoutLog | null> {
  try {
    const response = await apiRequest<{ success: boolean; log: WorkoutLog }>(
      `/logs/workout/${workoutId}/block/${workoutBlockId}/skip`,
      {
        method: "POST",
      }
    );
    invalidateActiveWorkoutCache();
    return response.log || null;
  } catch (error) {
    console.error("Error skipping workout block:", error);
    return null;
  }
}

/**
 * Repeat a previous week's workout with a new start date
 */
export async function repeatPreviousWeekWorkout(
  userId: number,
  originalWorkoutId: number,
  newStartDate: string
): Promise<WorkoutResponse | null> {
  try {
    const response = await apiRequest<WorkoutResponse>(
      `/workouts/${userId}/repeat-week/${originalWorkoutId}`,
      {
        method: "POST",
        body: JSON.stringify({ newStartDate }),
      }
    );

    if (response?.success) {
      // Invalidate cache to force fresh data fetch
      invalidateActiveWorkoutCache();
      return response;
    } else {
      throw new Error(response?.message || "Failed to repeat workout");
    }
  } catch (error) {
    console.error("Error repeating previous week workout:", error);
    return null;
  }
}

/**
 * Fetch workout history for a user
 */
export async function fetchWorkoutHistory(
  userId: number
): Promise<WorkoutWithDetails[] | null> {
  try {
    const response = await apiRequest<WorkoutsResponse>(
      `/workouts/${userId}/history`
    );

    if (response?.success) {
      return response.workouts || [];
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error fetching workout history:", error);
    return [];
  }
}

/**
 * Get list of previous workouts from past month for selection
 */
export async function fetchPreviousWorkouts(
  userId: number
): Promise<WorkoutWithDetails[] | null> {
  try {
    const response = await apiRequest<WorkoutsResponse>(
      `/workouts/${userId}/previous-workouts`
    );

    if (response?.success) {
      return response.workouts || [];
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error fetching previous workouts:", error);
    return [];
  }
}

/**
 * Generate workout plan asynchronously (returns job ID immediately)
 */
export async function generateWorkoutPlanAsync(
  userId: number,
  params?: {
    customFeedback?: string;
    timezone?: string;
    profileData?: {
      age?: number;
      height?: number;
      weight?: number;
      gender?: string;
      goals?: string[];
      limitations?: string[];
      fitnessLevel?: string;
      environment?: string[];
      equipment?: string[];
      workoutStyles?: string[];
      availableDays?: string[];
      workoutDuration?: number;
      intensityLevel?: number;
      medicalNotes?: string;
    };
  }
): Promise<AsyncJobResponse | null> {
  if (!userId) {
    console.error("User ID is required for generating a workout plan");
    return null;
  }
  try {
    const response = await apiRequest<AsyncJobResponse>(
      `/workouts/${userId}/generate-async`,
      {
        method: "POST",
        body: JSON.stringify(params || {}),
      }
    );

    if (response?.success) {
      return response;
    } else {
      throw new Error("Failed to start async workout generation");
    }
  } catch (error) {
    console.error("Error starting async workout generation:", error);
    return null;
  }
}

/**
 * Get job status by job ID
 */
export async function getJobStatus(jobId: number): Promise<{
  success: boolean;
  job: {
    id: number;
    status: string;
    progress: number;
    error?: string;
    workoutId?: number;
    createdAt: string;
    completedAt?: string;
  };
} | null> {
  try {
    const response = await apiRequest<{
      success: boolean;
      job: {
        id: number;
        status: string;
        progress: number;
        error?: string;
        workoutId?: number;
        createdAt: string;
        completedAt?: string;
      };
    }>(`/workouts/jobs/${jobId}/status`);

    return response;
  } catch (error) {
    console.error("Error fetching job status:", error);
    return null;
  }
}

/**
 * Get user's job history
 */
export async function getUserJobs(userId: number): Promise<{
  success: boolean;
  jobs: Array<{
    id: number;
    status: string;
    progress: number;
    error?: string;
    workoutId?: number;
    createdAt: string;
    completedAt?: string;
  }>;
} | null> {
  try {
    const response = await apiRequest<{
      success: boolean;
      jobs: Array<{
        id: number;
        status: string;
        progress: number;
        error?: string;
        workoutId?: number;
        createdAt: string;
        completedAt?: string;
      }>;
    }>(`/workouts/${userId}/jobs`);

    return response;
  } catch (error) {
    console.error("Error fetching user jobs:", error);
    return null;
  }
}

/**
 * Register push notification token for user
 */
export async function registerPushToken(
  userId: number,
  pushToken: string
): Promise<{ success: boolean; message: string } | null> {
  try {
    const response = await apiRequest<{
      success: boolean;
      message: string;
    }>(`/workouts/${userId}/register-push-token`, {
      method: "POST",
      body: JSON.stringify({ pushToken }),
    });

    return response;
  } catch (error) {
    console.error("Error registering push token:", error);
    return null;
  }
}

/**
 * Regenerate workout plan asynchronously (returns job ID immediately)
 */
export async function regenerateWorkoutPlanAsync(
  userId: number,
  params?: {
    customFeedback?: string;
    profileData?: {
      age?: number;
      height?: number;
      weight?: number;
      gender?: string;
      goals?: string[];
      limitations?: string[];
      fitnessLevel?: string;
      environment?: string[];
      equipment?: string[];
      workoutStyles?: string[];
      availableDays?: string[];
      workoutDuration?: number;
      intensityLevel?: number;
      medicalNotes?: string;
    };
  }
): Promise<{ success: boolean; jobId: number; message: string } | null> {
  try {
    const response = await apiRequest<{
      success: boolean;
      jobId: number;
      message: string;
    }>(`/workouts/${userId}/regenerate-async`, {
      method: "POST",
      body: JSON.stringify(params || {}),
    });

    if (response?.success) {
      invalidateActiveWorkoutCache();
      return response;
    } else {
      throw new Error("Failed to start async workout regeneration");
    }
  } catch (error) {
    // Don't log PaywallError as a regular error - the paywall modal will handle it
    if (error instanceof PaywallError) {
      // Paywall callback has already been triggered, just return null
      return null;
    }
    console.error("Error starting async workout regeneration:", error);
    return null;
  }
}

/**
 * Regenerate daily workout asynchronously (returns job ID immediately)
 */
export async function regenerateDailyWorkoutAsync(
  userId: number,
  planDayId: number,
  params: {
    reason: string;
    styles?: string[];
    limitations?: string[];
  }
): Promise<{ success: boolean; jobId: number; message: string } | null> {
  try {
    const response = await apiRequest<{
      success: boolean;
      jobId: number;
      message: string;
    }>(`/workouts/${userId}/days/${planDayId}/regenerate-async`, {
      method: "POST",
      body: JSON.stringify(params),
    });

    if (response?.success) {
      invalidateActiveWorkoutCache();
      return response;
    } else {
      throw new Error("Failed to start async daily workout regeneration");
    }
  } catch (error) {
    // Don't log PaywallError as a regular error - the paywall modal will handle it
    if (error instanceof PaywallError) {
      // Paywall callback has already been triggered, just return null
      return null;
    }
    console.error("Error starting async daily workout regeneration:", error);
    return null;
  }
}

/**
 * Generate rest day workout asynchronously (returns job ID immediately)
 */
export async function generateRestDayWorkoutAsync(
  userId: number,
  params: {
    date: string;
    reason: string;
  }
): Promise<{ success: boolean; jobId: number; message: string } | null> {
  console.log("Calling rest day workout API", {
    userId,
    params,
    url: `/workouts/${userId}/rest-day-workout`,
  });

  try {
    const response = await apiRequest<{
      success: boolean;
      jobId: number;
      message: string;
    }>(`/workouts/${userId}/rest-day-workout`, {
      method: "POST",
      body: JSON.stringify(params),
    });

    console.log("Rest day workout API response:", response);

    if (response?.success) {
      invalidateActiveWorkoutCache();
      return response;
    } else {
      throw new Error("Failed to start rest day workout generation");
    }
  } catch (error) {
    // Don't log PaywallError as a regular error - the paywall modal will handle it
    if (error instanceof PaywallError) {
      // Paywall callback has already been triggered, just return null
      return null;
    }
    console.error("Error starting rest day workout generation:", error);
    return null;
  }
}

/**
 * Replace an exercise in a workout
 */
export async function replaceExercise(
  exerciseId: number,
  newExerciseId: number
): Promise<{ success: boolean; workoutBlockExercise: any } | null> {
  try {
    const response = await apiRequest<{
      success: boolean;
      workoutBlockExercise: any;
    }>(`/workouts/exercise/${exerciseId}/replace`, {
      method: "PUT",
      body: JSON.stringify({ newExerciseId }),
    });

    if (response?.success) {
      // Invalidate cache to force fresh data fetch
      invalidateActiveWorkoutCache();
      return response;
    } else {
      throw new Error("Failed to replace exercise");
    }
  } catch (error) {
    console.error("Error replacing exercise:", error);
    return null;
  }
}
