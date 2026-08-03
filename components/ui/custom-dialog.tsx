import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { useThemeColors } from "../../lib/theme";

export interface DialogButton {
  text: string;
  onPress: () => void;
  destructive?: boolean;
}

export interface CustomDialogProps {
  visible: boolean;
  onClose?: () => void;
  title: string;
  description: string;
  primaryButton: DialogButton;
  secondaryButton?: DialogButton;
  tertiaryButton?: DialogButton;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  /** Optional element rendered between the description and the buttons. */
  accessory?: React.ReactNode;
  /**
   * When set, the user must type this exact phrase (case-insensitive, trimmed)
   * into a text field before the primary button enables — the GitHub-style
   * "type to confirm" gate for irreversible actions. The dialog owns the input
   * state and clears it whenever it opens/closes.
   */
  confirmationPhrase?: string;
  dismissOnBackdropPress?: boolean;
  // Fires after the dialog's dismiss animation completes (iOS). Lets callers
  // sequence a follow-up modal transition instead of triggering it in the same
  // tick, which iOS would drop (orphaned/stuck modal).
  onDismiss?: () => void;
}

export default function CustomDialog({
  visible,
  onClose,
  title,
  description,
  primaryButton,
  secondaryButton,
  tertiaryButton,
  icon,
  iconColor,
  accessory,
  confirmationPhrase,
  dismissOnBackdropPress = true,
  onDismiss,
}: CustomDialogProps) {
  const colors = useThemeColors();
  const [confirmInput, setConfirmInput] = useState("");

  // Clear the typed phrase whenever the dialog opens or closes so a prior
  // attempt never leaves the primary button pre-enabled.
  useEffect(() => {
    setConfirmInput("");
  }, [visible]);

  const needsConfirmation = !!confirmationPhrase;
  const confirmed =
    !needsConfirmation ||
    confirmInput.trim().toLowerCase() === confirmationPhrase!.trim().toLowerCase();

  const handleBackdropPress = () => {
    if (dismissOnBackdropPress && onClose) {
      onClose();
    }
  };

  const hasThreeButtons = !!secondaryButton && !!tertiaryButton;
  const hasSecondaryButton = !!secondaryButton;

  return (
    <Modal visible={visible} transparent animationType="fade" onDismiss={onDismiss}>
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            className="w-full items-center"
          >
          <TouchableWithoutFeedback>
            <View className="bg-surface rounded-2xl p-6 w-full max-w-sm shadow-xl items-center border border-neutral-medium-1">
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

              {/* Optional accessory (e.g. streak badge) */}
              {accessory}

              {/* Type-to-confirm gate for irreversible actions */}
              {needsConfirmation && (
                <View className="w-full mb-5">
                  <Text className="text-sm text-text-muted text-center mb-2">
                    Type{" "}
                    <Text className="font-semibold text-text-primary">
                      {confirmationPhrase}
                    </Text>{" "}
                    to confirm
                  </Text>
                  <TextInput
                    value={confirmInput}
                    onChangeText={setConfirmInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    placeholder={confirmationPhrase}
                    placeholderTextColor={colors.text.muted}
                    className="w-full border border-neutral-medium-1 rounded-xl px-4 py-3 text-base text-text-primary bg-neutral-light-2"
                  />
                </View>
              )}

              {/* Buttons */}
              {hasThreeButtons ? (
                <View className="w-full gap-2">
                  {/* Primary Button (Top) */}
                  <TouchableOpacity
                    className="bg-primary rounded-xl py-3 px-6 items-center justify-center"
                    style={{ opacity: confirmed ? 1 : 0.5 }}
                    disabled={!confirmed}
                    onPress={primaryButton.onPress}
                  >
                    <Text className="text-content-on-primary font-semibold text-base">
                      {primaryButton.text}
                    </Text>
                  </TouchableOpacity>

                  {/* Tertiary Button (Middle) */}
                  <TouchableOpacity
                    className="bg-neutral-light-2 border border-neutral-medium-1 rounded-xl py-3 px-6 items-center justify-center"
                    onPress={tertiaryButton.onPress}
                  >
                    <Text className="text-text-secondary font-semibold text-base">
                      {tertiaryButton.text}
                    </Text>
                  </TouchableOpacity>

                  {/* Secondary Button (Bottom - text only) */}
                  <TouchableOpacity
                    className="py-2 items-center justify-center"
                    onPress={secondaryButton.onPress}
                  >
                    <Text className={`font-medium text-sm ${secondaryButton.destructive ? "text-red-500" : "text-text-muted"}`}>
                      {secondaryButton.text}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : hasSecondaryButton ? (
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
                    style={{ opacity: confirmed ? 1 : 0.5 }}
                    disabled={!confirmed}
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
                  style={{ opacity: confirmed ? 1 : 0.5 }}
                  disabled={!confirmed}
                  onPress={primaryButton.onPress}
                >
                  <Text className="text-content-on-primary font-semibold text-base">
                    {primaryButton.text}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
