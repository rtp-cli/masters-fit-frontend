/**
 * Voice Command Recognizer
 * Handles speech recognition and command parsing
 */

import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechStartEvent,
  SpeechEndEvent,
} from "@react-native-voice/voice";
import { Platform, PermissionsAndroid, Permission } from "react-native";
import { VoiceCommand, VoiceCommandResult, VoiceCommandHandler } from "./types";

// Command patterns for recognition
const COMMAND_PATTERNS: Record<VoiceCommand, RegExp[]> = {
  [VoiceCommand.NEXT]: [
    /\b(next|continue|move on|go ahead|proceed)\b/i,
  ],
  [VoiceCommand.REPEAT]: [
    /\b(repeat|again|say that again|what was that|one more time)\b/i,
  ],
  [VoiceCommand.PAUSE]: [
    /\b(pause|stop|wait|hold|break)\b/i,
  ],
  [VoiceCommand.RESUME]: [
    /\b(resume|continue|go|start|unpause)\b/i,
  ],
  [VoiceCommand.SKIP]: [
    /\b(skip|pass|next exercise|skip this)\b/i,
  ],
  [VoiceCommand.WHATS_NEXT]: [
    /\b(what'?s next|what is next|next exercise|upcoming|what comes next)\b/i,
  ],
  [VoiceCommand.STOP]: [
    /\b(stop listening|stop voice|cancel|quit|end)\b/i,
  ],
  [VoiceCommand.UNKNOWN]: [],
};

class VoiceCommandRecognizer {
  private isInitialized = false;
  private isListening = false;
  private onCommandReceived?: VoiceCommandHandler;
  private onListeningChange?: (isListening: boolean) => void;
  private onError?: (error: Error) => void;
  private lastResult: VoiceCommandResult | null = null;

  /**
   * Initialize the voice recognizer
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Check if Voice is available
      const isAvailable = await Voice.isAvailable();
      if (!isAvailable) {
        throw new Error("Voice recognition is not available on this device");
      }

      // Set up event handlers
      Voice.onSpeechStart = this.handleSpeechStart.bind(this);
      Voice.onSpeechEnd = this.handleSpeechEnd.bind(this);
      Voice.onSpeechResults = this.handleSpeechResults.bind(this);
      Voice.onSpeechPartialResults = this.handleSpeechPartialResults.bind(this);
      Voice.onSpeechError = this.handleSpeechError.bind(this);

      this.isInitialized = true;
    } catch (error) {
      console.error("Error initializing voice recognizer:", error);
      throw error;
    }
  }

  /**
   * Cleanup the voice recognizer
   */
  async cleanup(): Promise<void> {
    try {
      await this.stopListening();
      await Voice.destroy();
      this.isInitialized = false;
      this.isListening = false;
    } catch (error) {
      console.error("Error cleaning up voice recognizer:", error);
    }
  }

  /**
   * Request microphone permission
   */
  async requestPermission(): Promise<boolean> {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO as Permission,
          {
            title: "Microphone Permission",
            message:
              "Masters Fit needs access to your microphone for voice commands during workouts.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK",
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error("Error requesting microphone permission:", err);
        return false;
      }
    }
    // iOS permission is handled by the system when Voice.start() is called
    return true;
  }

  /**
   * Check if permission is granted
   */
  async checkPermission(): Promise<boolean> {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO as Permission
      );
      return granted;
    }
    // iOS - assume granted, will fail on start if not
    return true;
  }

  /**
   * Start listening for voice commands
   */
  async startListening(): Promise<void> {
    if (this.isListening) {
      return;
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check/request permission
    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) {
        throw new Error("Microphone permission denied");
      }
    }

    try {
      await Voice.start("en-US");
      this.isListening = true;
      this.onListeningChange?.(true);
    } catch (error) {
      console.error("Error starting voice recognition:", error);
      this.isListening = false;
      this.onListeningChange?.(false);
      throw error;
    }
  }

  /**
   * Stop listening for voice commands
   */
  async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      await Voice.stop();
      await Voice.cancel();
      this.isListening = false;
      this.onListeningChange?.(false);
    } catch (error) {
      console.error("Error stopping voice recognition:", error);
    }
  }

  /**
   * Set callback for when a command is received
   */
  setOnCommandReceived(handler: VoiceCommandHandler): void {
    this.onCommandReceived = handler;
  }

  /**
   * Set callback for listening state changes
   */
  setOnListeningChange(handler: (isListening: boolean) => void): void {
    this.onListeningChange = handler;
  }

  /**
   * Set callback for errors
   */
  setOnError(handler: (error: Error) => void): void {
    this.onError = handler;
  }

  /**
   * Parse recognized text into a command
   */
  parseCommand(text: string): VoiceCommandResult {
    const normalizedText = text.toLowerCase().trim();

    for (const [command, patterns] of Object.entries(COMMAND_PATTERNS)) {
      if (command === VoiceCommand.UNKNOWN) continue;

      for (const pattern of patterns) {
        if (pattern.test(normalizedText)) {
          return {
            command: command as VoiceCommand,
            confidence: 0.8, // Base confidence
            rawText: text,
          };
        }
      }
    }

    return {
      command: VoiceCommand.UNKNOWN,
      confidence: 0,
      rawText: text,
    };
  }

  /**
   * Get whether currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Get the last recognized result
   */
  getLastResult(): VoiceCommandResult | null {
    return this.lastResult;
  }

  // Event handlers

  private handleSpeechStart(event: SpeechStartEvent): void {
    this.isListening = true;
    this.onListeningChange?.(true);
  }

  private handleSpeechEnd(event: SpeechEndEvent): void {
    this.isListening = false;
    this.onListeningChange?.(false);
  }

  private handleSpeechResults(event: SpeechResultsEvent): void {
    const results = event.value;
    if (!results || results.length === 0) {
      return;
    }

    // Get the best result (first one usually has highest confidence)
    const bestResult = results[0];
    if (!bestResult) {
      return;
    }

    const commandResult = this.parseCommand(bestResult);
    this.lastResult = commandResult;

    if (commandResult.command !== VoiceCommand.UNKNOWN) {
      this.onCommandReceived?.(commandResult.command);
    }
  }

  private handleSpeechPartialResults(event: SpeechResultsEvent): void {
    // Could be used for real-time feedback if needed
    // For now, we wait for final results
  }

  private handleSpeechError(event: SpeechErrorEvent): void {
    const error = new Error(event.error?.message || "Speech recognition error");
    console.error("Voice recognition error:", error);
    this.isListening = false;
    this.onListeningChange?.(false);
    this.onError?.(error);
  }
}

// Export singleton instance
export const voiceCommandRecognizer = new VoiceCommandRecognizer();

// Also export class for testing
export { VoiceCommandRecognizer, COMMAND_PATTERNS };

