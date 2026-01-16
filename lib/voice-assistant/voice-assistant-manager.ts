/**
 * Voice Assistant Manager
 * Central coordinator for all voice assistant functionality
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ttsService } from "./tts-service";
import { voiceCommandRecognizer } from "./voice-commands";
import { generateCue, isCueEnabled } from "./cue-generator";
import {
  VoiceAssistantSettings,
  VoiceAssistantState,
  VoiceAssistantAPI,
  VoiceAssistantManagerConfig,
  VoiceCommand,
  VoiceCommandHandler,
  CueType,
  CueData,
  TTSOptions,
  VoiceInfo,
  DEFAULT_VOICE_ASSISTANT_SETTINGS,
} from "./types";

const STORAGE_KEY = "@voice_assistant_settings";

class VoiceAssistantManager implements VoiceAssistantAPI {
  private settings: VoiceAssistantSettings = DEFAULT_VOICE_ASSISTANT_SETTINGS;
  private isInitialized = false;
  private isSpeakingState = false;
  private isListeningState = false;
  private error: string | null = null;
  private availableVoices: VoiceInfo[] = [];
  
  // Callbacks
  private onCommandReceived?: VoiceCommandHandler;
  private onSpeakingChange?: (isSpeaking: boolean) => void;
  private onListeningChange?: (isListening: boolean) => void;
  private onSettingsChange?: (settings: VoiceAssistantSettings) => void;
  private onError?: (error: Error) => void;

  /**
   * Configure the voice assistant manager
   */
  configure(config: Partial<VoiceAssistantManagerConfig>): void {
    if (config.settings) {
      this.settings = { ...this.settings, ...config.settings };
    }
    if (config.onCommandReceived) {
      this.onCommandReceived = config.onCommandReceived;
    }
    if (config.onSpeakingChange) {
      this.onSpeakingChange = config.onSpeakingChange;
    }
    if (config.onListeningChange) {
      this.onListeningChange = config.onListeningChange;
    }
    if (config.onError) {
      this.onError = config.onError;
    }
  }

  /**
   * Set callback for settings changes
   */
  setOnSettingsChange(callback: (settings: VoiceAssistantSettings) => void): void {
    this.onSettingsChange = callback;
  }

  /**
   * Initialize the voice assistant
   */
  async initialize(): Promise<void> {
    console.log("[VoiceAssistant] initialize() called, already initialized:", this.isInitialized);
    
    if (this.isInitialized) {
      console.log("[VoiceAssistant] Already initialized, skipping");
      return;
    }

    try {
      // Load saved settings
      console.log("[VoiceAssistant] Loading settings...");
      await this.loadSettings();
      console.log("[VoiceAssistant] Settings loaded, enabled:", this.settings.enabled);

      // Initialize TTS service
      console.log("[VoiceAssistant] Initializing TTS service...");
      await ttsService.initialize();
      console.log("[VoiceAssistant] TTS service initialized");
      
      // Get available voices
      this.availableVoices = await ttsService.getAvailableVoices();
      console.log("[VoiceAssistant] Available voices:", this.availableVoices.length);

      // Set up TTS state change callback
      ttsService.setOnStateChange((state) => {
        const wasSpeaking = this.isSpeakingState;
        this.isSpeakingState = state.isSpeaking;
        if (wasSpeaking !== state.isSpeaking) {
          this.onSpeakingChange?.(state.isSpeaking);
        }
      });

      // Initialize voice command recognizer (but don't start listening)
      try {
        await voiceCommandRecognizer.initialize();
        
        // Set up command handler
        voiceCommandRecognizer.setOnCommandReceived((command) => {
          this.handleCommand(command);
        });

        // Set up listening state change callback
        voiceCommandRecognizer.setOnListeningChange((isListening) => {
          this.isListeningState = isListening;
          this.onListeningChange?.(isListening);
        });

        // Set up error handler
        voiceCommandRecognizer.setOnError((error) => {
          this.error = error.message;
          this.onError?.(error);
        });
      } catch (voiceError) {
        // Voice recognition might not be available on all devices
        console.warn("Voice commands not available:", voiceError);
      }

      this.isInitialized = true;
      this.error = null;
    } catch (error) {
      console.error("Error initializing voice assistant:", error);
      this.error = error instanceof Error ? error.message : "Initialization failed";
      throw error;
    }
  }

  /**
   * Cleanup the voice assistant
   */
  async cleanup(): Promise<void> {
    try {
      ttsService.cleanup();
      await voiceCommandRecognizer.cleanup();
      this.isInitialized = false;
      this.isSpeakingState = false;
      this.isListeningState = false;
    } catch (error) {
      console.error("Error cleaning up voice assistant:", error);
    }
  }

  /**
   * Load settings from storage
   */
  private async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.settings = {
          ...DEFAULT_VOICE_ASSISTANT_SETTINGS,
          ...parsed,
          cuePreferences: {
            ...DEFAULT_VOICE_ASSISTANT_SETTINGS.cuePreferences,
            ...parsed.cuePreferences,
          },
        };
      }
    } catch (error) {
      console.error("Error loading voice assistant settings:", error);
    }
  }

  /**
   * Save settings to storage
   */
  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error("Error saving voice assistant settings:", error);
    }
  }

  /**
   * Handle received voice command
   */
  private handleCommand(command: VoiceCommand): void {
    if (!this.settings.enabled) {
      return;
    }

    // Handle stop command internally
    if (command === VoiceCommand.STOP) {
      this.stopListening();
      this.stop();
      return;
    }

    // Forward other commands to the registered handler
    this.onCommandReceived?.(command);
  }

  // ============================================
  // TTS Controls
  // ============================================

  /**
   * Speak text directly
   */
  async speak(text: string, options?: TTSOptions): Promise<void> {
    console.log("[VoiceAssistant] speak() called, enabled:", this.settings.enabled, "text:", text);
    
    if (!this.settings.enabled || !text) {
      console.log("[VoiceAssistant] speak() skipped - not enabled or no text");
      return;
    }

    const mergedOptions: TTSOptions = {
      language: this.settings.language,
      pitch: this.settings.pitch,
      rate: this.settings.speechRate,
      volume: this.settings.volume,
      voice: this.settings.voice,
      ...options,
    };

    try {
      console.log("[VoiceAssistant] Calling ttsService.speakImmediate()");
      await ttsService.speakImmediate(text, mergedOptions);
    } catch (error) {
      console.error("[VoiceAssistant] Error speaking:", error);
      this.onError?.(error instanceof Error ? error : new Error("Speech error"));
    }
  }

  /**
   * Speak a cue based on type and data
   */
  async speakCue(type: CueType, data: CueData): Promise<void> {
    console.log("[VoiceAssistant] speakCue() called, type:", type, "enabled:", this.settings.enabled);
    
    if (!this.settings.enabled) {
      console.log("[VoiceAssistant] speakCue() skipped - not enabled");
      return;
    }

    // Check if this cue type is enabled
    if (!isCueEnabled(type, this.settings.cuePreferences)) {
      console.log("[VoiceAssistant] speakCue() skipped - cue type disabled:", type);
      return;
    }

    // Generate the cue text
    const cueText = generateCue(type, data);
    console.log("[VoiceAssistant] Generated cue text:", cueText);
    if (!cueText) {
      console.log("[VoiceAssistant] speakCue() skipped - no cue text generated");
      return;
    }

    // Speak with settings
    const options: TTSOptions = {
      language: this.settings.language,
      pitch: this.settings.pitch,
      rate: this.settings.speechRate,
      volume: this.settings.volume,
      voice: this.settings.voice,
    };

    try {
      console.log("[VoiceAssistant] Calling speakImmediate for cue");
      await ttsService.speakImmediate(cueText, options);
      console.log("[VoiceAssistant] Cue spoken successfully");
    } catch (error) {
      console.error("[VoiceAssistant] Error speaking cue:", error);
    }
  }

  /**
   * Get priority for a cue type
   */
  private getCuePriority(type: CueType): "high" | "normal" | "low" {
    switch (type) {
      case CueType.REST_COUNTDOWN:
        return "high";
      case CueType.EXERCISE_START:
      case CueType.SET_COMPLETION:
        return "normal";
      case CueType.NEXT_WORKOUT_INFO:
        return "low";
      default:
        return "normal";
    }
  }

  /**
   * Stop all speech
   */
  stop(): void {
    ttsService.stop();
  }

  /**
   * Pause speech
   */
  pause(): void {
    ttsService.pause();
  }

  /**
   * Resume speech
   */
  resume(): void {
    ttsService.resume();
  }

  // ============================================
  // Voice Commands
  // ============================================

  /**
   * Start listening for voice commands
   */
  async startListening(): Promise<void> {
    if (!this.settings.enabled) {
      return;
    }

    try {
      await voiceCommandRecognizer.startListening();
    } catch (error) {
      console.error("Error starting voice recognition:", error);
      this.onError?.(error instanceof Error ? error : new Error("Voice recognition error"));
      throw error;
    }
  }

  /**
   * Stop listening for voice commands
   */
  stopListening(): void {
    voiceCommandRecognizer.stopListening();
  }

  // ============================================
  // Settings
  // ============================================

  /**
   * Update settings
   */
  updateSettings(newSettings: Partial<VoiceAssistantSettings>): void {
    this.settings = {
      ...this.settings,
      ...newSettings,
      cuePreferences: {
        ...this.settings.cuePreferences,
        ...newSettings.cuePreferences,
      },
    };
    this.saveSettings();
    this.onSettingsChange?.(this.settings);
  }

  /**
   * Get current settings
   */
  getSettings(): VoiceAssistantSettings {
    return { ...this.settings };
  }

  /**
   * Reset settings to defaults
   */
  resetSettings(): void {
    this.settings = { ...DEFAULT_VOICE_ASSISTANT_SETTINGS };
    this.saveSettings();
    this.onSettingsChange?.(this.settings);
  }

  // ============================================
  // State
  // ============================================

  /**
   * Get current state
   */
  getState(): VoiceAssistantState {
    return {
      settings: { ...this.settings },
      isInitialized: this.isInitialized,
      isSpeaking: this.isSpeakingState,
      isListening: this.isListeningState,
      error: this.error,
      availableVoices: this.availableVoices,
    };
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.settings.enabled;
  }

  /**
   * Check if speaking
   */
  isSpeaking(): boolean {
    return this.isSpeakingState;
  }

  /**
   * Check if listening
   */
  isListening(): boolean {
    return this.isListeningState;
  }

  /**
   * Check if initialized
   */
  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get available voices
   */
  getAvailableVoices(): VoiceInfo[] {
    return this.availableVoices;
  }
}

// Export singleton instance
export const voiceAssistantManager = new VoiceAssistantManager();

// Also export class for testing
export { VoiceAssistantManager };

