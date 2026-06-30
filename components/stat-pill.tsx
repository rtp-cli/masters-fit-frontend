import React from "react";
import { Text, View, type ViewProps, type ViewStyle } from "react-native";

// Lifted-pill shadow — matches the streak chip. The shadow (not the fill or a
// border) is what separates the pill from the page, so it reads correctly in
// every theme, including dark themes where surface == background.
const pillShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.1,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: 1 },
  elevation: 2,
} as const;

interface StatPillProps extends ViewProps {
  /** An emoji string (e.g. "🔥") or a custom icon node rendered at the left. */
  icon?: React.ReactNode;
  /** Muted descriptive label, e.g. "Streak". */
  label: string;
  /** Emphasized value, e.g. "5 days". */
  value: string | number;
}

/**
 * Compact, presentational metric pill — icon + muted label + bold value.
 * Example: 🔥  Streak  ·  5 days
 *
 * Themed via NativeWind semantic classes plus the lifted shadow, so it adapts
 * to light/dark and all theme variants. Hugs its content width (self-start).
 */
export function StatPill({
  icon,
  label,
  value,
  style,
  ...rest
}: StatPillProps) {
  return (
    <View
      className="self-start flex-row items-center gap-2 rounded-full bg-neutral-white px-3 py-1.5"
      style={[pillShadow, style as ViewStyle]}
      {...rest}
    >
      {icon != null &&
        (typeof icon === "string" ? (
          <Text className="text-text-primary text-sm">{icon}</Text>
        ) : (
          icon
        ))}
      <Text className="text-text-muted text-sm">{label}</Text>
      <Text className="text-text-primary text-sm font-semibold">{value}</Text>
    </View>
  );
}

export default StatPill;
