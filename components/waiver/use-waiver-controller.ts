import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth-context";
import { API_URL } from "@/config";
import { saveUserToSecureStorage } from "@/lib/auth";
import { CURRENT_WAIVER_VERSION, isWaiverUpdate } from "@/constants/waiver";
import { DialogButton } from "@/components/ui";

export function useWaiverController() {
  const router = useRouter();
  const { user, setUserData, logout } = useAuth();
  const [isAgreed, setIsAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    description: string;
    primaryButton: DialogButton;
    secondaryButton?: DialogButton;
    icon?: keyof typeof Ionicons.glyphMap;
  } | null>(null);

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
    setDialogConfig({
      title: "Exit Application",
      description:
        "You must accept the waiver to use MastersFit. Exiting will log you out.",
      secondaryButton: {
        text: "Stay",
        onPress: () => setDialogVisible(false),
      },
      primaryButton: {
        text: "Log Out",
        onPress: async () => {
          setDialogVisible(false);
          try {
            await logout();
            router.replace("/");
          } catch (error) {
            console.error("Error during logout:", error);
            router.replace("/");
          }
        },
      },
      icon: "warning",
    });
    setDialogVisible(true);
  }, [logout, router]);

  const handleAgree = useCallback(async () => {
    if (!isAgreed) {
      setDialogConfig({
        title: "Agreement Required",
        description:
          "Please check the box to agree to the Waiver of Liability & Terms & Conditions before continuing.",
        primaryButton: {
          text: "OK",
          onPress: () => setDialogVisible(false),
        },
        icon: "alert-circle",
      });
      setDialogVisible(true);
      return;
    }

    if (!user || !token) {
      setDialogConfig({
        title: "Error",
        description: "Please log in first to accept the waiver.",
        primaryButton: {
          text: "OK",
          onPress: () => setDialogVisible(false),
        },
        icon: "alert-circle",
      });
      setDialogVisible(true);
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
      setDialogConfig({
        title: "Error",
        description: "Failed to save your agreement. Please try again.",
        primaryButton: {
          text: "OK",
          onPress: () => setDialogVisible(false),
        },
        icon: "alert-circle",
      });
      setDialogVisible(true);
    } finally {
      setIsLoading(false);
    }
  }, [isAgreed, user, token, router, setUserData]);

  return {
    // state
    isAgreed,
    isLoading,
    isUpdate,
    dialogVisible,
    dialogConfig,
    setDialogVisible,
    // actions
    toggleAgree,
    viewDocument,
    handleCancel,
    handleAgree,
  };
}
