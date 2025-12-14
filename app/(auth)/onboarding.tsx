import { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/auth-context";
import { colors } from "../../lib/theme";
import { OnboardingScreen } from "@/components/onboarding";

export default function OnboardingRoute() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

  // Redirect users who don't need onboarding
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const needsOnboarding = user.needsOnboarding ?? false;
      if (!needsOnboarding) {
        router.replace("/(tabs)/dashboard");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Show loading while checking authentication
  if (isLoading) {
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

  return <OnboardingScreen />;
}
