import React, { useEffect, useState } from "react";
import { View, Text, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../lib/theme";
import { images } from "@/assets";
import { getCurrentUser } from "@lib/auth";
import { io, Socket } from "socket.io-client";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "../../config";

interface ProgressEvent {
  progress: number; // 0-100
  complete?: boolean;
  error?: string;
}

type RegenerationType = "daily" | "weekly" | "repeat" | "initial";

interface GeneratingPlanScreenProps {
  onComplete?: () => void;
  onError?: (error: string) => void;
  useWebSocket?: boolean;
  regenerationType?: RegenerationType; // Context for intelligent progress
}

// Engaging messages by category
const engagingMessages = {
  "Fitness Wit & Puns": [
    "Working out the details... literally",
    "Reps and representatives are being calculated",
    "Flexing my computational muscles",
    "Stretching the possibilities",
    "No pain, no computational gain",
  ],
  "Personalization & Goals": [
    "Getting to know your fitness goals...",
    "Mapping out what works with your real schedule...",
    "Checking what equipment you've got to work with...",
    "Finding moves that play nice with your joints...",
    "Timing your recovery like a pro...",
    "Making every minute count for maximum impact...",
  ],
  "Recovery & Mobility": [
    "Planning your warm-ups and cool-downs...",
    "Respecting your body's recovery wisdom...",
    "Building in mobility and flexibility focus...",
  ],
  Finalization: [
    "Putting the final touches on your perfect plan...",
    "Almost ready to unleash your personalized program...",
    "Just need 30 more seconds to make this perfect...",
  ],
};

// Smart message mapping by progress range and regeneration type
const getProgressMessageCategories = (
  progress: number,
  regenerationType: RegenerationType
): string[] => {
  if (progress >= 95) return ["Finalization"];
  if (progress >= 80) return ["Recovery & Mobility", "Finalization"];
  if (progress >= 60) return ["Personalization & Goals", "Recovery & Mobility"];
  if (progress >= 40) return ["Fitness Wit & Puns", "Personalization & Goals"];
  if (progress >= 20) return ["Fitness Wit & Puns", "Personalization & Goals"];

  // Different starting messages based on type
  if (regenerationType === "initial")
    return ["Personalization & Goals", "Recovery & Mobility"];
  return ["Fitness Wit & Puns", "Personalization & Goals"];
};

// Get engaging message with randomization and context awareness
const getEngagingMessage = (
  progress: number,
  regenerationType: RegenerationType
): string => {
  const categories = getProgressMessageCategories(progress, regenerationType);

  // Pick a random category from available ones
  const selectedCategory =
    categories[Math.floor(Math.random() * categories.length)];

  // Pick a random message from that category
  const categoryMessages =
    engagingMessages[selectedCategory as keyof typeof engagingMessages];
  const selectedMessage =
    categoryMessages[Math.floor(Math.random() * categoryMessages.length)];

  return selectedMessage;
};

// Keep track of current message to avoid too frequent changes
let currentProgressMessage = "";
let lastProgressRange = -1;

const getMessageForProgress = (
  progress: number,
  regenerationType: RegenerationType
): string => {
  const progressRange = Math.floor(progress / 20) * 20; // Group by 20% ranges

  // Only change message when we move to a new range
  if (progressRange !== lastProgressRange) {
    currentProgressMessage = getEngagingMessage(progress, regenerationType);
    lastProgressRange = progressRange;
  }

  return currentProgressMessage || "Creating your workout plan...";
};

// Milestone patterns for different regeneration types
const MILESTONE_PATTERNS: Record<RegenerationType, number[]> = {
  weekly: [5, 85, 100], // + dynamic chunked 10-85%
  daily: [5, 15, 75, 100],
  repeat: [5, 20, 40, 60, 85, 100],
  initial: [5, 85, 100],
};

// Speed configuration for different contexts
const SPEED_CONFIG: Record<
  RegenerationType,
  { increment: number; interval: number }
> = {
  daily: { increment: 0.3, interval: 250 }, // Fast - daily is quick
  weekly: { increment: 0.15, interval: 250 }, // Slower - weekly takes longer
  repeat: { increment: 0.25, interval: 300 }, // Medium - repeat is moderate
  initial: { increment: 0.15, interval: 350 }, // Slower - initial onboarding
};

export default function GeneratingPlanScreen({
  onComplete,
  onError,
  useWebSocket = true,
  regenerationType = "initial",
}: GeneratingPlanScreenProps) {
  const [progress, setProgress] = useState(0);
  const [lastReceivedProgress, setLastReceivedProgress] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [hasError, setHasError] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(
    "Loading your fitness profile..."
  );

  // WebSocket progress effect
  useEffect(() => {
    if (!useWebSocket) return;

    let mounted = true;

    const initializeSocket = async () => {
      try {
        const user = await getCurrentUser();
        const token = await SecureStore.getItemAsync("token");
        if (!user || !token || !mounted) return;

        // Create socket connection using the same base URL as API calls
        const socketUrl = API_URL.replace("/api", "");
        const newSocket = io(socketUrl, {
          auth: {
            token: token,
          },
        });

        newSocket.on("connect", () => {
          // Join user-specific room
          newSocket.emit("join-user-room", user.id);
        });

        newSocket.on("workout-progress", (progressData: ProgressEvent) => {
          if (!mounted) return;

          console.log("Progress update received:", progressData);
          setLastReceivedProgress(progressData.progress);
          setCurrentMessage(
            getMessageForProgress(progressData.progress, regenerationType)
          );

          // If completion signal, immediately jump to 100%
          if (progressData.complete || progressData.progress === 100) {
            console.log("Workout generation completed");
            setProgress(100);
            setTimeout(() => {
              onComplete?.();
            }, 800); // Slightly longer delay to show 100%
          } else if (progressData.error) {
            console.error("Workout generation failed", progressData.error);
            setHasError(true);
            onError?.(progressData.error || "Unknown error");
          }
        });

        newSocket.on("disconnect", () => {
          console.log("WebSocket disconnected");
        });

        newSocket.on("connect_error", (error) => {
          if (!mounted) return;

          console.error("WebSocket connection error", error);
          setHasError(true);
          onError?.("Connection error");
        });

        setSocket(newSocket);
      } catch (error) {
        if (!mounted) return;

        console.error("Error initializing WebSocket connection", error);
        setHasError(true);
        onError?.("Failed to initialize progress tracking");
      }
    };

    initializeSocket();

    return () => {
      mounted = false;
      if (socket) {
        socket.disconnect();
      }
    };
  }, [useWebSocket, onComplete, onError]);

  // Single intelligent progress manager
  useEffect(() => {
    if (lastReceivedProgress >= 100) return; // Completed

    const expectedMilestones = MILESTONE_PATTERNS[regenerationType];
    let speedConfig = SPEED_CONFIG[regenerationType];

    // Intelligent speed adjustment based on milestone position
    const totalMilestones = expectedMilestones.length;
    const milestonesReceived = expectedMilestones.filter(
      (m) => m <= lastReceivedProgress
    ).length;

    // Speed up when we're at the last milestone (before completion)
    const isNearEnd = milestonesReceived >= totalMilestones - 1; // At last milestone

    if (isNearEnd) {
      // Speed up significantly when we're at the final milestone
      speedConfig = {
        increment: speedConfig.increment * 5, // 5x faster
        interval: Math.floor(speedConfig.interval / 3), // 3x faster interval
      };
      console.log("Near completion, speeding up progress animation");
    }

    // Get next expected milestone
    const nextMilestone = expectedMilestones.find(
      (m) => m > lastReceivedProgress
    );
    if (!nextMilestone) return;

    // Calculate target (1% before next milestone)
    const targetBeforeNext = nextMilestone - 1;

    // If we've reached the target, check if we need to jump to received milestone
    if (progress >= targetBeforeNext && lastReceivedProgress > progress) {
      // Quick smooth jump to received milestone
      const startProgress = progress;
      const endProgress = lastReceivedProgress;
      const startTime = Date.now();
      const duration = isNearEnd ? 200 : 500; // Faster jump if near end

      const animateJump = () => {
        const elapsed = Date.now() - startTime;
        const ratio = Math.min(elapsed / duration, 1);
        const easedRatio = 1 - Math.pow(1 - ratio, 3); // easeOutCubic

        const newProgress =
          startProgress + (endProgress - startProgress) * easedRatio;
        setProgress(newProgress);

        if (ratio < 1) {
          requestAnimationFrame(animateJump);
        } else {
          setProgress(endProgress);
        }
      };

      requestAnimationFrame(animateJump);
      return;
    }

    // Continue incremental progress if below target
    if (progress < targetBeforeNext) {
      const interval = setInterval(() => {
        setProgress((currentProgress) => {
          if (currentProgress >= targetBeforeNext) {
            return currentProgress;
          }
          return Math.min(
            currentProgress + speedConfig.increment,
            targetBeforeNext
          );
        });
      }, speedConfig.interval);

      return () => clearInterval(interval);
    }
  }, [lastReceivedProgress, progress, regenerationType]);

  // Fallback progress animation when WebSocket fails
  useEffect(() => {
    if (!useWebSocket || socket) return;

    const timeout = setTimeout(() => {
      if (!socket) {
        console.log("WebSocket not connected, using fallback progress");
        const speedConfig = SPEED_CONFIG[regenerationType];

        const interval = setInterval(() => {
          setProgress((prev) => {
            const next = Math.min(prev + speedConfig.increment * 2, 95); // Stop at 95% without WebSocket
            setCurrentMessage(getMessageForProgress(next, regenerationType));
            if (next >= 95) {
              clearInterval(interval);
            }
            return next;
          });
        }, speedConfig.interval);

        return () => clearInterval(interval);
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, [useWebSocket, socket, regenerationType]);

  const getProgressBarColor = () => {
    if (hasError) return "#ef4444"; // red-500
    return colors.brand.primary;
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center items-center px-8">
        {/* Main Content */}
        <View className="items-center mb-12">
          {/* Logo */}
          <Image
            key="generating-plan-logo"
            source={images.icon}
            className="w-48 h-48 mb-8 rounded-lg"
            resizeMode="contain"
          />

          {/* Title */}
          <Text className="text-2xl font-bold text-text-primary mb-4 text-center">
            {hasError
              ? "Generation Failed"
              : progress >= 100
              ? "Plan Complete!"
              : "Creating Your Plan"}
          </Text>

          {/* Dynamic Message */}
          <Text className="text-base text-text-muted text-center mb-8 leading-6">
            {currentMessage}
          </Text>

          {/* Progress Bar - much larger and more prominent */}
          <View className="w-80 mb-8">
            <View className="bg-neutral-light-2 h-6 rounded-full overflow-hidden shadow-md">
              <View
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${progress}%`,
                  backgroundColor: getProgressBarColor(),
                  shadowColor: getProgressBarColor(),
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 },
                }}
              />
            </View>

            {/* Progress Percentage */}
            <Text className="text-base text-text-primary text-center mt-4 font-semibold">
              {Math.round(progress)}%
            </Text>
          </View>
        </View>

        {/* Bottom Message */}
        <View className="absolute bottom-8 left-8 right-8 mb-6">
          <Text className="text-sm text-text-muted text-center leading-5">
            {hasError
              ? "Please try again or contact support if the problem persists."
              : progress >= 100
              ? "Your personalized workout plan is ready!"
              : "We're building a workout plan tailored specifically for you. This process uses AI to analyze your goals and preferences."}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
