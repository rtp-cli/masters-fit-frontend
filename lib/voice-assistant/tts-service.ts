/**
 * Text-to-Speech Service
 * Wraps expo-speech for cross-platform TTS with queue management
 */

import * as Speech from "expo-speech";
import { TTSOptions, TTSQueueItem, TTSState, VoiceInfo } from "./types";

class TTSService {
  private queue: TTSQueueItem[] = [];
  private isProcessing = false;
  private currentItem: TTSQueueItem | null = null;
  private isPaused = false;
  private isSpeakingNow = false;
  private onStateChange?: (state: TTSState) => void;

  /**
   * Initialize the TTS service
   */
  async initialize(): Promise<void> {
    // Check if speech is available
    const voices = await this.getAvailableVoices();
    if (voices.length === 0) {
      console.warn("No TTS voices available on this device");
    }
  }

  /**
   * Cleanup the TTS service
   */
  cleanup(): void {
    this.stop();
    this.queue = [];
    this.currentItem = null;
    this.isProcessing = false;
    this.isPaused = false;
  }

  /**
   * Set callback for state changes
   */
  setOnStateChange(callback: (state: TTSState) => void): void {
    this.onStateChange = callback;
  }

  /**
   * Get available voices on the device
   */
  async getAvailableVoices(): Promise<VoiceInfo[]> {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      return voices.map((voice) => ({
        identifier: voice.identifier,
        name: voice.name,
        language: voice.language,
        quality: voice.quality === Speech.VoiceQuality.Enhanced ? "enhanced" : "default",
      }));
    } catch (error) {
      console.error("Error getting available voices:", error);
      return [];
    }
  }

  /**
   * Speak text immediately (bypasses queue)
   */
  async speakImmediate(text: string, options?: TTSOptions): Promise<void> {
    console.log("[TTS] speakImmediate called with:", text);
    
    return new Promise((resolve, reject) => {
      const speechOptions: Speech.SpeechOptions = {
        language: options?.language || "en-US",
        pitch: options?.pitch || 1.0,
        rate: options?.rate || 1.0,
        volume: options?.volume || 1.0,
        voice: options?.voice,
        onStart: () => {
          console.log("[TTS] Speech started");
          this.isSpeakingNow = true;
          this.notifyStateChange();
        },
        onDone: () => {
          console.log("[TTS] Speech done");
          this.isSpeakingNow = false;
          this.notifyStateChange();
          resolve();
        },
        onError: (error) => {
          console.error("[TTS] Speech error:", error);
          this.isSpeakingNow = false;
          this.notifyStateChange();
          reject(new Error(error.message || "Speech error"));
        },
      };

      try {
        Speech.speak(text, speechOptions);
        console.log("[TTS] Speech.speak() called successfully");
      } catch (err) {
        console.error("[TTS] Error calling Speech.speak():", err);
        reject(err);
      }
    });
  }

  /**
   * Add text to the speech queue
   */
  enqueue(item: Omit<TTSQueueItem, "id">): string {
    const id = `tts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const queueItem: TTSQueueItem = {
      ...item,
      id,
    };

    // Insert based on priority
    if (item.priority === "high") {
      // Insert at the beginning (after current item if speaking)
      const insertIndex = this.isProcessing ? 1 : 0;
      this.queue.splice(insertIndex, 0, queueItem);
    } else if (item.priority === "low") {
      // Add to the end
      this.queue.push(queueItem);
    } else {
      // Normal priority - add after high priority items
      const firstLowIndex = this.queue.findIndex((q) => q.priority === "low");
      if (firstLowIndex === -1) {
        this.queue.push(queueItem);
      } else {
        this.queue.splice(firstLowIndex, 0, queueItem);
      }
    }

    this.notifyStateChange();
    this.processQueue();

    return id;
  }

  /**
   * Speak text with queue management
   */
  speak(text: string, options?: TTSOptions, priority: "high" | "normal" | "low" = "normal"): string {
    return this.enqueue({
      text,
      options,
      priority,
    });
  }

  /**
   * Process the speech queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.isPaused || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.currentItem = this.queue.shift() || null;

    if (!this.currentItem) {
      this.isProcessing = false;
      return;
    }

    const item = this.currentItem;
    this.notifyStateChange();

    try {
      item.onStart?.();

      await new Promise<void>((resolve, reject) => {
        const speechOptions: Speech.SpeechOptions = {
          language: item.options?.language || "en-US",
          pitch: item.options?.pitch || 1.0,
          rate: item.options?.rate || 1.0,
          volume: item.options?.volume || 1.0,
          voice: item.options?.voice,
          onDone: () => {
            item.onDone?.();
            resolve();
          },
          onError: (error) => {
            item.onError?.(new Error(error.message || "Speech error"));
            reject(new Error(error.message || "Speech error"));
          },
          onStopped: () => {
            resolve();
          },
        };

        Speech.speak(item.text, speechOptions);
      });
    } catch (error) {
      console.error("Error speaking:", error);
    } finally {
      this.currentItem = null;
      this.isProcessing = false;
      this.notifyStateChange();

      // Process next item in queue
      if (this.queue.length > 0 && !this.isPaused) {
        this.processQueue();
      }
    }
  }

  /**
   * Stop all speech and clear the queue
   */
  stop(): void {
    Speech.stop();
    this.queue = [];
    this.currentItem = null;
    this.isProcessing = false;
    this.isPaused = false;
    this.notifyStateChange();
  }

  /**
   * Pause speech
   */
  pause(): void {
    if (Speech.pause) {
      Speech.pause();
    }
    this.isPaused = true;
    this.notifyStateChange();
  }

  /**
   * Resume speech
   */
  resume(): void {
    if (Speech.resume) {
      Speech.resume();
    }
    this.isPaused = false;
    this.notifyStateChange();
    this.processQueue();
  }

  /**
   * Check if currently speaking
   */
  async isSpeaking(): Promise<boolean> {
    return Speech.isSpeakingAsync();
  }

  /**
   * Get current state
   */
  getState(): TTSState {
    return {
      isSpeaking: this.isProcessing,
      isPaused: this.isPaused,
      queueLength: this.queue.length,
      currentItem: this.currentItem,
    };
  }

  /**
   * Clear the queue but keep current speech
   */
  clearQueue(): void {
    this.queue = [];
    this.notifyStateChange();
  }

  /**
   * Remove item from queue by ID
   */
  removeFromQueue(id: string): boolean {
    const index = this.queue.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.notifyStateChange();
      return true;
    }
    return false;
  }

  /**
   * Notify state change callback
   */
  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  }
}

// Export singleton instance
export const ttsService = new TTSService();

// Also export class for testing
export { TTSService };

