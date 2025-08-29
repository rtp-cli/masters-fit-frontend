import {
  WorkoutBlockWithExercise,
  WorkoutBlockWithExercises,
} from "./workout.types";

/**
 * Exercise performance data within a specific round
 */
export interface CircuitExerciseLog {
  /** Unique exercise identifier */
  exerciseId: number;
  /** Plan day exercise ID for backend logging */
  planDayExerciseId: number;
  /** Target reps for this exercise */
  targetReps: number;
  /** Actual reps completed */
  actualReps: number;
  /** Weight used (optional) */
  weight?: number;
  /** Whether this exercise was completed in this round */
  completed: boolean;
  /** Exercise-specific notes */
  notes?: string;
  /** Time taken for this specific exercise (optional) */
  timeSeconds?: number;
  /** Whether this exercise was skipped in this round */
  skipped?: boolean;
}

/**
 * Complete round data including all exercises
 */
export interface CircuitRound {
  /** Round number (1-indexed) */
  roundNumber: number;
  /** Array of exercise logs for this round */
  exercises: CircuitExerciseLog[];
  /** Timestamp when round was completed */
  completedAt?: Date;
  /** Time taken to complete this round (seconds) */
  roundTimeSeconds?: number;
  /** Whether this round is completed */
  isCompleted: boolean;
  /** Whether this round was skipped */
  isSkipped?: boolean;
  /** Round-specific notes */
  notes?: string;
}

/**
 * Timer state for circuit workouts
 */
export interface CircuitTimerState {
  /** Current time elapsed in seconds */
  currentTime: number;
  /** Whether timer is actively running */
  isActive: boolean;
  /** Whether timer is paused */
  isPaused: boolean;
  /** Timer start timestamp */
  startTime?: Date;
  /** Pause start timestamp */
  pausedAt?: Date;
  /** Total paused time in seconds */
  totalPausedTime: number;
  /** Current interval for interval-based workouts (Tabata) */
  currentInterval?: number;
  /** Whether in work or rest phase for interval workouts */
  isWorkPhase?: boolean;
}

/**
 * Complete circuit session data
 */
export interface CircuitSessionData {
  /** Workout block ID */
  blockId: number;
  /** Block type (amrap, emom, etc.) */
  blockType: string;
  /** Block name */
  blockName?: string;
  /** Array of rounds data */
  rounds: CircuitRound[];
  /** Current active round number */
  currentRound: number;
  /** Target number of rounds (if specified) */
  targetRounds?: number;
  /** Time cap in minutes (if specified) */
  timeCapMinutes?: number;
  /** Timer state */
  timer: CircuitTimerState;
  /** Whether the entire circuit is completed */
  isCompleted: boolean;
  /** Session start timestamp */
  startedAt?: Date;
  /** Session completion timestamp */
  completedAt?: Date;
  /** Session-wide notes */
  notes?: string;
}

/**
 * Circuit metrics for display and scoring
 */
export interface CircuitMetrics {
  /** Total rounds completed */
  roundsCompleted: number;
  /** Total reps across all exercises and rounds */
  totalReps: number;
  /** Total workout time in minutes */
  totalTimeMinutes: number;
  /** Average time per round in seconds */
  averageRoundTime?: number;
  /** Calculated score based on workout type */
  score: string;
  /** Performance breakdown by round */
  roundBreakdown: {
    roundNumber: number;
    totalReps: number;
    timeSeconds: number;
    completedExercises: number;
  }[];
}

/**
 * Circuit logging parameters for backend API
 */
export interface CreateCircuitLogParams {
  /** Workout block ID */
  workoutBlockId: number;
  /** Number of rounds completed */
  roundsCompleted: number;
  /** Time cap in minutes (if applicable) */
  timeCapMinutes?: number;
  /** Actual time taken in minutes */
  actualTimeMinutes: number;
  /** Total reps across all rounds */
  totalReps: number;
  /** Total duration in seconds */
  totalDuration: number;
  /** Calculated score */
  score: string;
  /** Whether the circuit is complete */
  isComplete: boolean;
  /** Session notes */
  notes?: string;
  /** Difficulty rating (1-10) */
  rating?: number;
}

/**
 * Exercise set log for circuit rounds (maps to existing exerciseSetLogs schema)
 */
export interface CircuitExerciseSetLog {
  /** Exercise log ID */
  exerciseLogId: number;
  /** Round number */
  roundNumber: number;
  /** Set number (always 1 for circuit exercises) */
  setNumber: number;
  /** Weight used */
  weight?: number;
  /** Reps completed */
  reps: number;
  /** Rest time after (not typically used in circuits) */
  restAfter?: number;
}

/**
 * Props for CircuitTracker component
 */
export interface CircuitTrackerProps {
  /** Current workout block */
  block: WorkoutBlockWithExercises;
  /** Current session data */
  sessionData: CircuitSessionData;
  /** Callback when session data changes */
  onSessionUpdate: (data: CircuitSessionData) => void;
  /** Callback when round is completed */
  onRoundComplete: (roundData: CircuitRound) => void;
  /** Callback when entire circuit is completed */
  onCircuitComplete: (sessionData: CircuitSessionData) => void;
  /** Whether the session is active */
  isActive: boolean;
}

/**
 * Props for CircuitTimer component
 */
export interface CircuitTimerProps {
  /** Block type for timer configuration */
  blockType: string;
  /** Time cap in minutes (if applicable) */
  timeCapMinutes?: number;
  /** Number of rounds (if applicable) */
  rounds?: number;
  /** Current timer state */
  timerState: CircuitTimerState;
  /** Callback when timer state changes */
  onTimerUpdate: (state: CircuitTimerState) => void;
  /** Callback for timer events (start, pause, complete) */
  onTimerEvent?: (
    event: "start" | "pause" | "resume" | "complete" | "reset" | "completeRound"
  ) => void;
  /** Whether timer is disabled */
  disabled?: boolean;
}

/**
 * Circuit session configuration
 */
export interface CircuitSessionConfig {
  /** Block configuration */
  block: WorkoutBlockWithExercises;
  /** Whether to auto-start timer */
  autoStartTimer?: boolean;
  /** Whether to allow partial round completion */
  allowPartialRounds?: boolean;
  /** Whether to show exercise instructions */
  showExerciseInstructions?: boolean;
  /** Custom rep targets (overrides exercise defaults) */
  customRepTargets?: Record<number, number>;
}

/**
 * Circuit session hooks return type
 */
export interface UseCircuitSessionReturn {
  /** Current session data */
  sessionData: CircuitSessionData;
  /** Current round data */
  currentRoundData: CircuitRound | null;
  /** Circuit metrics */
  metrics: CircuitMetrics;
  /** Actions */
  actions: {
    /** Start the circuit session */
    startSession: () => void;
    /** Update exercise reps in current round */
    updateExerciseReps: (exerciseId: number, reps: number) => void;
    /** Update exercise weight in current round */
    updateExerciseWeight: (exerciseId: number, weight: number) => void;
    /** Complete current round */
    completeRound: (notes?: string) => Promise<void>;
    /** Skip current round */
    skipRound: (reason?: string) => void;
    /** Complete entire circuit */
    completeCircuit: (notes?: string) => Promise<void>;
    /** Pause/resume timer */
    toggleTimer: () => void;
    /** Reset session */
    resetSession: () => void;
  };
  /** State flags */
  isLoading: boolean;
  canCompleteRound: boolean;
  canCompleteCircuit: boolean;
  /** Update timer state (used by timer UI) */
  updateTimerState: (state: CircuitTimerState) => void;
}
