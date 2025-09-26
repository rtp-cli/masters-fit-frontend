import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import { getWaiverStatusAPI, setWaiverRedirectCallback } from "@/lib/api";
import { useAuth } from "./AuthContext";
import { useRouter } from "expo-router";
import { logger } from "@/lib/logger";

interface WaiverContextType {
  isCheckingWaiver: boolean;
  lastWaiverCheck: Date | null;
  checkWaiverStatus: () => Promise<void>;
  waiverInfo: {
    currentVersion: string;
    userVersion: string | null;
    hasAccepted: boolean;
    isUpdate: boolean;
    needsAcceptance: boolean;
  } | null;
}

const WaiverContext = createContext<WaiverContextType | undefined>(undefined);

export function useWaiver() {
  const context = useContext(WaiverContext);
  if (context === undefined) {
    throw new Error("useWaiver must be used within a WaiverProvider");
  }
  return context;
}

export function WaiverProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [isCheckingWaiver, setIsCheckingWaiver] = useState(false);
  const [lastWaiverCheck, setLastWaiverCheck] = useState<Date | null>(null);
  const [waiverInfo, setWaiverInfo] = useState<{
    currentVersion: string;
    userVersion: string | null;
    hasAccepted: boolean;
    isUpdate: boolean;
    needsAcceptance: boolean;
  } | null>(null);

  // Refs for timers
  const periodicCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);

  // Set up waiver redirect callback
  useEffect(() => {
    const redirectToWaiver = () => {
      console.log("[WaiverContext] API intercepted waiver requirement, redirecting");
      router.replace("/(auth)/waiver");
    };

    setWaiverRedirectCallback(redirectToWaiver);

    // Cleanup on unmount
    return () => {
      setWaiverRedirectCallback(() => {});
    };
  }, [router]);

  // Check waiver status
  const checkWaiverStatus = async () => {
    // Prevent concurrent checks
    if (isCheckingRef.current || !isAuthenticated || !user) {
      return;
    }

    isCheckingRef.current = true;
    setIsCheckingWaiver(true);

    try {
      logger.info("Checking waiver status", {
        operation: "checkWaiverStatus",
        metadata: {
          userId: user.id,
          lastCheck: lastWaiverCheck,
        },
      });

      const result = await getWaiverStatusAPI();

      if (result.success) {
        setWaiverInfo(result.waiverInfo);
        setLastWaiverCheck(new Date());

        // If waiver needs acceptance, redirect to waiver screen
        if (result.waiverInfo.needsAcceptance) {
          logger.info("Waiver acceptance needed, redirecting", {
            operation: "checkWaiverStatus",
            metadata: {
              userId: user.id,
              currentVersion: result.waiverInfo.currentVersion,
              userVersion: result.waiverInfo.userVersion,
              isUpdate: result.waiverInfo.isUpdate,
            },
          });

          router.replace("/(auth)/waiver");
        }
      } else {
        console.error("Failed to check waiver status");
      }
    } catch (error) {
      console.error("Waiver status check failed:", error);
      logger.error("Waiver status check failed", error as Error, {
        operation: "checkWaiverStatus",
        metadata: { userId: user?.id },
      });
    } finally {
      setIsCheckingWaiver(false);
      isCheckingRef.current = false;
    }
  };

  // Handle app state changes (foreground/background)
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log(`[WaiverContext] App state changed to: ${nextAppState}`);

      if (nextAppState === "active") {
        console.log("[WaiverContext] App became active, checking waiver status");
        checkWaiverStatus();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [isAuthenticated, user?.id]);

  // Set up periodic waiver checks when user is authenticated and app is active
  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Clear any existing interval
      if (periodicCheckInterval.current) {
        clearInterval(periodicCheckInterval.current);
        periodicCheckInterval.current = null;
      }
      return;
    }

    // Initial check when user becomes authenticated
    checkWaiverStatus();

    // Set up periodic checks every 60 seconds
    periodicCheckInterval.current = setInterval(() => {
      if (AppState.currentState === "active") {
        console.log("[WaiverContext] Periodic waiver check");
        checkWaiverStatus();
      }
    }, 60000); // 60 seconds

    return () => {
      if (periodicCheckInterval.current) {
        clearInterval(periodicCheckInterval.current);
        periodicCheckInterval.current = null;
      }
    };
  }, [isAuthenticated, user?.id]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (periodicCheckInterval.current) {
        clearInterval(periodicCheckInterval.current);
      }
    };
  }, []);

  const value = {
    isCheckingWaiver,
    lastWaiverCheck,
    checkWaiverStatus,
    waiverInfo,
  };

  return (
    <WaiverContext.Provider value={value}>{children}</WaiverContext.Provider>
  );
}