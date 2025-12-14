import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "@/contexts/auth-context";
import { verify, generateAuthCode } from "@/lib/auth";
import { hasAcceptedCurrentWaiver } from "@/constants/waiver";

export function useVerifyController() {
  const router = useRouter();
  const { setUserData, setIsPreloadingData } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const requestNewCode = useCallback(async (email: string) => {
    if (!email) return { success: false };

    setIsLoading(true);
    try {
      const response = await generateAuthCode({ email });
      if (response.success) {
        Alert.alert(
          "Success",
          "A new verification code has been sent to your email."
        );
        return { success: true };
      } else {
        Alert.alert("Error", "Failed to send new code. Please try again.");
        return { success: false };
      }
    } catch (error) {
      Alert.alert("Error", "Failed to request new code. Please try again.");
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyCode = useCallback(
    async (email: string, code: string) => {
      if (!email) return { success: false };

      if (code.length !== 4) {
        Alert.alert("Error", "Please enter the complete 4-digit OTP");
        return { success: false };
      }

      setIsLoading(true);
      try {
        const response = await verify({ authCode: code.trim() });

        if (response.success) {
          if (!response.token) {
            Alert.alert("Error", "Authentication failed. Please try again.");
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
            Alert.alert("Error", "User data not received. Please try again.");
            return { success: false };
          }
        } else {
          Alert.alert(
            "Invalid Code",
            "The code you entered is incorrect. Would you like to try again or request a new code?",
            [
              {
                text: "Try Again",
                onPress: () => {},
                style: "default",
              },
              {
                text: "New Code",
                onPress: () => requestNewCode(email),
                style: "default",
              },
            ]
          );
          return { success: false };
        }
      } catch (error) {
        console.error("Verification error:", error);
        Alert.alert("Error", "Failed to verify code. Please try again.");
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
  };
}
