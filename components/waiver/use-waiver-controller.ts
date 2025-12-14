import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "@/contexts/auth-context";
import { API_URL } from "@/config";
import { saveUserToSecureStorage } from "@/lib/auth";
import { CURRENT_WAIVER_VERSION, isWaiverUpdate } from "@/constants/waiver";

export function useWaiverController() {
  const router = useRouter();
  const { user, setUserData, logout } = useAuth();
  const [isAgreed, setIsAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const isUpdate = isWaiverUpdate(user?.waiverVersion || null);

  useEffect(() => {
    const getToken = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync("token");
        setToken(storedToken);
      } catch (error) {
        console.error("Error getting token:", error);
      }
    };
    getToken();
  }, []);

  const toggleAgree = useCallback(() => {
    setIsAgreed((prev) => !prev);
  }, []);

  const viewDocument = useCallback(
    (type: "waiver" | "terms" | "privacy") => {
      router.push(`/legal-document?type=${type}`);
    },
    [router]
  );

  const handleCancel = useCallback(() => {
    Alert.alert(
      "Exit Application",
      "You must accept the waiver to use MastersFit. Exiting will log you out.",
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
              router.replace("/");
            } catch (error) {
              console.error("Error during logout:", error);
              router.replace("/");
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [logout, router]);

  const handleAgree = useCallback(async () => {
    if (!isAgreed) {
      Alert.alert(
        "Agreement Required",
        "Please check the box to agree to the Waiver of Liability & Terms & Conditions before continuing."
      );
      return;
    }

    if (!user || !token) {
      Alert.alert("Error", "Please log in first to accept the waiver.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/accept-waiver`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ version: CURRENT_WAIVER_VERSION }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to accept waiver");
      }

      if (user) {
        const updatedUser = {
          ...user,
          waiverAcceptedAt: new Date(),
          waiverVersion: CURRENT_WAIVER_VERSION,
        };
        setUserData(updatedUser);
        await saveUserToSecureStorage(updatedUser);
      }

      if (user?.needsOnboarding) {
        router.push("/(auth)/onboarding");
      } else {
        router.push("/(tabs)/dashboard");
      }
    } catch (error) {
      console.error("Error accepting waiver:", error);
      Alert.alert("Error", "Failed to save your agreement. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [isAgreed, user, token, router, setUserData]);

  return {
    // state
    isAgreed,
    isLoading,
    isUpdate,
    // actions
    toggleAgree,
    viewDocument,
    handleCancel,
    handleAgree,
  };
}
