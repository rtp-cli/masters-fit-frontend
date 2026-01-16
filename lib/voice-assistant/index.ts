/**
 * Voice Assistant Module
 * Exports all voice assistant functionality
 */

// Types
export * from "./types";

// Services
export { ttsService, TTSService } from "./tts-service";
export { voiceCommandRecognizer, VoiceCommandRecognizer, COMMAND_PATTERNS } from "./voice-commands";

// Cue Generator
export {
  generateCue,
  isCueEnabled,
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
} from "./cue-generator";

// Manager
export { voiceAssistantManager, VoiceAssistantManager } from "./voice-assistant-manager";

