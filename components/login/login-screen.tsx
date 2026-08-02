import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { isValidEmail } from "@/utils";

import { useAuth } from "../../contexts/auth-context";
import { useThemeColors } from "../../lib/theme";

export const LoginScreen = () => {
  const colors = useThemeColors();
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [sendFailed, setSendFailed] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);

  // Single merged entry point. Account lookup now happens inside `verify`
  // (backend), so the client no longer calls checkEmail or branches on
  // new-vs-returning here — everyone submits an email and gets a code.
  const handleContinue = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return; // button is disabled while empty; guard anyway

    if (!isValidEmail(trimmed)) {
      setEmailError("That doesn’t look like an email address.");
      return;
    }

    setEmailError("");
    setSendFailed(false);
    setIsLoading(true);
    try {
      const res = await login({ email: trimmed });
      if (res.success) {
        router.push(`/(auth)/verify?email=${encodeURIComponent(trimmed)}`);
      } else {
        setSendFailed(true);
      }
    } catch {
      setSendFailed(true);
    } finally {
      setIsLoading(false);
    }
  };

  const emailFilled = email.trim().length > 0;

  const getInputStyle = (filled: boolean, focused: boolean, hasError = false) => ({
    height: 54,
    paddingHorizontal: 18,
    fontSize: 17,
    fontWeight: "500" as const,
    textAlign: "left" as const,
    borderWidth: 1,
    borderRadius: 16,
    borderColor: hasError
      ? colors.danger
      : filled || focused
        ? colors.brand.primary
        : colors.neutral.medium[1],
    backgroundColor: filled ? colors.surface : colors.background,
    color: colors.text.primary,
    ...(focused && {
      shadowColor: colors.brand.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
    }),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />

      {/* Android needs an explicit behavior: with SDK 54 edge-to-edge the window
          no longer resizes for the keyboard. Same pattern as the Adjust modal. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header — back chevron + centered brand lockup */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingTop: 14,
            paddingHorizontal: 20,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 9999,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: -8,
            }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 14,
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Image
                source={require("../../assets/logo-dark.png")}
                style={{ width: 27, height: 25 }}
                resizeMode="contain"
              />
              <Text
                style={{
                  fontSize: 19,
                  fontWeight: "600",
                  letterSpacing: -0.19,
                  color: colors.text.primary,
                }}
              >
                MastersFit
              </Text>
            </View>
          </View>
        </View>

        {/* Body — form group biased above center (0.45 : 1 spacers) */}
        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          <View style={{ flex: 0.45 }} />
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              letterSpacing: -0.56,
              lineHeight: 32.5,
              color: colors.text.primary,
              textAlign: "center",
            }}
          >
            Enter your email
          </Text>
          <Text
            style={{
              fontSize: 16,
              lineHeight: 24,
              color: colors.text.secondary,
              textAlign: "center",
              maxWidth: 290,
              alignSelf: "center",
              marginTop: 12,
            }}
          >
            We’ll send you a secure code to sign in or get started.
          </Text>

          {/* Email input */}
          <TextInput
            style={[
              { marginTop: 30 },
              getInputStyle(emailFilled, isEmailFocused, !!emailError),
            ]}
            placeholder="Email address"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (emailError) setEmailError("");
              if (sendFailed) setSendFailed(false);
            }}
            onFocus={() => setIsEmailFocused(true)}
            onBlur={() => setIsEmailFocused(false)}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            editable={!isLoading}
            placeholderTextColor={colors.text.muted}
            selectionColor={colors.brand.primary}
            autoFocus
            returnKeyType="go"
            onSubmitEditing={handleContinue}
          />

          {/* Inline validation — replaces the old "Error" dialog */}
          {emailError ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                marginTop: 10,
              }}
            >
              <Ionicons
                name="alert-circle-outline"
                size={15}
                color={colors.danger}
              />
              <Text style={{ fontSize: 14, fontWeight: "500", color: colors.danger }}>
                {emailError}
              </Text>
            </View>
          ) : null}

          {/* Send-failure card (frame 1h) — surfaces once the backend stops
              swallowing send failures (SPEC §4.6) */}
          {sendFailed && (
            <View
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.neutral.medium[1],
                backgroundColor: colors.surface,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 7,
                  marginBottom: 4,
                }}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={15}
                  color={colors.danger}
                />
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: colors.text.primary }}
                >
                  We couldn’t send your code
                </Text>
              </View>
              <Text style={{ fontSize: 14, lineHeight: 20, color: colors.text.secondary }}>
                Check your connection and try again.
              </Text>
              <TouchableOpacity onPress={handleContinue} style={{ marginTop: 10 }}>
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: colors.brand.primary }}
                >
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={{ flex: 1 }} />
        </View>

        {/* Footer */}
        <View
          style={{
            paddingHorizontal: 24,
            paddingBottom: 24,
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            style={{
              width: "100%",
              height: 56,
              backgroundColor: colors.brand.primary,
              borderRadius: 9999,
              alignItems: "center",
              justifyContent: "center",
              opacity: !emailFilled || isLoading ? 0.5 : 1,
            }}
            onPress={handleContinue}
            disabled={!emailFilled || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.contentOnPrimary} />
            ) : (
              <Text
                style={{ color: colors.contentOnPrimary, fontSize: 17, fontWeight: "600" }}
              >
                Send code
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
