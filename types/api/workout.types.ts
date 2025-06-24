import { Exercise } from "./exercise.types";

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

export interface CreateExerciseLogParams {
  planDayExerciseId: number;
  setsCompleted: number;
  repsCompleted: number;
  weightUsed: number;
  isComplete: boolean;
  timeTaken?: number;
  notes?: string;
}

export interface CreateWorkoutLogParams {
  workoutId: number;
  planDayId: number;
  timeTaken: number;
  notes?: string;
  isComplete: boolean;
  completedExercises: number[];
}

// Enhanced workout types from app/types.ts
export interface WorkoutDetailed {
  id: number;
  userId: number;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  promptId: number;
  isActive: boolean;
  completed: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PlanDay {
  id: number;
  workoutId: number;
  date: Date;
  instructions?: string;
  name: string;
  description?: string;
  dayNumber: number;
  created_at: Date;
  updated_at: Date;
}

export interface PlanDayExercise {
  id: number;
  planDayId: number;
  exerciseId: number;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;
  restTime?: number;
  completed: boolean;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface WorkoutSession {
  workoutId: number;
  planDayId: number;
  currentExerciseIndex: number;
  startTime: Date;
  exerciseLogs: ExerciseLog[];
  isActive: boolean;
}

export interface ExerciseSessionData {
  exerciseId: number;
  planDayExerciseId: number;
  targetSets: number;
  targetReps: number;
  targetWeight?: number;
  setsCompleted: number;
  repsCompleted: number;
  weightUsed?: number;
  timeTaken: number;
  notes?: string;
  isCompleted: boolean;
  startTime?: Date;
}

export interface ExerciseLog {
  id?: number;
  planDayExerciseId: number;
  setsCompleted: number;
  repsCompleted: number;
  weightUsed: number;
  status: "complete" | "incomplete";
  timeTaken?: number; // in seconds
  notes?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface WorkoutLog {
  id?: number;
  workoutId: number;
  status: "complete" | "incomplete" | "in_progress";
  totalTimeTaken?: number; // in seconds
  completedExercises?: number[]; // array of planDayExercise IDs
  notes?: string;
  created_at?: Date;
  updated_at?: Date;
}

// Composed types
export interface PlanDayWithExercise extends PlanDayExercise {
  exercise: Exercise;
}

export interface PlanDayWithExercises
  extends Omit<PlanDay, "created_at" | "updated_at"> {
  exercises: PlanDayWithExercise[];
  created_at: Date;
  updated_at: Date;
}

export interface WorkoutWithDetails extends WorkoutDetailed {
  planDays: PlanDayWithExercises[];
}
