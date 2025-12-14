import { useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { logger } from "@/lib/logger";

const SECRET_ACTIVATION_KEY = "ai_provider_secret_activated";

export const useSecretActivation = () => {
  const [isSecretActivated, setIsSecretActivated] = useState(false);

  // Load secret activation state on mount
  useEffect(() => {
    const loadSecretState = async () => {
      try {
        const activated = await SecureStore.getItemAsync(SECRET_ACTIVATION_KEY);
        setIsSecretActivated(activated === "true");
      } catch (error) {
        logger.error("Failed to load secret activation state", error);
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
      logger.error("Failed to activate secret", error);
    }
  };

  const deactivateSecret = async () => {
    try {
      await SecureStore.deleteItemAsync(SECRET_ACTIVATION_KEY);
      setIsSecretActivated(false);
      logger.info("AI provider secret deactivated");
    } catch (error) {
      logger.error("Failed to deactivate secret", error);
    }
  };

  return {
    isSecretActivated,
    activateSecret,
    deactivateSecret,
  };
};