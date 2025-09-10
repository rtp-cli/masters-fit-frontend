import { WorkoutBlockWithExercises } from "@/types/api/workout.types";

/**
 * Circuit workout types that require round-based logging
 */
export const CIRCUIT_BLOCK_TYPES = [
  'amrap',
  'emom', 
  'for_time',
  'circuit',
  'tabata'
] as const;

/**
 * Traditional workout types that use set-based logging
 */
export const TRADITIONAL_BLOCK_TYPES = [
  'traditional',
  'superset',
  'warmup',
  'cooldown', 
  'flow'
] as const;

export type CircuitBlockType = typeof CIRCUIT_BLOCK_TYPES[number];
export type TraditionalBlockType = typeof TRADITIONAL_BLOCK_TYPES[number];

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
 * Gets the logging interface type for a workout block
 * @param block The workout block
 * @returns 'circuit' or 'traditional' based on block type
 */
export function getLoggingInterface(block?: WorkoutBlockWithExercises): 'circuit' | 'traditional' {
  if (!block) return 'traditional';
  return isCircuitBlock(block.blockType) ? 'circuit' : 'traditional';
}

/**
 * Gets timer configuration for different circuit types
 * @param blockType The circuit block type
 * @returns Timer configuration object
 */
export function getCircuitTimerConfig(blockType: string) {
  const configs = {
    amrap: {
      type: 'countUp' as const,
      hasTimeLimit: true,
      showRounds: true,
      autoAdvanceRounds: false,
      workInterval: 0,
      restInterval: 0,
    },
    emom: {
      type: 'countDown' as const,
      hasTimeLimit: false,
      showRounds: true,
      autoAdvanceRounds: true,
      workInterval: 60, // 60 seconds per minute
      restInterval: 0,
    },
    for_time: {
      type: 'countDown' as const,
      hasTimeLimit: true,
      showRounds: true,
      autoAdvanceRounds: false,
      workInterval: 0,
      restInterval: 0,
    },
    circuit: {
      type: 'countUp' as const,
      hasTimeLimit: false,
      showRounds: true,
      autoAdvanceRounds: false,
      workInterval: 0,
      restInterval: 0,
    },
    tabata: {
      type: 'intervals' as const,
      hasTimeLimit: false,
      showRounds: true,
      autoAdvanceRounds: true,
      workInterval: 20, // 20 seconds work
      restInterval: 10, // 10 seconds rest
    },
  };

  return configs[blockType as keyof typeof configs] || configs.circuit;
}

/**
 * Calculates circuit score based on type and performance
 * @param blockType The circuit block type
 * @param data Performance data
 * @returns Formatted score string
 */
export function calculateCircuitScore(
  blockType: string,
  data: {
    roundsCompleted: number;
    totalReps: number;
    timeMinutes: number;
    targetRounds?: number;
  }
): string {
  const { roundsCompleted, totalReps, timeMinutes, targetRounds } = data;

  switch (blockType) {
    case 'amrap':
      // Score: rounds + reps (e.g., "5+12" means 5 complete rounds plus 12 additional reps)
      const extraReps = totalReps % (roundsCompleted > 0 ? Math.floor(totalReps / roundsCompleted) : totalReps);
      return `${roundsCompleted}${extraReps > 0 ? `+${extraReps}` : ''}`;
    
    case 'for_time':
      // Score: time to completion
      const minutes = Math.floor(timeMinutes);
      const seconds = Math.round((timeMinutes - minutes) * 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    case 'emom':
      // Score: rounds completed / total rounds
      const totalMinutes = targetRounds || roundsCompleted;
      return `${roundsCompleted}/${totalMinutes}`;
    
    case 'tabata':
      // Score: total reps across all intervals
      return `${totalReps} reps`;
    
    case 'circuit':
    default:
      // Score: rounds completed
      return `${roundsCompleted} rounds`;
  }
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
      return 'Complete Round';
    case 'emom':
      return null; // EMOM rounds auto-complete, no manual button needed
    case 'for_time':
      return totalRounds && currentRound >= totalRounds ? 'Finish Workout' : 'Complete Round';
    case 'tabata':
      return currentRound >= 8 ? 'Complete Tabata' : 'Complete Interval';
    case 'circuit':
    default:
      // Always allow users to complete rounds, even beyond prescribed rounds
      if (totalRounds && currentRound > totalRounds) {
        return 'Complete Additional Round';
      }
      return 'Complete Round';
  }
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