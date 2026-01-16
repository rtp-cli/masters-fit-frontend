/**
 * useWorkoutVoiceAssistant Hook
 * Provides workout-specific voice assistant functionality
 */

import { useCallback, useEffect, useRef } from "react";
import { useVoiceAssistant } from "./use-voice-assistant";
import {
  CueType,
  VoiceCommand,
  WorkoutStartCueData,
  BlockStartCueData,
  ExerciseStartCueData,
  SetCompletionCueData,
  RestPeriodCueData,
  ExerciseCompleteCueData,
  WorkoutCompleteCueData,
  CircuitRoundCueData,
  NextWorkoutInfoCueData,
  voiceAssistantManager,
} from "@/lib/voice-assistant";
import {
  PlanDayWithBlocks,
  WorkoutBlockWithExercise,
  WorkoutBlockWithExercises,
} from "@/types/api/workout.types";

interface UseWorkoutVoiceAssistantOptions {
  enabled?: boolean;
  onNextCommand?: () => void;
  onPauseCommand?: () => void;
  onResumeCommand?: () => void;
  onSkipCommand?: () => void;
  onRepeatCommand?: () => void;
}

interface UseWorkoutVoiceAssistantReturn {
  // Voice assistant state
  isEnabled: boolean;
  isSpeaking: boolean;
  isListening: boolean;

  // Control methods
  toggle: () => void;
  enable: () => void;
  disable: () => void;

  // Cue methods
  announceWorkoutStart: (workout: PlanDayWithBlocks, totalExercises: number) => void;
  announceBlockStart: (block: WorkoutBlockWithExercises) => void;
  announceExerciseStart: (
    exercise: WorkoutBlockWithExercise,
    blockType?: string
  ) => void;
  announceSetCompletion: (
    setNumber: number,
    totalSets: number,
    restTime?: number
  ) => void;
  announceRestPeriod: (duration: number) => void;
  announceRestCountdown: (secondsRemaining: number) => void;
  announceExerciseComplete: (
    exerciseName: string,
    hasNextExercise: boolean,
    nextExerciseName?: string
  ) => void;
  announceWorkoutComplete: (
    workoutName: string,
    totalTimeMinutes: number,
    exercisesCompleted: number,
    caloriesBurned?: number
  ) => void;
  announceCircuitRound: (
    roundNumber: number,
    totalRounds?: number,
    blockName?: string
  ) => void;
  announceNextWorkout: (nextWorkout: NextWorkoutInfoCueData) => void;

  // Voice command methods
  startListening: () => Promise<void>;
  stopListening: () => void;

  // Stop speaking
  stop: () => void;
}

/**
 * Hook for workout-specific voice assistant functionality
 */
export function useWorkoutVoiceAssistant(
  options: UseWorkoutVoiceAssistantOptions = {}
): UseWorkoutVoiceAssistantReturn {
  const {
    enabled = true,
    onNextCommand,
    onPauseCommand,
    onResumeCommand,
    onSkipCommand,
    onRepeatCommand,
  } = options;

  // Track last announced exercise to avoid repeats
  const lastAnnouncedExerciseId = useRef<number | null>(null);
  const lastAnnouncedBlockId = useRef<number | null>(null);

  // Handle voice commands
  const handleCommand = useCallback(
    (command: VoiceCommand) => {
      switch (command) {
        case VoiceCommand.NEXT:
          onNextCommand?.();
          break;
        case VoiceCommand.PAUSE:
          onPauseCommand?.();
          break;
        case VoiceCommand.RESUME:
          onResumeCommand?.();
          break;
        case VoiceCommand.SKIP:
          onSkipCommand?.();
          break;
        case VoiceCommand.REPEAT:
          onRepeatCommand?.();
          break;
        case VoiceCommand.WHATS_NEXT:
          // This could trigger a "what's next" announcement
          // For now, same as repeat
          onRepeatCommand?.();
          break;
        default:
          break;
      }
    },
    [onNextCommand, onPauseCommand, onResumeCommand, onSkipCommand, onRepeatCommand]
  );

  const {
    isEnabled: voiceEnabled,
    isSpeaking,
    isListening,
    speakCue,
    stop,
    toggle,
    enable,
    disable,
    startListening,
    stopListening,
  } = useVoiceAssistant(handleCommand);

  // Combine enabled state - also check the manager directly for immediate calls
  const isEnabled = enabled && voiceEnabled;
  
  // Helper to check if voice assistant is truly enabled (checks manager directly)
  const checkIsEnabled = useCallback(() => {
    const managerEnabled = voiceAssistantManager.isEnabled();
    const result = enabled && managerEnabled;
    console.log("[WorkoutVoiceAssistant] checkIsEnabled:", result, "(enabled:", enabled, ", managerEnabled:", managerEnabled, ")");
    return result;
  }, [enabled]);

  // Announce workout start
  const announceWorkoutStart = useCallback(
    (workout: PlanDayWithBlocks, totalExercises: number) => {
      console.log("[WorkoutVoiceAssistant] announceWorkoutStart called");
      
      // Check manager directly instead of state (which may be stale)
      if (!checkIsEnabled()) {
        console.log("[WorkoutVoiceAssistant] Skipping - voice assistant not enabled");
        return;
      }

      const data: WorkoutStartCueData = {
        workoutName: workout.name || "today's workout",
        totalExercises,
        description: workout.description,
      };

      console.log("[WorkoutVoiceAssistant] Speaking workout start cue:", data);
      
      // Call manager directly to avoid any hook timing issues
      voiceAssistantManager.speakCue(CueType.WORKOUT_START, data);
    },
    [checkIsEnabled]
  );

  // Announce block start
  const announceBlockStart = useCallback(
    (block: WorkoutBlockWithExercises) => {
      if (!checkIsEnabled()) return;

      // Avoid repeating block announcements
      if (lastAnnouncedBlockId.current === block.id) {
        return;
      }
      lastAnnouncedBlockId.current = block.id;

      const data: BlockStartCueData = {
        blockType: block.blockType || "workout",
        blockName: block.blockName || block.blockType || "workout",
        exerciseCount: block.exercises?.length || 0,
        instructions: block.instructions,
      };

      voiceAssistantManager.speakCue(CueType.BLOCK_START, data);
    },
    [checkIsEnabled]
  );

  // Announce exercise start
  const announceExerciseStart = useCallback(
    (exercise: WorkoutBlockWithExercise, blockType?: string) => {
      if (!checkIsEnabled()) return;

      // Avoid repeating exercise announcements
      if (lastAnnouncedExerciseId.current === exercise.id) {
        return;
      }
      lastAnnouncedExerciseId.current = exercise.id;

      const data: ExerciseStartCueData = {
        exerciseName: exercise.exercise?.name || "exercise",
        sets: exercise.sets,
        reps: exercise.reps,
        weight: exercise.weight,
        duration: exercise.duration,
        restTime: exercise.restTime,
        notes: exercise.notes,
        blockType,
      };

      voiceAssistantManager.speakCue(CueType.EXERCISE_START, data);
    },
    [checkIsEnabled]
  );

  // Announce set completion
  const announceSetCompletion = useCallback(
    (setNumber: number, totalSets: number, restTime?: number) => {
      if (!checkIsEnabled()) return;

      const data: SetCompletionCueData = {
        setNumber,
        totalSets,
        remainingSets: totalSets - setNumber,
        restTime,
      };

      voiceAssistantManager.speakCue(CueType.SET_COMPLETION, data);
    },
    [checkIsEnabled]
  );

  // Announce rest period start
  const announceRestPeriod = useCallback(
    (duration: number) => {
      if (!checkIsEnabled()) return;

      const data: RestPeriodCueData = {
        duration,
        isCountdown: false,
      };

      voiceAssistantManager.speakCue(CueType.REST_PERIOD, data);
    },
    [checkIsEnabled]
  );

  // Announce rest countdown
  const announceRestCountdown = useCallback(
    (secondsRemaining: number) => {
      if (!checkIsEnabled()) return;

      // Only announce at specific intervals: 10, 5, 3, 2, 1, 0
      if (![10, 5, 3, 2, 1, 0].includes(secondsRemaining)) {
        return;
      }

      const data: RestPeriodCueData = {
        duration: 0,
        isCountdown: true,
        secondsRemaining,
      };

      voiceAssistantManager.speakCue(CueType.REST_COUNTDOWN, data);
    },
    [checkIsEnabled]
  );

  // Announce exercise complete
  const announceExerciseComplete = useCallback(
    (
      exerciseName: string,
      hasNextExercise: boolean,
      nextExerciseName?: string
    ) => {
      if (!checkIsEnabled()) return;

      const data: ExerciseCompleteCueData = {
        exerciseName,
        hasNextExercise,
        nextExerciseName,
      };

      voiceAssistantManager.speakCue(CueType.EXERCISE_COMPLETE, data);
    },
    [checkIsEnabled]
  );

  // Announce workout complete
  const announceWorkoutComplete = useCallback(
    (
      workoutName: string,
      totalTimeMinutes: number,
      exercisesCompleted: number,
      caloriesBurned?: number
    ) => {
      if (!checkIsEnabled()) return;

      const data: WorkoutCompleteCueData = {
        workoutName,
        totalTimeMinutes,
        exercisesCompleted,
        caloriesBurned,
      };

      voiceAssistantManager.speakCue(CueType.WORKOUT_COMPLETE, data);
    },
    [checkIsEnabled]
  );

  // Announce circuit round
  const announceCircuitRound = useCallback(
    (roundNumber: number, totalRounds?: number, blockName?: string) => {
      if (!checkIsEnabled()) return;

      const data: CircuitRoundCueData = {
        roundNumber,
        totalRounds,
        remainingRounds: totalRounds ? totalRounds - roundNumber : undefined,
        blockName,
      };

      voiceAssistantManager.speakCue(CueType.CIRCUIT_ROUND, data);
    },
    [checkIsEnabled]
  );

  // Announce next workout
  const announceNextWorkout = useCallback(
    (nextWorkout: NextWorkoutInfoCueData) => {
      if (!checkIsEnabled()) return;

      voiceAssistantManager.speakCue(CueType.NEXT_WORKOUT_INFO, nextWorkout);
    },
    [checkIsEnabled]
  );

  // Reset announced IDs when component unmounts
  useEffect(() => {
    return () => {
      lastAnnouncedExerciseId.current = null;
      lastAnnouncedBlockId.current = null;
    };
  }, []);

  return {
    // State
    isEnabled,
    isSpeaking,
    isListening,

    // Controls
    toggle,
    enable,
    disable,

    // Cue methods
    announceWorkoutStart,
    announceBlockStart,
    announceExerciseStart,
    announceSetCompletion,
    announceRestPeriod,
    announceRestCountdown,
    announceExerciseComplete,
    announceWorkoutComplete,
    announceCircuitRound,
    announceNextWorkout,

    // Voice commands
    startListening,
    stopListening,

    // Stop
    stop,
  };
}

export default useWorkoutVoiceAssistant;

