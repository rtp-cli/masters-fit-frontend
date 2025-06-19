import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface GeneratingPlanScreenProps {
  onComplete?: () => void;
}

export default function GeneratingPlanScreen({
  onComplete,
}: GeneratingPlanScreenProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const messages = [
    {
      text: "Analyzing your profile...",
      icon: "person-outline" as const,
      description: "Reviewing your fitness goals and preferences",
    },
    {
      text: "Matching optimal exercises...",
      icon: "fitness-outline" as const,
      description: "Finding the best exercises for your fitness level",
    },
    {
      text: "Creating your schedule...",
      icon: "calendar-outline" as const,
      description: "Building a weekly plan that fits your availability",
    },
    {
      text: "Finalizing your plan...",
      icon: "checkmark-circle-outline" as const,
      description: "Putting the finishing touches on your workout",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => {
        const next = (prev + 1) % messages.length;
        setProgress(((next + 1) / messages.length) * 100);
        return next;
      });
    }, 2500); // Change message every 2.5 seconds

    return () => clearInterval(interval);
  }, []);

  const currentMessage = messages[currentMessageIndex];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title}>Creating Your Custom Plan</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Our AI is analyzing your profile and generating a personalized fitness
          plan tailored specifically for you.
        </Text>

        {/* Loading Spinner - Centered */}
        <View style={styles.spinnerContainer}>
          <ActivityIndicator size="large" color="primary" />
        </View>

        {/* Current Status - Below spinner as smaller text */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{currentMessage.text}</Text>
          <Text style={styles.statusDescription}>
            {currentMessage.description}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 20,
    paddingBottom: 20,
  },
  logo: {
    height: 40,
    width: 120,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "gray-900",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: "gray-500",
    textAlign: "center",
    marginBottom: 48,
    lineHeight: 24,
  },
  spinnerContainer: {
    marginBottom: 24,
  },
  statusContainer: {
    alignItems: "center",
    maxWidth: 280,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
    color: "text-secondary",
    textAlign: "center",
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 12,
    color: "gray-500",
    textAlign: "center",
    lineHeight: 16,
  },
});
