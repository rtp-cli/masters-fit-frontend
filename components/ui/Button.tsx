import React from "react";
import { colors } from "../../lib/theme";
import { TouchableOpacity, Text, ActivityIndicator } from "react-native";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export default function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false,
  className = "",
}: ButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return "bg-primary border-primary";
      case "secondary":
        return "bg-neutral-light-1 border-neutral-medium-1";
      case "outline":
        return "bg-transparent border-primary";
      default:
        return "bg-primary border-primary";
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return "px-4 py-2";
      case "md":
        return "px-6 py-4";
      case "lg":
        return "px-8 py-5";
      default:
        return "px-6 py-4";
    }
  };

  const getTextVariantStyles = () => {
    switch (variant) {
      case "primary":
        return "text-secondary";
      case "secondary":
        return "text-text-secondary";
      case "outline":
        return "text-primary";
      default:
        return "text-secondary";
    }
  };

  const getTextSizeStyles = () => {
    switch (size) {
      case "sm":
        return "text-sm";
      case "md":
        return "text-base";
      case "lg":
        return "text-lg";
      default:
        return "text-base";
    }
  };

  const buttonClasses = [
    "border rounded-md flex-row items-center justify-center",
    getVariantStyles(),
    getSizeStyles(),
    fullWidth ? "flex-1" : "",
    disabled || loading ? "opacity-70" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const textClasses = [
    "font-semibold",
    getTextVariantStyles(),
    getTextSizeStyles(),
  ].join(" ");

  return (
    <TouchableOpacity
      className={buttonClasses}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "primary"
              ? "colors.brand.primary"
              : colors.brand.primary
          }
        />
      ) : (
        <Text className={textClasses}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
