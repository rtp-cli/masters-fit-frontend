import { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../../contexts/AuthContext";
import { getCurrentUser, getPendingEmail, getPendingUserId } from "@lib/auth";
import { apiRequest } from "@lib/api";
import { useRouter } from "expo-router";
import { generateWorkoutPlanAsync } from "@lib/workouts";
import OnboardingForm, { FormData } from "../../components/OnboardingForm";
import * as SecureStore from "expo-secure-store";
import { colors } from "../../lib/theme";
import Header from "@components/Header";
import { useBackgroundJobs } from "@contexts/BackgroundJobContext";

export default function OnboardingScreen() {
  const router = useRouter();
  const {
    completeOnboarding,
    user,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();

  // Get background job functions
  const { addJob } = useBackgroundJobs();

  const [isLoading, setIsLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
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

  const startWorkoutGeneration = async () => {
    try {
      console.log("[Onboarding] Starting workout generation...");

      const user = await getCurrentUser();
      if (!user) {
        console.error("[Onboarding] No current user found");
        throw new Error("User not found");
      }

      console.log(
        `[Onboarding] Calling generateWorkoutPlanAsync for user ID: ${user.id}`
      );
      console.log("[Onboarding] User data:", JSON.stringify(user, null, 2));

      // Fetch fresh profile data to ensure we have the complete profile
      console.log("[Onboarding] Fetching fresh profile data...");
      const profileResponse = await apiRequest(`/profile/${user.id}`);
      console.log(
        "[Onboarding] Profile response:",
        JSON.stringify(profileResponse, null, 2)
      );

      // Start async workout generation - the backend will use the profile from database
      const result = await generateWorkoutPlanAsync(user.id);

      console.log(
        "[Onboarding] generateWorkoutPlanAsync result:",
        JSON.stringify(result, null, 2)
      );

      if (result?.success && result.jobId) {
        console.log(
          `[Onboarding] Workout generation job created with ID: ${result.jobId}`
        );

        // Add job to background context for tracking
        console.log("[Onboarding] Adding job to background context...");
        await addJob(result.jobId, "generation");

        // Navigate to main app - the FAB will handle the rest of the flow
        console.log("[Onboarding] Navigating to main app...");
        router.replace("/");

        return { success: true };
      } else {
        console.error(
          "[Onboarding] Workout generation failed - no success or jobId"
        );
        console.error(
          "[Onboarding] Result was:",
          JSON.stringify(result, null, 2)
        );
        throw new Error("Failed to start workout generation");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error("[Onboarding] startWorkoutGeneration error:", error);
      console.error("[Onboarding] Error message:", errorMessage);
      if (errorStack) console.error("[Onboarding] Error stack:", errorStack);
      throw error; // Re-throw to be caught by the main handler
    }
  };

  // Submit onboarding data
  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setIsCompletingOnboarding(true); // Prevent premature redirects

    try {
      // Use pendingUserId, or fallback to current user ID
      const userIdToUse = pendingUserId || user?.id?.toString();
      if (!userIdToUse) {
        throw new Error("User ID not found");
      }

      console.log("[Onboarding] Starting profile creation...");
      console.log(
        "[Onboarding] Raw form data:",
        JSON.stringify(formData, null, 2)
      );

      // Convert form data to match backend profile update format
      const profileData = {
        name: user?.name || "User", // Get name from user context or default
        age: formData.age,
        height: formData.height,
        weight: formData.weight,
        gender: formData.gender.toString(),
        goals: formData.goals.map((goal) => goal.toString()),
        limitations:
          formData.limitations?.map((limitation) => limitation.toString()) ||
          [],
        fitnessLevel: formData.fitnessLevel.toString(),
        environment: formData.environment?.toString() || "",
        equipment: formData.equipment?.map((eq) => eq.toString()) || [],
        otherEquipment: formData.otherEquipment || "",
        preferredStyles: formData.preferredStyles.map((style) =>
          style.toString()
        ),
        availableDays: formData.availableDays.map((day) => day.toString()),
        workoutDuration: formData.workoutDuration, // Add missing required field
        intensityLevel: formData.intensityLevel.toString(),
        medicalNotes: formData.medicalNotes || "",
      };

      console.log(
        "[Onboarding] Converted profile data:",
        JSON.stringify(profileData, null, 2)
      );
      console.log("[Onboarding] Data types check:");
      console.log("- name:", typeof profileData.name, profileData.name);
      console.log("- age:", typeof profileData.age, profileData.age);
      console.log("- goals:", typeof profileData.goals, profileData.goals);
      console.log(
        "- environment:",
        typeof profileData.environment,
        profileData.environment
      );
      console.log(
        "- workoutDuration:",
        typeof profileData.workoutDuration,
        profileData.workoutDuration
      );

      // Step 1: Complete onboarding (update profile)
      if (!userIdToUse || isNaN(parseInt(userIdToUse, 10))) {
        throw new Error("Invalid User ID");
      }
      const onboardingData = {
        ...profileData,
        userId: parseInt(userIdToUse, 10),
        email: pendingEmail || user?.email || "", // Ensure email is included
      };
      const onboardingSuccess = await completeOnboarding(onboardingData);

      if (!onboardingSuccess) {
        throw new Error("Failed to complete onboarding");
      }

      console.log(
        "[Onboarding] Profile created successfully, starting workout generation..."
      );

      // Step 2: Start workout generation
      await startWorkoutGeneration();

      // Cleanup
      setIsLoading(false);
      setIsCompletingOnboarding(false);
    } catch (error) {
      console.error("[Onboarding] Error:", error);
      setIsLoading(false);
      setIsCompletingOnboarding(false);

      // Show specific error message
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      const isProfileError =
        errorMessage.includes("onboarding") || errorMessage.includes("profile");

      Alert.alert(
        isProfileError
          ? "Profile Creation Failed"
          : "Workout Generation Failed",
        isProfileError
          ? "Unable to create your profile. Please check your information and try again."
          : "Your profile was created, but we couldn't start generating your workout. Please try again from the settings.",
        [{ text: "OK" }]
      );
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
        submitButtonText={isLoading ? "Creating Profile..." : "Generate Plan"}
      />
    </SafeAreaView>
  );
}
