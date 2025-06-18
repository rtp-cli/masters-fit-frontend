import { View, Text, TouchableOpacity, Dimensions, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, usePathname } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

export default function GetStarted() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user, isGeneratingWorkout } = useAuth();
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

  // If user is already authenticated, redirect based on onboarding status
  useEffect(() => {
    // Don't redirect if we're generating a workout
    if (isGeneratingWorkout) {
      console.log("🚫 Skipping redirect - workout generation in progress");
      return;
    }

    // Don't redirect if user is in verification flow
    if (isVerifyingUser) {
      console.log("🚫 Skipping redirect - user in verification flow");
      return;
    }

    // Don't redirect if we already have
    if (hasRedirected.current) {
      console.log("🚫 Skipping redirect - already redirected");
      return;
    }

    if (isAuthenticated && !isLoading && user && isVerifyingUser !== null) {
      // Check if user has completed onboarding
      const needsOnboarding = user.needsOnboarding ?? true;

      console.log("🔀 Main redirect logic:", {
        isAuthenticated,
        isLoading,
        user: user?.email,
        needsOnboarding,
        isGeneratingWorkout,
        hasRedirected: hasRedirected.current,
        isVerifyingUser,
        currentPath: pathname,
      });

      if (!needsOnboarding) {
        // Only redirect to calendar if not already there
        if (pathname !== "/(tabs)/calendar") {
          console.log("✅ Redirecting to calendar - onboarding complete");
          hasRedirected.current = true;
          router.replace("/(tabs)/dashboard");
        } else {
          console.log("🚫 Already on calendar page, skipping redirect");
        }
      } else {
        // Only redirect to onboarding if not already there
        if (pathname !== "/(auth)/onboarding") {
          console.log("📋 Redirecting to onboarding - onboarding needed");
          hasRedirected.current = true;
          router.replace("/(auth)/onboarding");
        } else {
          console.log("🚫 Already on onboarding page, skipping redirect");
        }
      }
    }
  }, [
    isAuthenticated,
    isLoading,
    user?.needsOnboarding,
    isGeneratingWorkout,
    isVerifyingUser,
    pathname,
    router,
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
      <View className="flex-1 justify-center items-center bg-white">
        <Text className="text-base text-neutral-medium-4">Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-center pt-5">
        <Image
          source={require("../assets/logo.png")}
          className="h-10 w-30"
          resizeMode="contain"
        />
      </View>

      <View className="flex-1 px-6 justify-between pb-12">
        {/* Hero Section with Home Image */}
        <View className="flex-1 justify-center items-center">
          <Image
            source={require("../assets/home.png")}
            className="w-64 h-64"
            resizeMode="contain"
          />
        </View>

        {/* Text Content */}
        <View className="items-center my-10">
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
            color="#ffffff"
            className="ml-1"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
