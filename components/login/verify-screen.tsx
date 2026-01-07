import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useVerifyController } from "@components/login/use-verify-controller";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../lib/theme";

export const VerifyScreen = () => {
  const colors = useThemeColors();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState(["", "", "", ""]);
  const { isLoading, requestNewCode, verifyCode } = useVerifyController();

  const inputs = useRef<TextInput[]>([]);
  const hiddenInputRef = useRef<TextInput>(null);

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      router.replace("/(auth)/login");
    }
  }, [email]);

  // Handle autofill from hidden input
  const handleHiddenInputChange = (text: string) => {
    if (text.length === 4) {
      const digits = text.split("");
      setOtp(digits);

      // Auto-submit if we have 4 digits
      if (!isLoading) {
        setTimeout(() => {
          handleVerifyWithCode(text);
        }, 100);
      }
    }
  };

  // Handle manual input from visible inputs
  const handleOtpChange = (text: string, index: number) => {
    // Only handle single digit input for visible inputs
    const newOtp = [...otp];
    newOtp[index] = text.slice(-1); // Take only the last character
    setOtp(newOtp);

    // Move to next input
    if (text && index < 3) {
      inputs.current[index + 1].focus();
    }

    // Auto-submit when last digit is entered
    if (text && index === 3) {
      const completeCode = [...newOtp];
      completeCode[index] = text.slice(-1);
      if (completeCode.every((digit) => digit !== "") && !isLoading) {
        setTimeout(() => {
          const code = completeCode.join("");
          handleVerifyWithCode(code);
        }, 100);
      }
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    // Move to previous input on backspace
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  // Request a new code via controller
  const handleRequestNewCode = async () => {
    if (!email) return;
    const res = await requestNewCode(email as string);
    if (res.success) {
      setOtp(["", "", "", ""]);
    }
  };

  const handleVerifyWithCode = async (code: string) => {
    if (!email) return;
    const res = await verifyCode(email as string, code);
    if (!res.success) {
      // Reset OTP on failure to match previous UX
      setOtp(["", "", "", ""]);
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    await handleVerifyWithCode(code);
  };

  const handleGoBack = () => {
    router.back();
  };

  if (!email) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="dark" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-lg pt-2xl pb-lg">
          {/* Title and description */}
          <Text className="text-2xl font-semibold text-text-primary mb-md">
            Enter Verification Code
          </Text>
          <Text className="text-sm text-text-muted leading-5 mb-lg">
            A 4-digit code has been sent to your email address. This code will
            expire in 10 minutes.
          </Text>

          {/* Hidden input for iOS autofill */}
          <TextInput
            ref={hiddenInputRef}
            style={{
              position: "absolute",
              left: -9999,
              top: -9999,
              opacity: 0,
              height: 0,
              width: 0,
            }}
            value={otp.join("")}
            onChangeText={handleHiddenInputChange}
            textContentType="oneTimeCode"
            keyboardType="number-pad"
            maxLength={4}
            editable={!isLoading}
            autoComplete="sms-otp"
          />

          {/* OTP Input Boxes */}
          <View className="flex-row justify-center space-x-6 my-lg">
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  if (ref) inputs.current[index] = ref;
                }}
                className="w-16 h-16 border border-neutral-medium-1 rounded-xl text-center text-2xl font-bold text-text-primary mr-2"
                value={digit}
                onChangeText={(text) => handleOtpChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                editable={!isLoading}
                autoFocus={index === 0}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom button */}
      <View className="px-lg pb-2xl pt-md bg-background">
        <TouchableOpacity
          className={`py-md px-2xl bg-secondary rounded-xl items-center justify-center flex-row ${
            isLoading || otp.join("").length !== 4 ? "opacity-50" : ""
          }`}
          onPress={handleVerify}
          disabled={isLoading || otp.join("").length !== 4}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.neutral.white} />
          ) : (
            <>
              <Text className="text-neutral-white font-semibold text-base mr-2">
                Continue
              </Text>
              <Ionicons name="arrow-forward" size={20} color={colors.neutral.white} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
