import { apiRequest } from "./api";
import {
  DateSearchResponse,
  ExerciseSearchResponse,
  ExercisesSearchResponse,
} from "@/types/api";

// Re-export types for backward compatibility
export type {
  DateSearchResponse,
  ExerciseSearchResponse,
  ExercisesSearchResponse,
  SearchExercise as Exercise,
  DateSearchWorkout,
  ExerciseDetails,
  ExerciseUserStats,
} from "@/types/api";

/**
 * Search for workout by date
 */
export async function searchByDateAPI(
  userId: number,
  date: string
): Promise<DateSearchResponse> {
  try {
    const result = await apiRequest<DateSearchResponse>(
      `/search/date/${userId}?date=${date}`
    );
    return result;
  } catch (error) {
    console.error("Search by date error:", error);
    return {
      success: false,
      data: [],
      date,
      workout: null,
    };
  }
}

/**
 * Search for exercise details and user stats
 */
export async function searchExerciseAPI(
  userId: number,
  exerciseId: number
): Promise<ExerciseSearchResponse> {
  try {
    const result = await apiRequest<ExerciseSearchResponse>(
      `/search/exercise/${userId}/${exerciseId}`
    );
    return result;
  } catch (error) {
    console.error("Search exercise error:", error);
    throw error;
  }
}

/**
 * Search exercises by name or muscle group
 */
export async function searchExercisesAPI(
  query: string
): Promise<ExercisesSearchResponse> {
  try {
    const result = await apiRequest<ExercisesSearchResponse>(
      `/search/exercises?query=${encodeURIComponent(query)}`
    );
    return result;
  } catch (error) {
    console.error("Search exercises error:", error);
    return {
      success: false,
      data: [],
      exercises: [],
    };
  }
}
