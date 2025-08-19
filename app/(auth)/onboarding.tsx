import { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../../contexts/AuthContext";
import { getCurrentUser, getPendingEmail, getPendingUserId } from "@lib/auth";
import { useRouter } from "expo-router";
import { generateWorkoutPlan, fetchActiveWorkout } from "@lib/workouts";
import OnboardingForm, { FormData } from "../../components/OnboardingForm";
import * as SecureStore from "expo-secure-store";
import { colors } from "../../lib/theme";
import Header from "@components/Header";
import { useAppDataContext } from "@contexts/AppDataContext";

export default function OnboardingScreen() {
  const router = useRouter();
  const {
    completeOnboarding,
    user,
    isAuthenticated,
    isLoading: authLoading,
    setIsGeneratingWorkout,
    setIsPreloadingData,
  } = useAuth();

  // Get refresh functions for data refresh after workout generation
  const {
    refresh: { refreshAll },
  } = useAppDataContext();
  const [isLoading, setIsLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  // Local generating workout state removed - using global state from AuthContext
  const [error, setError] = useState<string | null>(null);
  const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, authLoading, router]);

  // Redirect users who don't need onboarding
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !isCompletingOnboarding) {
      const needsOnboarding = user.needsOnboarding ?? true;
      if (!needsOnboarding) {
        router.replace("/(tabs)/calendar");
      }
    }
  }, [authLoading, isAuthenticated, user, isCompletingOnboarding, router]);

  // Fetch and apply pending email and user ID on component mount
  useEffect(() => {
    const loadPendingData = async () => {
      try {
        const [email, userId] = await Promise.all([
          getPendingEmail(),
          getPendingUserId(),
        ]);

        if (email) {
          setPendingEmail(email);
        }

        if (userId) {
          setPendingUserId(userId);
        }

        // Clear the verification flag to allow normal redirect behavior
        await SecureStore.deleteItemAsync("isVerifyingUser").catch(() => {});
      } catch (error) {
        console.error("Failed to load pending data:", error);
      }
    };

    loadPendingData();
  }, []);

  const fetchWorkoutPlan = async () => {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("User not found");
    }
    const result = await generateWorkoutPlan(user.id);

    if (result?.success) {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 7);

      await refreshAll({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      });
    }

    return result;
  };

  // Submit onboarding data
  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setIsCompletingOnboarding(true); // Prevent premature redirects

    try {
      if (!pendingUserId) {
        throw new Error("User ID not found");
      }

      // Convert form data to match OnboardingData type
      const onboardingData = {
        ...formData,
        userId: parseInt(pendingUserId),
        goals: formData.goals,
        limitations: formData.limitations || [],
        environment: formData.environment!,
        equipment: formData.equipment || [],
        otherEquipment: formData.otherEquipment || "",
        preferredStyles: formData.preferredStyles,
        availableDays: formData.availableDays,
        gender: formData.gender.toString(),
        fitnessLevel: formData.fitnessLevel.toString(),
        intensityLevel: formData.intensityLevel.toString(),
      };
      setIsGeneratingWorkout(true, 'initial');
      setIsLoading(false);

      const onboardingSuccess = await completeOnboarding(onboardingData);

      if (!onboardingSuccess) {
        throw new Error("Failed to complete onboarding");
      }

      await fetchWorkoutPlan();
      setIsGeneratingWorkout(false);
      setIsCompletingOnboarding(false);
      // Trigger app reload to show warming up screen
      setIsPreloadingData(true);
      router.replace("/");
    } catch (error) {
      console.error("Error:", error);
      setIsLoading(false);
      setIsGeneratingWorkout(false);
      setIsCompletingOnboarding(false);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text className="mt-md text-sm text-neutral-medium-4">
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Don't render anything if not authenticated (redirect in progress)
  if (!isAuthenticated) {
    return null;
  }

  // Global generating screen will handle workout generation display

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="dark" />

      {/* Header */}
      <Header />

      <OnboardingForm
        initialData={{ email: user?.email || pendingEmail || "" }}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        submitButtonText="Generate Plan"
      />
    </SafeAreaView>
  );
}
