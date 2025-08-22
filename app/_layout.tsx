import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { AuthProvider, useAuth } from "@contexts/AuthContext";
import { WorkoutProvider } from "@contexts/WorkoutContext";
import { AppDataProvider, useAppDataContext } from "@contexts/AppDataContext";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import GeneratingPlanScreen from "../components/ui/GeneratingPlanScreen";
import WarmingUpScreen from "../components/ui/WarmingUpScreen";
import { invalidateActiveWorkoutCache } from "@lib/workouts";
import "../global.css";


// Inner component that can access auth context
function AppContent() {
  const { isGeneratingWorkout, currentRegenerationType, setIsGeneratingWorkout, needsFullAppRefresh, setNeedsFullAppRefresh } = useAuth();
  const { refresh: { reset, refreshAll }, loading } = useAppDataContext();
  const router = useRouter();
  
  // Check if we need full app refresh and data is loading
  const isDoingFullAppRefresh = needsFullAppRefresh && (loading.dashboardLoading || loading.workoutLoading || loading.profileLoading);
  
  // Clear full app refresh flag when loading completes
  useEffect(() => {
    if (needsFullAppRefresh && !loading.dashboardLoading && !loading.workoutLoading && !loading.profileLoading) {
      console.log("Full app refresh complete, clearing flag");
      setNeedsFullAppRefresh(false);
    }
  }, [needsFullAppRefresh, loading.dashboardLoading, loading.workoutLoading, loading.profileLoading, setNeedsFullAppRefresh]);

  // Show global generating screen when workout is being generated/regenerated
  if (isGeneratingWorkout) {
    return (
      <GeneratingPlanScreen 
        regenerationType={currentRegenerationType}
        onComplete={() => {
          // Invalidate workout cache
          invalidateActiveWorkoutCache();
          // Reset all cached data
          reset();
          // Trigger fresh data load - this will show warming up screen during loading
          refreshAll();
          // Hide generating screen
          setIsGeneratingWorkout(false);
          // Keep needsFullAppRefresh true - it will be cleared when warming up completes
        }}
        onError={(error) => {
          console.error('Workout generation error:', error);
          setIsGeneratingWorkout(false);
          setNeedsFullAppRefresh(false); // Clear flag on error
        }}
      />
    );
  }

  // Show warming up screen only during full app refresh after workout generation
  if (isDoingFullAppRefresh) {
    return (
      <WarmingUpScreen
        onComplete={() => {
          // This should never be called since we're waiting for loading to finish
          // But just in case, don't do anything
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
          <AppContent />
        </AppDataProvider>
      </WorkoutProvider>
    </AuthProvider>
  );
}
