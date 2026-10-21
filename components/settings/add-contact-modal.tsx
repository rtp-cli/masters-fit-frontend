import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { type ContactKind, useAddContact } from "@/hooks/use-add-contact";
import { useThemeColors } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import { formatPhoneAsTyped, formatPhoneDisplay } from "@/utils/phone";

interface AddContactModalProps {
  visible: boolean;
  kind: ContactKind;
  onClose: () => void;
}

/**
 * Two steps in one card: enter the email/number, then the 4-digit code we
 * sent to it. On success the auth context already holds the updated user, so
 * Settings re-renders with the new line and this just closes.
 */
export default function AddContactModal({ visible, kind, onClose }: AddContactModalProps) {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const [value, setValue] = useState("");
  const [code, setCode] = useState("");
  const { step, sentTo, isBusy, error, sendCode, verifyCode, reset, setError } =
    useAddContact(kind, onClose);

  // Fresh form every time it opens.
  useEffect(() => {
    if (visible) {
      reset();
      setValue("");
      setCode("");
    }
  }, [visible, reset]);

  const isEmail = kind === "email";
  const title =
    step === "enter"
      ? isEmail
        ? "Add an email"
        : "Add a phone number"
      : isEmail
        ? "Check your inbox"
        : "Check your texts";
  const sentLabel = sentTo ? (isEmail ? sentTo : formatPhoneDisplay(sentTo)) : "";

  const inputStyle = {
    height: 52,
    paddingHorizontal: 16,
    fontSize: 17,
    borderWidth: 1,
    borderRadius: 14,
    borderColor: error ? colors.danger : colors.neutral.medium[1],
    backgroundColor: colors.background,
    color: colors.text.primary,
  };

  const onPrimary = () => {
    if (step === "enter") sendCode(value);
    else verifyCode(code);
  };
  const primaryDisabled =
    isBusy || (step === "enter" ? !value.trim() : code.length !== 4);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className={`flex-1 justify-center px-6 ${isDark ? "dark" : ""}`}
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <View className="rounded-2xl p-6" style={{ backgroundColor: colors.surface }}>
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-lg font-bold text-text-primary">{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityLabel="Close"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={colors.text.muted} />
            </TouchableOpacity>
          </View>

          <Text className="text-sm text-text-secondary mb-4">
            {step === "enter"
              ? isEmail
                ? "You’ll be able to sign in with it too, and we’ll send account notices like renewal reminders there."
                : "You’ll be able to sign in with a texted code. US and Canadian mobile numbers only."
              : `Enter the 4-digit code we sent to ${sentLabel}.`}
          </Text>

          {step === "enter" ? (
            <TextInput
              key={`enter-${kind}`}
              style={inputStyle}
              value={value}
              onChangeText={(t) => {
                setValue(isEmail ? t : formatPhoneAsTyped(t));
                if (error) setError("");
              }}
              placeholder={isEmail ? "Email address" : "(555) 555-5555"}
              placeholderTextColor={colors.text.muted}
              autoCapitalize="none"
              autoComplete={isEmail ? "email" : "tel"}
              textContentType={isEmail ? "emailAddress" : "telephoneNumber"}
              keyboardType={isEmail ? "email-address" : "phone-pad"}
              editable={!isBusy}
              autoFocus
              returnKeyType="go"
              onSubmitEditing={onPrimary}
            />
          ) : (
            <TextInput
              key="code"
              style={[inputStyle, { letterSpacing: 8, textAlign: "center" }]}
              value={code}
              onChangeText={(t) => {
                setCode(t.replace(/\D/g, "").slice(0, 4));
                if (error) setError("");
              }}
              placeholder="0000"
              placeholderTextColor={colors.text.muted}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete={isEmail ? "one-time-code" : "sms-otp"}
              maxLength={4}
              editable={!isBusy}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={onPrimary}
            />
          )}

          {error ? (
            <View className="flex-row items-center mt-2" style={{ gap: 6 }}>
              <Ionicons name="alert-circle-outline" size={15} color={colors.danger} />
              <Text className="text-sm flex-1" style={{ color: colors.danger }}>
                {error}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={onPrimary}
            disabled={primaryDisabled}
            className="mt-5 h-[52px] rounded-full items-center justify-center"
            style={{
              backgroundColor: colors.brand.primary,
              opacity: primaryDisabled ? 0.5 : 1,
            }}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color={colors.contentOnPrimary} />
            ) : (
              <Text className="text-base font-semibold" style={{ color: colors.contentOnPrimary }}>
                {step === "enter" ? "Send code" : "Confirm"}
              </Text>
            )}
          </TouchableOpacity>

          {step === "code" && (
            <TouchableOpacity
              onPress={() => {
                reset();
                setCode("");
              }}
              disabled={isBusy}
              className="mt-3 items-center"
            >
              <Text className="text-sm" style={{ color: colors.text.muted }}>
                {isEmail ? "Wrong email? " : "Wrong number? "}
                <Text style={{ color: colors.text.primary, fontWeight: "600" }}>Change it</Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
