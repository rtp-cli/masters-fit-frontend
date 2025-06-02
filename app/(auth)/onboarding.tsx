import { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../../contexts/AuthContext";
import { getCurrentUser, getPendingEmail, getPendingUserId } from "@lib/auth";
import { useRouter } from "expo-router";
import { generateWorkoutPlan, fetchActiveWorkout } from "@lib/workouts";
import OnboardingForm, { FormData } from "../../components/OnboardingForm";
import GeneratingPlanScreen from "../../components/ui/GeneratingPlanScreen";
import * as SecureStore from "expo-secure-store";

export default function OnboardingScreen() {
  const router = useRouter();
  const {
    completeOnboarding,
    user,
    isAuthenticated,
    isLoading: authLoading,
    setIsGeneratingWorkout,
  } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [generatingWorkout, setGeneratingWorkout] = useState(false);
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
      console.log("🔍 Onboarding Screen - Checking if user needs onboarding:", {
        needsOnboarding,
        userEmail: user.email,
        userId: user.id,
      });

      if (!needsOnboarding) {
        console.log("✅ User doesn't need onboarding, redirecting to calendar");
        router.replace("/(tabs)/calendar");
      }
    }
  }, [authLoading, isAuthenticated, user, isCompletingOnboarding, router]);

  // Debug logging for user state
  useEffect(() => {
    if (!authLoading) {
      console.log("🔍 Onboarding Screen - User state:", {
        isAuthenticated,
        user: user?.email,
        needsOnboarding: user?.needsOnboarding,
        generatingWorkout,
        isCompletingOnboarding,
      });
    }
  }, [
    authLoading,
    isAuthenticated,
    user?.needsOnboarding,
    generatingWorkout,
    isCompletingOnboarding,
  ]);

  // Debug logging for generating workout state
  useEffect(() => {
    console.log("🔄 Onboarding - Generating workout state changed:", {
      generatingWorkout,
      shouldShowGeneratingScreen: generatingWorkout,
    });
  }, [generatingWorkout]);

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
    await generateWorkoutPlan(user.id);
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
        environment: formData.environment,
        equipment: formData.equipment || [],
        preferredStyles: formData.preferredStyles,
        availableDays: formData.availableDays,
        gender: formData.gender.toString(),
        fitnessLevel: formData.fitnessLevel.toString(),
        intensityLevel: formData.intensityLevel.toString(),
      };

      console.log(
        "📊 Onboarding data being sent:",
        JSON.stringify(onboardingData, null, 2)
      );

      // Step 1: Set global flag BEFORE onboarding completion to prevent redirects
      console.log("🚧 Setting generating workout flag to prevent redirects");
      setIsGeneratingWorkout(true); // Prevent redirects globally FIRST
      setGeneratingWorkout(true);
      setIsLoading(false); // Stop showing form loading, show generating screen

      // Step 2: Complete onboarding (this will update user state and trigger redirect logic)
      console.log("Starting onboarding...");
      const onboardingSuccess = await completeOnboarding(onboardingData);

      if (!onboardingSuccess) {
        throw new Error("Failed to complete onboarding");
      }

      console.log("Onboarding completed successfully");

      // Add a small delay to ensure the generating screen is visible
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 3: Generate workout plan
      console.log("Starting workout generation...");
      await fetchWorkoutPlan();
      console.log("Workout generation completed");

      // Step 4: Wait to show completion message
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Step 5: Now it's safe to navigate
      console.log("Navigating to calendar...");
      setGeneratingWorkout(false);
      setIsGeneratingWorkout(false); // Allow redirects again
      setIsCompletingOnboarding(false);
      router.replace("/(tabs)/calendar");
    } catch (error) {
      console.error("Error:", error);
      setIsLoading(false);
      setGeneratingWorkout(false);
      setIsGeneratingWorkout(false); // Allow redirects again
      setIsCompletingOnboarding(false);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#BBDE51" />
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

  // Show generating screen during workout generation
  if (generatingWorkout) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar style="dark" />
        <GeneratingPlanScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-center pt-5">
        <Image
          source={require("../../assets/logo.png")}
          className="h-10 w-30"
          resizeMode="contain"
        />
      </View>

      <OnboardingForm
        initialData={{ email: user?.email || pendingEmail || "" }}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        submitButtonText="Generate Plan"
      />
    </SafeAreaView>
  );
}
