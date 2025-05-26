import { apiRequest } from "./api";
import { WorkoutResponse } from "../../server/src/types/workout/responses";
import { getCurrentUser } from "./auth";

// Types
export interface Workout {
  id: number;
  name: string;
  description?: string;
  type?: string;
  duration: number;
  intensity: string;
  date: string;
  completed: boolean;
  caloriesBurned?: number;
  createdAt?: string;
}

export interface CreateWorkoutParams {
  name: string;
  description?: string;
  type?: string;
  duration: number;
  intensity: string;
  date: string;
}

export interface UpdateWorkoutParams {
  name?: string;
  description?: string;
  type?: string;
  duration?: number;
  intensity?: string;
  date?: string;
  completed?: boolean;
  caloriesBurned?: number;
}

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
          date: new Date().toISOString().split("T")[0],
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

  // Filter workouts within the week
  return workouts.filter((workout) => {
    const workoutDate = new Date(workout.date);
    return workoutDate >= startOfWeek && workoutDate <= endOfWeek;
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
      { method: "POST" }
    );
    return response;
  } catch (error) {
    console.error("Error generating workout plan:", error);
    return null;
  }
}

/**
 * Fetch active workout
 */
export async function fetchActiveWorkout(): Promise<WorkoutResponse | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("User not found");
    }
    const response = await apiRequest<WorkoutResponse>(
      `/workouts/${user.id}/active`
    );
    return response;
  } catch (error) {
    console.error("Error fetching active workout:", error);
    return null;
  }
}

/**
 * Get the next upcoming workout
 */
export function getNextWorkout(workouts: Workout[]): Workout | null {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Filter future workouts that are not completed
  const futureWorkouts = workouts.filter((workout) => {
    const workoutDate = new Date(workout.date);
    return workoutDate >= now && !workout.completed;
  });

  // Sort by date (closest first)
  futureWorkouts.sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  return futureWorkouts.length > 0 ? futureWorkouts[0] : null;
}
