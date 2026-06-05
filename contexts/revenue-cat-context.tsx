import React, { createContext, useContext, useEffect, useState } from "react";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { Platform } from "react-native";
import { Sentry } from "@/lib/sentry";

const RevenueCatContext = createContext(false);

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

    const apiKey =
      Platform.OS === "ios"
        ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
        : process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY;

    if (!apiKey) {
      Sentry.captureMessage("RevenueCat: API key is missing", {
        level: "error",
        extra: {
          platform: Platform.OS,
          iosKeyExists: !!process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
          androidKeyExists: !!process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY,
        },
      });
      console.error("[RevenueCat] API key is missing for platform:", Platform.OS);
      return;
    }

    Purchases.configure({ apiKey });
    setIsReady(true);
  }, []);

  return (
    <RevenueCatContext.Provider value={isReady}>
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCatReady() {
  return useContext(RevenueCatContext);
}
