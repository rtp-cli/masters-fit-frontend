import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../lib/theme";

interface AsyncGenerationModalProps {
  visible: boolean;
  onContinueBackground: () => void;
  onStayAndWatch: () => void;
  onClose: () => void;
  jobId?: number;
  jobType: 'generation' | 'regeneration' | 'daily-regeneration';
  progress?: number; // 0-100
  estimatedTimeRemaining?: number; // in seconds
}

const AsyncGenerationModal: React.FC<AsyncGenerationModalProps> = ({
  visible,
  onContinueBackground,
  onStayAndWatch,
  onClose,
  jobId,
  jobType,
  progress = 0,
  estimatedTimeRemaining,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getTitle = () => {
    switch (jobType) {
      case 'generation':
        return 'Creating Your Workout 💪';
      case 'regeneration':
        return 'Regenerating Workout 🔄';
      case 'daily-regeneration':
        return 'Regenerating Today\'s Workout ⚡';
      default:
        return 'Processing...';
    }
  };

  const getDescription = () => {
    switch (jobType) {
      case 'generation':
        return 'Our AI is crafting a personalized workout plan tailored to your goals, fitness level, and preferences.';
      case 'regeneration':
        return 'Regenerating your entire workout plan with your latest preferences and feedback.';
      case 'daily-regeneration':
        return 'Creating a fresh workout for today based on your feedback and current progress.';
      default:
        return 'Please wait while we process your request...';
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}
          className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
        >
          {/* Header */}
          <View className="items-center mb-4">
            <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center mb-3">
              <Ionicons name="fitness" size={32} color={colors.primary} />
            </View>
            <Text className="text-xl font-semibold text-text-primary text-center">
              {getTitle()}
            </Text>
          </View>

          {/* Description */}
          <Text className="text-text-secondary text-center mb-6 leading-5">
            {getDescription()}
          </Text>

          {/* Progress Section */}
          {jobId && (
            <View className="mb-6">
              {/* Progress Bar */}
              <View className="w-full h-2 bg-gray-200 rounded-full mb-3">
                <View
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(10, progress)}%` }}
                />
              </View>

              {/* Progress Info */}
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-text-muted">
                  {progress > 0 ? `${Math.round(progress)}% complete` : 'Starting...'}
                </Text>
                {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
                  <Text className="text-sm text-text-muted">
                    ~{formatTime(estimatedTimeRemaining)} left
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Loading Animation */}
          <View className="flex-row justify-center items-center mb-6">
            <ActivityIndicator size="small" color={colors.primary} />
            <Text className="ml-2 text-text-muted text-sm">
              AI is thinking...
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="space-y-3">
            <TouchableOpacity
              onPress={onContinueBackground}
              className="bg-primary py-4 rounded-xl"
            >
              <Text className="text-white text-center font-medium">
                Continue in Background
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onStayAndWatch}
              className="bg-gray-100 py-4 rounded-xl"
            >
              <Text className="text-text-primary text-center font-medium">
                Stay & Watch Progress
              </Text>
            </TouchableOpacity>
          </View>

          {/* Fine Print */}
          <Text className="text-xs text-text-muted text-center mt-4">
            We'll send you a notification when your workout is ready!
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default AsyncGenerationModal;