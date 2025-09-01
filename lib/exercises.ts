import { apiRequest } from "./api";
import { ExerciseFromLib as Exercise, WorkoutExercise } from "@/types/api";

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
 * Filter exercises by various criteria
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
  return exercises.filter((exercise) => {
    // Filter by search query
    const matchesQuery =
      query === "" ||
      exercise.name.toLowerCase().includes(query.toLowerCase()) ||
      exercise.description.toLowerCase().includes(query.toLowerCase()) ||
      exercise.muscleGroups.some((muscle) =>
        muscle.toLowerCase().includes(query.toLowerCase())
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
