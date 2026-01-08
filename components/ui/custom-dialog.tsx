import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { useThemeColors } from "../../lib/theme";

export interface DialogButton {
  text: string;
  onPress: () => void;
}

export interface CustomDialogProps {
  visible: boolean;
  onClose?: () => void;
  title: string;
  description: string;
  primaryButton: DialogButton;
  secondaryButton?: DialogButton;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  dismissOnBackdropPress?: boolean;
}

export default function CustomDialog({
  visible,
  onClose,
  title,
  description,
  primaryButton,
  secondaryButton,
  icon,
  iconColor,
  dismissOnBackdropPress = true,
}: CustomDialogProps) {
  const colors = useThemeColors();
  const handleBackdropPress = () => {
    if (dismissOnBackdropPress && onClose) {
      onClose();
    }
  };

  const hasSecondaryButton = !!secondaryButton;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <TouchableWithoutFeedback>
            <View className="bg-surface rounded-2xl p-6 w-full max-w-sm shadow-xl items-center">
              {/* Icon */}
              {icon && (
                <View className="size-16 rounded-full bg-primary/10 items-center justify-center mb-4">
                  <Ionicons
                    name={icon}
                    size={32}
                    color={iconColor || colors.brand.primary}
                  />
                </View>
              )}

              {/* Title */}
              <Text className="text-xl font-bold text-text-primary mb-2 text-center">
                {title}
              </Text>

              {/* Description */}
              <Text className="text-base text-text-secondary text-center mb-6 leading-6">
                {description}
              </Text>

              {/* Buttons */}
              {hasSecondaryButton ? (
                <View className="flex-row gap-3 w-full">
                  {/* Secondary Button (Left) */}
                  <TouchableOpacity
                    className="flex-1 bg-neutral-light-2 border border-neutral-medium-1 rounded-xl py-3 px-6 items-center justify-center"
                    onPress={secondaryButton.onPress}
                  >
                    <Text className="text-text-secondary font-semibold text-base">
                      {secondaryButton.text}
                    </Text>
                  </TouchableOpacity>

                  {/* Primary Button (Right) */}
                  <TouchableOpacity
                    className="flex-1 bg-primary rounded-xl py-3 px-6 items-center justify-center"
                    onPress={primaryButton.onPress}
                  >
                    <Text className="text-content-on-primary font-semibold text-base">
                      {primaryButton.text}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  className="bg-primary rounded-xl py-3 px-8 w-full items-center justify-center"
                  onPress={primaryButton.onPress}
                >
                  <Text className="text-content-on-primary font-semibold text-base">
                    {primaryButton.text}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
