/**
 * Voice Toggle Button Component
 * Quick toggle button for enabling/disabling voice assistant during workouts
 */

import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/theme";

interface VoiceToggleButtonProps {
  isEnabled: boolean;
  isSpeaking?: boolean;
  isListening?: boolean;
  onToggle: () => void;
  onToggleListening?: () => void;
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
}

export function VoiceToggleButton({
  isEnabled,
  isSpeaking = false,
  isListening = false,
  onToggle,
  onToggleListening,
  size = "medium",
  showLabel = false,
}: VoiceToggleButtonProps) {
  const colors = useThemeColors();

  // Size configurations
  const sizeConfig = {
    small: { button: 32, icon: 18, label: 10 },
    medium: { button: 44, icon: 24, label: 12 },
    large: { button: 56, icon: 32, label: 14 },
  };

  const { button: buttonSize, icon: iconSize, label: labelSize } = sizeConfig[size];

  // Determine icon and color based on state
  const getIconConfig = () => {
    if (!isEnabled) {
      return {
        name: "volume-mute" as const,
        color: colors.textMuted,
        backgroundColor: colors.card,
      };
    }
    if (isListening) {
      return {
        name: "mic" as const,
        color: colors.success,
        backgroundColor: colors.card,
      };
    }
    if (isSpeaking) {
      return {
        name: "volume-high" as const,
        color: colors.primary,
        backgroundColor: colors.card,
      };
    }
    return {
      name: "volume-medium" as const,
      color: colors.text,
      backgroundColor: colors.card,
    };
  };

  const { name: iconName, color: iconColor, backgroundColor } = getIconConfig();

  // Get status text
  const getStatusText = () => {
    if (!isEnabled) return "Voice Off";
    if (isListening) return "Listening...";
    if (isSpeaking) return "Speaking...";
    return "Voice On";
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onToggle}
        onLongPress={onToggleListening}
        delayLongPress={500}
        style={[
          styles.button,
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            backgroundColor,
            borderColor: isEnabled ? colors.primary : colors.border,
            borderWidth: isEnabled ? 2 : 1,
          },
        ]}
        activeOpacity={0.7}
      >
        <Ionicons name={iconName} size={iconSize} color={iconColor} />
        {/* Pulsing indicator when speaking or listening */}
        {(isSpeaking || isListening) && (
          <View
            style={[
              styles.pulseIndicator,
              {
                backgroundColor: isListening ? colors.success : colors.primary,
              },
            ]}
          />
        )}
      </TouchableOpacity>
      {showLabel && (
        <Text
          style={[
            styles.label,
            {
              fontSize: labelSize,
              color: isEnabled ? colors.text : colors.textMuted,
            },
          ]}
        >
          {getStatusText()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  button: {
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  pulseIndicator: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    marginTop: 4,
    fontWeight: "500",
  },
});

export default VoiceToggleButton;

