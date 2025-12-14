import {} from "react";
import {} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../../contexts/AuthContext";
import OnboardingForm from "../onboarding-form";
import Header from "@components/Header";
import { useOnboardingController } from "@components/onboarding/use-onboarding-controller";

export const OnboardingScreen = () => {
  const { user } = useAuth();

  const { isLoading, isCompletingOnboarding, pendingEmail, handleSubmit } =
    useOnboardingController();

  // Pending email and user state are handled in the controller
  // Submit and generation logic moved to useOnboardingController
  // Global generating screen will handle workout generation display

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="dark" />

      <OnboardingForm
        initialData={{ email: user?.email || pendingEmail || "" }}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        submitButtonText={
          isLoading ? "Creating Profile..." : "Generate Weekly Plan"
        }
      />
    </SafeAreaView>
  );
};
