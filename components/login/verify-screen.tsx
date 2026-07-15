import { useVerifyController } from "@components/login/use-verify-controller";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams,useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback,useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  type NativeSyntheticEvent,
  Text,
  TextInput,
  type TextInputKeyPressEventData,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CustomDialog } from "@/components/ui";

import { useThemeColors } from "../../lib/theme";

type VerifyStatus = "idle" | "verifying" | "success" | "error";

export const VerifyScreen = () => {
  const colors = useThemeColors();
  const router = useRouter();
  const { email, isNewUser } = useLocalSearchParams<{ email: string; isNewUser?: string }>();

  const [otp, setOtp] = useState(["", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(54);
  const [status, setStatus] = useState<VerifyStatus>("idle");
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  const {
    isLoading,
    requestNewCode,
    verifyCode,
    dialogVisible,
    dialogConfig,
    setDialogVisible,
  } = useVerifyController();

  const inputs = useRef<TextInput[]>([]);
  const isVerifyingRef = useRef(false);
  const lastVerifiedCodeRef = useRef<string>("");

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (!email) router.replace("/(auth)/login");
  }, [email]);

  const showToast = useCallback(
    (message: string) => {
      setToastMessage(message);
      toastTranslateY.setValue(-12);
      toastOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(toastTranslateY, {
          toValue: 0,
          damping: 12,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start();
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(toastOpacity, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(toastTranslateY, {
            toValue: -12,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }, 2400);
    },
    [toastOpacity, toastTranslateY]
  );

  const triggerShake = useCallback(() => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -7, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 3, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleVerifyWithCode = async (code: string) => {
    if (!email || isVerifyingRef.current) return;
    if (code === lastVerifiedCodeRef.current) return;

    isVerifyingRef.current = true;
    lastVerifiedCodeRef.current = code;
    setStatus("verifying");
    inputs.current.forEach((input) => input?.blur());

    try {
      const res = await verifyCode(email as string, code);
      if (res.success) {
        setStatus("success");
        lastVerifiedCodeRef.current = "";
      } else if (res.invalidCode) {
        setStatus("error");
        triggerShake();
        setTimeout(() => {
          setOtp(["", "", "", ""]);
          setStatus("idle");
          lastVerifiedCodeRef.current = "";
          inputs.current[0]?.focus();
        }, 750);
      } else {
        setStatus("idle");
        setOtp(["", "", "", ""]);
        lastVerifiedCodeRef.current = "";
      }
    } finally {
      setTimeout(() => {
        isVerifyingRef.current = false;
      }, 500);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    if (status === "verifying" || status === "success") return;

    if (text.length > 1) {
      const digits = text.replace(/[^0-9]/g, "").slice(0, 4).split("");
      const newOtp = ["", "", "", ""];
      digits.forEach((d, i) => {
        newOtp[i] = d;
      });
      setOtp(newOtp);
      const lastIndex = Math.min(digits.length - 1, 3);
      inputs.current[lastIndex]?.focus();
      const code = newOtp.join("");
      if (
        code.length === 4 &&
        !isVerifyingRef.current &&
        code !== lastVerifiedCodeRef.current
      ) {
        setTimeout(() => handleVerifyWithCode(code), 100);
      }
      return;
    }

    if (status === "error") setStatus("idle");

    const newOtp = [...otp];
    newOtp[index] = text.replace(/[^0-9]/g, "").slice(-1);
    setOtp(newOtp);

    if (newOtp[index] && index < 3) {
      inputs.current[index + 1]?.focus();
    }

    if (newOtp[index] && index === 3) {
      const code = newOtp.join("");
      if (
        newOtp.every((d) => d !== "") &&
        !isVerifyingRef.current &&
        code !== lastVerifiedCodeRef.current
      ) {
        setTimeout(() => handleVerifyWithCode(code), 100);
      }
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (status === "verifying" || status === "success") return;
    const key = e.nativeEvent.key;
    if (key === "Backspace" && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
      inputs.current[index - 1]?.focus();
    } else if (key === "ArrowLeft" && index > 0) {
      inputs.current[index - 1]?.focus();
    } else if (key === "ArrowRight" && index < 3) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleResend = useCallback(async () => {
    if (!email || resendCooldown > 0 || isLoading) return;
    const res = await requestNewCode(email as string);
    if (res.success) {
      setOtp(["", "", "", ""]);
      setStatus("idle");
      setResendCooldown(54);
      showToast("A new code is on its way");
      inputs.current[0]?.focus();
    }
  }, [email, resendCooldown, isLoading, requestNewCode, showToast]);

  const handleBack = useCallback(() => {
    showToast("Returning to email entry…");
    setTimeout(() => router.back(), 800);
  }, [router, showToast]);

  const handleChangeEmail = useCallback(() => {
    showToast("Returning to email entry…");
    setTimeout(() => router.back(), 800);
  }, [router, showToast]);

  if (!email) return null;

  const locked = status === "verifying" || status === "success";

  const getCellStyle = (index: number) => {
    const digit = otp[index];
    const isFocused = focusedIndex === index;

    if (status === "error") {
      return {
        borderColor: colors.danger,
        backgroundColor: colors.background,
        color: colors.danger,
      };
    }
    if (status === "success") {
      return {
        borderColor: colors.brand.primary,
        backgroundColor: "rgba(10, 10, 10, 0.06)",
        color: colors.text.primary,
      };
    }
    if (digit) {
      return {
        borderColor: colors.brand.primary,
        backgroundColor: colors.surface,
        color: colors.text.primary,
      };
    }
    if (isFocused) {
      return {
        borderColor: colors.brand.primary,
        backgroundColor: colors.background,
        color: colors.text.primary,
      };
    }
    return {
      borderColor: colors.neutral.medium[1],
      backgroundColor: colors.background,
      color: colors.text.primary,
    };
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />

      {/* Toast */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 64,
          left: 0,
          right: 0,
          alignItems: "center",
          zIndex: 10,
          opacity: toastOpacity,
          transform: [{ translateY: toastTranslateY }],
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: colors.brand.primary,
            paddingVertical: 9,
            paddingHorizontal: 16,
            borderRadius: 9999,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 8,
          }}
        >
          <Ionicons name="checkmark" size={16} color={colors.contentOnPrimary} />
          <Text
            style={{
              color: colors.contentOnPrimary,
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            {toastMessage}
          </Text>
        </View>
      </Animated.View>

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: 14,
          paddingHorizontal: 20,
        }}
      >
        <TouchableOpacity
          onPress={handleBack}
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
              style={{ width: 24, height: 22 }}
              resizeMode="contain"
            />
            <Text
              style={{
                fontSize: 17,
                fontWeight: "600",
                letterSpacing: -0.17,
                color: colors.text.primary,
              }}
            >
              MastersFit
            </Text>
          </View>
        </View>
      </View>

      {/* Body — centered vertically and horizontally */}
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
        }}
      >
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
          Check your inbox
        </Text>
        <Text
          style={{
            fontSize: 15,
            lineHeight: 24,
            color: colors.text.muted,
            textAlign: "center",
            maxWidth: 280,
            marginTop: 12,
          }}
        >
          {isNewUser === "true"
            ? "We sent a confirmation code to verify your email"
            : "Enter the 4-digit code we sent to"}{"\n"}
          <Text style={{ color: colors.text.primary, fontWeight: "600" }}>
            {email}
          </Text>
        </Text>

        {/* Code cells */}
        <Animated.View
          style={{
            flexDirection: "row",
            gap: 12,
            marginTop: 30,
            transform: [{ translateX: shakeAnim }],
          }}
        >
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                if (ref) inputs.current[index] = ref;
              }}
              style={{
                width: 62,
                height: 70,
                fontSize: 26,
                fontWeight: "700",
                textAlign: "center",
                borderWidth: 1.5,
                borderRadius: 16,
                ...getCellStyle(index),
              }}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(null)}
              keyboardType="number-pad"
              maxLength={index === 0 ? 4 : 1}
              editable={!locked}
              autoFocus={index === 0}
              textContentType={index === 0 ? "oneTimeCode" : "none"}
              autoComplete={index === 0 ? "sms-otp" : "off"}
              selectTextOnFocus
            />
          ))}
        </Animated.View>

        {/* Error line */}
        <View style={{ marginTop: 20, height: 20, justifyContent: "center" }}>
          {status === "error" && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 7 }}
            >
              <Ionicons
                name="alert-circle-outline"
                size={15}
                color={colors.danger}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "500",
                  color: colors.danger,
                }}
              >
                That code didn't match. Check it and try again.
              </Text>
            </View>
          )}
        </View>

        {/* Status line */}
        <View
          style={{
            height: 20,
            marginTop: 4,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {status === "verifying" && (
            <>
              <ActivityIndicator
                size="small"
                color={colors.brand.primary}
                style={{ transform: [{ scale: 0.7 }] }}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: colors.text.secondary,
                }}
              >
                Verifying…
              </Text>
            </>
          )}
          {status === "success" && (
            <>
              <Ionicons
                name="checkmark"
                size={16}
                color={colors.brand.primary}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: colors.brand.primary,
                }}
              >
                Verified
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Footer */}
      <View
        style={{
          paddingTop: 24,
          paddingBottom: 24,
          paddingHorizontal: 24,
          alignItems: "center",
          gap: 16,
        }}
      >
        {resendCooldown > 0 ? (
          <Text
            style={{ fontSize: 13, fontWeight: "500", color: colors.text.muted }}
          >
            Resend code in {resendCooldown}s
          </Text>
        ) : (
          <TouchableOpacity onPress={handleResend} disabled={isLoading}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.brand.primary,
                textDecorationLine: "underline",
              }}
            >
              Resend code
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleChangeEmail}>
          <Text style={{ fontSize: 13, color: colors.text.muted }}>
            Wrong email?{" "}
            <Text style={{ color: colors.text.primary, fontWeight: "600" }}>
              Change it
            </Text>
          </Text>
        </TouchableOpacity>
      </View>

      {dialogConfig && (
        <CustomDialog
          visible={dialogVisible}
          onClose={() => setDialogVisible(false)}
          title={dialogConfig.title}
          description={dialogConfig.description}
          primaryButton={dialogConfig.primaryButton}
          secondaryButton={dialogConfig.secondaryButton}
          icon={dialogConfig.icon}
        />
      )}
    </SafeAreaView>
  );
};
