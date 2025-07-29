import {
  ExerciseSessionData,
  PlanDayWithBlocks,
  WorkoutBlockWithExercise,
  ExerciseSet,
} from "../api/workout.types";

export interface UseWorkoutSessionReturn {
  // State
  activeWorkout: PlanDayWithBlocks | null;
  currentExerciseIndex: number;
  currentBlockIndex: number;
  exerciseTimer: number;
  workoutTimer: number;
  isWorkoutActive: boolean;
  isPaused: boolean;
  exerciseData: ExerciseSessionData[];
  isLoading: boolean;

  // Actions
  startWorkout: () => Promise<void>;
  completeExercise: (notes?: string) => Promise<boolean>;
  endWorkout: (notes?: string) => Promise<boolean>;
  updateExerciseData: (field: keyof ExerciseSessionData, value: any) => void;
  updateExerciseSets: (sets: ExerciseSet[]) => void;
  moveToNextExercise: () => void;
  resetSession: () => void;
  refreshWorkout: () => Promise<void>;
  togglePause: () => void;

  // Computed values
  currentExercise: WorkoutBlockWithExercise | undefined;
  currentData: ExerciseSessionData | undefined;
  completedCount: number;
  totalExercises: number;
  progressPercentage: number;
  formatTime: (seconds: number) => string;
}
