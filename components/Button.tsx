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
          color={variant === "primary" ? "white" : "indigo"}
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
    backgroundColor: "indigo",
  },
  secondaryButton: {
    backgroundColor: "neutral-medium-1",
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "indigo",
  },
  ghostButton: {
    backgroundColor: "transparent",
  },
  destructiveButton: {
    backgroundColor: "error",
  },

  // Variant text styles
  primaryText: {
    color: "white",
  },
  secondaryText: {
    color: "neutral-dark-4",
  },
  outlineText: {
    color: "indigo",
  },
  ghostText: {
    color: "indigo",
  },
  destructiveText: {
    color: "white",
  },

  // Variant disabled styles
  primaryDisabled: {
    backgroundColor: "indigo",
  },
  secondaryDisabled: {
    backgroundColor: "neutral-medium-1",
  },
  outlineDisabled: {
    borderColor: "neutral-medium-5",
  },
  ghostDisabled: {},
  destructiveDisabled: {
    backgroundColor: "error",
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
