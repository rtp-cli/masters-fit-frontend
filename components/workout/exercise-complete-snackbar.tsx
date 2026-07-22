import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Text, TouchableOpacity } from "react-native";

import { type ThemeColorPalette, useThemeColors } from "@/lib/theme";

/**
 * [T5-2] "Exercise complete" snackbar with an Undo action. Shown while an
 * auto-advanced exercise's log commit is deferred (the Undo window); the
 * parent owns visibility — it clears the snackbar when the commit flushes or
 * Undo is tapped. Slides up above the bottom action bar.
 */
export default function ExerciseCompleteSnackbar({
  visible,
  exerciseName,
  onUndo,
}: {
  visible: boolean;
  exerciseName?: string;
  onUndo: () => void;
}) {
  const colors = useThemeColors();
  const successColor =
    (colors as ThemeColorPalette).success ?? colors.brand.primary;
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

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
      <Ionicons name="checkmark-circle" size={20} color={successColor} />
      <Text
        className="flex-1 text-sm font-semibold ml-2"
        style={{ color: colors.background }}
        numberOfLines={1}
      >
        {exerciseName ? `${exerciseName} complete` : "Exercise complete"}
      </Text>
      <TouchableOpacity
        onPress={onUndo}
        accessibilityRole="button"
        accessibilityLabel="Undo exercise completion"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        className="ml-3 py-1"
      >
        <Text
          className="text-sm font-bold"
          style={{ color: successColor }}
        >
          UNDO
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
