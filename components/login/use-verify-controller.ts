import { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth-context";
import { verify, generateAuthCode } from "@/lib/auth";
import { hasAcceptedCurrentWaiver } from "@/constants/waiver";
import type { DialogButton } from "@/components/ui";

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
        setDialogConfig({
          title: "Success",
          description: "A new verification code has been sent to your email.",
          primaryButton: {
            text: "OK",
            onPress: () => setDialogVisible(false),
          },
          icon: "checkmark-circle",
        });
        setDialogVisible(true);
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
        const response = await verify({ authCode: code.trim() });

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
            const userWithOnboardingStatus = {
              ...response.user,
              needsOnboarding: response.needsOnboarding ?? false,
            };
            setUserData(userWithOnboardingStatus);
            await SecureStore.setItemAsync(
              "user",
              JSON.stringify(userWithOnboardingStatus)
            );

            const hasValidWaiver = hasAcceptedCurrentWaiver(
              response.user.waiverAcceptedAt || null,
              response.user.waiverVersion || null
            );

            if (!hasValidWaiver) {
              router.replace("/(auth)/waiver");
              return { success: true };
            } else if (response.needsOnboarding) {
              await Promise.all([
                SecureStore.setItemAsync("pendingEmail", email),
                SecureStore.setItemAsync(
                  "pendingUserId",
                  response.user.id.toString()
                ),
                SecureStore.setItemAsync("isVerifyingUser", "true"),
              ]);
              router.replace("/(auth)/onboarding");
              return { success: true };
            } else {
              await SecureStore.deleteItemAsync("isVerifyingUser");
              setIsPreloadingData(true);
              router.replace("/");
              return { success: true };
            }
          } else {
            setDialogConfig({
              title: "Error",
              description: "User data not received. Please try again.",
              primaryButton: {
                text: "OK",
                onPress: () => setDialogVisible(false),
              },
              icon: "alert-circle",
            });
            setDialogVisible(true);
            return { success: false };
          }
        } else {
          setDialogConfig({
            title: "Invalid Code",
            description:
              "The code you entered is incorrect. Would you like to try again or request a new code?",
            primaryButton: {
              text: "New Code",
              onPress: () => {
                setDialogVisible(false);
                requestNewCode(email);
              },
            },
            secondaryButton: {
              text: "Try Again",
              onPress: () => setDialogVisible(false),
            },
            icon: "alert-circle",
          });
          setDialogVisible(true);
          return { success: false };
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
    [router, setUserData, setIsPreloadingData, requestNewCode]
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
