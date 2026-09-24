import { type ExerciseFromLib as Exercise, type WorkoutExercise } from "@/types/api";
import { type SearchExercise } from "@/types/api/search.types";

import { apiRequest } from "./api";

/**
 * Fetch all exercises from the API
 */
export async function fetchExercises(): Promise<Exercise[]> {
  try {
    const response = await apiRequest<Exercise[]>("/exercises");
    return response;
  } catch (error) {
    console.error("Error fetching exercises:", error);
    return [];
  }
}

/**
 * Fetch a single exercise by ID from the API
 */
export async function fetchExerciseById(id: number): Promise<Exercise | null> {
  try {
    const exercise = await apiRequest<Exercise>(`/api/exercises/${id}`);
    return exercise;
  } catch (error) {
    console.error(`Error fetching exercise with id ${id}:`, error);
    return null;
  }
}

/**
 * Fetch exercises for a specific workout
 */
export async function fetchWorkoutExercises(
  workoutId: number
): Promise<WorkoutExercise[]> {
  try {
    const workoutExercises = await apiRequest<WorkoutExercise[]>(
      `/api/workouts/${workoutId}/exercises`
    );
    return workoutExercises;
  } catch (error) {
    console.error(`Error fetching exercises for workout ${workoutId}:`, error);
    return [];
  }
}

/**
 * Collapse spaces, dashes, and underscores into a single space for
 * separator-agnostic comparison.
 */
function normalizeSeparators(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\-_]+/g, " ")
    .trim();
}

/**
 * Filter exercises by various criteria.
 * Query matching treats spaces, dashes, and underscores as interchangeable
 * so "Pull up" matches "Pull-up", etc.
 */
export function filterExercises(
  exercises: Exercise[],
  {
    query = "",
    muscleGroup = "",
    difficulty = "",
    equipment = "",
  }: {
    query?: string;
    muscleGroup?: string;
    difficulty?: string;
    equipment?: string;
  }
): Exercise[] {
  const normalizedQuery = normalizeSeparators(query);

  return exercises.filter((exercise) => {
    const matchesQuery =
      normalizedQuery === "" ||
      normalizeSeparators(exercise.name).includes(normalizedQuery) ||
      normalizeSeparators(exercise.description).includes(normalizedQuery) ||
      exercise.muscleGroups.some((muscle) =>
        normalizeSeparators(muscle).includes(normalizedQuery)
      );

    // Filter by muscle group
    const matchesMuscle =
      muscleGroup === "" ||
      exercise.muscleGroups.some(
        (muscle) => muscle.toLowerCase() === muscleGroup.toLowerCase()
      );

    // Filter by difficulty
    const matchesDifficulty =
      difficulty === "" ||
      exercise.difficulty.toLowerCase() === difficulty.toLowerCase();

    // Filter by equipment
    const matchesEquipment =
      equipment === "" ||
      exercise.equipment.some(
        (eq) => eq.toLowerCase() === equipment.toLowerCase()
      ) ||
      (equipment.toLowerCase() === "none" && exercise.equipment.length === 0);

    return (
      matchesQuery && matchesMuscle && matchesDifficulty && matchesEquipment
    );
  });
}

/**
 * Get all unique muscle groups from the exercises array
 */
export function getMuscleGroups(exercises: Exercise[]): string[] {
  const muscleGroupsSet = new Set<string>();

  exercises.forEach((exercise) => {
    exercise.muscleGroups.forEach((muscle) => {
      muscleGroupsSet.add(muscle);
    });
  });

  return Array.from(muscleGroupsSet).sort();
}

/**
 * Get all unique equipment types from the exercises array
 */
export function getEquipmentTypes(exercises: Exercise[]): string[] {
  const equipmentSet = new Set<string>();

  exercises.forEach((exercise) => {
    exercise.equipment.forEach((eq) => {
      equipmentSet.add(eq);
    });
  });

  return Array.from(equipmentSet).sort();
}

/**
 * Add an exercise to a workout
 */
export async function addExerciseToWorkout(
  workoutId: number,
  exerciseId: number,
  params: {
    sets?: number;
    reps?: number;
    weight?: number;
    duration?: number;
    order?: number;
  }
): Promise<WorkoutExercise | null> {
  try {
    const workoutExercise = await apiRequest<WorkoutExercise>(
      `/api/workouts/${workoutId}/exercises`,
      {
        method: "POST",
        body: JSON.stringify({
          exerciseId,
          ...params,
        }),
      }
    );
    return workoutExercise;
  } catch (error) {
    console.error("Error adding exercise to workout:", error);
    return null;
  }
}

export const updateExerciseLink = async (
  exerciseId: number,
  link: string | null
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = (await apiRequest(`/exercises/${exerciseId}/link`, {
      method: "PUT",
      body: JSON.stringify({ link }),
      headers: {
        "Content-Type": "application/json",
      },
    })) as { success: boolean; error?: string };

    if (response.success) {
      return { success: true };
    } else {
      return {
        success: false,
        error: response.error || "Failed to update link",
      };
    }
  } catch (error: unknown) {
    console.error("Failed to update exercise link:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update exercise link",
    };
  }
};

/**
 * Create one of the user's own exercises — the "not in the library? add your
 * own" row in edit-search. Idempotent per user by name, so re-adding
 * yesterday's "Sled push + pull" returns the same exercise. Returns the row in
 * the search-result shape so the caller can select it like any other hit.
 * Throws on failure so the caller can say so; this is a user-initiated write.
 */
export async function createCustomExercise(
  name: string
): Promise<SearchExercise> {
  const response = await apiRequest<{
    success: boolean;
    exercise: SearchExercise;
  }>("/exercises/custom", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  if (!response?.success || !response.exercise) {
    throw new Error("Failed to create exercise");
  }
  return response.exercise;
}
