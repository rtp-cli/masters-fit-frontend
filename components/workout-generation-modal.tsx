import React, { useEffect, useState, useRef, useMemo } from "react";
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
import { images } from "@/assets";

function getErrorMessage(error?: string, status?: string): string {
  if (!error && status === "timeout") {
    return "The generation took too long. Please try again.";
  }
  if (!error) return "Something went wrong. Please try again.";
  const e = error.toLowerCase();
  if (
    e.includes("429") ||
    e.includes("rate limit") ||
    e.includes("quota") ||
    e.includes("resource exhausted")
  ) {
    return "Too many requests. Please wait a moment and try again.";
  }
  if (
    e.includes("401") ||
    e.includes("403") ||
    e.includes("unauthorized") ||
    e.includes("forbidden")
  ) {
    return "Authentication issue. Please contact support.";
  }
  if (
    status === "timeout" ||
    e.includes("timeout") ||
    e.includes("timed out")
  ) {
    return "The generation took too long. Please try again.";
  }
  return "Something went wrong. Please try again.";
}

// Animated marker that spins while active and stamps a check when done
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
  const stampAnim = useRef(
    new Animated.Value(status === "done" ? 1 : 0)
  ).current;
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
        borderRadius: 9999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isDone ? primary : bg,
        borderWidth: isDone ? 0 : 2,
        borderColor: isGenerating ? primary : railColor,
        // Glow ring (equivalent of box-shadow 0 0 0 5px primary@13%)
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
        <ActivityIndicator
          size="small"
          color={primary}
          style={{ transform: [{ scale: 0.6 }] }}
        />
      )}
      {isFailed && (
        <Ionicons name="alert" size={12} color={railColor} />
      )}
    </View>
  );
}

// Rotating process-narration captions shown while the week generates, so the
// ~25-30s wait reads as active work rather than a static line.
const GENERATION_CAPTIONS = [
  "Selecting exercises for your goals…",
  "Balancing muscle groups across the week…",
  "Calibrating sets, reps, and intensity…",
  "Matching movements to your equipment…",
  "Sequencing warm-ups and finishers…",
  "Fine-tuning the details…",
];

export default function WorkoutGenerationModal() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { activeJobs, failedJobs, cancelJob, removeJob } = useBackgroundJobs();

  const [showModal, setShowModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const autoShownRef = useRef(new Set<number>());
  const [timelineHeight, setTimelineHeight] = useState(0);
  const [captionIdx, setCaptionIdx] = useState(0);
  const captionFade = useRef(new Animated.Value(1)).current;

  // Token map → useThemeColors()
  const C = {
    bg: colors.background,
    surface: colors.surface,
    primary: colors.brand.primary,
    onPrimary: colors.contentOnPrimary,
    textPrimary: colors.text.primary,
    textSecondary: colors.text.secondary,
    textMuted: colors.text.muted,
    border: colors.neutral.medium[1],   // --border / --n-medium-1 #E0E0E0
    l2: colors.neutral.light[2],        // progress track #F4F4F4
    m1: colors.neutral.medium[1],       // rail, pending border, chip border
    m3: colors.neutral.medium[3],       // muted mid-tone
  };

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
  // Track the MOST RECENTLY started job, not the oldest. When a generation
  // finishes, the websocket flips the UI to "complete" but our local job stays
  // "processing" until the next poll (~1.5s) reaps it. If the user regenerates
  // inside that window, the new job is appended *behind* the still-active old
  // one — selecting the oldest would keep the panel pinned to the previous
  // generation's timeline until the poll catches up (the stale-view bug), and
  // the job-change reset in useWorkoutProgress would never fire. Picking the
  // newest hands the panel to the new job immediately so the reset runs at once.
  const pickNewest = (list: typeof activeBackgroundJobs) =>
    list.reduce<(typeof list)[number] | null>(
      (newest, j) =>
        !newest ||
        new Date(j.createdAt).getTime() >= new Date(newest.createdAt).getTime()
          ? j
          : newest,
      null
    );
  const currentJob =
    pickNewest(activeBackgroundJobs) ?? pickNewest(failedBackgroundJobs) ?? null;

  // Polled fallback for the progressive timeline. The websocket is the fast
  // path, but on a physical device behind Render's proxy it can drop or never
  // deliver; the polled per-day status (from the job-status endpoint) drives
  // the same pipeline so the timeline still renders. Memoized on the meaningful
  // fields so it only re-feeds the hook when a fresh poll actually changes them.
  const polledEvent = useMemo(
    () =>
      currentJob
        ? {
            progress: currentJob.progress ?? 0,
            complete: currentJob.status === "completed",
            error: currentJob.error,
            phase: currentJob.phase,
            days: currentJob.days,
          }
        : null,
    [
      currentJob?.progress,
      currentJob?.status,
      currentJob?.error,
      currentJob?.phase,
      currentJob?.days,
    ]
  );

  const { phase, days, isComplete } = useWorkoutProgress(
    polledEvent,
    currentJob?.id ?? null
  );

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

  // Rotate the process-narration caption while a weekly plan is actively
  // generating and day cards are present. Daily regen, finished, and terminal
  // states keep their static subtitle.
  const showRotatingCaption =
    !!currentJob &&
    currentJob.type !== "daily-regeneration" &&
    !isJobTerminal &&
    !isFinished &&
    totalCount > 0;
  const rotatingCaption =
    GENERATION_CAPTIONS[captionIdx % GENERATION_CAPTIONS.length];

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

  // Auto-show on new job
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

  // Cycle the rotating caption every ~2.8s with a soft cross-fade.
  useEffect(() => {
    if (!showModal || !showRotatingCaption) return;
    const id = setInterval(() => {
      Animated.timing(captionFade, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setCaptionIdx((i) => i + 1);
        Animated.timing(captionFade, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });
    }, 2800);
    return () => clearInterval(id);
  }, [showModal, showRotatingCaption, captionFade]);

  const backgroundJobCount =
    activeBackgroundJobs.length + failedBackgroundJobs.length;
  useEffect(() => {
    if (backgroundJobCount === 0) autoShownRef.current.clear();
  }, [backgroundJobCount]);

  // Animate progress bar fill
  useEffect(() => {
    const pct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
    Animated.timing(progressAnim, {
      toValue: pct,
      duration: 500,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    }).start();
  }, [doneCount, totalCount]);

  // Animate vertical rail fill
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

  // Animate finish note
  useEffect(() => {
    if (isFinished) {
      Animated.parallel([
        Animated.timing(finishOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
        Animated.timing(finishTranslate, {
          toValue: 0,
          duration: 500,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
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

  // ── Shared header lockup ──────────────────────────────────────────────────
  const brandLockup = (
    <View
      style={{
        paddingTop: insets.top + 14,
        paddingHorizontal: 20,
        paddingBottom: 0,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Image
          source={images.logoDark}
          style={{ width: 24, height: 22 }}
          resizeMode="contain"
        />
        <Text
          style={{
            fontSize: 17,
            fontWeight: "600",
            letterSpacing: -0.17,
            color: C.textPrimary,
          }}
        >
          MastersFit
        </Text>
      </View>
    </View>
  );

  // ── Shared footer pill + cancel ───────────────────────────────────────────
  const renderFooter = (
    primaryLabel: string,
    onPrimary: () => void,
    secondaryLabel?: string,
    onSecondary?: () => void,
    primaryDanger?: boolean,
  ) => (
    <View
      style={{
        paddingTop: 12,
        paddingHorizontal: 24,
        paddingBottom: 20 + insets.bottom,
        borderTopWidth: 1,
        borderTopColor: C.border,
        gap: 2,
      }}
    >
      <TouchableOpacity
        onPress={onPrimary}
        style={{
          height: 56,
          borderRadius: 9999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: primaryDanger ? colors.danger : C.primary,
        }}
      >
        <Text
          style={{
            fontSize: 17,
            fontWeight: "600",
            color: C.onPrimary,
          }}
        >
          {primaryLabel}
        </Text>
      </TouchableOpacity>

      {secondaryLabel && onSecondary && (
        <TouchableOpacity
          onPress={onSecondary}
          style={{
            height: 48,
            borderRadius: 9999,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: C.textMuted,
            }}
          >
            {secondaryLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <Modal visible animationType="slide" transparent={false}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>

        {/* ── Brand header ─────────────────────────────────────────────── */}
        {brandLockup}

        {isJobTerminal ? (
          /* ── Terminal state (failed / timeout / cancelled) ──────────── */
          <>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 24, paddingTop: 8 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <Ionicons
                  name="alert-circle-outline"
                  size={48}
                  color={C.textMuted}
                  style={{ marginBottom: 16 }}
                />
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: "700",
                    letterSpacing: -0.56,
                    color: C.textPrimary,
                    textAlign: "center",
                    marginBottom: 7,
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
                    color: C.textMuted,
                    textAlign: "center",
                    lineHeight: 22.5,
                  }}
                >
                  {currentJob.status === "cancelled"
                    ? "The generation was cancelled. You can start again at any time."
                    : getErrorMessage(currentJob.error, currentJob.status)}
                </Text>
              </View>
            </ScrollView>
            {renderFooter("Dismiss", handleDismiss)}
          </>
        ) : showCancelConfirm ? (
          /* ── Cancel confirmation ─────────────────────────────────────── */
          <>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 24, paddingTop: 8 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <Ionicons
                  name="warning-outline"
                  size={48}
                  color={C.textMuted}
                  style={{ marginBottom: 16 }}
                />
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: "700",
                    letterSpacing: -0.56,
                    color: C.textPrimary,
                    textAlign: "center",
                    marginBottom: 7,
                  }}
                >
                  Cancel Generation?
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    color: C.textMuted,
                    textAlign: "center",
                    lineHeight: 22.5,
                  }}
                >
                  This will stop the process and you'll need to start again.
                </Text>
              </View>
            </ScrollView>
            {renderFooter(
              "Keep Generating",
              () => setShowCancelConfirm(false),
              "Cancel Generation",
              handleCancelConfirm,
            )}
          </>
        ) : (
          /* ── Main timeline view ──────────────────────────────────────── */
          <>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingTop: 8,
                paddingHorizontal: 24,
                paddingBottom: 10,
              }}
              showsVerticalScrollIndicator={false}
            >
              {/* Title */}
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "700",
                  letterSpacing: -0.56,
                  lineHeight: 32.5,
                  color: C.textPrimary,
                  marginTop: 6,
                }}
              >
                {getTitle()}
              </Text>

              {/* Subtitle — rotating process narration while generating */}
              {showRotatingCaption ? (
                <Animated.Text
                  style={{
                    fontSize: 15,
                    lineHeight: 22.5,
                    color: C.textMuted,
                    marginTop: 7,
                    opacity: captionFade,
                  }}
                >
                  {rotatingCaption}
                </Animated.Text>
              ) : (
                <Text
                  style={{
                    fontSize: 15,
                    lineHeight: 22.5,
                    color: C.textMuted,
                    marginTop: 7,
                  }}
                >
                  {getSub()}
                </Text>
              )}

              {/* Progress row */}
              {totalCount > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    marginTop: 30,
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      height: 5,
                      borderRadius: 9999,
                      backgroundColor: C.l2,
                      overflow: "hidden",
                    }}
                  >
                    <Animated.View
                      style={{
                        height: "100%",
                        borderRadius: 9999,
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
                      minWidth: 54,
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
                <View
                  style={{
                    alignItems: "center",
                    paddingVertical: 32,
                    gap: 12,
                    marginTop: 28,
                  }}
                >
                  <ActivityIndicator color={C.primary} />
                  <Text style={{ fontSize: 13, color: C.textMuted }}>
                    {phase === "planning"
                      ? "Designing your week…"
                      : "Preparing your plan…"}
                  </Text>
                </View>
              ) : (
                <View
                  style={{ position: "relative", marginTop: 28 }}
                  onLayout={(e) =>
                    setTimelineHeight(e.nativeEvent.layout.height)
                  }
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
                          style={{
                            width: 30,
                            alignItems: "center",
                            paddingTop: 1,
                          }}
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
                              fontSize: 11,
                              fontWeight: "700",
                              letterSpacing: 1.32,
                              color: isPending ? C.textMuted : C.primary,
                              marginBottom: 3,
                            }}
                          >
                            DAY {day.dayNumber}
                          </Text>

                          {/* Stage title */}
                          <Text
                            style={{
                              fontSize: 17,
                              fontWeight: "600",
                              lineHeight: 21.25,
                              letterSpacing: -0.17,
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
                  marginTop: 24,
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
            </ScrollView>

            {/* ── Footer ──────────────────────────────────────────────── */}
            {renderFooter(
              isFinished ? "View Your Workout" : "Continue Using App",
              handleClose,
              isJobActive ? "Cancel Generation" : undefined,
              isJobActive ? () => setShowCancelConfirm(true) : undefined,
            )}
          </>
        )}
      </View>
    </Modal>
  );
}
