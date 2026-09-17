import React, { useEffect, useRef, useState } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";

import { useThemeColors } from "@/lib/theme";

const HIT_SLOP = { top: 12, bottom: 12, left: 16, right: 16 };

/**
 * The one undo affordance in a session (SPEC §8).
 *
 * A single row — a label with its seconds remaining, underlined by a 2px rule
 * that drains to nothing. It replaces a link in the footer rather than sitting
 * above it, so the action bar does not move while the window is open; that is
 * the whole argument for the shape, so keep it one row (§6.2).
 *
 * Retires ExerciseCompleteSnackbar: two undo idioms in one session is the
 * thing this change set exists to avoid. Used by both logging paths — the
 * circuit round undo (in the "Complete Circuit" row) and the deferred
 * exercise commit (in its own row on the traditional path).
 */
export default function UndoDrainStrip({
  visible,
  label,
  sublabel,
  durationMs,
  onUndo,
}: {
  visible: boolean;
  /** "Undo Round 2" | "Undo · Barbell Back Squat" */
  label: string;
  /** Optional cost, shown inline to keep the strip one row: "2 of 4 sets" */
  sublabel?: string;
  durationMs: number;
  onUndo: () => void;
}) {
  const colors = useThemeColors();
  const progress = useRef(new Animated.Value(1)).current;
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.ceil(durationMs / 1000),
  );

  useEffect(() => {
    if (!visible) {
      progress.setValue(1);
      return;
    }

    progress.setValue(1);
    setSecondsLeft(Math.ceil(durationMs / 1000));
    const animation = Animated.timing(progress, {
      toValue: 0,
      duration: durationMs,
      // Width can't be driven natively.
      useNativeDriver: false,
    });
    // Deferred a frame to avoid a flicker on mount (same reason as the
    // animation this replaces).
    const frame = requestAnimationFrame(() => animation.start());

    const startedAt = Date.now();
    const tick = setInterval(() => {
      const remaining = Math.max(0, durationMs - (Date.now() - startedAt));
      setSecondsLeft(Math.ceil(remaining / 1000));
    }, 250);

    return () => {
      cancelAnimationFrame(frame);
      animation.stop();
      clearInterval(tick);
    };
    // `label` is the restart key, not decoration. Re-arming for a NEW round or
    // exercise keeps `visible` true the whole time (the circuit path can now
    // complete round N+1 during round N's window — §6 — and the traditional
    // path re-sets the pending commit in the same batch it clears it), so
    // without this the drain would animate once and then sit empty.
  }, [visible, label, durationMs, progress]);

  if (!visible) return null;

  return (
    <TouchableOpacity
      onPress={onUndo}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={label}
      // Android-only; iOS reads the label when focus reaches the strip.
      accessibilityLiveRegion="polite"
      // minHeight, not height: the "Complete Circuit" link it replaces grows
      // under font scaling too, so matching its 17.3px line box at default
      // scale is what keeps the bar still — pinning 18px would just clip the
      // label at large text sizes.
      style={{ minHeight: 18, justifyContent: "center" }}
    >
      <View className="flex-row items-center justify-center" style={{ gap: 7 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: colors.text.primary,
            flexShrink: 1,
          }}
          maxFontSizeMultiplier={1.3}
        >
          {label}
        </Text>
        {sublabel ? (
          <Text
            numberOfLines={1}
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: colors.text.muted,
            }}
            maxFontSizeMultiplier={1.3}
          >
            {sublabel}
          </Text>
        ) : null}
        <Text
          style={{ fontSize: 11, fontWeight: "600", color: colors.text.muted }}
          maxFontSizeMultiplier={1.3}
        >
          {secondsLeft}s
        </Text>
      </View>

      {/* The drain reads as the label's underline draining away. The whole
          strip is the tap target — never this 2px rule. */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 2,
          backgroundColor: colors.neutral.medium[1],
        }}
      />
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          height: 2,
          backgroundColor: colors.text.primary,
          width: progress.interpolate({
            inputRange: [0, 1],
            outputRange: ["0%", "100%"],
          }),
        }}
      />
    </TouchableOpacity>
  );
}
