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
    const timer = setTimeout(onDismiss, 10000);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <Animated.View
      className="mx-4 mb-2 rounded-2xl px-4 py-3 flex-row items-center shadow-lg"
      style={{
        backgroundColor: colors.text.primary,
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
      <Ionicons name="watch" size={20} color={colors.background} />
      <Text
        className="flex-1 text-sm font-semibold ml-2"
        style={{ color: colors.background }}
        numberOfLines={2}
      >
        Wearing a watch? Start a workout on it to capture your heart rate.
      </Text>
      <TouchableOpacity
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss watch reminder"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        className="ml-3 py-1"
      >
        <Text className="text-sm font-bold" style={{ color: colors.brand.primary }}>
          GOT IT
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
