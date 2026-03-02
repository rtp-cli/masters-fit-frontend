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
 * Normalize a search query so spaces, dashes, and underscores are treated as
 * interchangeable by the backend's ILIKE operator. The underscore `_` acts as
 * a single-character wildcard in SQL ILIKE, matching any of those separators.
 */
export function normalizeSearchQuery(query: string): string {
  return query.trim().replace(/[\s\-_]+/g, "_");
}

/**
 * Normalize text for client-side comparison by collapsing all separator
 * characters (space, dash, underscore) into a single space and lowercasing.
 */
function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\-_]+/g, " ")
    .trim();
}

/**
 * Score an exercise against the original query for relevance ranking.
 * Higher score = more relevant.
 */
function scoreExercise(exercise: SearchExercise, rawQuery: string): number {
  const normalizedQuery = normalizeForComparison(rawQuery);
  const normalizedName = normalizeForComparison(exercise.name || "");

  if (normalizedName === normalizedQuery) return 100;
  if (normalizedName.startsWith(normalizedQuery)) return 80;

  const queryWords = normalizedQuery.split(" ");
  const nameWords = normalizedName.split(" ");
  const allWordsPresent = queryWords.every((qw) =>
    nameWords.some((nw) => nw.startsWith(qw))
  );
  if (allWordsPresent) return 60;

  if (normalizedName.includes(normalizedQuery)) return 40;

  const normalizedDesc = normalizeForComparison(exercise.description || "");
  if (normalizedDesc.includes(normalizedQuery)) return 20;

  const muscles = [
    ...(exercise.muscleGroups || []),
    ...(exercise.targetMuscles || []),
  ];
  if (
    muscles.some((m) => normalizeForComparison(m).includes(normalizedQuery))
  ) {
    return 10;
  }

  return 0;
}

/**
 * Sort exercises by relevance to the original query, with shorter (more
 * specific) names used as a tiebreaker.
 */
export function sortExercisesByRelevance(
  exercises: SearchExercise[],
  rawQuery: string
): SearchExercise[] {
  return [...exercises].sort((a, b) => {
    const scoreDiff = scoreExercise(b, rawQuery) - scoreExercise(a, rawQuery);
    if (scoreDiff !== 0) return scoreDiff;
    return (a.name?.length || 0) - (b.name?.length || 0);
  });
}

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
 * Search exercises by name or muscle group.
 * The query is normalized so that spaces, dashes, and underscores are treated
 * as interchangeable (e.g. "Pull up" finds "Pull-up"). Results are sorted by
 * relevance to the original query.
 */
export async function searchExercisesAPI(
  query: string
): Promise<ExercisesSearchResponse> {
  try {
    const normalized = normalizeSearchQuery(query);
    const result = await apiRequest<ExercisesSearchResponse>(
      `/search/exercises?query=${encodeURIComponent(normalized)}`
    );

    if (result.success && result.exercises) {
      result.exercises = sortExercisesByRelevance(result.exercises, query);
      result.data = result.exercises;
    }

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

    if (query) queryParams.append("query", normalizeSearchQuery(query));
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

    if (result.success && result.exercises && query) {
      result.exercises = sortExercisesByRelevance(result.exercises, query);
    }

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
