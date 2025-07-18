import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { useRouter, useLocalSearchParams, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { verify, generateAuthCode } from "../../lib/auth";
import { useAuth } from "../../contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { colors } from "../../lib/theme";
import Header from "@components/Header";

export default function VerifyScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const { isSigningUp, setUserData, setIsPreloadingData } = useAuth();

  const inputs = useRef<TextInput[]>([]);

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      router.replace("/(auth)/login");
    }
  }, [email]);

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Move to next input
    if (text && index < 3) {
      inputs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Move to previous input on backspace
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  // Function to request a new code
  const requestNewCode = async () => {
    if (!email) return;

    setIsLoading(true);
    try {
      const response = await generateAuthCode({ email });
      if (response.success) {
        Alert.alert(
          "Success",
          "A new verification code has been sent to your email."
        );
        setOtp(["", "", "", ""]);
      } else {
        Alert.alert("Error", "Failed to send new code. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to request new code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!email) return;

    const code = otp.join("");
    if (code.length !== 4) {
      Alert.alert("Error", "Please enter the complete 4-digit OTP");
      return;
    }

    setIsLoading(true);
    try {
      const response = await verify({
        authCode: code.trim(),
      });

      if (response.success) {
        if (response.token) {
          await SecureStore.setItemAsync("token", response.token);
        }

        // Set the user data in auth context if available
        if (response.user) {
          console.log("🔍 Verify - Setting user data:", response.user);
          // Include needsOnboarding from the response in the user object
          const userWithOnboardingStatus = {
            ...response.user,
            needsOnboarding: response.needsOnboarding ?? false,
          };
          console.log(
            "🔍 Verify - User with onboarding status:",
            userWithOnboardingStatus
          );
          setUserData(userWithOnboardingStatus);
          // Save the complete user data to SecureStore
          await SecureStore.setItemAsync(
            "user",
            JSON.stringify(userWithOnboardingStatus)
          );
          console.log("🔍 Verify - User data saved to SecureStore");
        }

        console.log("🔍 Verify - Response analysis:", {
          isSigningUp,
          responseNeedsOnboarding: response.needsOnboarding,
          userNeedsOnboarding: response.user?.needsOnboarding,
          willRedirectToOnboarding: isSigningUp || response.needsOnboarding,
        });

        // If user is signing up or response indicates onboarding is needed, store email and user ID
        if (isSigningUp || response.needsOnboarding) {
          await Promise.all([
            SecureStore.setItemAsync("pendingEmail", email),
            // Store the user ID for onboarding
            response.user?.id
              ? SecureStore.setItemAsync(
                  "pendingUserId",
                  response.user.id.toString()
                )
              : Promise.resolve(),
            // Set flag to prevent index.tsx from redirecting
            SecureStore.setItemAsync("isVerifyingUser", "true"),
          ]);

          // Only redirect if not already on onboarding page
          if (pathname !== "/(auth)/onboarding") {
            console.log("🔍 Verify - Redirecting to onboarding");
            router.replace("/(auth)/onboarding");
          } else {
            console.log(
              "🔍 Verify - Already on onboarding page, skipping redirect"
            );
          }
        } else {
          // Clear verification flag and let index.tsx handle the preloading
          await SecureStore.deleteItemAsync("isVerifyingUser");
          console.log("🔍 Verify - Redirecting to index for data preload");
          router.replace("/");
        }
      } else {
        Alert.alert(
          "Invalid Code",
          "The code you entered is incorrect. Would you like to try again or request a new code?",
          [
            {
              text: "Try Again",
              onPress: () => setOtp(["", "", "", ""]),
              style: "default",
            },
            {
              text: "New Code",
              onPress: requestNewCode,
              style: "default",
            },
          ]
        );
      }
    } catch (error) {
      console.error("Verification error:", error);
      Alert.alert("Error", "Failed to verify code. Please try again.");
    } finally {
      setIsLoading(false);
    }
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

      {/* Header */}
      <Header />

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
              <Text className="text-white font-semibold text-base mr-2">
                Continue
              </Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
