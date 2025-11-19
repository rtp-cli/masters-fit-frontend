import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";
import { images } from "@/assets";
import { useAuth } from "@/contexts/AuthContext";
import { API_URL } from "@/config";
import * as SecureStore from "expo-secure-store";
import { saveUserToSecureStorage } from "@/lib/auth";
import { CURRENT_WAIVER_VERSION, isWaiverUpdate } from "@/constants/waiver";

export default function WaiverScreen() {
  const router = useRouter();
  const { user, setUserData, logout } = useAuth();
  const [isAgreed, setIsAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Check if this is a waiver update (existing user with old version)
  const isUpdate = isWaiverUpdate(user?.waiverVersion || null);

  // Get token from SecureStore since AuthContext doesn't provide it
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

  const handleAgree = async () => {
    console.log("handleAgree called - isAgreed:", isAgreed);
    console.log(
      "User object:",
      user ? `${user.email} (ID: ${user.id})` : "null"
    );
    console.log("Token:", token ? "Present" : "null");

    if (!isAgreed) {
      Alert.alert(
        "Agreement Required",
        "Please check the box to agree to the Waiver of Liability & Terms & Conditions before continuing."
      );
      return;
    }

    if (!user || !token) {
      console.log("Missing user or token - showing login alert");
      Alert.alert("Error", "Please log in first to accept the waiver.");
      return;
    }

    console.log("All checks passed, proceeding with API call...");

    setIsLoading(true);

    try {
      console.log(
        "Making waiver API call to:",
        `${API_URL}/auth/accept-waiver`
      );
      console.log("Token:", token ? "Present" : "Missing");
      console.log("User:", user ? user.email : "Missing");

      // Call API to accept waiver
      const response = await fetch(`${API_URL}/auth/accept-waiver`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          version: CURRENT_WAIVER_VERSION,
        }),
      });

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to accept waiver");
      }

      // Update user object with waiver acceptance
      if (user) {
        const updatedUser = {
          ...user,
          waiverAcceptedAt: new Date(),
          waiverVersion: CURRENT_WAIVER_VERSION,
        };

        // Update both AuthContext and SecureStore
        setUserData(updatedUser);
        await saveUserToSecureStorage(updatedUser);

        console.log("User data updated with waiver acceptance");
      }

      // Navigate to onboarding or dashboard based on user status
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
  };

  const handleCancel = () => {
    Alert.alert(
      "Exit Application",
      "You must accept the waiver to use MastersFit. Exiting will log you out.",
      [
        {
          text: "Stay",
          style: "cancel",
        },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            // Log the user out completely since they can't use the app without accepting the waiver
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
  };

  const viewDocument = (type: "waiver" | "terms" | "privacy") => {
    router.push(`/legal-document?type=${type}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="dark" />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-4 pb-2">
          <TouchableOpacity onPress={handleCancel} className="p-2 -ml-2">
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Logo and Title */}
        <View className="px-6 items-center mb-8 mt-4">
          <Image
            source={images.icon}
            className="w-24 h-24 mb-6 rounded-md"
            resizeMode="contain"
          />
          <Text className="text-3xl font-bold text-text-primary text-center mb-2">
            {isUpdate ? "Updated Legal Agreement" : "Before You Begin"}
          </Text>
          <Text className="text-base text-text-muted text-center">
            {isUpdate
              ? "Our terms have been updated. Please review and accept the new version"
              : "Please review and accept our legal agreements"}
          </Text>
        </View>

        {/* Main Content */}
        <View className="px-6 mb-2">
          <View className="bg-white rounded-xl p-5">
            <View className="flex-col items-start mb-4">
              <View className="flex items-center justify-center flex-row mb-4">
                <Ionicons
                  name="warning"
                  size={24}
                  color={colors.brand.secondary}
                />
                <Text className="text-lg font-semibold text-text-primary ml-3">
                  Waiver of Liability & Assumption of Risk
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-base text-text-secondary leading-6 mb-3">
                  MastersFit provides fitness guidance only and is not medical
                  advice. Always check with your doctor before starting new
                  workouts.
                </Text>
                <Text className="text-base text-text-secondary leading-6 mb-3">
                  Our workouts are AI-powered, but AI isn't perfect — listen to
                  your body and use your judgment.
                </Text>
                <Text className="text-base text-text-secondary leading-6 mb-3">
                  By using this app, you agree to do so at your own risk and
                  release MastersFit LLC from any liability for injuries, health
                  issues, or damages.
                </Text>
                <Text className="text-base font-medium text-text-primary">
                  Results are not guaranteed.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Agreement Checkbox */}
        <View className="px-6 mb-6">
          <TouchableOpacity
            onPress={() => setIsAgreed(!isAgreed)}
            className="flex-row items-center bg-white rounded-xl p-4"
          >
            <View
              className={`w-6 h-6 rounded-md border-2 mr-3 items-center justify-center ${
                isAgreed
                  ? "bg-brand-primary border-brand-primary"
                  : "bg-white border-neutral-medium-2"
              }`}
              style={
                isAgreed
                  ? {
                      backgroundColor: colors.brand.primary,
                      borderColor: colors.brand.primary,
                    }
                  : {}
              }
            >
              {isAgreed && (
                <Ionicons name="checkmark" size={16} color="white" />
              )}
            </View>
            <Text className="flex-1 text-base text-text-primary">
              I have read and accept all legal agreements (v
              {CURRENT_WAIVER_VERSION})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Document Links */}
        <View className="px-6 mb-8">
          <View className="flex-row justify-center items-center flex-wrap">
            <TouchableOpacity
              onPress={() => viewDocument("terms")}
              className="flex-row items-center mx-2 mb-3"
            >
              <Ionicons
                name="newspaper-outline"
                size={16}
                color={colors.brand.primary}
              />
              <Text className="text-sm text-brand-primary ml-1 underline">
                Terms & Conditions
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => viewDocument("privacy")}
              className="flex-row items-center mx-2 mb-3"
            >
              <Ionicons
                name="lock-closed-outline"
                size={16}
                color={colors.brand.primary}
              />
              <Text className="text-sm text-brand-primary ml-1 underline">
                Privacy Policy
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => viewDocument("waiver")}
              className="flex-row items-center mx-2 mb-3"
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={colors.brand.primary}
              />
              <Text className="text-sm text-brand-primary ml-1 underline">
                Waiver of Liability
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View className="px-6 pb-6 pt-4 bg-white border-t border-neutral-light-2">
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 py-3 px-6 rounded-xl bg-red-500 items-center justify-center"
            onPress={handleCancel}
          >
            <Text className="text-white font-semibold">Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 py-4 px-6 rounded-xl items-center ${
              isAgreed && !isLoading ? "bg-brand-primary" : "bg-neutral-light-2"
            }`}
            style={
              isAgreed && !isLoading
                ? { backgroundColor: colors.brand.primary }
                : {}
            }
            onPress={handleAgree}
            disabled={!isAgreed || isLoading}
          >
            <Text
              className={`text-base font-semibold ${
                isAgreed && !isLoading ? "text-white" : "text-neutral-medium-3"
              }`}
            >
              {isLoading ? "Saving..." : "Continue"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
