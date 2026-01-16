/**
 * Voice Assistant Context
 * Provides global state for voice assistant preferences
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from "react";
import {
  voiceAssistantManager,
  VoiceAssistantSettings,
  VoiceAssistantState,
  VoiceAssistantContextValue,
  DEFAULT_VOICE_ASSISTANT_SETTINGS,
  CuePreferences,
  VoiceCommand,
} from "@/lib/voice-assistant";

// Create context with default value
const VoiceAssistantContext = createContext<VoiceAssistantContextValue | undefined>(undefined);

// Provider props
interface VoiceAssistantProviderProps {
  children: ReactNode;
  onCommand?: (command: VoiceCommand) => void;
}

/**
 * Voice Assistant Provider Component
 * Wraps the app to provide voice assistant state and controls
 */
export function VoiceAssistantProvider({ children, onCommand }: VoiceAssistantProviderProps) {
  const [state, setState] = useState<VoiceAssistantState>({
    settings: DEFAULT_VOICE_ASSISTANT_SETTINGS,
    isInitialized: false,
    isSpeaking: false,
    isListening: false,
    error: null,
    availableVoices: [],
  });

  const [settings, setSettings] = useState<VoiceAssistantSettings>(DEFAULT_VOICE_ASSISTANT_SETTINGS);

  // Store onCommand in a ref to avoid re-running the effect when it changes
  const onCommandRef = useRef(onCommand);
  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  // Initialize voice assistant on mount - only run ONCE
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        // Configure manager
        voiceAssistantManager.configure({
          onCommandReceived: (cmd) => onCommandRef.current?.(cmd),
          onSpeakingChange: (isSpeaking) => {
            if (mounted) {
              setState((prev) => ({ ...prev, isSpeaking }));
            }
          },
          onListeningChange: (isListening) => {
            if (mounted) {
              setState((prev) => ({ ...prev, isListening }));
            }
          },
          onError: (error) => {
            if (mounted) {
              setState((prev) => ({ ...prev, error: error.message }));
            }
          },
        });

        // Set up settings change callback
        voiceAssistantManager.setOnSettingsChange((newSettings) => {
          if (mounted) {
            setSettings(newSettings);
            setState((prev) => ({ ...prev, settings: newSettings }));
          }
        });

        // Initialize
        await voiceAssistantManager.initialize();

        if (mounted) {
          const managerState = voiceAssistantManager.getState();
          setState(managerState);
          setSettings(managerState.settings);
        }
      } catch (error) {
        console.error("Error initializing voice assistant:", error);
        if (mounted) {
          setState((prev) => ({
            ...prev,
            error: error instanceof Error ? error.message : "Initialization failed",
            isInitialized: false,
          }));
        }
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      mounted = false;
      voiceAssistantManager.cleanup();
    };
  }, []); // Empty dependency array - only run on mount

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<VoiceAssistantSettings>) => {
    voiceAssistantManager.updateSettings(newSettings);
    // State will be updated via the onSettingsChange callback
  }, []);

  // Reset settings to defaults
  const resetSettings = useCallback(() => {
    voiceAssistantManager.resetSettings();
    // State will be updated via the onSettingsChange callback
  }, []);

  // Context value
  const value: VoiceAssistantContextValue = {
    state,
    settings,
    updateSettings,
    resetSettings,
  };

  return (
    <VoiceAssistantContext.Provider value={value}>
      {children}
    </VoiceAssistantContext.Provider>
  );
}

/**
 * Hook to use voice assistant context
 */
export function useVoiceAssistantContext(): VoiceAssistantContextValue {
  const context = useContext(VoiceAssistantContext);
  if (context === undefined) {
    throw new Error("useVoiceAssistantContext must be used within a VoiceAssistantProvider");
  }
  return context;
}

/**
 * Hook to get voice assistant settings only
 */
export function useVoiceAssistantSettings(): {
  settings: VoiceAssistantSettings;
  updateSettings: (settings: Partial<VoiceAssistantSettings>) => void;
  resetSettings: () => void;
  isEnabled: boolean;
  toggle: () => void;
} {
  const { settings, updateSettings, resetSettings } = useVoiceAssistantContext();

  const toggle = useCallback(() => {
    updateSettings({ enabled: !settings.enabled });
  }, [settings.enabled, updateSettings]);

  return {
    settings,
    updateSettings,
    resetSettings,
    isEnabled: settings.enabled,
    toggle,
  };
}

/**
 * Hook to get cue preferences only
 */
export function useCuePreferences(): {
  preferences: CuePreferences;
  updatePreference: (key: keyof CuePreferences, value: boolean) => void;
  updatePreferences: (preferences: Partial<CuePreferences>) => void;
} {
  const { settings, updateSettings } = useVoiceAssistantContext();

  const updatePreference = useCallback(
    (key: keyof CuePreferences, value: boolean) => {
      updateSettings({
        cuePreferences: {
          ...settings.cuePreferences,
          [key]: value,
        },
      });
    },
    [settings.cuePreferences, updateSettings]
  );

  const updatePreferences = useCallback(
    (preferences: Partial<CuePreferences>) => {
      updateSettings({
        cuePreferences: {
          ...settings.cuePreferences,
          ...preferences,
        },
      });
    },
    [settings.cuePreferences, updateSettings]
  );

  return {
    preferences: settings.cuePreferences,
    updatePreference,
    updatePreferences,
  };
}

export default VoiceAssistantContext;

