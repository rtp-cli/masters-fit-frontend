import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { AuthProvider, useAuth } from "@contexts/AuthContext";
import { WorkoutProvider } from "@contexts/WorkoutContext";
import { AppDataProvider } from "@contexts/AppDataContext";
import DebugButton from "../components/DebugButton";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import GeneratingPlanScreen from "../components/ui/GeneratingPlanScreen";
import "../global.css";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Inner component that can access auth context
function AppContent() {
  const { isGeneratingWorkout } = useAuth();

  // Show global generating screen when workout is being generated/regenerated
  if (isGeneratingWorkout) {
    return <GeneratingPlanScreen />;
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

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

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
