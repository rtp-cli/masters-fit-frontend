import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
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

import { CustomDialog } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics-events";
import { useThemeColors } from "@/lib/theme";

export const NameScreen = () => {
  const colors = useThemeColors();
  const router = useRouter();
  const navigation = useNavigation();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [exitVisible, setExitVisible] = useState(false);
  const leavingRef = useRef(false);

  // No back chevron — the email is already verified, so a plain back is a dead
  // end. Intercept every back vector (gesture, hardware, header) and confirm
  // via the leave-setup dialog (§6.5). `leavingRef` lets the confirmed leave
  // through without re-triggering the guard.
  useEffect(() => {
    const sub = navigation.addListener("beforeRemove", (e) => {
      if (leavingRef.current) return;
      e.preventDefault();
      setExitVisible(true);
    });
    return sub;
  }, [navigation]);

  useEffect(() => {
    if (!email) {
      leavingRef.current = true; // programmatic redirect, not a user back
      router.replace("/(auth)/login");
    }
  }, [email]);

  const confirmLeave = () => {
    leavingRef.current = true;
    setExitVisible(false);
    router.replace("/");
  };

  const handleContinue = async () => {
    const trimmed = name.trim();
    if (!trimmed) return; // button disabled while empty; guard anyway

    trackEvent(AnalyticsEvent.SIGNUP_STARTED, { is_new_user: true }); // [AN-09] now post-verification (SPEC §9)
    setNameError("");
    setIsLoading(true);
    try {
      const res = await signup({ email: email as string, name: trimmed });
      if (res.success) {
        leavingRef.current = true; // advancing forward, not a user back
        router.replace("/(auth)/waiver");
      } else {
        setNameError("Something went wrong. Please try again.");
      }
    } catch {
      setNameError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const nameFilled = name.trim().length > 0;

  if (!email) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header — centred lockup only, no back affordance (40×40 spacer) */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingTop: 14,
            paddingHorizontal: 20,
          }}
        >
          <View style={{ width: 40, height: 40 }} />
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

        {/* Body — 0.45 : 1 optical spacers, matching the other form screens */}
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
            What should we call you?
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
            We’ll use it around the app, and on your waiver.
          </Text>

          <TextInput
            style={{
              marginTop: 30,
              height: 54,
              paddingHorizontal: 18,
              fontSize: 17,
              fontWeight: "500",
              textAlign: "left",
              borderWidth: 1,
              borderRadius: 16,
              borderColor: nameError
                ? colors.danger
                : nameFilled || isFocused
                  ? colors.brand.primary
                  : colors.neutral.medium[1],
              backgroundColor: nameFilled ? colors.surface : colors.background,
              color: colors.text.primary,
              ...(isFocused && {
                shadowColor: colors.brand.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.08,
                shadowRadius: 6,
              }),
            }}
            placeholder="Full name"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (nameError) setNameError("");
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoCapitalize="words"
            editable={!isLoading}
            placeholderTextColor={colors.text.muted}
            selectionColor={colors.brand.primary}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />

          {nameError ? (
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
                {nameError}
              </Text>
            </View>
          ) : null}
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
              opacity: !nameFilled || isLoading ? 0.5 : 1,
            }}
            onPress={handleContinue}
            disabled={!nameFilled || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.contentOnPrimary} />
            ) : (
              <Text
                style={{ color: colors.contentOnPrimary, fontSize: 17, fontWeight: "600" }}
              >
                Continue
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Leave-setup dialog (frame 1n) — reassurance, not a warning; nothing is
          lost, the email is already verified. */}
      <CustomDialog
        visible={exitVisible}
        onClose={() => setExitVisible(false)}
        title="Leave setup?"
        description="Your email is verified. You can come back any time and pick up where you left off."
        icon="warning"
        primaryButton={{ text: "Keep going", onPress: () => setExitVisible(false) }}
        secondaryButton={{ text: "Leave", onPress: confirmLeave }}
      />
    </SafeAreaView>
  );
};
