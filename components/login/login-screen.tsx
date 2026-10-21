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

import { startPhoneLogin } from "@/lib/auth";
import { isValidEmail } from "@/utils";
import { formatPhoneAsTyped, toUsE164 } from "@/utils/phone";

import { useAuth } from "../../contexts/auth-context";
import { useThemeColors } from "../../lib/theme";

export const LoginScreen = () => {
  const colors = useThemeColors();
  const router = useRouter();
  const { login } = useAuth();

  // Email is the default; "Use your phone number instead" switches to a texted
  // code (US/Canada numbers). Both land on the same code screen.
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [sendFailed, setSendFailed] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);

  const switchMode = () => {
    setMode((m) => (m === "email" ? "phone" : "email"));
    setEmailError("");
    setSendFailed(false);
  };

  const handlePhoneContinue = async () => {
    const e164 = toUsE164(phone);
    if (!e164) {
      setEmailError("Enter a 10-digit US or Canadian mobile number.");
      return;
    }

    setEmailError("");
    setSendFailed(false);
    setIsLoading(true);
    try {
      const res = await startPhoneLogin({ phone: e164 });
      if (res.success) {
        router.push(`/(auth)/verify?phone=${encodeURIComponent(e164)}`);
      } else if (
        res.errorCode === "INVALID_PHONE" ||
        res.errorCode === "SMS_UNAVAILABLE" ||
        res.errorCode === "RATE_LIMITED"
      ) {
        // The server's own words are the useful ones here (e.g. how long to
        // wait, or "use your email instead").
        setEmailError(res.error ?? "We couldn’t text that number.");
      } else {
        setSendFailed(true);
      }
    } catch {
      setSendFailed(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Single merged entry point. Account lookup now happens inside `verify`
  // (backend), so the client no longer calls checkEmail or branches on
  // new-vs-returning here — everyone submits an email and gets a code.
  const handleContinue = async () => {
    if (mode === "phone") return handlePhoneContinue();

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

  const emailFilled =
    mode === "email" ? email.trim().length > 0 : phone.replace(/\D/g, "").length > 0;

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
            {mode === "email" ? "Enter your email" : "Enter your mobile number"}
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
            {mode === "email"
              ? "We’ll send you a secure code to sign in or get started."
              : "We’ll text you a secure code to sign in or get started."}
          </Text>

          {mode === "email" ? (
            /* Email input */
            <TextInput
              key="email"
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
          ) : (
            /* Phone input — formatted as typed, +1 only */
            <TextInput
              key="phone"
              style={[
                { marginTop: 30 },
                getInputStyle(emailFilled, isEmailFocused, !!emailError),
              ]}
              placeholder="(555) 555-5555"
              value={phone}
              onChangeText={(t) => {
                setPhone(formatPhoneAsTyped(t));
                if (emailError) setEmailError("");
                if (sendFailed) setSendFailed(false);
              }}
              onFocus={() => setIsEmailFocused(true)}
              onBlur={() => setIsEmailFocused(false)}
              autoComplete="tel"
              textContentType="telephoneNumber"
              keyboardType="phone-pad"
              inputMode="tel"
              editable={!isLoading}
              placeholderTextColor={colors.text.muted}
              selectionColor={colors.brand.primary}
              autoFocus
              returnKeyType="go"
              onSubmitEditing={handleContinue}
            />
          )}

          <TouchableOpacity
            onPress={switchMode}
            disabled={isLoading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ alignSelf: "center", marginTop: 14 }}
            accessibilityRole="button"
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: colors.brand.primary,
              }}
            >
              {mode === "email"
                ? "Use your phone number instead"
                : "Use your email instead"}
            </Text>
          </TouchableOpacity>

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

          {/* Trust microcopy. This screen is where a prospective user is first
              asked for anything personal, and it previously said nothing about
              what happens to it -- a tester told us she stopped here for exactly
              that reason. The Privacy Policy was only reachable from the waiver,
              three screens later. legal-document renders from a bundled
              constant, so this link works pre-auth and offline. */}
          <View style={{ alignItems: "center", marginTop: 16 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Ionicons
                name="lock-closed-outline"
                size={13}
                color={colors.text.muted}
              />
              <Text
                style={{
                  fontSize: 13,
                  lineHeight: 18,
                  color: colors.text.muted,
                  textAlign: "center",
                }}
              >
                No password to create. We never sell your data.
              </Text>
            </View>
            {/* Carrier/CTIA convention for texted codes. */}
            {mode === "phone" && (
              <Text
                style={{
                  fontSize: 12,
                  lineHeight: 16,
                  color: colors.text.muted,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                Msg & data rates may apply.
              </Text>
            )}
            <TouchableOpacity
              onPress={() => router.push("/legal-document?type=privacy")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="link"
              accessibilityLabel={
                mode === "email"
                  ? "Read what MastersFit does with your email and health data"
                  : "Read what MastersFit does with your phone number and health data"
              }
              style={{ marginTop: 6 }}
            >
              <Text
                style={{
                  fontSize: 13,
                  lineHeight: 18,
                  fontWeight: "600",
                  color: colors.text.secondary,
                  textDecorationLine: "underline",
                  textDecorationStyle: "solid",
                  textAlign: "center",
                }}
              >
                {mode === "email"
                  ? "What we do with your email"
                  : "What we do with your number"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
