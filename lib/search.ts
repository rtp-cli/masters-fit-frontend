import { apiRequest } from "./api";
import {
  DateSearchResponse,
  ExerciseSearchResponse,
  ExercisesSearchResponse,
  SearchExercise,
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

export interface EnhancedSearchResponse {
  success: boolean;
  exercises: SearchExercise[];
  appliedFilters: {
    equipment?: string[];
    difficulty?: string;
    userEquipmentOnly?: boolean;
  };
}

/**
 * Enhanced search exercises with filtering options
 */
export async function searchExercisesWithFiltersAPI(
  userId: number,
  options: {
    query?: string;
    muscleGroups?: string[];
    equipment?: string[];
    difficulty?: string;
    excludeId?: number;
    userEquipmentOnly?: boolean;
    limit?: number;
  } = {}
): Promise<EnhancedSearchResponse> {
  try {
    const {
      query,
      muscleGroups,
      equipment,
      difficulty,
      excludeId,
      userEquipmentOnly = true,
      limit = 20,
    } = options;

    // Build query parameters
    const queryParams = new URLSearchParams();

    if (query) queryParams.append("query", query);
    if (muscleGroups && muscleGroups.length > 0) {
      queryParams.append("muscleGroups", muscleGroups.join(","));
    }
    if (equipment && equipment.length > 0) {
      queryParams.append("equipment", equipment.join(","));
    }
    if (difficulty) queryParams.append("difficulty", difficulty);
    if (excludeId) queryParams.append("excludeId", excludeId.toString());
    if (userEquipmentOnly !== undefined) {
      queryParams.append("userEquipmentOnly", userEquipmentOnly.toString());
    }
    queryParams.append("limit", limit.toString());

    const result = await apiRequest<EnhancedSearchResponse>(
      `/search/exercises/filtered/${userId}?${queryParams.toString()}`
    );
    return result;
  } catch (error) {
    console.error("Enhanced search exercises error:", error);
    return {
      success: false,
      exercises: [],
      appliedFilters: {},
    };
  }
}

/**
 * Get available filter options for exercise search
 */
export async function getFilterOptionsAPI(): Promise<{
  success: boolean;
  equipment: string[];
  muscleGroups: string[];
  difficulty: string[];
} | null> {
  try {
    const result = await apiRequest<{
      success: boolean;
      equipment: string[];
      muscleGroups: string[];
      difficulty: string[];
    }>('/search/filters');
    return result;
  } catch (error) {
    console.error("Get filter options error:", error);
    return null;
  }
}
