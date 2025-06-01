import { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../../contexts/AuthContext";
import { getCurrentUser, getPendingEmail, getPendingUserId } from "@lib/auth";
import { useRouter } from "expo-router";
import { generateWorkoutPlan, fetchActiveWorkout } from "@lib/workouts";
import OnboardingForm, { FormData } from "../../components/OnboardingForm";
import GeneratingPlanScreen from "../../components/ui/GeneratingPlanScreen";

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [generatingWorkout, setGeneratingWorkout] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    try {
      if (!pendingUserId) {
        throw new Error("User ID not found");
      }

      // Convert form data to match OnboardingData type
      const onboardingData = {
        ...formData,
        userId: parseInt(pendingUserId),
        goals: formData.goals.map((g) => g.toString()),
        limitations: formData.limitations?.map((l) => l.toString()) || [],
        environment: formData.environment,
        equipment: formData.equipment?.map((e) => e.toString()) || [],
        preferredStyles: formData.preferredStyles.map((s) => s.toString()),
        availableDays: formData.availableDays.map((d) => d.toString()),
        gender: formData.gender.toString(),
        fitnessLevel: formData.fitnessLevel.toString(),
        intensityLevel: formData.intensityLevel.toString(),
      };

      // Step 1: Complete onboarding
      console.log("Starting onboarding...");
      await completeOnboarding(onboardingData);
      console.log("Onboarding completed");

      // Step 2: Show generating screen
      setIsLoading(false);
      setGeneratingWorkout(true);

      // Step 3: Generate workout plan
      console.log("Starting workout generation...");
      await fetchWorkoutPlan();
      console.log("Workout generation completed");

      // Step 4: Navigate
      console.log("Navigating to calendar...");
      setGeneratingWorkout(false);
      await fetchActiveWorkout();
      router.replace("/(tabs)/calendar");
    } catch (error) {
      console.error("Error:", error);
      setIsLoading(false);
      setGeneratingWorkout(false);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  if (generatingWorkout) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-light-1">
        <StatusBar style="dark" />
        <GeneratingPlanScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-light-1">
      <StatusBar style="dark" />
      <OnboardingForm
        initialData={{ email: user?.email || pendingEmail || "" }}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        submitButtonText="Generate Plan"
      />
    </SafeAreaView>
  );
}
