import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Platform,
  View,
  useColorScheme as useSystemColorScheme,
} from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { WorkoutProvider } from "@/contexts/workout-context";
import {
  AppDataProvider,
  useAppDataContext,
} from "@/contexts/app-data-context";
import {
  BackgroundJobProvider,
  useBackgroundJobs,
} from "@/contexts/background-job-context";
import { WaiverProvider } from "@/contexts/waiver-context";
import { MixpanelProvider } from "@/contexts/mixpanel-context";
import { VoiceAssistantProvider } from "@/contexts/voice-assistant-context";
import { useFonts } from "expo-font";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from "@expo-google-fonts/manrope";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import WarmingUpScreen from "@/components/ui/warming-up-screen";
import { invalidateActiveWorkoutCache } from "@lib/workouts";
import {
  registerForPushNotifications,
  addNotificationResponseListener,
  setupNotificationCategories,
} from "@/lib/notifications";
import "../global.css";
import { ensureHealthConnectInitialized } from "@utils/health";
import * as NavigationBar from "expo-navigation-bar";
import { colorThemes, themes, ThemeKey } from "@/lib/theme";
import { ThemeContext, ThemeMode, ColorTheme, useTheme } from "@/lib/theme-context";

import { FloatingNetworkLoggerButton } from "@/components/ui/floating-network-logger-button";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme as useNativeWindColorScheme } from "nativewind";
import * as TrackingTransparency from "expo-tracking-transparency";

const THEME_KEY = "@theme_preference";
const COLOR_THEME_KEY = "@color_theme";

// Re-export useTheme for backward compatibility
export { useTheme } from "@/lib/theme-context";

// Inner wrapper for StatusBar and Android navigation bar
function SystemUIWrapper({ children }: { children: React.ReactNode }) {
  const { isDark, colorTheme } = useTheme();
  const palette = colorThemes[colorTheme];
  const themeColors = isDark ? { ...palette.light, ...palette.dark } : palette.light;

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setBackgroundColorAsync(themeColors.background).catch(
        () => {}
      );
      NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark").catch(
        () => {}
      );
    }
  }, [themeColors.background, isDark]);

  return (
    <>
      <StatusBar
        style={isDark ? "light" : "dark"}
        backgroundColor={themeColors.background}
      />
      {children}
    </>
  );
}

// Inner component that can access auth context
function AppContent() {
  const {
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

  // Initialize RevenueCat
  useEffect(() => {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

    if (Platform.OS === "ios") {
      Purchases.configure({
        apiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
      });
    } else if (Platform.OS === "android") {
      Purchases.configure({
        apiKey: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY,
      });
    }
  }, []);

  useEffect(() => {
    ensureHealthConnectInitialized();
  }, []);

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
          // Setup notification categories first
          await setupNotificationCategories();
          console.log("Notification categories set up");

          // Register for push notifications
          await registerForPushNotifications();
          console.log("Push notifications registered");
        } catch (error) {
          console.error("Error initializing notifications:", error);
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
    <View className="flex-1 bg-background">
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="network-logger"
          options={{
            presentation: "modal",
          }}
        />
      </Stack>
      <FloatingNetworkLoggerButton />
    </View>
  );
}

// Memoized provider tree to prevent re-mounting when theme class changes
const StableProviderTree = React.memo(function StableProviderTree() {
  return (
    <MixpanelProvider>
      <AuthProvider>
        <WaiverProvider>
          <WorkoutProvider>
            <AppDataProvider>
              <BackgroundJobProvider>
                <VoiceAssistantProvider>
                  <SystemUIWrapper>
                    <AppContent />
                  </SystemUIWrapper>
                </VoiceAssistantProvider>
              </BackgroundJobProvider>
            </AppDataProvider>
          </WorkoutProvider>
        </WaiverProvider>
      </AuthProvider>
    </MixpanelProvider>
  );
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  // Theme state managed at absolute root level
  const [mode, setMode] = useState<ThemeMode>("auto");
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("original");
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);
  const systemColorScheme = useSystemColorScheme();
  const { setColorScheme } = useNativeWindColorScheme();

  // Calculate isDark based on mode and system preference
  const isDark =
    mode === "auto" ? systemColorScheme === "dark" : mode === "dark";

  // Request App Tracking Transparency permission on iOS
  useEffect(() => {
    const requestTrackingPermission = async () => {
      if (Platform.OS === "ios") {
        try {
          const { status } =
            await TrackingTransparency.requestTrackingPermissionsAsync();
          console.log("ATT permission status:", status);
        } catch (error) {
          console.error("Error requesting ATT permission:", error);
        }
      }
    };

    // Request permission as early as possible after fonts are loaded
    if (fontsLoaded || fontError) {
      requestTrackingPermission();
    }
  }, [fontsLoaded, fontError]);

  // Load theme preferences on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const [savedMode, savedColorTheme] = await Promise.all([
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(COLOR_THEME_KEY),
        ]);

        if (savedMode && ["light", "dark", "auto"].includes(savedMode)) {
          setMode(savedMode as ThemeMode);
          // Sync with NativeWind
          if (savedMode === "auto") {
            setColorScheme("system");
          } else {
            setColorScheme(savedMode as "light" | "dark");
          }
        }

        if (
          savedColorTheme &&
          ["original", "steel-blue", "dusty-denim", "dusty-sage"].includes(
            savedColorTheme
          )
        ) {
          setColorThemeState(savedColorTheme as ColorTheme);
        }
      } catch (error) {
        console.error("Failed to load theme:", error);
      } finally {
        setIsThemeLoaded(true);
      }
    };
    loadTheme();
  }, [setColorScheme]);

  // Function to update theme mode
  const setThemeMode = useCallback(
    (newMode: ThemeMode) => {
      setMode(newMode);
      if (newMode === "auto") {
        setColorScheme("system");
      } else {
        setColorScheme(newMode);
      }
      AsyncStorage.setItem(THEME_KEY, newMode).catch((error) => {
        console.error("Failed to save theme:", error);
      });
    },
    [setColorScheme]
  );

  // Function to update color theme
  const setColorTheme = useCallback((newColorTheme: ColorTheme) => {
    setColorThemeState(newColorTheme);
    AsyncStorage.setItem(COLOR_THEME_KEY, newColorTheme).catch((error) => {
      console.error("Failed to save color theme:", error);
    });
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  // This fixes navigation context errors when toggling theme
  const themeContextValue = useMemo(
    () => ({ mode, isDark, colorTheme, setThemeMode, setColorTheme }),
    [mode, isDark, colorTheme, setThemeMode, setColorTheme]
  );

  // Generate combined theme key for selecting the correct theme variant
  const themeKey = useMemo(
    () => `${colorTheme}-${isDark ? "dark" : "light"}` as ThemeKey,
    [colorTheme, isDark]
  );

  // Return null until fonts are loaded - prevents Expo Router from pre-rendering routes
  if (!fontsLoaded && !fontError) {
    return null;
  }

  // Wait for theme to load to prevent flash
  if (!isThemeLoaded) {
    return null;
  }

  return (
    <View
      key={`theme-${themeKey}`}
      className="flex-1"
      style={themes[themeKey]}
    >
      <ThemeContext.Provider value={themeContextValue}>
        <StableProviderTree />
      </ThemeContext.Provider>
    </View>
  );
}
