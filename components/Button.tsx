import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
} from "react-native";
import { colors } from "../lib/theme";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";
type ButtonSize = "sm" | "md" | "lg";

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
  // Determine styles based on variant, size, and other props
  const buttonStyles = [
    styles.button,
    styles[`${variant}Button`],
    styles[`${size}Button`],
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    (disabled || loading) && styles[`${variant}Disabled`],
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
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
          <Text style={textStyles}>{children}</Text>
          {rightIcon && <React.Fragment>{rightIcon}</React.Fragment>}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  text: {
    fontWeight: "600",
    textAlign: "center",
  },
  fullWidth: {
    width: "100%",
  },
  disabled: {
    opacity: 0.6,
  },

  // Variant styles
  primaryButton: {
    backgroundColor: colors.brand.primary,
  },
  secondaryButton: {
    backgroundColor: colors.neutral.light[2],
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  ghostButton: {
    backgroundColor: "transparent",
  },
  destructiveButton: {
    backgroundColor: colors.brand.secondary,
  },

  // Variant text styles
  primaryText: {
    color: colors.brand.secondary,
  },
  secondaryText: {
    color: colors.text.primary,
  },
  outlineText: {
    color: colors.brand.primary,
  },
  ghostText: {
    color: colors.brand.primary,
  },
  destructiveText: {
    color: colors.neutral.white,
  },

  // Variant disabled styles
  primaryDisabled: {
    backgroundColor: colors.brand.primary,
  },
  secondaryDisabled: {
    backgroundColor: colors.neutral.light[2],
  },
  outlineDisabled: {
    borderColor: colors.neutral.medium[3],
  },
  ghostDisabled: {},
  destructiveDisabled: {
    backgroundColor: colors.brand.secondary,
  },

  // Size styles
  smButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mdButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  lgButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },

  // Size text styles
  smText: {
    fontSize: 13,
  },
  mdText: {
    fontSize: 15,
  },
  lgText: {
    fontSize: 17,
  },
});

export default Button;
