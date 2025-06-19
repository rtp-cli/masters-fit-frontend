import React from "react";
import {
  Text as RNText,
  StyleSheet,
  TextProps as RNTextProps,
  TextStyle,
} from "react-native";

type TextVariant =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "title"
  | "subtitle"
  | "body"
  | "bodySmall"
  | "label"
  | "caption";

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  weight?: "normal" | "medium" | "semibold" | "bold";
  color?: string;
  center?: boolean;
  style?: TextStyle;
  children: React.ReactNode;
}

/**
 * Text component with typography variants
 */
const Text: React.FC<TextProps> = ({
  variant = "body",
  weight,
  color,
  center = false,
  style,
  children,
  ...rest
}) => {
  const baseStyle = styles[variant];
  const weightStyle =
    weight === "normal"
      ? styles.weightNormal
      : weight === "medium"
      ? styles.weightMedium
      : weight === "semibold"
      ? styles.weightSemibold
      : weight === "bold"
      ? styles.weightBold
      : null;
  const colorStyle = color ? { color } : null;
  const centerStyle = center ? styles.center : null;

  return (
    <RNText
      style={[baseStyle, weightStyle, colorStyle, centerStyle, style]}
      {...rest}
    >
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  // Typography variants - Updated to Twitter-style standards
  h1: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "Inter_700Bold",
    lineHeight: 24,
    color: "neutral-dark-5",
  },
  h2: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "Inter_700Bold",
    lineHeight: 24,
    color: "neutral-dark-5",
  },
  h3: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "Inter_700Bold",
    lineHeight: 24,
    color: "neutral-dark-5",
  },
  h4: {
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    lineHeight: 24,
    color: "neutral-dark-5",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    lineHeight: 24,
    color: "neutral-dark-5",
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
    lineHeight: 21,
    color: "neutral-dark-2",
  },
  body: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    color: "neutral-dark-4",
  },
  bodySmall: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    color: "neutral-dark-4",
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
    lineHeight: 21,
    color: "neutral-dark-2",
  },
  caption: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    color: "text-light",
  },

  // Font weights
  weightNormal: {
    fontWeight: "normal",
    fontFamily: "Inter_400Regular",
  },
  weightMedium: {
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
  },
  weightSemibold: {
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  weightBold: {
    fontWeight: "bold",
    fontFamily: "Inter_700Bold",
  },

  // Alignment
  center: {
    textAlign: "center",
  },
});

export default Text;
