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



// Actual backend progress markers for reference:
// Weekly: 5% -> 20-90% (chunked AI) -> 95% -> 99% -> 100%
// Daily: 15% -> 50% -> 99% -> 100%
// Repeat: 5% -> 20% -> 40% -> 60% -> 85% -> 100%

// Speed configuration for different contexts
const SPEED_CONFIG: Record<
  RegenerationType,
  { increment: number; interval: number }
> = {
  daily: { increment: 0.8, interval: 250 }, // 50ms slower as requested
  weekly: { increment: 0.6, interval: 200 }, // Faster - weekly takes longer but still responsive
  repeat: { increment: 0.7, interval: 250 }, // Medium-fast - repeat is moderate
  initial: { increment: 0.5, interval: 300 }, // Faster - initial onboarding but still feels thoughtful
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
  const [isAnimating, setIsAnimating] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Reset state when regeneration type changes or component mounts
  useEffect(() => {
    console.log(`Resetting progress state for ${regenerationType} regeneration`);
    setProgress(0);
    setLastReceivedProgress(0);
    setIsAnimating(false);
    setIsCompleted(false);
    setHasError(false);
    setCurrentMessage("Loading your fitness profile...");
  }, [regenerationType]);

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

          // If completion signal, mark as completed but don't interrupt ongoing animations
          if (progressData.complete || progressData.progress === 100) {
            console.log("Workout generation completed - marking for completion");
            setIsCompleted(true);
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

  // Smooth progress animation to backend checkpoints
  useEffect(() => {
    if (lastReceivedProgress <= 0 || lastReceivedProgress >= 100) return;

    // Only animate if we need to catch up to backend progress
    if (lastReceivedProgress > progress) {
      console.log(
        `Animating progress from ${progress}% to ${lastReceivedProgress}%`
      );

      setIsAnimating(true);
      const startProgress = progress;
      const endProgress = lastReceivedProgress;
      const progressDifference = endProgress - startProgress;
      const speedConfig = SPEED_CONFIG[regenerationType];

      // Calculate duration based on speed config and progress difference
      // Each increment represents roughly 1% progress
      const estimatedSteps = progressDifference / speedConfig.increment;
      const totalDuration = estimatedSteps * speedConfig.interval;

      const startTime = Date.now();
      let animationId: number;
      let cancelled = false;

      const animateToCheckpoint = () => {
        if (cancelled) return;
        
        const elapsed = Date.now() - startTime;
        const ratio = Math.min(elapsed / totalDuration, 1);
        const easedRatio = 1 - Math.pow(1 - ratio, 2); // easeOutQuad for smooth animation

        const newProgress = startProgress + progressDifference * easedRatio;
        setProgress(newProgress);

        if (ratio < 1) {
          animationId = requestAnimationFrame(animateToCheckpoint);
        } else {
          setProgress(endProgress);
          setIsAnimating(false);
        }
      };

      animationId = requestAnimationFrame(animateToCheckpoint);
      
      // Cleanup function to cancel animation
      return () => {
        cancelled = true;
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      };
    }
  }, [lastReceivedProgress, progress, regenerationType]);

  // Handle completion after animations finish - always animate to 100% when completed
  useEffect(() => {
    if (isCompleted && !isAnimating) {
      console.log(`Backend signaled completion, animating from ${progress}% to 100%`);
      
      const startProgress = progress;
      const startTime = Date.now();
      const remainingProgress = 100 - startProgress;
      
      // Dynamic duration based on remaining progress
      // More time for larger gaps, minimum 800ms, maximum 2500ms
      const baseDuration = Math.max(800, Math.min(2500, remainingProgress * 30));
      const duration = baseDuration;

      let animationId: number;
      let timeoutId: NodeJS.Timeout;
      let cancelled = false;

      const animateToCompletion = () => {
        if (cancelled) return;
        
        const elapsed = Date.now() - startTime;
        const ratio = Math.min(elapsed / duration, 1);
        const easedRatio = 1 - Math.pow(1 - ratio, 2); // easeOutQuad for smooth finish

        const newProgress = startProgress + remainingProgress * easedRatio;
        setProgress(newProgress);

        if (ratio < 1) {
          animationId = requestAnimationFrame(animateToCompletion);
        } else {
          // Ensure we're at exactly 100%
          setProgress(100);
          // Wait additional time to let user see 100% completion
          timeoutId = setTimeout(() => {
            if (!cancelled) {
              onComplete?.();
            }
          }, 1500); // 1.5 seconds to appreciate the completion
        }
      };

      animationId = requestAnimationFrame(animateToCompletion);
      
      // Cleanup function
      return () => {
        cancelled = true;
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }
  }, [isCompleted, isAnimating, progress, onComplete]);

  // Fallback progress animation when WebSocket fails
  useEffect(() => {
    if (!useWebSocket || socket) return;

    const timeout = setTimeout(() => {
      if (!socket) {
        console.log("WebSocket not connected, using fallback progress");
        const speedConfig = SPEED_CONFIG[regenerationType];

        const interval = setInterval(() => {
          setProgress((prev) => {
            const next = Math.min(prev + speedConfig.increment, 90); // Stop at 90% without WebSocket
            if (next >= 90) {
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

  // Message rotation timer - change message every 5 seconds
  useEffect(() => {
    // Set initial message
    setCurrentMessage(getEngagingMessage(progress, regenerationType));

    const messageInterval = setInterval(() => {
      // Get a fresh random message every 5 seconds regardless of progress
      setCurrentMessage(getEngagingMessage(progress, regenerationType));
    }, 5000); // 5 seconds

    return () => clearInterval(messageInterval);
  }, [regenerationType]); // Only depend on regenerationType, not progress

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
