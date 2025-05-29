import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../../contexts/AuthContext";
import { getCurrentUser, getPendingEmail, getPendingUserId } from "@lib/auth";
import { useRouter } from "expo-router";
import { generateWorkoutPlan } from "@lib/workouts";
import OnboardingForm, { FormData } from "../../components/OnboardingForm";

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
    try {
      setError(null);
      setGeneratingWorkout(true);
      const user = await getCurrentUser();
      if (!user) {
        setError("User not found");
        return;
      }
      await generateWorkoutPlan(user.id);
    } catch (err) {
      setError("Failed to load workout plan");
      console.error("Error fetching workout plan:", err);
    } finally {
      setGeneratingWorkout(false);
      router.replace("/(tabs)/calendar");
    }
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

      await completeOnboarding(onboardingData);
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
      console.error("Profile creation error:", error);
    } finally {
      setIsLoading(false);
      fetchWorkoutPlan();
    }
  };

  if (generatingWorkout) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Generating your workout plan...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <OnboardingForm
        initialData={{ email: user?.email || pendingEmail || "" }}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        submitButtonText="Complete"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#4f46e5",
    fontWeight: "500",
  },
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
});
