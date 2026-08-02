import { type Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useState } from "react";

import type { DialogButton } from "@/components/ui";
import { hasAcceptedCurrentWaiver } from "@/constants/waiver";
import { useAuth } from "@/contexts/auth-context";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics-events";
import { generateAuthCode, verify } from "@/lib/auth";

export function useVerifyController() {
  const router = useRouter();
  const { setUserData, setIsPreloadingData } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    description: string;
    primaryButton: DialogButton;
    secondaryButton?: DialogButton;
    icon?: keyof typeof Ionicons.glyphMap;
  } | null>(null);

  const requestNewCode = useCallback(async (email: string) => {
    if (!email) return { success: false };

    setIsLoading(true);
    try {
      const response = await generateAuthCode({ email });
      if (response.success) {
        return { success: true };
      } else {
        setDialogConfig({
          title: "Error",
          description: "Failed to send new code. Please try again.",
          primaryButton: {
            text: "OK",
            onPress: () => setDialogVisible(false),
          },
          icon: "alert-circle",
        });
        setDialogVisible(true);
        return { success: false };
      }
    } catch (error) {
      setDialogConfig({
        title: "Error",
        description: "Failed to request new code. Please try again.",
        primaryButton: {
          text: "OK",
          onPress: () => setDialogVisible(false),
        },
        icon: "alert-circle",
      });
      setDialogVisible(true);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyCode = useCallback(
    async (email: string, code: string) => {
      if (!email) return { success: false };

      if (code.length !== 4) {
        setDialogConfig({
          title: "Error",
          description: "Please enter the complete 4-digit OTP",
          primaryButton: {
            text: "OK",
            onPress: () => setDialogVisible(false),
          },
          icon: "alert-circle",
        });
        setDialogVisible(true);
        return { success: false };
      }

      setIsLoading(true);
      try {
        const response = await verify({ authCode: code.trim(), email });
        trackEvent(AnalyticsEvent.OTP_SUBMITTED, { success: response.success }); // [AN-09]

        if (response.success) {
          if (!response.token) {
            setDialogConfig({
              title: "Error",
              description: "Authentication failed. Please try again.",
              primaryButton: {
                text: "OK",
                onPress: () => setDialogVisible(false),
              },
              icon: "alert-circle",
            });
            setDialogVisible(true);
            return { success: false };
          }

          await SecureStore.setItemAsync("token", response.token);

          if (response.user) {
            // Existing user — the code was valid and the account exists.
            const userWithOnboardingStatus = {
              ...response.user,
              needsOnboarding: response.needsOnboarding ?? false,
            };
            setUserData(userWithOnboardingStatus);
            await SecureStore.setItemAsync(
              "user",
              JSON.stringify(userWithOnboardingStatus),
            );

            const hasValidWaiver = hasAcceptedCurrentWaiver(
              response.user.waiverAcceptedAt || null,
              response.user.waiverVersion || null,
            );

            if (!hasValidWaiver) {
              router.replace("/(auth)/waiver");
              return { success: true };
            } else if (response.needsOnboarding) {
              router.replace("/(auth)/onboarding");
              return { success: true };
            } else {
              setIsPreloadingData(true);
              router.replace("/");
              return { success: true };
            }
          } else {
            // New user — code valid, no account yet. `response.token` is the
            // onboarding token (now stored above); collect a name next, and
            // signup authorises on that token (Work C).
            router.replace(
              `/(auth)/name?email=${encodeURIComponent(email)}`,
            );
            return { success: true };
          }
        } else {
          return { success: false, invalidCode: true };
        }
      } catch (error) {
        console.error("Verification error:", error);
        setDialogConfig({
          title: "Error",
          description: "Failed to verify code. Please try again.",
          primaryButton: {
            text: "OK",
            onPress: () => setDialogVisible(false),
          },
          icon: "alert-circle",
        });
        setDialogVisible(true);
        return { success: false };
      } finally {
        setIsLoading(false);
      }
    },
    [router, setUserData, setIsPreloadingData, requestNewCode],
  );

  return {
    isLoading,
    requestNewCode,
    verifyCode,
    dialogVisible,
    dialogConfig,
    setDialogVisible,
  };
}
