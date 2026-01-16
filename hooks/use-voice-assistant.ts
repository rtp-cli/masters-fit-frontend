/**
 * useVoiceAssistant Hook
 * React hook for components to interact with the voice assistant
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  voiceAssistantManager,
  VoiceAssistantSettings,
  CuePreferences,
  CueType,
  CueData,
  TTSOptions,
  VoiceCommand,
  UseVoiceAssistantReturn,
} from "@/lib/voice-assistant";

export function useVoiceAssistant(
  onCommand?: (command: VoiceCommand) => void
): UseVoiceAssistantReturn {
  // State
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<VoiceAssistantSettings>(
    voiceAssistantManager.getSettings()
  );

  // Track if component is mounted
  const isMounted = useRef(true);
  
  // Store onCommand in a ref to avoid re-running the effect when it changes
  const onCommandRef = useRef(onCommand);
  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  // Initialize on mount - only run ONCE
  useEffect(() => {
    isMounted.current = true;

    const initializeVoiceAssistant = async () => {
      try {
        // Configure manager with callbacks
        voiceAssistantManager.configure({
          onCommandReceived: (command) => {
            if (isMounted.current) {
              onCommandRef.current?.(command);
            }
          },
          onSpeakingChange: (speaking) => {
            if (isMounted.current) {
              setIsSpeaking(speaking);
            }
          },
          onListeningChange: (listening) => {
            if (isMounted.current) {
              setIsListening(listening);
            }
          },
          onError: (err) => {
            if (isMounted.current) {
              setError(err.message);
            }
          },
        });

        // Set up settings change callback
        voiceAssistantManager.setOnSettingsChange((newSettings) => {
          if (isMounted.current) {
            setSettings(newSettings);
            setIsEnabled(newSettings.enabled);
          }
        });

        // Initialize manager
        await voiceAssistantManager.initialize();

        if (isMounted.current) {
          const state = voiceAssistantManager.getState();
          setIsInitialized(true);
          setIsEnabled(state.settings.enabled);
          setSettings(state.settings);
          setError(state.error);
        }
      } catch (err) {
        if (isMounted.current) {
          setError(err instanceof Error ? err.message : "Initialization failed");
          setIsInitialized(false);
        }
      }
    };

    initializeVoiceAssistant();

    // Cleanup on unmount
    return () => {
      isMounted.current = false;
    };
  }, []); // Empty dependency array - only run on mount

  // Speak text
  const speak = useCallback(async (text: string, options?: TTSOptions) => {
    try {
      await voiceAssistantManager.speak(text, options);
    } catch (err) {
      console.error("Error speaking:", err);
    }
  }, []);

  // Speak a cue
  const speakCue = useCallback(async (type: CueType, data: CueData) => {
    try {
      await voiceAssistantManager.speakCue(type, data);
    } catch (err) {
      console.error("Error speaking cue:", err);
    }
  }, []);

  // Stop speaking
  const stop = useCallback(() => {
    voiceAssistantManager.stop();
  }, []);

  // Toggle enabled state
  const toggle = useCallback(() => {
    const newEnabled = !voiceAssistantManager.isEnabled();
    voiceAssistantManager.updateSettings({ enabled: newEnabled });
    setIsEnabled(newEnabled);
  }, []);

  // Enable voice assistant
  const enable = useCallback(() => {
    voiceAssistantManager.updateSettings({ enabled: true });
    setIsEnabled(true);
  }, []);

  // Disable voice assistant
  const disable = useCallback(() => {
    voiceAssistantManager.updateSettings({ enabled: false });
    setIsEnabled(false);
    voiceAssistantManager.stop();
    voiceAssistantManager.stopListening();
  }, []);

  // Start listening for voice commands
  const startListening = useCallback(async () => {
    try {
      await voiceAssistantManager.startListening();
    } catch (err) {
      console.error("Error starting voice recognition:", err);
    }
  }, []);

  // Stop listening for voice commands
  const stopListening = useCallback(() => {
    voiceAssistantManager.stopListening();
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<VoiceAssistantSettings>) => {
    voiceAssistantManager.updateSettings(newSettings);
  }, []);

  // Update cue preferences
  const updateCuePreferences = useCallback((preferences: Partial<CuePreferences>) => {
    const currentSettings = voiceAssistantManager.getSettings();
    voiceAssistantManager.updateSettings({
      cuePreferences: {
        ...currentSettings.cuePreferences,
        ...preferences,
      },
    });
  }, []);

  return {
    // State
    isEnabled,
    isSpeaking,
    isListening,
    isInitialized,
    error,
    settings,

    // Actions
    speak,
    speakCue,
    stop,
    toggle,
    enable,
    disable,

    // Voice Commands
    startListening,
    stopListening,

    // Settings
    updateSettings,
    updateCuePreferences,
  };
}

export default useVoiceAssistant;

