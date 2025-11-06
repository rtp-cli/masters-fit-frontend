import { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { OnboardingData } from "@lib/types";
import { RegenerationType } from "@/constants";

// Encapsulates onboarding side effects and data mapping
export function useOnboardingController() {
  const router = useRouter();
  const { user, completeOnboarding, setIsGeneratingWorkout } = useAuth();

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
    try {
      // Align with AuthContext RegenerationType
      setIsGeneratingWorkout(true, RegenerationType.Initial);
    } catch (err) {
      // Swallow errors to avoid breaking onboarding flow; consider logging later
    }
  }, [setIsGeneratingWorkout]);

  const handleSubmit = useCallback(
    async (formData: any) => {
      setIsLoading(true);
      setIsCompletingOnboarding(true);
      try {
        const payload = mapFormToProfileData(formData);

        // TODO: integrate profile update API if available in the codebase
        // await updateProfile(payload);

        const success = await completeOnboarding(payload);
        if (success) {
          await startWorkoutGeneration();
          router.replace("/(tabs)/dashboard");
        }
      } catch (error) {
        // Consider surfacing a user-friendly message via your toast system
      } finally {
        setIsLoading(false);
        setIsCompletingOnboarding(false);
      }
    },
    [completeOnboarding, startWorkoutGeneration, mapFormToProfileData, router]
  );

  return {
    handleSubmit,
    startWorkoutGeneration,
    isLoading,
    isCompletingOnboarding,
    pendingEmail,
  };
}
