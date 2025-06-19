import React from "react";
import { TouchableOpacity, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface OptionButtonProps {
  label: string;
  description?: string;
  isSelected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  className?: string;
  variant?: "default" | "compact";
}

export default function OptionButton({
  label,
  description,
  isSelected,
  onPress,
  icon,
  iconColor,
  className = "",
  variant = "default",
}: OptionButtonProps) {
  const getContainerStyles = () => {
    const baseStyles = "border rounded-lg flex-row items-center";
    const selectedStyles = isSelected
      ? "bg-primary border-primary"
      : "bg-neutral-light-1 border-neutral-medium-1";
    const sizeStyles = variant === "compact" ? "p-3" : "p-4";

    return `${baseStyles} ${selectedStyles} ${sizeStyles}`;
  };

  const getTextStyles = () => {
    const baseStyles = "font-medium";
    const colorStyles = isSelected ? "text-secondary" : "text-text-primary";
    const sizeStyles = variant === "compact" ? "text-sm" : "text-base";

    return `${baseStyles} ${colorStyles} ${sizeStyles}`;
  };

  const getDescriptionStyles = () => {
    const baseStyles = "text-xs mt-1";
    const colorStyles = isSelected ? "text-secondary" : "text-text-muted";

    return `${baseStyles} ${colorStyles}`;
  };

  const getIconColor = () => {
    if (iconColor) return iconColor;
    return isSelected ? "secondary" : "text-muted";
  };

  return (
    <TouchableOpacity
      className={`${getContainerStyles()} ${className}`}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {icon && (
        <View className="mr-3">
          <Ionicons
            name={icon}
            size={variant === "compact" ? 20 : 24}
            color={getIconColor()}
          />
        </View>
      )}
      <View className="flex-1">
        <Text className={getTextStyles()}>{label}</Text>
        {description && (
          <Text className={getDescriptionStyles()}>{description}</Text>
        )}
      </View>
      {isSelected && (
        <View className="ml-2">
          <Ionicons
            name="checkmark-circle"
            size={variant === "compact" ? 20 : 24}
            color="secondary"
          />
        </View>
      )}
    </TouchableOpacity>
  );
}
