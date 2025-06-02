import { apiRequest } from "./api";

// Types for search responses
export interface SearchExerciseDetails {
  id: number;
  name: string;
  description: string;
  muscleGroups: string[];
  equipment: string[];
  difficulty: string;
  instructions: string;
  link?: string;
}

export interface DateSearchExercise {
  id: number;
  exercise: SearchExerciseDetails;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  duration: number | null;
  completed: boolean;
  completionRate: number;
}

export interface DateSearchPlanDay {
  id: number;
  date: Date;
  exercises: DateSearchExercise[];
}

export interface DateSearchWorkout {
  id: number;
  name: string;
  description: string;
  completed: boolean;
  planDay: DateSearchPlanDay;
  overallCompletionRate: number;
}

export interface DateSearchResponse {
  success: boolean;
  date: string;
  workout: DateSearchWorkout | null;
}

export interface ExerciseDetails {
  id: number;
  name: string;
  description: string;
  muscleGroups: string[];
  equipment: string[];
  difficulty: string;
  instructions: string;
  link?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PersonalRecord {
  maxWeight: number | null;
  maxReps: number;
  maxSets: number;
}

export interface ExerciseUserStats {
  totalAssignments: number;
  totalCompletions: number;
  completionRate: number;
  averageSets: number;
  averageReps: number;
  averageWeight: number | null;
  lastPerformed: Date | null;
  personalRecord: PersonalRecord;
}

export interface ExerciseSearchResponse {
  success: boolean;
  exercise: ExerciseDetails;
  userStats: ExerciseUserStats | null;
}

export interface Exercise {
  id: number;
  name: string;
  description: string | null;
  muscleGroups: string[];
  equipment: string[] | null;
  difficulty: string | null;
  instructions: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExercisesSearchResponse {
  success: boolean;
  exercises: Exercise[];
}

/**
 * Search for workout by date
 */
export async function searchByDateAPI(
  userId: number,
  date: string
): Promise<DateSearchResponse> {
  try {
    return await apiRequest<DateSearchResponse>(
      `/search/date/${userId}?date=${date}`
    );
  } catch (error) {
    console.error("Search by date error:", error);
    return {
      success: false,
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
    return await apiRequest<ExerciseSearchResponse>(
      `/search/exercise/${userId}/${exerciseId}`
    );
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
    return await apiRequest<ExercisesSearchResponse>(
      `/search/exercises?query=${encodeURIComponent(query)}`
    );
  } catch (error) {
    console.error("Search exercises error:", error);
    return {
      success: false,
      exercises: [],
    };
  }
}
