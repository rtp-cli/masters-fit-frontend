import { View, Text, TouchableOpacity, Dimensions, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";

export default function GetStarted() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // If user is already authenticated, redirect to main app
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace("/(tabs)/calendar");
    }
  }, [isAuthenticated, isLoading, router]);

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
      <View className="flex-row items-center justify-between px-5 pt-2.5 pb-5">
        <TouchableOpacity className="w-10 h-10 justify-center items-center">
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Image
          source={require("../assets/logo.png")}
          className="h-10 w-30"
          resizeMode="contain"
        />
        <View className="w-10" />
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
          <Text className="text-3xl font-bold text-text-primary text-center mb-4">
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
