import { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../../contexts/auth-context";
import { useBackgroundJobs } from "../../contexts/background-job-context";
import { OnboardingData } from "@lib/types";
import { RegenerationType } from "@/constants";
import { generateWorkoutPlanAsync } from "@lib/workouts";
import { registerForPushNotifications } from "@lib/notifications";
import { logger } from "@lib/logger";

// Encapsulates onboarding side effects and data mapping
export function useOnboardingController() {
  const router = useRouter();
  const { user, completeOnboarding, setIsGeneratingWorkout } = useAuth();
  const { addJob } = useBackgroundJobs();

  const [isLoading, setIsLoading] = useState(false);
  const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false);

  const pendingEmail = user?.email ?? undefined;

  // Map form values to the profile payload the backend expects.
  // Keep permissive typing here to avoid compiler friction while refactoring.
  const mapFormToProfileData = useCallback((formData: any): OnboardingData => {
    // Minimal pass-through mapping. Adjust if the backend requires different keys.
    // Type cast keeps momentum while we adjust upstream types.
    return { ...(formData as Partial<OnboardingData>) } as OnboardingData;
  }, []);

  const startWorkoutGeneration = useCallback(async () => {
    if (!user?.id) {
      logger.error("Cannot start workout generation: user ID not found");
      return;
    }

    try {
      // Set generating flag
      setIsGeneratingWorkout(true, RegenerationType.Initial);

      // Register for push notifications
      await registerForPushNotifications();

      // Call the workout generation API
      const result = await generateWorkoutPlanAsync(user.id);

      if (result?.success && result.jobId) {
        // Register the job with background context for FAB tracking
        await addJob(result.jobId, "generation");
        logger.info("Workout generation started after onboarding", {
          userId: user.id,
          jobId: result.jobId,
        });
      } else {
        logger.error("Failed to start workout generation after onboarding", {
          userId: user.id,
          result,
        });
        // Reset generating flag if API call failed
        setIsGeneratingWorkout(false);
      }
    } catch (err) {
      logger.error("Error starting workout generation after onboarding", {
        error: err instanceof Error ? err.message : "Unknown error",
        userId: user?.id,
      });
      // Reset generating flag on error
      setIsGeneratingWorkout(false);
    }
  }, [user?.id, setIsGeneratingWorkout, addJob]);

  const handleSubmit = useCallback(
    async (formData: any) => {
      setIsLoading(true);
      setIsCompletingOnboarding(true);
      try {
        const payload = mapFormToProfileData(formData);

        // Complete onboarding (updates profile)
        const success = await completeOnboarding(payload);
        if (success && user?.id) {
          // Start workout generation (calls the API)
          await startWorkoutGeneration();
          // Navigate to dashboard
          router.replace("/(tabs)/dashboard");
        } else {
          logger.error("Onboarding completion failed or user ID missing", {
            success,
            userId: user?.id,
          });
        }
      } catch (error) {
        logger.error("Error during onboarding submission", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
        // Consider surfacing a user-friendly message via your toast system
      } finally {
        setIsLoading(false);
        setIsCompletingOnboarding(false);
      }
    },
    [
      completeOnboarding,
      startWorkoutGeneration,
      mapFormToProfileData,
      router,
      user?.id,
    ]
  );

  return {
    handleSubmit,
    startWorkoutGeneration,
    isLoading,
    isCompletingOnboarding,
    pendingEmail,
  };
}
