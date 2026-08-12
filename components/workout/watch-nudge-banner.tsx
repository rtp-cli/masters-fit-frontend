import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Text, TouchableOpacity } from "react-native";

import { useThemeColors } from "@/lib/theme";

/**
 * One-shot nudge shown when a workout starts while health is connected but no
 * recent heart-rate samples exist — i.e. the user likely owns a watch that
 * isn't recording. A watch workout is the only way MastersFit can capture
 * heart rate (apps can't start the watch's workout remotely), so we ask.
 * Parent owns visibility; auto-dismisses after a few seconds.
 */
export default function WatchNudgeBanner({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
  const colors = useThemeColors();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <Animated.View
      className="mx-4 mb-2"
      style={{
        opacity: slide,
        transform: [
          {
            translateY: slide.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 0],
            }),
          },
        ],
      }}
      accessibilityLiveRegion="polite"
    >
      {/* Whole chip is tap-to-dismiss, with a clear ✕ so the affordance is
          obvious (the old low-contrast "GOT IT" wasn't). */}
      <TouchableOpacity
        onPress={onDismiss}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="Dismiss watch reminder"
        className="rounded-2xl px-4 py-3 flex-row items-center shadow-lg"
        style={{ backgroundColor: colors.text.primary }}
      >
        <Ionicons name="watch" size={20} color={colors.background} />
        <Text
          className="flex-1 text-sm font-semibold mx-2"
          style={{ color: colors.background }}
          numberOfLines={2}
        >
          Wearing a watch? Start a workout on it to capture your heart rate.
        </Text>
        <Ionicons name="close" size={20} color={colors.background} />
      </TouchableOpacity>
    </Animated.View>
  );
}
