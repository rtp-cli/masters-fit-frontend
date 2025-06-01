import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";

interface GeneratingPlanScreenProps {
  onComplete?: () => void;
}

export default function GeneratingPlanScreen({
  onComplete,
}: GeneratingPlanScreenProps) {
  const [currentMessage, setCurrentMessage] = useState(
    "Analyzing your profile..."
  );

  const messages = [
    "Analyzing your profile...",
    "Matching with optimal exercises...",
    "Creating your personalized plan...",
    "Finalizing recommendations...",
  ];

  useEffect(() => {
    let messageIndex = 0;
    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setCurrentMessage(messages[messageIndex]);
    }, 2000); // Change message every 2 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <View className="flex-1 bg-neutral-light-1 justify-center items-center px-6">
      {/* Loading Spinner */}
      <View className="mb-8">
        <ActivityIndicator size="large" color="#BBDE51" />
      </View>

      {/* Title */}
      <Text className="text-2xl font-bold text-neutral-dark-1 text-center mb-4">
        Creating Your Custom Plan
      </Text>

      {/* Subtitle */}
      <Text className="text-base text-neutral-medium-4 text-center mb-8">
        Claude is analyzing your profile and generating a personalized fitness
        plan just for you.
      </Text>

      {/* Current Status */}
      <Text className="text-sm text-neutral-medium-4 text-center">
        {currentMessage}
      </Text>
    </View>
  );
}
