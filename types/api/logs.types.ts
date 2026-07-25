export interface ExerciseLog {
  id: number;
  planDayExerciseId: number;
  roundNumber: number;
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

/**
 * A set as built up in the client during an active session (before it's
 * persisted as an ExerciseSetLog). Relocated from the deleted dead
 * components/set-tracker.tsx (T5-8 cleanup) — the live consumers are
 * adaptive-set-tracker and the workout session screen.
 */
export interface ExerciseSet {
  roundNumber: number;
  setNumber: number;
  weight: number;
  reps: number;
  restAfter?: number;
  /** Actual time performed for duration-based sets (persisted). */
  durationSeconds?: number;
  /** Actual distance performed in meters (persisted). */
  distanceM?: number;
  /**
   * [T5-1] Client-side only: the user tapped this set's ✓ during the session.
   * Only completed sets are logged; the field is STRIPPED before the API call
   * (see workout-screen's toApiSets).
   */
  isCompleted?: boolean;
}

export interface ExerciseSetLog {
  id: number;
  exerciseLogId: number;
  roundNumber: number;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  restAfter: number | null;
  durationSeconds: number | null;
  distanceM: number | null;
  createdAt: string;
}

/** Block-level result (rounds completed, time, score) — block_logs table. */
export interface BlockLog {
  id: number;
  workoutBlockId: number;
  roundsCompleted: number | null;
  timeCapMinutes: number | null;
  actualTimeMinutes: number | null;
  totalReps: number | null;
  totalDuration: number | null;
  score: string | null;
  isComplete: boolean;
  isSkipped: boolean;
  notes: string | null;
  difficulty: string | null;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
}

/** One row of GET /logs/block/history — a past block result with context. */
export interface BlockResultHistoryItem {
  id: number;
  workoutBlockId: number;
  roundsCompleted: number | null;
  totalReps: number | null;
  actualTimeMinutes: number | null;
  totalDuration: number | null;
  score: string | null;
  createdAt: string;
  blockType: string | null;
  scoringType: string;
  blockName: string | null;
  planDayId: number;
  planDayDate: string;
  /** Best result among the user's blocks with the same scoring type. */
  isBest: boolean;
}

export interface PlanDayLog {
  id: number;
  planDayId: number;
  totalTimeSeconds: number | null;
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
