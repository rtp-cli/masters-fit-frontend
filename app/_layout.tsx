import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { AuthProvider, useAuth } from "@contexts/AuthContext";
import { WorkoutProvider } from "@contexts/WorkoutContext";
import { AppDataProvider, useAppDataContext } from "@contexts/AppDataContext";
import {
  BackgroundJobProvider,
  useBackgroundJobs,
} from "@contexts/BackgroundJobContext";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useEffect, useState } from "react";
import WarmingUpScreen from "@/components/ui/WarmingUpScreen";
import { invalidateActiveWorkoutCache } from "@lib/workouts";
import {
  registerForPushNotifications,
  addNotificationResponseListener,
} from "@/lib/notifications";
import "../global.css";

// Inner component that can access auth context
function AppContent() {
  const {
    isGeneratingWorkout,
    currentRegenerationType,
    setIsGeneratingWorkout,
    needsFullAppRefresh,
    setNeedsFullAppRefresh,
    isPreloadingData,
    setIsPreloadingData,
    user,
  } = useAuth();
  const {
    refresh: { reset, refreshAll },
    loading,
  } = useAppDataContext();
  const { hasActiveJobs } = useBackgroundJobs();

  // State to track notification-triggered refreshes
  const [isNotificationRefresh, setIsNotificationRefresh] = useState(false);

  // Check if we need full app refresh and data is loading
  // For notification-triggered refreshes, we want to show warming up even if loading states aren't immediately true
  const isDoingFullAppRefresh =
    needsFullAppRefresh &&
    (loading.dashboardLoading ||
      loading.workoutLoading ||
      loading.profileLoading ||
      isPreloadingData || // Show warming up when background job triggers refresh
      // Show warming up immediately after notification refresh to handle timing issues
      isNotificationRefresh);

  // Debug logging for warming up screen
  useEffect(() => {
    console.log("[WarmingUp] State check:", {
      needsFullAppRefresh,
      dashboardLoading: loading.dashboardLoading,
      workoutLoading: loading.workoutLoading,
      profileLoading: loading.profileLoading,
      isPreloadingData,
      isNotificationRefresh,
      isDoingFullAppRefresh,
    });
  }, [
    needsFullAppRefresh,
    loading.dashboardLoading,
    loading.workoutLoading,
    loading.profileLoading,
    isPreloadingData,
    isNotificationRefresh,
    isDoingFullAppRefresh,
  ]);

  // Setup notifications on app startup
  useEffect(() => {
    if (user?.id) {
      const initializeAsyncFeatures = async () => {
        try {
          // Register for push notifications
          await registerForPushNotifications();
          console.log("Push notifications registered");
        } catch (error) {
          console.error("Error registering push notifications:", error);
        }
      };

      initializeAsyncFeatures();
    }
  }, [user?.id]);

  // Handle notification taps for cache invalidation
  useEffect(() => {
    const subscription = addNotificationResponseListener((response) => {
      console.log(
        "[Notification] Tapped - checking if cache invalidation needed"
      );

      // Check if we're already doing a full app refresh to avoid duplicate processing
      if (needsFullAppRefresh) {
        console.log(
          "[Notification] Full app refresh already in progress, skipping duplicate invalidation"
        );
        return;
      }

      // If there are still active jobs, the completion handler will trigger the refresh
      // Only manually invalidate if no jobs are active (completion already processed)
      if (hasActiveJobs) {
        console.log(
          "[Notification] Active jobs still running, letting completion handler manage cache invalidation"
        );
        return;
      }

      console.log(
        "[Notification] No active jobs, triggering cache invalidation for completed workout"
      );

      // Log state before invalidation
      console.log("[Notification] Before invalidation:", {
        needsFullAppRefresh,
        dashboardLoading: loading.dashboardLoading,
        workoutLoading: loading.workoutLoading,
        profileLoading: loading.profileLoading,
      });

      // Immediately invalidate cache and trigger refresh
      invalidateActiveWorkoutCache();
      setNeedsFullAppRefresh(true);
      setIsNotificationRefresh(true); // Track that this is a notification refresh

      // Reset all cached data
      reset();

      // Trigger fresh data load - this will show warming up screen during loading
      refreshAll();

      console.log(
        "[Notification] Triggering refreshAll, warming up should appear"
      );

      // Safety timeout to clear notification refresh flag after 10 seconds
      setTimeout(() => {
        console.log(
          "[Notification] Safety timeout: clearing isNotificationRefresh flag"
        );
        setIsNotificationRefresh(false);
      }, 10000);

      // Log state after invalidation
      setTimeout(() => {
        console.log("[Notification] After invalidation (100ms delay):", {
          needsFullAppRefresh: true, // We just set it
          dashboardLoading: loading.dashboardLoading,
          workoutLoading: loading.workoutLoading,
          profileLoading: loading.profileLoading,
        });
      }, 100);
    });

    return () => subscription.remove();
  }, [
    reset,
    refreshAll,
    setNeedsFullAppRefresh,
    needsFullAppRefresh,
    hasActiveJobs,
  ]);

  // Clear full app refresh flag when loading completes
  useEffect(() => {
    if (
      needsFullAppRefresh &&
      !loading.dashboardLoading &&
      !loading.workoutLoading &&
      !loading.profileLoading
    ) {
      console.log("Full app refresh complete, clearing flags");
      setNeedsFullAppRefresh(false);
      setIsPreloadingData(false); // Clear preloading flag
      setIsNotificationRefresh(false); // Also clear notification refresh flag
    }
  }, [
    needsFullAppRefresh,
    loading.dashboardLoading,
    loading.workoutLoading,
    loading.profileLoading,
    setNeedsFullAppRefresh,
    setIsPreloadingData,
  ]);

  // Show warming up screen only during full app refresh after workout generation
  if (isDoingFullAppRefresh) {
    console.log("[WarmingUp] Showing warming up screen");
    return (
      <WarmingUpScreen
        onComplete={() => {
          // This should never be called since we're waiting for loading to finish
          // But just in case, don't do anything
          console.log(
            "[WarmingUp] WarmingUpScreen onComplete called (unexpected)"
          );
        }}
        duration={5000} // Fallback duration, but we rely on loading states
      />
    );
  }

  return (
    <View className="flex-1">
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <WorkoutProvider>
        <AppDataProvider>
          <BackgroundJobProvider>
            <AppContent />
          </BackgroundJobProvider>
        </AppDataProvider>
      </WorkoutProvider>
    </AuthProvider>
  );
}
