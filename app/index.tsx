import { Ionicons } from "@expo/vector-icons";
import { usePathname,useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { Image,Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { images } from "@/assets";
import WarmingUpScreen from "@/components/ui/warming-up-screen";
import { hasAcceptedCurrentWaiver } from "@/constants/waiver";
import { useAuth } from "@/contexts/auth-context";
import { useDataPreload } from "@/hooks/use-data-preload";
import { useThemeColors } from "@/lib/theme";

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
    // Don't redirect if we already have
    if (hasRedirected.current) {
      return;
    }

    if (isAuthenticated && !isLoading && user) {
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
              style={{ width: 27, height: 25 }}
              resizeMode="contain"
            />
            <Text
              style={{
                fontSize: 19,
                fontWeight: "600",
                letterSpacing: -0.19,
                color: colors.text.primary,
              }}
            >
              MastersFit
            </Text>
          </View>
        </View>
      </View>

      {/* Body — anchored to the optical center (upper-middle), not dead-center */}
      <View
        style={{
          flex: 1,
          alignItems: "center",
          paddingHorizontal: 24,
        }}
      >
        {/* Fractional spacers pull the block above true center: 0.7 : 1 → sits at ~41% height */}
        <View style={{ flex: 0.7 }} />
        <Image
          source={images.welcomeHero}
          style={{
            width: 264,
            height: 264,
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
          Training that adapts to you.
        </Text>
        <Text
          style={{
            fontSize: 16,
            lineHeight: 24,
            color: colors.text.secondary,
            textAlign: "center",
            maxWidth: 300,
            marginTop: 12,
          }}
        >
          Built around your goals, your schedule, your equipment—and how your
          body moves today.
        </Text>
        {/* Larger bottom spacer balances the 0.7 top spacer, anchoring content above center */}
        <View style={{ flex: 1 }} />
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
            Get started with email
          </Text>
          <Ionicons name="arrow-forward" size={18} color={colors.contentOnPrimary} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 13,
            lineHeight: 20,
            color: colors.text.muted,
            textAlign: "center",
            marginTop: 12,
          }}
        >
          We’ll email you a secure code. No password needed.
        </Text>
      </View>
    </SafeAreaView>
  );
}
