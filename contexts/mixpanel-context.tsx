"use client";

import React, {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import { logger } from "@/lib/logger";
import { initMixpanel } from "@/lib/mixpanel";

const MIXPANEL_TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;

interface MixpanelContextType {
  isEnabled: boolean;
}

const MixpanelContext = createContext<MixpanelContextType | undefined>(
  undefined,
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

      // Delegates to the lib/mixpanel singleton, which retains the instance so
      // custom events (track) and identity (identify/reset) work app-wide —
      // autocapture stays on inside initMixpanel.
      const ok = await initMixpanel(MIXPANEL_TOKEN as string);
      setIsEnabled(ok);
      if (ok) {
        logger.info("Mixpanel initialized (RN)", { autocapture: true });
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
