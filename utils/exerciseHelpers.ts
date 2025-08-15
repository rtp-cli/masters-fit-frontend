import { WorkoutBlockWithExercise } from "@/types/api/workout.types";

// Exercise logging types
export type ExerciseLoggingType = 
  | "sets_reps"        // Traditional: sets + reps + weight (e.g., "3 sets of 10 push-ups")
  | "duration_only"    // Time-based: duration + optional weight (e.g., "1 set arm circles 15s")  
  | "sets_duration"    // Multiple timed sets: sets + duration + optional weight (e.g., "3 sets plank 30s each")
  | "hybrid";          // Both reps and duration: sets + reps + duration + weight

// Helper function to determine how an exercise should be logged
export function getExerciseLoggingType(exercise: WorkoutBlockWithExercise): ExerciseLoggingType {
  const hasReps = exercise.reps && exercise.reps > 0;
  const hasDuration = exercise.duration && exercise.duration > 0;
  const hasSets = exercise.sets && exercise.sets > 1;

  if (hasReps && hasDuration) {
    return "hybrid";
  } else if (hasDuration && !hasReps) {
    return hasSets ? "sets_duration" : "duration_only";
  } else if (hasReps && !hasDuration) {
    return "sets_reps";
  }
  
  // Default fallback to traditional sets/reps
  return "sets_reps";
}

// Helper to get display text for exercise requirements
export function getExerciseRequirementsText(exercise: WorkoutBlockWithExercise): string {
  const loggingType = getExerciseLoggingType(exercise);
  const sets = exercise.sets || 1;
  
  switch (loggingType) {
    case "duration_only":
      return `${exercise.duration}s`;
    
    case "sets_duration":
      return `${sets} sets × ${exercise.duration}s`;
    
    case "sets_reps":
      return `${sets} sets × ${exercise.reps} reps`;
    
    case "hybrid":
      return `${sets} sets × ${exercise.reps} reps (${exercise.duration}s each)`;
    
    default:
      return `${sets} sets`;
  }
}

// Helper to determine if weight input should be shown
export function shouldShowWeightInput(exercise: WorkoutBlockWithExercise): boolean {
  // Always show weight input - user requested weight logging be available in all cases
  return true;
}

// Helper to get default rest time based on exercise type
export function getDefaultRestTime(exercise: WorkoutBlockWithExercise): number {
  const loggingType = getExerciseLoggingType(exercise);
  
  switch (loggingType) {
    case "duration_only":
      return 30; // Short rest for single timed exercises
    
    case "sets_duration":
      return exercise.restTime || 60; // Medium rest between timed sets
    
    case "sets_reps":
      return exercise.restTime || 90; // Standard rest for strength exercises
    
    case "hybrid":
      return exercise.restTime || 120; // Longer rest for complex exercises
    
    default:
      return 60;
  }
}