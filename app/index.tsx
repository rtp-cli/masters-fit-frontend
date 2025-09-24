import { View, Text, TouchableOpacity, Image } from "react-native";
import { colors } from "@/lib/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, usePathname } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import Header from "@/components/Header";
import WarmingUpScreen from "@/components/ui/WarmingUpScreen";
import { useDataPreload } from "@hooks/useDataPreload";
import { images } from "@/assets";

export default function GetStarted() {
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
      // Check if user has accepted waiver
      const hasAcceptedWaiver = user.waiverAcceptedAt !== null;

      if (!hasAcceptedWaiver) {
        // User needs to accept waiver - redirect to waiver screen
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

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <Text className="text-base text-neutral-medium-4">Loading...</Text>
      </View>
    );
  }

  // Show warming up screen when preloading data
  if (isPreloadingData) {
    return <WarmingUpScreen />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="dark" />

      {/* Header */}
      <Header />

      <View className="flex-1 px-6 justify-between pb-12">
        {/* Hero Section with Home Image */}
        <View className="flex-1 justify-center items-center">
          <Image
            key="home-hero-image"
            source={images.home}
            className="w-80 h-80 mb-10 rounded-lg"
            resizeMode="contain"
          />
          <Text className="text-xl font-bold text-text-primary text-center mb-4">
            Welcome to MastersFit!
          </Text>
          <Text className="text-base text-neutral-medium-4 text-center leading-6 px-5">
            AI-personalized fitness plans designed specifically for adults 40+
            to help you achieve your fitness goals safely and effectively.
          </Text>
        </View>

        {/* Get Started Button */}
        <TouchableOpacity
          className="bg-black py-4 px-6 rounded-md items-center flex-row justify-center"
          onPress={handleGetStarted}
        >
          <Text className="text-white text-base font-semibold mr-2">
            Get Started
          </Text>
          <Ionicons
            name="arrow-forward"
            size={20}
            color={colors.background}
            className="ml-1"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
