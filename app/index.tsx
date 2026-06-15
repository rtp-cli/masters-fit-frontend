import { View, Text, TouchableOpacity, Image } from "react-native";
import { useThemeColors } from "@/lib/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, usePathname } from "expo-router";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import WarmingUpScreen from "@/components/ui/warming-up-screen";
import { useDataPreload } from "@/hooks/use-data-preload";
import { images } from "@/assets";
import { hasAcceptedCurrentWaiver } from "@/constants/waiver";

export default function GetStarted() {
  const colors = useThemeColors();
  const router = useRouter();
  const pathname = usePathname();
  const {
    isAuthenticated,
    isLoading,
    user,
    isGeneratingWorkout,
    isPreloadingData,
    setIsPreloadingData,
  } = useAuth();
  const { preloadAllData } = useDataPreload();
  const hasRedirected = useRef(false);
  const [isVerifyingUser, setIsVerifyingUser] = useState<boolean | null>(null);

  // Check if user is in verification flow
  useEffect(() => {
    const checkVerificationFlag = async () => {
      try {
        const flag = await SecureStore.getItemAsync("isVerifyingUser");
        setIsVerifyingUser(!!flag);
      } catch (error) {
        setIsVerifyingUser(false);
      }
    };
    checkVerificationFlag();
  }, []);

  // Handle data preloading completion
  useEffect(() => {
    if (isPreloadingData && user && !isLoading) {
      const handlePreloadComplete = async () => {
        await preloadAllData();
        setIsPreloadingData(false);
        hasRedirected.current = true;
        router.replace("/(tabs)/dashboard");
      };

      handlePreloadComplete();
    }
  }, [
    isPreloadingData,
    user,
    isLoading,
    preloadAllData,
    setIsPreloadingData,
    router,
  ]);

  // If user is already authenticated, redirect based on onboarding status
  useEffect(() => {
    // Don't redirect if user is in verification flow
    if (isVerifyingUser) {
      return;
    }

    // Don't redirect if we already have
    if (hasRedirected.current) {
      return;
    }

    if (isAuthenticated && !isLoading && user && isVerifyingUser !== null) {
      // Check if user has accepted the current waiver version
      const hasValidWaiver = hasAcceptedCurrentWaiver(
        user.waiverAcceptedAt || null,
        user.waiverVersion || null
      );

      if (!hasValidWaiver) {
        // User needs to accept waiver (first time or version update) - redirect to waiver screen
        if (pathname !== "/(auth)/waiver") {
          hasRedirected.current = true;
          router.replace("/(auth)/waiver");
        }
        return;
      }

      // Check if user has completed onboarding
      // Default to false for existing users (null means they're old users who already onboarded)
      const needsOnboarding = user.needsOnboarding ?? false;

      if (needsOnboarding) {
        // User needs onboarding - redirect to onboarding screen
        if (pathname !== "/(auth)/onboarding") {
          hasRedirected.current = true;
          router.replace("/(auth)/onboarding");
        }
      } else {
        // User has completed onboarding - redirect to dashboard
        // Even if generating workout or preloading data, authenticated users should see dashboard
        if (!isPreloadingData) {
          setIsPreloadingData(true);
        }
      }
    }
  }, [
    isAuthenticated,
    isLoading,
    user?.needsOnboarding,
    user?.waiverAcceptedAt,
    user?.waiverVersion,
    isGeneratingWorkout,
    isPreloadingData,
    isVerifyingUser,
    pathname,
    router,
    setIsPreloadingData,
  ]);

  // Reset redirect flag when authentication state changes (e.g., logout)
  useEffect(() => {
    if (!isAuthenticated) {
      hasRedirected.current = false;
    }
  }, [isAuthenticated]);

  const handleGetStarted = () => {
    router.push("/(auth)/login");
  };

  // Show warming up screen when preloading data
  if (isPreloadingData) {
    return <WarmingUpScreen />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />

      {/* Header — brand lockup centered, 40px spacers on both sides (no back button) */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: 14,
          paddingHorizontal: 20,
        }}
      >
        <View style={{ width: 40, height: 40 }} />
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 14,
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Image
              source={require("../assets/logo-dark.png")}
              style={{ width: 24, height: 22 }}
              resizeMode="contain"
            />
            <Text
              style={{
                fontSize: 17,
                fontWeight: "600",
                letterSpacing: -0.17,
                color: colors.text.primary,
              }}
            >
              MastersFit
            </Text>
          </View>
        </View>
      </View>

      {/* Body — centered vertically and horizontally */}
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
        }}
      >
        <Image
          source={images.home}
          style={{
            width: 240,
            height: 240,
            borderRadius: 9999,
            marginBottom: 32,
          }}
          resizeMode="cover"
        />
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            letterSpacing: -0.56,
            lineHeight: 32.5,
            color: colors.text.primary,
            textAlign: "center",
          }}
        >
          Welcome to MastersFit!
        </Text>
        <Text
          style={{
            fontSize: 15,
            lineHeight: 24,
            color: colors.text.muted,
            textAlign: "center",
            maxWidth: 300,
            marginTop: 12,
          }}
        >
          AI-personalized fitness plans designed specifically for adults 40+ to
          help you achieve your fitness goals safely and effectively.
        </Text>
      </View>

      {/* Footer */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: 24,
        }}
      >
        <TouchableOpacity
          style={{
            width: "100%",
            height: 56,
            backgroundColor: colors.brand.primary,
            borderRadius: 9999,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
          onPress={handleGetStarted}
        >
          <Text
            style={{
              color: colors.contentOnPrimary,
              fontSize: 17,
              fontWeight: "600",
            }}
          >
            Get Started
          </Text>
          <Ionicons name="arrow-forward" size={18} color={colors.contentOnPrimary} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
