import * as SplashScreen from "expo-splash-screen";
import React, { useCallback,useEffect, useRef } from "react";
import { Image, StyleSheet, Text } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { images } from "@/assets";

const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);
const ENTER_MS = 700;
const TITLE_DELAY_MS = 100;
const MIN_HOLD_MS = 1200;
const EXIT_MS = 1100;

// Always the original-ink surface regardless of user theme
const SURFACE = "#0A0A0A";
const ON_SURFACE = "#FFFFFF";

interface Props {
  isAppReady: boolean;
  onDismissed: () => void;
}

export default function AnimatedSplashScreen({ isAppReady, onDismissed }: Props) {
  const reducedMotion = useReducedMotion();
  const mountTime = useRef(Date.now());
  const exitStarted = useRef(false);

  const markOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const markTranslateY = useSharedValue(reducedMotion ? 0 : 10);
  const markScale = useSharedValue(reducedMotion ? 1 : 0.96);
  const titlesOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const titlesTranslateY = useSharedValue(reducedMotion ? 0 : 10);
  const titlesScale = useSharedValue(reducedMotion ? 1 : 0.96);
  const containerOpacity = useSharedValue(1);

  const startExit = useCallback(() => {
    if (exitStarted.current) return;
    exitStarted.current = true;

    if (reducedMotion) {
      onDismissed();
      return;
    }

    containerOpacity.value = withTiming(
      0,
      { duration: EXIT_MS, easing: EASE_OUT },
      (finished) => {
        if (finished) runOnJS(onDismissed)();
      }
    );
    markScale.value = withTiming(1.04, { duration: EXIT_MS, easing: EASE_OUT });
  }, [reducedMotion, onDismissed, containerOpacity, markScale]);

  // Entrance animation
  useEffect(() => {
    if (reducedMotion) return;
    markOpacity.value = withTiming(1, { duration: ENTER_MS, easing: EASE_OUT });
    markTranslateY.value = withTiming(0, { duration: ENTER_MS, easing: EASE_OUT });
    markScale.value = withTiming(1, { duration: ENTER_MS, easing: EASE_OUT });
    titlesOpacity.value = withDelay(
      TITLE_DELAY_MS,
      withTiming(1, { duration: ENTER_MS, easing: EASE_OUT })
    );
    titlesTranslateY.value = withDelay(
      TITLE_DELAY_MS,
      withTiming(0, { duration: ENTER_MS, easing: EASE_OUT })
    );
    titlesScale.value = withDelay(
      TITLE_DELAY_MS,
      withTiming(1, { duration: ENTER_MS, easing: EASE_OUT })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hide native splash once JS splash is rendered
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Trigger exit once app is ready + min hold elapsed
  useEffect(() => {
    if (!isAppReady) return;
    const remaining = Math.max(0, MIN_HOLD_MS - (Date.now() - mountTime.current));
    const t = setTimeout(startExit, remaining);
    return () => clearTimeout(t);
  }, [isAppReady, startExit]);

  const markAnimStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
    transform: [{ translateY: markTranslateY.value }, { scale: markScale.value }],
  }));

  const titlesAnimStyle = useAnimatedStyle(() => ({
    opacity: titlesOpacity.value,
    transform: [{ translateY: titlesTranslateY.value }, { scale: titlesScale.value }],
  }));

  const containerAnimStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, containerAnimStyle]}>
      <Animated.View style={markAnimStyle}>
        <Image source={images.logo} style={styles.mark} resizeMode="contain" />
      </Animated.View>
      <Animated.View style={[styles.titles, titlesAnimStyle]}>
        <Text style={styles.wordmark}>MastersFit</Text>
        <Text style={styles.tagline}>Fitness mastered. AI-powered.</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    gap: 26,
    zIndex: 9999,
    elevation: 9999,
  },
  mark: {
    height: 96,
    // 581:525 original aspect ratio
    width: 106,
  },
  titles: {
    alignItems: "center",
    gap: 12,
  },
  wordmark: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 40,
    // -0.02em × 40px = -0.8px
    letterSpacing: -0.8,
    lineHeight: 40,
    color: ON_SURFACE,
  },
  tagline: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15.5,
    color: "rgba(255, 255, 255, 0.6)",
  },
});
