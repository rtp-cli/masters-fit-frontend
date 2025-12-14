"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Mixpanel } from "mixpanel-react-native";
import { logger } from "@/lib/logger";

const MIXPANEL_TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;

interface MixpanelContextType {
  isEnabled: boolean;
}

const MixpanelContext = createContext<MixpanelContextType | undefined>(
  undefined
);

interface MixpanelProviderProps {
  children: ReactNode;
}

/**
 * MixpanelProvider - For session replay and heatmaps only
 * All custom event tracking is handled by backend API
 */
export function MixpanelProvider({ children }: MixpanelProviderProps) {
  const [isEnabled, setIsEnabled] = useState(false);

  /**
   * Initialize Mixpanel SDK only in production and when token exists.
   */
  useEffect(() => {
    const initializeMixpanel = async () => {
      const isProd = process.env.NODE_ENV === "production";
      const hasToken = !!MIXPANEL_TOKEN;
      if (!isProd || !hasToken) {
        logger.info("Mixpanel disabled", {
          reason: !hasToken ? "missing_token" : "non_production_env",
          environment: process.env.NODE_ENV,
          hasToken,
        });
        setIsEnabled(false);
        return;
      }

      try {
        const mixpanelInstance = new Mixpanel(MIXPANEL_TOKEN, {
          // Autocapture provides useful baseline interaction data on RN
          // (there is no native 'session replay' flag like on web)
          trackAutomaticEvents: true,
        } as any);

        await mixpanelInstance.init();
        setIsEnabled(true);

        logger.info("Mixpanel initialized (RN)", {
          autocapture: true,
        });
      } catch (error) {
        logger.error("Failed to initialize Mixpanel", {
          error_message: (error as Error)?.message,
          error_stack: (error as Error)?.stack ?? undefined,
        });
        setIsEnabled(false);
      }
    };

    initializeMixpanel();
  }, []);

  const contextValue: MixpanelContextType = {
    isEnabled,
  };

  return (
    <MixpanelContext.Provider value={contextValue}>
      {children}
    </MixpanelContext.Provider>
  );
}

/**
 * Hook to access Mixpanel session replay status
 */
export function useMixpanel() {
  const context = useContext(MixpanelContext);
  if (context === undefined) {
    throw new Error("useMixpanel must be used within a MixpanelProvider");
  }
  return context;
}
