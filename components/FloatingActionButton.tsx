import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Modal,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useBackgroundJobs } from "@contexts/BackgroundJobContext";
import { colors } from "@/lib/theme";
import { images } from "@/assets";

export default function FloatingActionButton() {
  const { activeJobs, hasActiveJobs: contextHasActiveJobs } =
    useBackgroundJobs();
  const [showModal, setShowModal] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0));
  const [hasAutoShownForGeneration, setHasAutoShownForGeneration] = useState(false);

  // Check if there are any active background jobs (generation, regeneration, daily-regeneration)
  const backgroundJobs = activeJobs.filter(
    (job) =>
      job.type === "generation" ||
      job.type === "regeneration" ||
      job.type === "daily-regeneration"
  );
  const hasActiveJobs = backgroundJobs.length > 0 || contextHasActiveJobs;

  // Debug logging for FAB
  useEffect(() => {
    console.log(`[FAB] Active background jobs: ${backgroundJobs.length}`);
    backgroundJobs.forEach((job) => {
      console.log(
        `[FAB] Job #${job.id}: ${job.type} - ${job.status} - ${job.progress}%`
      );
    });
  }, [backgroundJobs]);

  // Auto-show modal for new generation jobs (first-time experience)
  useEffect(() => {
    const newGenerationJobs = backgroundJobs.filter(
      (job) => job.type === "generation" && job.status === "pending"
    );
    
    // Auto-show modal if we have a new generation job and haven't auto-shown yet
    if (newGenerationJobs.length > 0 && !hasAutoShownForGeneration && !showModal) {
      console.log("[FAB] Auto-showing modal for new generation job");
      setHasAutoShownForGeneration(true);
      
      // Slight delay to ensure smooth navigation transition
      setTimeout(() => {
        setShowModal(true);
      }, 500);
    }
    
    // Reset flag when no active jobs (for future generations)
    if (backgroundJobs.length === 0) {
      setHasAutoShownForGeneration(false);
    }
  }, [backgroundJobs, hasAutoShownForGeneration, showModal]);

  // Animation for FAB appearance
  useEffect(() => {
    if (hasActiveJobs) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.spring(scaleAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [hasActiveJobs]);

  if (!hasActiveJobs) {
    return null;
  }

  const currentJob = backgroundJobs[0]; // Show the first active job

  return (
    <>
      <Animated.View
        style={{
          position: "absolute",
          bottom: 80,
          right: 20,
          transform: [{ scale: scaleAnim }],
          zIndex: 1000,
        }}
      >
        <TouchableOpacity
          className="bg-primary rounded-full w-16 h-16 items-center justify-center shadow-lg"
          onPress={() => setShowModal(true)}
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <View className="items-center">
            <Image
              source={images.icon}
              className="w-12 h-12"
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Progress Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <View className="items-center mb-4">
              <Ionicons name="barbell" size={48} color={colors.brand.primary} />
            </View>

            <Text className="text-xl font-bold text-text-primary mb-2 text-center">
              {currentJob.type === "generation"
                ? "Generating Workout"
                : currentJob.type === "regeneration"
                ? "Regenerating Workout Plan"
                : "Regenerating Daily Workout"}
            </Text>

            <Text className="text-base text-text-secondary text-center mb-6 leading-6">
              {currentJob.type === "generation"
                ? "Your new workout is being generated in the background."
                : currentJob.type === "regeneration"
                ? "Your workout plan is being regenerated in the background."
                : "Your daily workout is being regenerated in the background."}{" "}
              You can close this and continue using the app!
            </Text>

            {/* Job Details */}
            {currentJob.message && (
              <View className="bg-neutral-light-1 rounded-xl p-3 mb-6">
                <Text className="text-sm text-text-primary text-center">
                  {currentJob.message}
                </Text>
              </View>
            )}

            <TouchableOpacity
              className="bg-primary rounded-xl py-3 px-6"
              onPress={() => setShowModal(false)}
            >
              <Text className="text-white font-semibold text-center">
                Continue Using App
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
