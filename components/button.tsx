import React from "react";
import {
  ActivityIndicator,
  Text,
  type TextStyle,
  TouchableOpacity,
  type TouchableOpacityProps,
  type ViewStyle,
} from "react-native";

import { colors } from "../lib/theme";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";
type ButtonSize = "sm" | "md" | "lg";

// TODO: should be using this component for buttons wherever we have added buttons
interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  disabled,
  leftIcon,
  rightIcon,
  children,
  ...rest
}) => {
  // Base classes
  const baseClasses = "flex-row items-center justify-center rounded-sm";

  // Variant classes
  const variantClasses = {
    primary: "bg-primary",
    secondary: "bg-neutral-light-2",
    outline: "bg-transparent border border-primary",
    ghost: "bg-transparent",
    destructive: "bg-secondary",
  };

  // Size classes
  const sizeClasses = {
    sm: "px-3 py-2",
    md: "px-4 py-3",
    lg: "px-6 py-4",
  };

  // Text variant classes
  const textVariantClasses = {
    primary: "text-secondary",
    secondary: "text-text-primary",
    outline: "text-primary",
    ghost: "text-primary",
    destructive: "text-white",
  };

  // Text size classes
  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  // Build className
  const buttonClassName = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && "w-full",
    (disabled || loading) && "opacity-60",
  ]
    .filter(Boolean)
    .join(" ");

  const textClassName = [
    "font-semibold text-center",
    textVariantClasses[variant],
    textSizeClasses[size],
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <TouchableOpacity
      className={buttonClassName}
      style={style}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "primary" || variant === "destructive"
              ? colors.neutral.white
              : colors.brand.primary
          }
        />
      ) : (
        <>
          {leftIcon && <React.Fragment>{leftIcon}</React.Fragment>}
          <Text className={textClassName} style={textStyle}>
            {children}
          </Text>
          {rightIcon && <React.Fragment>{rightIcon}</React.Fragment>}
        </>
      )}
    </TouchableOpacity>
  );
};

export default Button;
