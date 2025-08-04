import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../lib/theme";
import { Image } from "react-native";

interface WarmingUpScreenProps {
  onComplete?: () => void;
  duration?: number;
}

const messages = [
  "Loading your personalized dashboard...",
  "Fetching your workout history...",
  "Preparing your fitness insights...",
  "Almost ready to get started...",
];

export default function WarmingUpScreen({
  onComplete,
  duration = 8000,
}: WarmingUpScreenProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, duration / messages.length);

    return () => {
      clearInterval(messageInterval);
    };
  }, [duration]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center items-center px-8">
        {/* Main Content */}
        <View className="items-center mb-12">
          <Image
            source={require("../../assets/icon.png")}
            className="w-48 h-48 mb-8 rounded-lg"
            resizeMode="contain"
          />
          {/* Title */}
          <Text className="text-2xl font-bold text-text-primary mb-4 text-center">
            Warming Up MastersFit
          </Text>
          {/* Dynamic Message */}
          <Text className="text-base text-text-muted text-center mb-8 leading-6">
            {messages[currentMessageIndex]}
          </Text>
          {/* Animated Spinner */}
          <View className="mb-8">
            <ActivityIndicator size="large" color={colors.brand.primary} />
          </View>
        </View>

        {/* Bottom Message */}
        <View className="absolute bottom-8 left-8 right-8 mb-6">
          <Text className="text-sm text-text-muted text-center leading-5">
            Delivering personalized, AI-powered workouts built just for you.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
