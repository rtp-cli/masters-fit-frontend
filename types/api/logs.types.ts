export interface ExerciseLog {
  id: number;
  planDayExerciseId: number;
  durationCompleted: number | null;
  timeTaken: number | null;
  isComplete: boolean;
  isSkipped: boolean;
  notes: string | null;
  difficulty: string | null;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
  sets?: ExerciseSetLog[];
}

export interface ExerciseSetLog {
  id: number;
  exerciseLogId: number;
  roundNumber: number;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  restAfter: number | null;
  createdAt: string;
}

export interface PlanDayLog {
  id: number;
  planDayId: number;
  totalTimeMinutes: number | null;
  blocksCompleted: number | null;
  exercisesCompleted: number | null;
  totalVolume: number | null;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  isComplete: boolean;
  isSkipped: boolean;
  notes: string | null;
  difficulty: string | null;
  rating: number | null;
  mood: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutLog {
  id: number;
  workoutId: number;
  totalTimeMinutes: number | null;
  daysCompleted: number | null;
  totalDays: number | null;
  totalVolume: number | null;
  averageRating: number | null;
  completedExercises: number[] | null;
  completedBlocks: number[] | null;
  completedDays: number[] | null;
  isComplete: boolean;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompletedExercisesResponse extends ApiResponse {
  completedExercises: number[];
  count: number;
}
