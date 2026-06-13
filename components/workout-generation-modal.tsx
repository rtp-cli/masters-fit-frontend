import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Animated,
  Easing,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBackgroundJobs } from "@/contexts/background-job-context";
import { useWorkoutProgress } from "@/hooks/use-workout-progress";
import { useThemeColors } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import { images } from "@/assets";

function getErrorMessage(error?: string, status?: string): string {
  if (!error && status === "timeout") {
    return "The generation took too long. Please try again.";
  }
  if (!error) return "Something went wrong. Please try again.";
  const e = error.toLowerCase();
  if (e.includes("429") || e.includes("rate limit") || e.includes("quota") || e.includes("resource exhausted")) {
    return "Too many requests. Please wait a moment and try again.";
  }
  if (e.includes("401") || e.includes("403") || e.includes("unauthorized") || e.includes("forbidden")) {
    return "Authentication issue. Please contact support.";
  }
  if (status === "timeout" || e.includes("timeout") || e.includes("timed out")) {
    return "The generation took too long. Please try again.";
  }
  return "Something went wrong. Please try again.";
}

// Animated check mark that stamps in when a stage completes
function NodeMarker({
  status,
  primary,
  bg,
  checkColor,
  railColor,
}: {
  status: "pending" | "generating" | "done" | "failed";
  primary: string;
  bg: string;
  checkColor: string;
  railColor: string;
}) {
  const stampAnim = useRef(new Animated.Value(status === "done" ? 1 : 0)).current;
  const prevStatus = useRef(status);

  useEffect(() => {
    if (prevStatus.current !== "done" && status === "done") {
      stampAnim.setValue(0);
      Animated.spring(stampAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 6,
      }).start();
    }
    prevStatus.current = status;
  }, [status]);

  const isDone = status === "done";
  const isGenerating = status === "generating";
  const isFailed = status === "failed";

  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isDone ? primary : bg,
        borderWidth: isDone ? 0 : 2,
        borderColor: isGenerating ? primary : railColor,
        // Glow ring for active node
        shadowColor: primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: isGenerating ? 0.18 : 0,
        shadowRadius: 6,
        elevation: isGenerating ? 4 : 0,
      }}
    >
      {isDone && (
        <Animated.View style={{ transform: [{ scale: stampAnim }] }}>
          <Ionicons name="checkmark" size={14} color={checkColor} />
        </Animated.View>
      )}
      {isGenerating && (
        <ActivityIndicator size="small" color={primary} style={{ transform: [{ scale: 0.6 }] }} />
      )}
      {isFailed && (
        <Ionicons name="alert" size={12} color={railColor} />
      )}
    </View>
  );
}

export default function WorkoutGenerationModal() {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { activeJobs, failedJobs, cancelJob, removeJob } = useBackgroundJobs();
  const { phase, days, isComplete } = useWorkoutProgress();

  const [showModal, setShowModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const autoShownRef = useRef(new Set<number>());
  const [timelineHeight, setTimelineHeight] = useState(0);

  // Token map (prototype mf-theme.js → app useThemeColors())
  const C = {
    bg: colors.background,
    surface: colors.surface,
    primary: colors.brand.primary,
    onPrimary: colors.contentOnPrimary,
    textPrimary: colors.text.primary,
    textSecondary: colors.text.secondary,
    textMuted: colors.text.muted,
    l2: colors.neutral.light[2],        // progress track
    m1: colors.neutral.medium[1],       // base rail, pending border, chip border
    m3: colors.neutral.medium[3],       // exercise dot (muted mid-tone)
  };

  // Derived state
  const activeBackgroundJobs = activeJobs.filter(
    (j) =>
      j.type === "generation" ||
      j.type === "regeneration" ||
      j.type === "daily-regeneration"
  );
  const failedBackgroundJobs = failedJobs.filter(
    (j) =>
      j.type === "generation" ||
      j.type === "regeneration" ||
      j.type === "daily-regeneration"
  );
  const backgroundJobs = [...activeBackgroundJobs, ...failedBackgroundJobs];
  const currentJob = backgroundJobs[0] ?? null;

  const doneCount = days.filter((d) => d.status === "done").length;
  const totalCount = days.length;
  const activeIdx = days.findIndex((d) => d.status === "generating");
  const fillFrac = isComplete
    ? 1
    : activeIdx < 0
      ? 0
      : activeIdx / Math.max(1, totalCount - 1);

  const isJobTerminal =
    currentJob &&
    (currentJob.status === "failed" ||
      currentJob.status === "timeout" ||
      currentJob.status === "cancelled");
  const isJobActive =
    currentJob &&
    (currentJob.status === "pending" || currentJob.status === "processing");

  const isFinished = isComplete && doneCount === totalCount && totalCount > 0;

  const getTitle = () => {
    if (currentJob?.type === "daily-regeneration") return "Building today's workout";
    return "Building your workouts";
  };
  const getSub = () => {
    if (currentJob?.type === "daily-regeneration") return "Tailoring your daily workout.";
    if (totalCount > 0) return `Tailoring your ${totalCount}-day week.`;
    return "Preparing your workout plan…";
  };
  const getFinishLabel = () => {
    if (currentJob?.type === "daily-regeneration") return "Today's workout is ready";
    return "Your week is ready";
  };

  // Animated values
  const progressAnim = useRef(new Animated.Value(0)).current;
  const railFillAnim = useRef(new Animated.Value(0)).current;
  const finishOpacity = useRef(new Animated.Value(0)).current;
  const finishTranslate = useRef(new Animated.Value(6)).current;

  // Auto-show: trigger for any new job type, not just initial generation
  useEffect(() => {
    if (showModal) return;

    const newJobs = activeBackgroundJobs.filter(
      (j) => !autoShownRef.current.has(j.id)
    );
    const newFailed = failedBackgroundJobs.filter(
      (j) => j.status === "failed" && !autoShownRef.current.has(j.id)
    );

    if (newJobs.length > 0) {
      autoShownRef.current.add(newJobs[0].id);
      setTimeout(() => setShowModal(true), 500);
    } else if (newFailed.length > 0) {
      autoShownRef.current.add(newFailed[0].id);
      setTimeout(() => setShowModal(true), 500);
    }
  }, [activeBackgroundJobs, failedBackgroundJobs, showModal]);

  useEffect(() => {
    if (backgroundJobs.length === 0) autoShownRef.current.clear();
  }, [backgroundJobs.length]);

  // Animate progress bar width
  useEffect(() => {
    const pct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
    Animated.timing(progressAnim, {
      toValue: pct,
      duration: 500,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    }).start();
  }, [doneCount, totalCount]);

  // Animate rail fill height
  useEffect(() => {
    if (timelineHeight === 0) return;
    const targetH = Math.max(0, (timelineHeight - 28) * fillFrac);
    Animated.timing(railFillAnim, {
      toValue: targetH,
      duration: 600,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    }).start();
  }, [fillFrac, timelineHeight]);

  // Animate finish note in
  useEffect(() => {
    if (isFinished) {
      Animated.parallel([
        Animated.timing(finishOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(finishTranslate, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      finishOpacity.setValue(0);
      finishTranslate.setValue(6);
    }
  }, [isFinished]);

  const handleClose = () => {
    setShowModal(false);
    setShowCancelConfirm(false);
  };
  const handleDismiss = () => {
    setShowModal(false);
    setShowCancelConfirm(false);
    if (currentJob) {
      setTimeout(() => removeJob(currentJob.id), 500);
    }
  };
  const handleCancelConfirm = async () => {
    if (currentJob) await cancelJob(currentJob.id);
    setShowCancelConfirm(false);
    setShowModal(false);
  };

  if (!showModal || !currentJob) return null;

  return (
    <Modal visible animationType="slide" transparent={false}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 20,
            paddingHorizontal: 22,
            paddingBottom: insets.bottom + 36,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand row ───────────────────────────────────────── */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: isJobTerminal ? 32 : 20,
            }}
          >
            <Image
              source={isDark ? images.logoDark : images.logo}
              style={{ width: 20, height: 20 }}
              resizeMode="contain"
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                letterSpacing: 2.16,
                color: C.textMuted,
              }}
            >
              MASTERSFIT
            </Text>
          </View>

          {isJobTerminal ? (
            /* ── Terminal state (failed / timeout / cancelled) ── */
            <>
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <Ionicons
                  name="alert-circle-outline"
                  size={48}
                  color={C.textMuted}
                  style={{ marginBottom: 16 }}
                />
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: C.textPrimary,
                    textAlign: "center",
                    marginBottom: 8,
                  }}
                >
                  {currentJob.status === "cancelled"
                    ? "Generation Cancelled"
                    : currentJob.status === "timeout"
                      ? "Generation Timed Out"
                      : "Generation Failed"}
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    color: C.textSecondary,
                    textAlign: "center",
                    lineHeight: 22,
                  }}
                >
                  {currentJob.status === "cancelled"
                    ? "The generation was cancelled. You can start again at any time."
                    : getErrorMessage(currentJob.error, currentJob.status)}
                </Text>
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.danger,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                  marginTop: 8,
                }}
                onPress={handleDismiss}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 15 }}>
                  Dismiss
                </Text>
              </TouchableOpacity>
            </>
          ) : showCancelConfirm ? (
            /* ── Cancel confirmation ────────────────────────────── */
            <>
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <Ionicons
                  name="warning-outline"
                  size={48}
                  color={C.textMuted}
                  style={{ marginBottom: 16 }}
                />
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: C.textPrimary,
                    textAlign: "center",
                    marginBottom: 8,
                  }}
                >
                  Cancel Generation?
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    color: C.textSecondary,
                    textAlign: "center",
                    lineHeight: 22,
                  }}
                >
                  This will stop the process and you'll need to start again.
                </Text>
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: C.primary,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                  marginBottom: 10,
                }}
                onPress={() => setShowCancelConfirm(false)}
              >
                <Text style={{ color: C.onPrimary, fontWeight: "600", fontSize: 15 }}>
                  Keep Generating
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.danger,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
                onPress={handleCancelConfirm}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 15 }}>
                  Cancel Generation
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            /* ── Main timeline view ─────────────────────────────── */
            <>
              {/* Title */}
              <Text
                style={{
                  fontSize: 27,
                  fontWeight: "700",
                  letterSpacing: -0.54,
                  lineHeight: 31,
                  color: C.textPrimary,
                  marginBottom: 7,
                }}
              >
                {getTitle()}
              </Text>

              {/* Subtitle */}
              <Text
                style={{
                  fontSize: 15,
                  lineHeight: 22,
                  color: C.textSecondary,
                  marginBottom: 20,
                }}
              >
                {getSub()}
              </Text>

              {/* Progress bar */}
              {totalCount > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 26,
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      height: 5,
                      borderRadius: 999,
                      backgroundColor: C.l2,
                      overflow: "hidden",
                    }}
                  >
                    <Animated.View
                      style={{
                        height: "100%",
                        borderRadius: 999,
                        backgroundColor: C.primary,
                        width: progressAnim.interpolate({
                          inputRange: [0, 100],
                          outputRange: ["0%", "100%"],
                        }),
                      }}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: C.textPrimary,
                      minWidth: 58,
                      textAlign: "right",
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {doneCount} of {totalCount}
                  </Text>
                </View>
              )}

              {/* Timeline */}
              {days.length === 0 ? (
                /* Planning phase — days not yet known */
                <View style={{ alignItems: "center", paddingVertical: 32, gap: 12 }}>
                  <ActivityIndicator color={C.primary} />
                  <Text style={{ fontSize: 13, color: C.textMuted }}>
                    {phase === "planning" ? "Designing your week…" : "Preparing your plan…"}
                  </Text>
                </View>
              ) : (
                <View
                  style={{ position: "relative" }}
                  onLayout={(e) => setTimelineHeight(e.nativeEvent.layout.height)}
                >
                  {/* Base rail */}
                  <View
                    style={{
                      position: "absolute",
                      left: 14,
                      top: 14,
                      bottom: 14,
                      width: 2,
                      borderRadius: 2,
                      backgroundColor: C.m1,
                    }}
                  />
                  {/* Animated fill rail */}
                  <Animated.View
                    style={{
                      position: "absolute",
                      left: 14,
                      top: 14,
                      width: 2,
                      borderRadius: 2,
                      backgroundColor: C.primary,
                      height: railFillAnim,
                    }}
                  />

                  {days.map((day) => {
                    const isPending = day.status === "pending";

                    return (
                      <View
                        key={day.dayNumber}
                        style={{
                          flexDirection: "row",
                          gap: 16,
                          paddingVertical: 9,
                          alignItems: "flex-start",
                        }}
                      >
                        {/* Marker column — 30px wide to center the 28px circle */}
                        <View
                          style={{ width: 30, alignItems: "center", paddingTop: 1 }}
                        >
                          <NodeMarker
                            status={day.status}
                            primary={C.primary}
                            bg={C.bg}
                            checkColor={C.onPrimary}
                            railColor={C.m1}
                          />
                        </View>

                        {/* Node body */}
                        <View
                          style={{
                            flex: 1,
                            paddingBottom: 2,
                            opacity: isPending ? 0.4 : 1,
                          }}
                        >
                          {/* Kicker: DAY N */}
                          <Text
                            style={{
                              fontSize: 11.5,
                              fontWeight: "700",
                              letterSpacing: 1.38,
                              color: isPending ? C.textMuted : C.primary,
                              marginBottom: 2,
                            }}
                          >
                            DAY {day.dayNumber}
                          </Text>

                          {/* Stage title */}
                          <Text
                            style={{
                              fontSize: 16.5,
                              fontWeight: "600",
                              lineHeight: 21,
                              letterSpacing: -0.165,
                              color: C.textPrimary,
                            }}
                          >
                            {day.label}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Finish note */}
              <Animated.View
                style={{
                  marginTop: 22,
                  alignItems: "center",
                  opacity: finishOpacity,
                  transform: [{ translateY: finishTranslate }],
                }}
              >
                <Text
                  style={{
                    fontSize: 13.5,
                    fontWeight: "600",
                    color: C.textSecondary,
                  }}
                >
                  {getFinishLabel()}
                </Text>
              </Animated.View>

              {/* Action buttons */}
              <View style={{ marginTop: 36, gap: 4 }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: C.primary,
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: "center",
                  }}
                  onPress={handleClose}
                >
                  <Text
                    style={{ color: C.onPrimary, fontWeight: "600", fontSize: 15 }}
                  >
                    {isFinished ? "View Your Workout" : "Continue Using App"}
                  </Text>
                </TouchableOpacity>

                {isJobActive && (
                  <TouchableOpacity
                    style={{ paddingVertical: 12, alignItems: "center" }}
                    onPress={() => setShowCancelConfirm(true)}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: C.textMuted,
                      }}
                    >
                      Cancel Generation
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
