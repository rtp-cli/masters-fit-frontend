import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  TouchableOpacity,
  type TouchableOpacityProps,
  type ViewStyle,
} from "react-native";

import { useThemeColors } from "../lib/theme";

type IconButtonVariant = "surface" | "ghost" | "primary";

interface IconButtonProps extends TouchableOpacityProps {
  /** Ionicons glyph name (e.g. "search", "person", "close"). */
  icon: keyof typeof Ionicons.glyphMap;
  /**
   * Required spoken label for screen readers — icon-only controls have no text,
   * so this is the only thing VoiceOver/TalkBack can announce (backlog MF-009).
   */
  accessibilityLabel: string;
  /** Icon glyph size in px. The 44×44 touch target is fixed regardless. */
  size?: number;
  variant?: IconButtonVariant;
  /** Override the icon color; defaults to a sensible per-variant theme color. */
  color?: string;
  style?: ViewStyle;
}

/**
 * Accessible icon-only button. Always presents a 44×44 touch target (Apple/Material
 * minimum) even when the glyph is smaller, plus a role, a required label, and hitSlop.
 * Replaces the ad-hoc `w-10 h-10`/`w-9 h-9` TouchableOpacity+Ionicons pattern scattered
 * across the header, search, workout, and calendar surfaces (MF-009/MF-014).
 */
export function IconButton({
  icon,
  accessibilityLabel,
  size = 20,
  variant = "surface",
  color,
  disabled,
  style,
  ...rest
}: IconButtonProps) {
  const colors = useThemeColors();

  const variantClasses: Record<IconButtonVariant, string> = {
    surface: "bg-surface",
    ghost: "bg-transparent",
    primary: "bg-primary",
  };

  const iconColor =
    color ??
    (variant === "primary" ? colors.contentOnPrimary : colors.text.primary);

  const className = [
    "w-[44px] h-[44px] rounded-full items-center justify-center",
    variantClasses[variant],
    disabled && "opacity-40",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <TouchableOpacity
      className={className}
      style={style}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      {...rest}
    >
      <Ionicons name={icon} size={size} color={iconColor} />
    </TouchableOpacity>
  );
}

export default IconButton;
