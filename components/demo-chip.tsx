import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, View } from "react-native";

import { HIT_SLOP_10 } from "@/constants/accessibility";
import { useThemeColors } from "@/lib/theme";

import Text from "./text";

interface DemoChipProps {
  onPress: () => void;
  /** Visible label ("Demo" / "Demos"). Omit for the icon-only chip used on
   *  dense list rows -- the accessibilityLabel still names the exercise, and
   *  the play glyph is itself the non-colour cue there. */
  label?: string;
  accessibilityLabel: string;
  /** Extra classes for call-site spacing (margins/alignment). */
  className?: string;
  /** Glyph override. The in-workout "Swap" chip reuses this chip with
   *  `swap-horizontal` so the two sit side by side as one vocabulary. */
  icon?: keyof typeof Ionicons.glyphMap;
}

/**
 * The single "watch the demo" affordance used everywhere the app offers an
 * exercise demonstration video. Consolidates what used to be four different
 * treatments so the vocabulary ("Demo"/"Demos") and the resting look stay in
 * one place.
 *
 * Resting treatment is the kit's tappable-chip look: a light fill with a 1px
 * border. Never a solid ink fill -- in this kit a solid fill means
 * active/selected, not merely interactive. Touch target is padded to >=44px
 * via hitSlop even when the chip renders compact.
 */
export default function DemoChip({
  onPress,
  label,
  accessibilityLabel,
  className,
  icon = "play-circle-outline",
}: DemoChipProps) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={HIT_SLOP_10}
      className={className}
    >
      {({ pressed }) => (
        <View
          pointerEvents="none"
          className={`flex-row items-center rounded-full border self-start ${
            label ? "px-4 py-2.5" : "p-2.5"
          } ${
            pressed
              ? "bg-neutral-medium-1 border-neutral-medium-2"
              : "bg-brand-light-1 border-neutral-medium-1"
          }`}
        >
          <Ionicons
            name={icon}
            size={16}
            color={colors.text.primary}
          />
          {label ? (
            <Text
              className="text-sm font-semibold text-text-primary"
              style={{ marginLeft: 6 }}
            >
              {label}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}
