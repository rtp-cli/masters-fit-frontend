import React, { useEffect, useMemo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// Festive multi-color palette — deliberately vivid regardless of app theme,
// since this only appears on the one-shot workout-completion celebration.
const COLORS = [
  "#F97316",
  "#22C55E",
  "#3B82F6",
  "#EAB308",
  "#EC4899",
  "#8B5CF6",
  "#14B8A6",
];

interface PieceParams {
  startX: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  driftX: number;
  fall: number;
  spin: number;
  rounded: boolean;
}

// One falling piece. Runs its animation exactly once on mount; the parent only
// mounts on the completion screen, so the whole burst plays a single time.
function ConfettiPiece({ p }: { p: PieceParams }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      p.delay,
      withTiming(1, { duration: p.duration, easing: Easing.out(Easing.quad) })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: progress.value * p.driftX },
      { translateY: progress.value * p.fall },
      { rotate: `${progress.value * p.spin}deg` },
    ],
    opacity: interpolate(progress.value, [0, 0.75, 1], [1, 1, 0]),
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: -24,
          left: p.startX,
          width: p.size,
          height: p.rounded ? p.size : p.size * 0.5,
          backgroundColor: p.color,
          borderRadius: p.rounded ? p.size / 2 : 2,
        },
        style,
      ]}
    />
  );
}

interface Props {
  /** Number of confetti pieces. */
  count?: number;
}

/**
 * A one-shot confetti burst overlay. Renders a full-screen, non-interactive
 * (pointerEvents="none") layer of falling pieces that plays once when mounted.
 * Honors the OS "Reduce Motion" setting by rendering nothing — matches the
 * reduced-motion handling in ui/splash-screen.tsx.
 */
export default function ConfettiCelebration({ count = 26 }: Props) {
  const reducedMotion = useReducedMotion();

  const pieces = useMemo<PieceParams[]>(
    () =>
      Array.from({ length: count }).map(() => {
        const size = 7 + Math.random() * 8;
        return {
          startX: Math.random() * SCREEN_W,
          size,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          delay: Math.random() * 250,
          duration: 1600 + Math.random() * 1200,
          driftX: (Math.random() - 0.5) * 160,
          fall: SCREEN_H * (0.75 + Math.random() * 0.35),
          spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 720),
          rounded: Math.random() < 0.4,
        };
      }),
    [count]
  );

  if (reducedMotion) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} p={p} />
      ))}
    </View>
  );
}
