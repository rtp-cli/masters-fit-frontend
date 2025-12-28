import { useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { logger } from "@/lib/logger";

const SECRET_ACTIVATION_KEY = "ai_provider_secret_activated";
const DEBUG_MODE_KEY = "debug_mode_activated";

export const useSecretActivation = () => {
  const [isSecretActivated, setIsSecretActivated] = useState(false);
  const [isDebugModeActivated, setIsDebugModeActivated] = useState(false);

  // Load secret activation state on mount
  useEffect(() => {
    const loadSecretState = async () => {
      try {
        const activated = await SecureStore.getItemAsync(SECRET_ACTIVATION_KEY);
        setIsSecretActivated(activated === "true");

        const debugActivated = await SecureStore.getItemAsync(DEBUG_MODE_KEY);
        setIsDebugModeActivated(debugActivated === "true");
      } catch (error) {
        logger.error("Failed to load secret activation state", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
    loadSecretState();
  }, []);

  const activateSecret = async () => {
    try {
      await SecureStore.setItemAsync(SECRET_ACTIVATION_KEY, "true");
      setIsSecretActivated(true);
      logger.info("AI provider secret activated");
    } catch (error) {
      logger.error("Failed to activate secret", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const deactivateSecret = async () => {
    try {
      await SecureStore.deleteItemAsync(SECRET_ACTIVATION_KEY);
      setIsSecretActivated(false);
      logger.info("AI provider secret deactivated");
    } catch (error) {
      logger.error("Failed to deactivate secret", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const activateDebugMode = async () => {
    try {
      await SecureStore.setItemAsync(DEBUG_MODE_KEY, "true");
      setIsDebugModeActivated(true);
      logger.info("Debug mode activated");
    } catch (error) {
      logger.error("Failed to activate debug mode", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const deactivateDebugMode = async () => {
    try {
      await SecureStore.deleteItemAsync(DEBUG_MODE_KEY);
      setIsDebugModeActivated(false);
      logger.info("Debug mode deactivated");
    } catch (error) {
      logger.error("Failed to deactivate debug mode", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return {
    isSecretActivated,
    activateSecret,
    deactivateSecret,
    isDebugModeActivated,
    activateDebugMode,
    deactivateDebugMode,
  };
};
