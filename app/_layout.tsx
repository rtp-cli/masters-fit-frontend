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
import { invalidateActiveWorkoutCache } from "@lib/workouts";
import "../global.css";


// Inner component that can access auth context
function AppContent() {
  const { isGeneratingWorkout, currentRegenerationType, setIsGeneratingWorkout, setIsPreloadingData } = useAuth();
  const { refresh: { reset } } = useAppDataContext();
  const router = useRouter();

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
          // Hide generating screen
          setIsGeneratingWorkout(false);
          // Don't show warming up screen - just let data refresh in background
          // User stays where they are with skeleton loading briefly
        }}
        onError={(error) => {
          console.error('Workout generation error:', error);
          setIsGeneratingWorkout(false);
        }}
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
