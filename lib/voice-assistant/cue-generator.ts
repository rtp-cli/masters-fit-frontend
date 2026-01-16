/**
 * Cue Generator
 * Generates natural language cues from workout data
 */

import {
  CueType,
  CueData,
  WorkoutStartCueData,
  BlockStartCueData,
  ExerciseStartCueData,
  SetCompletionCueData,
  RestPeriodCueData,
  ExerciseCompleteCueData,
  WorkoutCompleteCueData,
  CircuitRoundCueData,
  NextWorkoutInfoCueData,
} from "./types";

/**
 * Format duration in minutes/seconds to speech-friendly text
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  }
  const minutePart = minutes === 1 ? "1 minute" : `${minutes} minutes`;
  const secondPart = remainingSeconds === 1 ? "1 second" : `${remainingSeconds} seconds`;
  return `${minutePart} and ${secondPart}`;
}

/**
 * Format weight with unit
 */
function formatWeight(weight: number): string {
  if (weight === 0) {
    return "bodyweight";
  }
  return `${weight} pounds`;
}

/**
 * Format plural for sets/reps
 */
function formatPlural(count: number, singular: string, plural: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural}`;
}

/**
 * Generate workout start cue
 */
function generateWorkoutStartCue(data: WorkoutStartCueData): string {
  let cue = `Starting your workout: ${data.workoutName}. `;
  cue += `${formatPlural(data.totalExercises, "exercise", "exercises")} today.`;
  
  if (data.estimatedDuration) {
    cue += ` Estimated time: about ${formatDuration(data.estimatedDuration * 60)}.`;
  }
  
  return cue;
}

/**
 * Generate block start cue
 */
function generateBlockStartCue(data: BlockStartCueData): string {
  const blockTypeFormatted = formatBlockType(data.blockType);
  let cue = `Starting ${blockTypeFormatted}`;
  
  if (data.blockName && data.blockName !== data.blockType) {
    cue += `: ${data.blockName}`;
  }
  cue += ".";
  
  if (data.exerciseCount > 0) {
    cue += ` ${formatPlural(data.exerciseCount, "exercise", "exercises")} in this block.`;
  }
  
  if (data.instructions) {
    cue += ` ${data.instructions}`;
  }
  
  return cue;
}

/**
 * Format block type for speech
 */
function formatBlockType(blockType: string): string {
  const typeMap: Record<string, string> = {
    traditional: "strength training",
    warmup: "warm-up",
    cooldown: "cool-down",
    amrap: "AMRAP",
    emom: "EMOM",
    for_time: "For Time",
    circuit: "circuit training",
    tabata: "Tabata",
    superset: "superset",
    flow: "flow",
  };
  
  return typeMap[blockType?.toLowerCase()] || blockType || "workout";
}

/**
 * Generate exercise start cue
 */
function generateExerciseStartCue(data: ExerciseStartCueData): string {
  let cue = `Next exercise: ${data.exerciseName}. `;
  
  // Handle different exercise types
  if (data.duration && data.duration > 0 && (!data.reps || data.reps === 0)) {
    // Duration-based exercise
    cue += `${formatDuration(data.duration)}.`;
  } else if (data.sets && data.reps) {
    // Sets and reps based exercise
    cue += `${formatPlural(data.sets, "set", "sets")} of ${formatPlural(data.reps, "rep", "reps")}.`;
    
    if (data.weight && data.weight > 0) {
      cue += ` ${formatWeight(data.weight)}.`;
    }
  } else if (data.reps && !data.sets) {
    // Reps only (circuit style)
    cue += `${formatPlural(data.reps, "rep", "reps")}.`;
    
    if (data.weight && data.weight > 0) {
      cue += ` ${formatWeight(data.weight)}.`;
    }
  }
  
  if (data.restTime && data.restTime > 0) {
    cue += ` Rest ${formatDuration(data.restTime)} between sets.`;
  }
  
  if (data.notes) {
    cue += ` Note: ${data.notes}`;
  }
  
  return cue;
}

/**
 * Generate set completion cue
 */
function generateSetCompletionCue(data: SetCompletionCueData): string {
  let cue = `Set ${data.setNumber} complete.`;
  
  if (data.remainingSets > 0) {
    cue += ` ${formatPlural(data.remainingSets, "set", "sets")} remaining.`;
    
    if (data.restTime && data.restTime > 0) {
      cue += ` Rest for ${formatDuration(data.restTime)}.`;
    }
  } else {
    cue += " All sets completed!";
  }
  
  return cue;
}

/**
 * Generate rest period cue
 */
function generateRestPeriodCue(data: RestPeriodCueData): string {
  if (data.isCountdown && data.secondsRemaining !== undefined) {
    // Countdown cue
    if (data.secondsRemaining === 0) {
      return "Rest complete. Ready!";
    }
    if (data.secondsRemaining <= 3) {
      return `${data.secondsRemaining}`;
    }
    if (data.secondsRemaining === 5) {
      return "5 seconds";
    }
    if (data.secondsRemaining === 10) {
      return "10 seconds remaining";
    }
    return "";
  }
  
  // Regular rest period start
  return `Rest for ${formatDuration(data.duration)}.`;
}

/**
 * Generate exercise complete cue
 */
function generateExerciseCompleteCue(data: ExerciseCompleteCueData): string {
  let cue = `${data.exerciseName} complete.`;
  
  if (data.hasNextExercise && data.nextExerciseName) {
    cue += ` Moving to ${data.nextExerciseName}.`;
  } else if (!data.hasNextExercise) {
    cue += " Great work!";
  }
  
  return cue;
}

/**
 * Generate workout complete cue
 */
function generateWorkoutCompleteCue(data: WorkoutCompleteCueData): string {
  let cue = `Congratulations! ${data.workoutName} complete!`;
  
  if (data.totalTimeMinutes > 0) {
    const minutes = Math.round(data.totalTimeMinutes);
    cue += ` Total time: ${formatPlural(minutes, "minute", "minutes")}.`;
  }
  
  if (data.exercisesCompleted > 0) {
    cue += ` You completed ${formatPlural(data.exercisesCompleted, "exercise", "exercises")}.`;
  }
  
  if (data.caloriesBurned && data.caloriesBurned > 0) {
    cue += ` Estimated ${Math.round(data.caloriesBurned)} calories burned.`;
  }
  
  cue += " Great job!";
  
  return cue;
}

/**
 * Generate circuit round cue
 */
function generateCircuitRoundCue(data: CircuitRoundCueData): string {
  let cue = `Round ${data.roundNumber} complete.`;
  
  if (data.totalRounds && data.remainingRounds !== undefined) {
    if (data.remainingRounds > 0) {
      cue += ` ${formatPlural(data.remainingRounds, "round", "rounds")} remaining.`;
    } else {
      cue += " Circuit complete!";
    }
  }
  
  return cue;
}

/**
 * Generate next workout info cue
 */
function generateNextWorkoutInfoCue(data: NextWorkoutInfoCueData): string {
  let cue = `Your next workout is ${data.workoutName}`;
  
  if (data.date) {
    cue += ` on ${formatDate(data.date)}`;
  }
  cue += ".";
  
  if (data.exerciseCount > 0) {
    cue += ` ${formatPlural(data.exerciseCount, "exercise", "exercises")} planned.`;
  }
  
  if (data.estimatedDuration) {
    cue += ` About ${formatPlural(data.estimatedDuration, "minute", "minutes")}.`;
  }
  
  if (data.description) {
    cue += ` ${data.description}`;
  }
  
  return cue;
}

/**
 * Format date for speech
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if it's today or tomorrow
    if (date.toDateString() === today.toDateString()) {
      return "today";
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return "tomorrow";
    }
    
    // Otherwise format the date
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  } catch {
    return dateString;
  }
}

/**
 * Main cue generator function
 */
export function generateCue(type: CueType, data: CueData): string {
  switch (type) {
    case CueType.WORKOUT_START:
      return generateWorkoutStartCue(data as WorkoutStartCueData);
    
    case CueType.BLOCK_START:
      return generateBlockStartCue(data as BlockStartCueData);
    
    case CueType.EXERCISE_START:
      return generateExerciseStartCue(data as ExerciseStartCueData);
    
    case CueType.SET_COMPLETION:
      return generateSetCompletionCue(data as SetCompletionCueData);
    
    case CueType.REST_PERIOD:
    case CueType.REST_COUNTDOWN:
      return generateRestPeriodCue(data as RestPeriodCueData);
    
    case CueType.EXERCISE_COMPLETE:
      return generateExerciseCompleteCue(data as ExerciseCompleteCueData);
    
    case CueType.WORKOUT_COMPLETE:
      return generateWorkoutCompleteCue(data as WorkoutCompleteCueData);
    
    case CueType.CIRCUIT_ROUND:
      return generateCircuitRoundCue(data as CircuitRoundCueData);
    
    case CueType.NEXT_WORKOUT_INFO:
      return generateNextWorkoutInfoCue(data as NextWorkoutInfoCueData);
    
    default:
      console.warn(`Unknown cue type: ${type}`);
      return "";
  }
}

/**
 * Check if a cue type is enabled in preferences
 */
export function isCueEnabled(
  type: CueType,
  preferences: {
    workoutStart?: boolean;
    blockStart?: boolean;
    exerciseStart?: boolean;
    setCompletion?: boolean;
    restPeriod?: boolean;
    restCountdown?: boolean;
    exerciseComplete?: boolean;
    workoutComplete?: boolean;
    circuitRound?: boolean;
    nextWorkoutInfo?: boolean;
  }
): boolean {
  const typeToPreference: Record<CueType, keyof typeof preferences> = {
    [CueType.WORKOUT_START]: "workoutStart",
    [CueType.BLOCK_START]: "blockStart",
    [CueType.EXERCISE_START]: "exerciseStart",
    [CueType.SET_COMPLETION]: "setCompletion",
    [CueType.REST_PERIOD]: "restPeriod",
    [CueType.REST_COUNTDOWN]: "restCountdown",
    [CueType.EXERCISE_COMPLETE]: "exerciseComplete",
    [CueType.WORKOUT_COMPLETE]: "workoutComplete",
    [CueType.CIRCUIT_ROUND]: "circuitRound",
    [CueType.NEXT_WORKOUT_INFO]: "nextWorkoutInfo",
  };
  
  const preferenceKey = typeToPreference[type];
  return preferences[preferenceKey] !== false;
}

// Export individual generators for testing
export {
  generateWorkoutStartCue,
  generateBlockStartCue,
  generateExerciseStartCue,
  generateSetCompletionCue,
  generateRestPeriodCue,
  generateExerciseCompleteCue,
  generateWorkoutCompleteCue,
  generateCircuitRoundCue,
  generateNextWorkoutInfoCue,
  formatDuration,
  formatWeight,
  formatBlockType,
  formatDate,
};

