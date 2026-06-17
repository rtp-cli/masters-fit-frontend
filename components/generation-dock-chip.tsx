import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useBackgroundJobs } from "@/contexts/background-job-context";
import { useThemeColors } from "@/lib/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Persistent status chip docked above the tab bar while a generation runs in
// the background (user tapped "Continue Using App"). The minimized timeline:
// tap to restore the modal; morphs to a "ready" state on completion and
// persists until tapped. Ships the "Determinate" variant (real progress).
export default function GenerationDockChip() {
  const colors = useThemeColors();
  const {
    activeJobs,
    isGenerationModalOpen,
    openGenerationModal,
    landAfterGeneration,
    readyChip,
    dismissReadyChip,
    removeJob,
  } = useBackgroundJobs();

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => sub?.remove();
  }, []);

  // Newest active generation/regeneration/daily-regeneration job.
  const genJob = useMemo(() => {
    const gen = activeJobs.filter(
      (j) =>
        j.type === "generation" ||
        j.type === "regeneration" ||
        j.type === "daily-regeneration",
    );
    return gen.reduce<(typeof gen)[number] | null>(
      (newest, j) =>
        !newest ||
        new Date(j.createdAt).getTime() >= new Date(newest.createdAt).getTime()
          ? j
          : newest,
      null,
    );
  }, [activeJobs]);

  const showReady = !!readyChip && !isGenerationModalOpen;
  const showProgress = !showReady && !!genJob && !isGenerationModalOpen;
  const visible = showReady || showProgress;

  // Derive progress from the shared job (NOT a second useWorkoutProgress, which
  // would open a duplicate websocket). Days carry per-day status when polled.
  const days = genJob?.days ?? [];
  const doneCount = days.filter((d) => d.status === "done").length;
  const totalCount = days.length;
  const fraction = showReady
    ? 1
    : totalCount > 0
      ? doneCount / totalCount
      : (genJob?.progress ?? 0) / 100;

  const scope = showReady
    ? readyChip!.scope
    : genJob?.type === "daily-regeneration"
      ? "day"
      : "week";

  const title = showReady
    ? scope === "day"
      ? "Today's workout is ready"
      : "Your week is ready"
    : scope === "day"
      ? "Building today's workout"
      : "Building your workouts";

  const subtitle = showReady
    ? "Tap to view"
    : totalCount > 0
      ? `${doneCount} of ${totalCount} ready`
      : `${Math.round(genJob?.progress ?? 0)}%`;

  // ── Animations ────────────────────────────────────────────────────────────
  // Entrance: slide-up + fade (~0.42s).
  const enter = useRef(new Animated.Value(0)).current;
  // Progress arc + bottom fill (0..1).
  const arc = useRef(new Animated.Value(0)).current;
  // Check "stamp" spring when morphing to ready.
  const stamp = useRef(new Animated.Value(0)).current;
  const wasReady = useRef(false);

  useEffect(() => {
    if (!visible) {
      enter.setValue(0);
      return;
    }
    if (reduceMotion) {
      enter.setValue(1);
      return;
    }
    Animated.timing(enter, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, reduceMotion, enter]);

  useEffect(() => {
    Animated.timing(arc, {
      toValue: fraction,
      duration: reduceMotion ? 0 : 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [fraction, reduceMotion, arc]);

  useEffect(() => {
    if (showReady && !wasReady.current) {
      if (reduceMotion) {
        stamp.setValue(1);
      } else {
        stamp.setValue(0);
        Animated.spring(stamp, {
          toValue: 1,
          tension: 200,
          friction: 6,
          useNativeDriver: true,
        }).start();
      }
    }
    if (!showReady) stamp.setValue(0);
    wasReady.current = showReady;
  }, [showReady, reduceMotion, stamp]);

  if (!visible) return null;

  const handlePress = () => {
    if (showReady) {
      const id = readyChip!.id;
      landAfterGeneration(readyChip!.scope);
      dismissReadyChip();
      removeJob(id);
    } else {
      openGenerationModal();
    }
  };

  // Progress ring geometry: r=9, stroke 2.5, start at 12 o'clock.
  const R = 9;
  const CIRC = 2 * Math.PI * R;
  const strokeDashoffset = arc.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRC, 0],
  });
  const fillWidth = arc.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: 68,
        opacity: enter,
        transform: [
          {
            translateY: enter.interpolate({
              inputRange: [0, 1],
              outputRange: [16, 0],
            }),
          },
        ],
      }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${subtitle}`}
        style={{
          minHeight: 60,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.neutral.medium[1],
          backgroundColor: colors.surface,
          paddingTop: 11,
          paddingBottom: 11,
          paddingLeft: 13,
          paddingRight: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          overflow: "hidden",
          // card shadow
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        {/* Left — progress ring or ready checkmark */}
        {showReady ? (
          <Animated.View
            style={{
              width: 22,
              height: 22,
              borderRadius: 9999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.brand.primary,
              transform: [{ scale: stamp }],
            }}
          >
            <Ionicons
              name="checkmark"
              size={14}
              color={colors.contentOnPrimary}
            />
          </Animated.View>
        ) : (
          <View style={{ width: 22, height: 22 }}>
            <Svg width={22} height={22}>
              {/* track */}
              <Circle
                cx={11}
                cy={11}
                r={R}
                stroke={colors.neutral.medium[1]}
                strokeWidth={2.5}
                fill="none"
              />
              {/* arc — rotate -90 so it starts at 12 o'clock */}
              <AnimatedCircle
                cx={11}
                cy={11}
                r={R}
                stroke={colors.brand.primary}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${CIRC} ${CIRC}`}
                strokeDashoffset={strokeDashoffset}
                rotation={-90}
                origin="11, 11"
              />
            </Svg>
          </View>
        )}

        {/* Center — title + sub */}
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: colors.text.primary,
            }}
          >
            {title}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 13,
              color: colors.text.muted,
              marginTop: 1,
              fontVariant: ["tabular-nums"],
            }}
          >
            {subtitle}
          </Text>
        </View>

        {/* Right — View pill (ready) or chevron-up (progress) */}
        {showReady ? (
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 9999,
              backgroundColor: colors.brand.primary,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: colors.contentOnPrimary,
              }}
            >
              View
            </Text>
          </View>
        ) : (
          <Ionicons
            name="chevron-up"
            size={20}
            color={colors.neutral.medium[3]}
          />
        )}

        {/* Bottom fill bar — a second, quieter progress read */}
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            height: 3,
            width: fillWidth,
            backgroundColor: colors.brand.primary,
          }}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}
