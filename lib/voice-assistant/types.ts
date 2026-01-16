/**
 * Voice Assistant Types
 * TypeScript types for the voice assistant system
 */

import { WorkoutBlockWithExercise, PlanDayWithBlocks, Workout } from "@/types/api/workout.types";
import { Exercise } from "@/types/api/exercise.types";

// ============================================
// Cue Types
// ============================================

export enum CueType {
  WORKOUT_START = "workout_start",
  BLOCK_START = "block_start",
  EXERCISE_START = "exercise_start",
  SET_COMPLETION = "set_completion",
  REST_PERIOD = "rest_period",
  REST_COUNTDOWN = "rest_countdown",
  EXERCISE_COMPLETE = "exercise_complete",
  WORKOUT_COMPLETE = "workout_complete",
  CIRCUIT_ROUND = "circuit_round",
  NEXT_WORKOUT_INFO = "next_workout_info",
}

export interface CuePreferences {
  workoutStart: boolean;
  blockStart: boolean;
  exerciseStart: boolean;
  setCompletion: boolean;
  restPeriod: boolean;
  restCountdown: boolean;
  exerciseComplete: boolean;
  workoutComplete: boolean;
  circuitRound: boolean;
  nextWorkoutInfo: boolean;
}

export const DEFAULT_CUE_PREFERENCES: CuePreferences = {
  workoutStart: true,
  blockStart: true,
  exerciseStart: true,
  setCompletion: true,
  restPeriod: true,
  restCountdown: false,
  exerciseComplete: true,
  workoutComplete: true,
  circuitRound: true,
  nextWorkoutInfo: true,
};

// ============================================
// Voice Commands
// ============================================

export enum VoiceCommand {
  NEXT = "next",
  REPEAT = "repeat",
  PAUSE = "pause",
  RESUME = "resume",
  SKIP = "skip",
  WHATS_NEXT = "whats_next",
  STOP = "stop",
  UNKNOWN = "unknown",
}

export interface VoiceCommandResult {
  command: VoiceCommand;
  confidence: number;
  rawText: string;
}

export type VoiceCommandHandler = (command: VoiceCommand) => void;

// ============================================
// TTS Service Types
// ============================================

export interface TTSOptions {
  language?: string;
  pitch?: number;
  rate?: number;
  volume?: number;
  voice?: string;
}

export interface TTSQueueItem {
  id: string;
  text: string;
  options?: TTSOptions;
  priority: "high" | "normal" | "low";
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

export interface TTSState {
  isSpeaking: boolean;
  isPaused: boolean;
  queueLength: number;
  currentItem: TTSQueueItem | null;
}

// ============================================
// Voice Assistant State
// ============================================

export interface VoiceAssistantSettings {
  enabled: boolean;
  volume: number; // 0-1
  speechRate: number; // 0.5-2.0
  pitch: number; // 0.5-2.0
  language: string;
  voice?: string;
  cuePreferences: CuePreferences;
}

export const DEFAULT_VOICE_ASSISTANT_SETTINGS: VoiceAssistantSettings = {
  enabled: true,
  volume: 0.8,
  speechRate: 1.0,
  pitch: 1.0,
  language: "en-US",
  cuePreferences: DEFAULT_CUE_PREFERENCES,
};

export interface VoiceAssistantState {
  settings: VoiceAssistantSettings;
  isInitialized: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  error: string | null;
  availableVoices: VoiceInfo[];
}

export interface VoiceInfo {
  identifier: string;
  name: string;
  language: string;
  quality?: "default" | "enhanced";
}

// ============================================
// Cue Data Types (for generating cues)
// ============================================

export interface WorkoutStartCueData {
  workoutName: string;
  totalExercises: number;
  estimatedDuration?: number;
  description?: string;
}

export interface BlockStartCueData {
  blockType: string;
  blockName: string;
  exerciseCount: number;
  instructions?: string;
}

export interface ExerciseStartCueData {
  exerciseName: string;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;
  restTime?: number;
  notes?: string;
  blockType?: string;
}

export interface SetCompletionCueData {
  setNumber: number;
  totalSets: number;
  remainingSets: number;
  restTime?: number;
}

export interface RestPeriodCueData {
  duration: number;
  isCountdown?: boolean;
  secondsRemaining?: number;
}

export interface ExerciseCompleteCueData {
  exerciseName: string;
  hasNextExercise: boolean;
  nextExerciseName?: string;
}

export interface WorkoutCompleteCueData {
  workoutName: string;
  totalTimeMinutes: number;
  exercisesCompleted: number;
  caloriesBurned?: number;
}

export interface CircuitRoundCueData {
  roundNumber: number;
  totalRounds?: number;
  remainingRounds?: number;
  blockName?: string;
}

export interface NextWorkoutInfoCueData {
  workoutName: string;
  date: string;
  exerciseCount: number;
  estimatedDuration?: number;
  description?: string;
}

export type CueData =
  | WorkoutStartCueData
  | BlockStartCueData
  | ExerciseStartCueData
  | SetCompletionCueData
  | RestPeriodCueData
  | ExerciseCompleteCueData
  | WorkoutCompleteCueData
  | CircuitRoundCueData
  | NextWorkoutInfoCueData;

// ============================================
// Voice Assistant Manager Types
// ============================================

export interface VoiceAssistantManagerConfig {
  settings: VoiceAssistantSettings;
  onCommandReceived?: VoiceCommandHandler;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onListeningChange?: (isListening: boolean) => void;
  onError?: (error: Error) => void;
}

export interface VoiceAssistantAPI {
  // Initialization
  initialize: () => Promise<void>;
  cleanup: () => Promise<void>;

  // TTS Controls
  speak: (text: string, options?: TTSOptions) => Promise<void>;
  speakCue: (type: CueType, data: CueData) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;

  // Voice Commands
  startListening: () => Promise<void>;
  stopListening: () => void;

  // Settings
  updateSettings: (settings: Partial<VoiceAssistantSettings>) => void;
  getSettings: () => VoiceAssistantSettings;

  // State
  getState: () => VoiceAssistantState;
  isEnabled: () => boolean;
  isSpeaking: () => boolean;
  isListening: () => boolean;
}

// ============================================
// Hook Types
// ============================================

export interface UseVoiceAssistantReturn {
  // State
  isEnabled: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  isInitialized: boolean;
  error: string | null;
  settings: VoiceAssistantSettings;

  // Actions
  speak: (text: string, options?: TTSOptions) => Promise<void>;
  speakCue: (type: CueType, data: CueData) => Promise<void>;
  stop: () => void;
  toggle: () => void;
  enable: () => void;
  disable: () => void;

  // Voice Commands
  startListening: () => Promise<void>;
  stopListening: () => void;

  // Settings
  updateSettings: (settings: Partial<VoiceAssistantSettings>) => void;
  updateCuePreferences: (preferences: Partial<CuePreferences>) => void;
}

// ============================================
// Context Types
// ============================================

export interface VoiceAssistantContextValue {
  state: VoiceAssistantState;
  settings: VoiceAssistantSettings;
  updateSettings: (settings: Partial<VoiceAssistantSettings>) => void;
  resetSettings: () => void;
}

