import {
  CIRCUIT_BLOCK_TYPES,
  type CircuitBlockType,
  TRADITIONAL_BLOCK_TYPES,
  type TraditionalBlockType,
} from "@/constants/block-types";
import { type CircuitRound } from "@/types/api/circuit.types";
import { type WorkoutBlockWithExercises } from "@/types/api/workout.types";

// Re-exported so existing import sites keep working; the source of truth
// lives in constants/block-types.ts.
export {
  CIRCUIT_BLOCK_TYPES,
  type CircuitBlockType,
  TRADITIONAL_BLOCK_TYPES,
  type TraditionalBlockType,
};

/**
 * Determines if a workout block requires circuit-based logging
 * @param blockType The type of workout block
 * @returns true if block should use circuit logging, false for traditional logging
 */
export function isCircuitBlock(blockType?: string): boolean {
  if (!blockType) return false;
  return CIRCUIT_BLOCK_TYPES.includes(blockType as CircuitBlockType);
}

/**
 * Determines if a workout block uses traditional set-based logging
 * @param blockType The type of workout block
 * @returns true if block should use traditional logging
 */
export function isTraditionalBlock(blockType?: string): boolean {
  if (!blockType) return true; // Default to traditional
  return TRADITIONAL_BLOCK_TYPES.includes(blockType as TraditionalBlockType);
}

/**
 * Determines if a workout block is a warmup or cooldown block
 * @param blockType The type of workout block
 * @returns true if block is warmup or cooldown
 */
export function isWarmupCooldownBlock(blockType?: string): boolean {
  if (!blockType) return false;
  return blockType === 'warmup' || blockType === 'cooldown';
}

/**
 * Gets the logging interface type for a workout block
 * @param block The workout block
 * @returns 'circuit', 'traditional', or 'warmup_cooldown' based on block type
 */
export function getLoggingInterface(block?: WorkoutBlockWithExercises): 'circuit' | 'traditional' | 'warmup_cooldown' {
  if (!block) return 'traditional';
  if (isWarmupCooldownBlock(block.blockType)) return 'warmup_cooldown';
  return isCircuitBlock(block.blockType) ? 'circuit' : 'traditional';
}

/**
 * Block-level result for a circuit session — the shape persisted to
 * block_logs (POST /logs/block) and shown as the score in history.
 */
export interface CircuitBlockResult {
  roundsCompleted: number;
  totalReps: number;
  score: string;
  /** Manually entered elapsed time (no timers by design — T5-3). */
  actualTimeSeconds?: number;
}

const formatMinutesSeconds = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

/**
 * Computes the block result from the actual round data.
 *
 * Scores by block type (structure and scoring are distinct concepts, but
 * these are the sensible defaults per type):
 * - amrap:    "R+P" — R complete rounds plus P reps of the partial round
 * - for_time: "m:ss" when a time was entered, else rounds completed
 * - emom:     "R/T" — rounds completed of T target intervals
 * - tabata:   total reps across intervals
 * - circuit:  rounds completed
 */
export function computeCircuitResult(
  blockType: string,
  rounds: CircuitRound[],
  options?: {
    targetRounds?: number;
    actualTimeSeconds?: number;
  }
): CircuitBlockResult {
  const { targetRounds, actualTimeSeconds } = options || {};

  const completedRounds = rounds.filter((r) => r.isCompleted);
  const roundsCompleted = completedRounds.length;
  const repsIn = (round: CircuitRound) =>
    round.exercises.reduce((sum, ex) => sum + (ex.actualReps || 0), 0);
  const totalReps = rounds.reduce((sum, round) => sum + repsIn(round), 0);
  // Reps performed in a trailing partial (uncompleted) round, e.g. the
  // "+12" in an AMRAP score of "5+12".
  const partialReps = rounds
    .filter((r) => !r.isCompleted)
    .reduce((sum, round) => sum + repsIn(round), 0);

  let score: string;
  switch (blockType) {
    case "amrap":
      score =
        partialReps > 0
          ? `${roundsCompleted}+${partialReps}`
          : `${roundsCompleted}`;
      break;
    case "for_time":
      score =
        actualTimeSeconds && actualTimeSeconds > 0
          ? formatMinutesSeconds(actualTimeSeconds)
          : `${roundsCompleted} rounds`;
      break;
    case "emom":
      score = `${roundsCompleted}/${targetRounds || roundsCompleted}`;
      break;
    case "tabata":
      score = `${totalReps} reps`;
      break;
    case "circuit":
    default:
      score = `${roundsCompleted} rounds`;
      break;
  }

  return { roundsCompleted, totalReps, score, actualTimeSeconds };
}

/**
 * Gets the appropriate button text for completing a circuit round
 * @param blockType The circuit block type
 * @param currentRound Current round number
 * @param totalRounds Total number of rounds
 * @returns Button text
 */
export function getRoundCompleteButtonText(
  blockType: string,
  currentRound: number,
  totalRounds?: number
): string | null {
  switch (blockType) {
    case 'amrap':
      return `Complete Round ${currentRound}`; // AMRAP allows unlimited rounds
    case 'emom':
      // Hide button if reached prescribed minutes
      if (totalRounds && currentRound >= totalRounds) {
        return null;
      }
      return null; // EMOM rounds auto-complete, no manual button needed
    case 'for_time':
      // Hide button after completing all prescribed rounds
      if (totalRounds && currentRound > totalRounds) {
        return null;
      }
      return `Complete Round ${currentRound}`;
    case 'tabata':
      // Hide button after 8 intervals
      if (currentRound >= 8) {
        return null;
      }
      return `Complete Interval ${currentRound}`;
    case 'circuit':
    default:
      // Hide button after completing all prescribed rounds
      if (totalRounds && currentRound > totalRounds) {
        return null;
      }
      return `Complete Round ${currentRound}`;
  }
}

/**
 * Label for the Undo button, which reverts the most recently completed round.
 * @param blockType The circuit block type (tabata undoes an "Interval")
 * @param roundNumber The round/interval number being undone
 * @returns Button label, e.g. "Undo Round 6"
 */
export function getRoundUndoButtonText(
  blockType: string,
  roundNumber: number
): string {
  const noun = blockType === 'tabata' ? 'Interval' : 'Round';
  return `Undo ${noun} ${roundNumber}`;
}

/**
 * Gets descriptive text for circuit instructions
 * @param blockType The circuit block type
 * @param timeCapMinutes Time cap in minutes (if any)
 * @param rounds Number of rounds (if specified)
 * @returns Instruction text
 */
export function getCircuitInstructionText(
  blockType: string,
  timeCapMinutes?: number,
  rounds?: number
): string {
  switch (blockType) {
    case 'amrap':
      return `Complete as many rounds as possible${timeCapMinutes ? ` in ${timeCapMinutes} minutes` : ''}. Log your reps for each exercise in each round.`;
    
    case 'emom':
      return `Every minute on the minute${rounds ? ` for ${rounds} minutes` : ''}, complete the prescribed reps. Log actual reps completed each minute.`;
    
    case 'for_time':
      return `Complete ${rounds ? `${rounds} rounds` : 'all rounds'} as fast as possible. Log your reps for each round.`;
    
    case 'tabata':
      return 'Complete 8 rounds of 20 seconds work, 10 seconds rest. Log reps completed in each work interval.';
    
    case 'circuit':
    default:
      return `Complete ${rounds ? `${rounds} rounds` : 'all rounds'} of the circuit. Log your performance for each exercise in each round.`;
  }
}