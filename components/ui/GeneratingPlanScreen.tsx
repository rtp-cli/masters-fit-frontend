import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../lib/theme";

interface GeneratingPlanScreenProps {
  onComplete?: () => void;
  duration?: number;
}

const messages = [
  "Analyzing your fitness goals...",
  "Customizing exercises for your level...",
  "Selecting optimal workout structure...",
  "Finalizing your personalized plan...",
];

export default function GeneratingPlanScreen({
  onComplete,
  duration = 8000,
}: GeneratingPlanScreenProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, duration / messages.length);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          clearInterval(messageInterval);
          onComplete?.();
          return 100;
        }
        return prev + 1;
      });
    }, duration / 100);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, [duration, onComplete]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center items-center px-8">
        {/* Main Content */}
        <View className="items-center mb-12">
          {/* Animated Spinner */}
          <View className="mb-8">
            <ActivityIndicator size="large" color={colors.brand.primary} />
          </View>

          {/* Title */}
          <Text className="text-2xl font-bold text-text-primary mb-4 text-center">
            Creating Your Plan
          </Text>

          {/* Dynamic Message */}
          <Text className="text-base text-text-muted text-center mb-8 leading-6">
            {messages[currentMessageIndex]}
          </Text>

          {/* TODO: Make this real */}
          {/* Progress Bar */}
          {/* <View className="w-full max-w-xs">
            <View className="bg-neutral-light-2 rounded-full h-2 mb-2">
              <View
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </View>
            <Text className="text-xs text-text-muted text-center">
              {progress}% Complete
            </Text>
          </View> */}
        </View>

        {/* Bottom Message */}
        <View className="absolute bottom-8 left-8 right-8">
          <Text className="text-sm text-text-muted text-center leading-5">
            We're building a workout plan tailored specifically for you. This
            usually takes just a few moments.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
