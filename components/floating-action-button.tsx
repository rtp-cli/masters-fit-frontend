import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Modal,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useBackgroundJobs } from "@/contexts/background-job-context";
import { colors } from "@/lib/theme";
import { images } from "@/assets";

export default function FloatingActionButton() {
  const {
    activeJobs,
    failedJobs,
    hasActiveJobs: contextHasActiveJobs,
    cancelJob,
    removeJob,
  } = useBackgroundJobs();
  const [showModal, setShowModal] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));
  const autoShownJobIdsRef = useRef(new Set<number>());

  // Check if there are any active or failed background jobs (generation, regeneration, daily-regeneration)
  const activeBackgroundJobs = activeJobs.filter(
    (job) =>
      job.type === "generation" ||
      job.type === "regeneration" ||
      job.type === "daily-regeneration"
  );
  const failedBackgroundJobs = failedJobs.filter(
    (job) =>
      job.type === "generation" ||
      job.type === "regeneration" ||
      job.type === "daily-regeneration"
  );
  const backgroundJobs = [...activeBackgroundJobs, ...failedBackgroundJobs];
  const hasActiveJobs = backgroundJobs.length > 0 || contextHasActiveJobs;

  // Auto-show modal for new generation jobs (first-time experience) and failed jobs
  useEffect(() => {
    // Don't run auto-show logic if modal is already open
    if (showModal) return;

    const newGenerationJobs = activeBackgroundJobs.filter(
      (job) =>
        job.type === "generation" && !autoShownJobIdsRef.current.has(job.id)
    );

    const newFailedJobs = failedBackgroundJobs.filter(
      (job) =>
        job.status === "failed" && !autoShownJobIdsRef.current.has(job.id)
    );

    // Priority 1: Auto-show modal if we have a new generation job and haven't auto-shown it yet
    if (newGenerationJobs.length > 0) {
      const newJob = newGenerationJobs[0];
      // Mark this job as auto-shown immediately to prevent double-trigger
      autoShownJobIdsRef.current.add(newJob.id);

      // Use a ref to prevent multiple timeouts
      setTimeout(() => {
        if (!showModal) {
          // Double-check modal isn't already open
          setShowModal(true);
        }
      }, 500);
    }
    // Priority 2: Auto-show modal for failed jobs to notify user (only if no generation jobs)
    else if (newFailedJobs.length > 0) {
      const newJob = newFailedJobs[0];

      // Mark this job as auto-shown to prevent re-triggering
      autoShownJobIdsRef.current.add(newJob.id);

      setTimeout(() => {
        if (!showModal) {
          // Double-check modal isn't already open
          setShowModal(true);
        }
      }, 500);
    }
  }, [activeBackgroundJobs, failedBackgroundJobs, showModal]);

  // Reset tracking when no background jobs (separate effect to avoid dependency issues)
  useEffect(() => {
    if (backgroundJobs.length === 0) {
      autoShownJobIdsRef.current.clear();
    }
  }, [backgroundJobs.length]);

  // Handle showing cancel confirmation
  const handleCancelJob = () => {
    setShowCancelConfirmation(true);
  };

  // Handle confirmed cancellation
  const handleConfirmCancel = async (jobId: number) => {
    await cancelJob(jobId);
    setShowCancelConfirmation(false);
    setShowModal(false);
  };

  // Handle cancel confirmation dismissal
  const handleCancelConfirmationBack = () => {
    setShowCancelConfirmation(false);
    setShowModal(false);
  };

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

  // Pulse animation for active jobs
  useEffect(() => {
    if (hasActiveJobs) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [hasActiveJobs, pulseAnim]);

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
        <Animated.View
          style={{
            transform: [{ scale: pulseAnim }],
          }}
        >
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <View
              className="bg-primary rounded-full w-16 h-16 items-center justify-center"
              style={{
                backgroundColor: colors.brand.primary,
              }}
            >
              <Image
                source={images.icon}
                className="w-12 h-12 rounded-full"
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* Progress Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowModal(false);
          setShowCancelConfirmation(false);
        }}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            {showCancelConfirmation ? (
              // Cancel Confirmation UI
              <>
                <View className="items-center mb-4">
                  <Ionicons
                    name="warning"
                    size={48}
                    color={colors.brand.secondary}
                  />
                </View>

                <Text className="text-xl font-bold text-text-primary mb-2 text-center">
                  Cancel Generation?
                </Text>

                <Text className="text-base text-text-secondary text-center mb-6 leading-6">
                  Are you sure you want to cancel the workout generation? This
                  will stop the process and you'll need to start again.
                </Text>
              </>
            ) : (
              // Normal Job Status UI
              <>
                <View className="items-center mb-4">
                  <Ionicons
                    name="barbell"
                    size={48}
                    color={colors.brand.primary}
                  />
                </View>

                <Text className="text-xl font-bold text-text-primary mb-2 text-center">
                  {currentJob.status === "cancelled"
                    ? "Generation Cancelled"
                    : currentJob.status === "timeout"
                    ? "Generation Timed Out"
                    : currentJob.status === "failed"
                    ? "Generation Failed"
                    : currentJob.type === "generation"
                    ? "Generating Workout"
                    : currentJob.type === "regeneration"
                    ? "Regenerating Workout Plan"
                    : "Regenerating Daily Workout"}
                </Text>

                <Text className="text-base text-text-secondary text-center mb-6 leading-6">
                  {currentJob.status === "cancelled"
                    ? "The workout generation was cancelled. You can start a new generation at any time."
                    : currentJob.status === "timeout"
                    ? "The workout generation took too long and was stopped. Please check your internet connection or try again later."
                    : currentJob.status === "failed"
                    ? "The workout generation failed after multiple attempts. Please check your internet connection or try again later."
                    : currentJob.type === "generation"
                    ? "Your personalized, AI powered workout plan is on the way."
                    : currentJob.type === "regeneration"
                    ? "Your personalized, AI powered workout plan is on the way."
                    : "Your personalized, AI powered daily workout is on the way."}{" "}
                  {currentJob.status !== "cancelled" &&
                  currentJob.status !== "timeout" &&
                  currentJob.status !== "failed"
                    ? "Feel free to continue using the app —— we'll let you know as soon as it's ready!"
                    : ""}
                </Text>
              </>
            )}

            {/* Job Details - only show in normal mode */}
            {!showCancelConfirmation && currentJob.message && (
              <View className="bg-neutral-light-1 rounded-xl p-3 mb-6">
                <Text className="text-sm text-text-primary text-center">
                  {currentJob.message}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View className="space-y-3">
              {showCancelConfirmation ? (
                // Cancel Confirmation Buttons
                <>
                  <TouchableOpacity
                    className="bg-brand-primary mb-2 rounded-xl py-3 px-6"
                    onPress={handleCancelConfirmationBack}
                  >
                    <Text className="text-white  font-semibold text-center">
                      Keep Generating
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="bg-red-500 rounded-xl py-3 px-6"
                    onPress={() => handleConfirmCancel(currentJob.id)}
                  >
                    <Text className="text-white font-semibold text-center">
                      Cancel Generation
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                // Normal Action Buttons
                <>
                  {/* For failed jobs - only show dismiss button with red background */}
                  {currentJob &&
                  (currentJob.status === "failed" ||
                    currentJob.status === "cancelled" ||
                    currentJob.status === "timeout") ? (
                    <TouchableOpacity
                      className="bg-red-500 rounded-xl py-3 px-6"
                      onPress={() => {
                        setShowModal(false);
                        setShowCancelConfirmation(false);
                        // Remove the failed job from the list after a short delay
                        setTimeout(() => {
                          removeJob(currentJob.id);
                        }, 500);
                      }}
                    >
                      <Text className="text-white font-semibold text-center">
                        Dismiss
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    // For active jobs - show continue and cancel options
                    <>
                      <TouchableOpacity
                        className="bg-primary rounded-xl py-3 px-6"
                        onPress={() => {
                          setShowModal(false);
                          setShowCancelConfirmation(false);
                        }}
                      >
                        <Text className="text-white font-semibold text-center">
                          Continue Using App
                        </Text>
                      </TouchableOpacity>

                      {/* Cancel Button - only show for active jobs */}
                      {currentJob &&
                        (currentJob.status === "pending" ||
                          currentJob.status === "processing") && (
                          <TouchableOpacity
                            className="bg-red-500 rounded-xl mt-2 py-3 px-6 border border-red-200"
                            onPress={handleCancelJob}
                          >
                            <Text className="text-white font-semibold text-center">
                              Cancel Generation
                            </Text>
                          </TouchableOpacity>
                        )}
                    </>
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
