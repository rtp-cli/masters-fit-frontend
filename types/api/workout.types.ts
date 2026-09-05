import { BLOCK_TYPE_DISPLAY_NAMES } from "@/constants/block-types";

import { type ApiResponse } from "./common.types";
import { type Exercise } from "./exercise.types";

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
  roundNumber?: number;
  sets: {
    roundNumber: number;
    setNumber: number;
    weight: number;
    reps: number;
    restAfter?: number;
    durationSeconds?: number;
    distanceM?: number;
  }[];
  durationCompleted?: number;
  isComplete: boolean;
  timeTaken?: number;
  notes?: string;
  difficulty?: string;
  rating?: number;
}

export interface ExerciseProgress {
  setsCompleted: number;
  repsCompleted: number;
  roundsCompleted: number;
  weightUsed: number;
  duration: number;
  restTime: number;
  notes: string;
  isSkipped?: boolean;
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
  // [GQ-04] Parts of the user's request the plan couldn't fully honor
  // ("couldn't apply X because Y"), shown in the dismissible week banner.
  feedbackConflicts?: { request: string; reason: string }[];
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
  // Training-locations §2.2/§9: frozen snapshot of where this session was built
  // for. Present only when a location was chosen for the day; the row falls back
  // to the primary location's name when absent.
  locationId?: number | null;
  locationSnapshot?: import("./training-location.types").TrainingLocationSnapshot | null;
  created_at: Date;
  updated_at: Date;
}

// New workout block types
export interface WorkoutBlock {
  id: number;
  blockType?: string;
  /** How the block is scored (completion|rounds_reps|time|reps|load|...);
   *  null on blocks created before the column existed. */
  scoringType?: string | null;
  /** Typed protocol details (rep schemes, work/rest intervals); null on
   *  blocks created before the column existed. */
  protocolConfig?: {
    repScheme?: number[];
    workSeconds?: number;
    restSeconds?: number;
    intervalSeconds?: number;
  } | null;
  blockName?: string;
  blockDurationMinutes?: number;
  timeCapMinutes?: number;
  rounds?: number;
  instructions?: string;
  order?: number;
  created_at: Date;
  updated_at: Date;
}

export interface WorkoutBlockExercise {
  id: number;
  workoutBlockId: number;
  exerciseId: number;
  sets?: number;
  reps?: number;
  /** Optional rep range around `reps` (e.g. 8–12); display only for now */
  repsMin?: number | null;
  repsMax?: number | null;
  weight?: number;
  duration?: number;
  restTime?: number;
  /** Prescribed distance in meters (runs, rows, carries) */
  distanceM?: number | null;
  /** Prescribed target effort, RPE 1-10 */
  rpe?: number | null;
  completed: boolean;
  isSkipped?: boolean;
  notes?: string;
  order?: number;
  created_at: Date;
  updated_at: Date;
}

// Legacy PlanDayExercise for backward compatibility
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

export interface ExerciseSet {
  roundNumber: number;
  setNumber: number;
  weight: number;
  reps: number;
  restAfter?: number;
}

export interface ExerciseSessionData {
  exerciseId: number;
  planDayExerciseId: number;
  targetSets: number;
  targetReps: number;
  targetRounds?: number;
  targetWeight?: number;
  targetDuration?: number;
  targetRestTime?: number;
  setsCompleted: number;
  repsCompleted: number;
  roundsCompleted?: number;
  weightUsed?: number;
  sets?: ExerciseSet[];
  duration?: number;
  restTime?: number;
  timeTaken: number;
  notes?: string;
  isCompleted: boolean;
  startTime?: Date;
  blockInfo?: {
    blockId: number;
    blockType?: string;
    blockName?: string;
    blockDurationMinutes?: number;
    instructions?: string;
    rounds?: number;
    timeCapMinutes?: number;
  };
}

export interface ExerciseLog {
  id?: number;
  planDayExerciseId: number;
  durationCompleted?: number;
  status: "complete" | "incomplete";
  timeTaken?: number; // in seconds
  notes?: string;
  difficulty?: string;
  rating?: number;
  created_at?: Date;
  updated_at?: Date;
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
  createdAt: Date;
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

// Composed types with workout blocks
export interface WorkoutBlockWithExercise extends WorkoutBlockExercise {
  exercise: Exercise;
  blockInfo?: {
    blockId: number;
    blockType?: string;
    blockName?: string;
    blockDurationMinutes?: number;
    instructions?: string;
    rounds?: number;
    timeCapMinutes?: number;
  };
}

export interface WorkoutBlockWithExercises
  extends Omit<WorkoutBlock, "created_at" | "updated_at"> {
  exercises: WorkoutBlockWithExercise[];
  created_at: Date;
  updated_at: Date;
}

export interface PlanDayWithBlocks
  extends Omit<PlanDay, "created_at" | "updated_at"> {
  blocks: WorkoutBlockWithExercises[];
  isComplete: boolean;
  created_at: Date;
  updated_at: Date;
  // Only set by /past-completed-days, which collapses repeats of the same
  // workout into a single newest-instance card. Absent everywhere else.
  timesCompleted?: number;
}

// Legacy types for backward compatibility
export interface PlanDayWithExercise extends PlanDayExercise {
  exercise: Exercise;
}

export interface PlanDayWithExercises
  extends Omit<PlanDay, "created_at" | "updated_at"> {
  exercises: PlanDayWithExercise[];
  isComplete: boolean;
  created_at: Date;
  updated_at: Date;
}

export type TodayWorkout = PlanDayWithBlocks | PlanDayWithExercises;

export interface WorkoutWithDetails extends WorkoutDetailed {
  planDays: PlanDayWithBlocks[];
}

export interface WorkoutResponse extends ApiResponse {
  workout: WorkoutWithDetails;
}

export interface WorkoutsResponse extends ApiResponse {
  workouts: WorkoutWithDetails[];
}

export interface ActiveWorkoutResponse extends ApiResponse {
  workout: WorkoutWithDetails | null;
}

export interface PlanDayWithExercisesLegacy extends PlanDayWithBlocks {
  exercises: WorkoutBlockWithExercise[];
}

// Helper function to flatten blocks into exercises for backward compatibility
export function flattenBlocksToExercises(
  blocks: WorkoutBlockWithExercises[]
): PlanDayWithExercise[] {
  const exercises: PlanDayWithExercise[] = [];

  blocks.forEach((block) => {
    if (block.exercises && Array.isArray(block.exercises)) {
      block.exercises.forEach((exercise) => {
        exercises.push({
          ...exercise,
          planDayId: 0, // This will need to be set by the caller
        });
      });
    }
  });

  return exercises;
}

// Helper function to get block type display name
export function getBlockTypeDisplayName(blockType?: string): string {
  if (!blockType) return "Workout";

  return (
    BLOCK_TYPE_DISPLAY_NAMES[blockType] ||
    blockType.charAt(0).toUpperCase() + blockType.slice(1)
  );
}

// Type for previous workouts in repeat modal
export interface PreviousWorkout {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  totalWorkouts: number;
  completedWorkouts: number;
  completionRate: number;
  duration: string;
  description?: string;
  planDays?: {
    id: number;
    dayNumber: number;
    date: string;
    name: string;
    description?: string;
    isComplete: boolean;
    totalExercises: number;
    blocks: {
      id: number;
      blockName?: string;
      blockType?: string;
      exerciseCount: number;
    }[];
  }[];
}

export interface WorkoutBlockExerciseResponse {
  success: boolean;
  workoutBlockExercise: WorkoutBlockExercise;
}

export interface AsyncJobResponse {
  success: boolean;
  jobId: number;
  message: string;
}
