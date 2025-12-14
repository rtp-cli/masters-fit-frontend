import React from "react";
import {
  Text as RNText,
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
  // Variant classes
  const variantClasses = {
    h1: "text-xl font-bold text-text-primary",
    h2: "text-xl font-bold text-text-primary",
    h3: "text-xl font-bold text-text-primary",
    h4: "text-xl font-semibold text-text-primary",
    title: "text-xl font-semibold text-text-primary",
    subtitle: "text-base font-medium text-text-secondary",
    body: "text-base text-text-primary",
    bodySmall: "text-sm text-text-primary",
    label: "text-base font-medium text-text-secondary",
    caption: "text-sm text-text-muted",
  };

  // Weight classes
  const weightClasses = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
  };

  // Build className
  const textClassName = [
    variantClasses[variant],
    weight && weightClasses[weight],
    center && "text-center",
  ]
    .filter(Boolean)
    .join(" ");

  // Style object for color override
  const styleWithColor = color ? [{ color }, style] : style;

  return (
    <RNText className={textClassName} style={styleWithColor} {...rest}>
      {children}
    </RNText>
  );
};

export default Text;
