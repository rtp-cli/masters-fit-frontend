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
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { verify, generateAuthCode } from "../../lib/auth";
import { useAuth } from "../../contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

export default function VerifyScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { isSigningUp, setUserData } = useAuth();

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      router.replace("/(auth)/login");
    }
  }, [email]);

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
        setCode("");
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

    if (!code.trim()) {
      Alert.alert("Error", "Please enter the verification code");
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
          // Only redirect if not already on calendar page
          if (pathname !== "/(tabs)/calendar") {
            console.log("🔍 Verify - Redirecting to calendar");
            router.replace("/(tabs)/calendar");
          } else {
            console.log(
              "🔍 Verify - Already on calendar page, skipping redirect"
            );
          }
        }
      } else {
        Alert.alert(
          "Invalid Code",
          "The code you entered is incorrect. Would you like to try again or request a new code?",
          [
            {
              text: "Try Again",
              onPress: () => setCode(""),
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
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-center pt-5">
        <Image
          source={require("../../assets/logo.png")}
          className="h-10 w-30"
          resizeMode="contain"
        />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Title and description */}
        <View className="px-lg pt-2xl pb-lg">
          <Text className="text-3xl font-bold text-text-primary mb-sm">
            Enter Verification Code
          </Text>
          <Text className="text-sm text-text-muted" style={{ lineHeight: 20 }}>
            We've sent a verification code to {email}. Please enter the code
            below to continue.
          </Text>
        </View>

        {/* Form content */}
        <View className="px-lg pt-lg">
          {/* Verification code input */}
          <View className="mb-lg">
            <Text className="text-base font-medium text-text-primary mb-sm">
              Verification Code
            </Text>
            <TextInput
              className="bg-background px-md py-md rounded-xl text-base text-center tracking-widest border border-neutral-medium-1"
              placeholder="Enter verification code"
              value={code}
              onChangeText={setCode}
              keyboardType="default"
              maxLength={6}
              editable={!isLoading}
              autoFocus
              placeholderTextColor="#A8A8A8"
            />
          </View>

          {/* Request new code link */}
          <TouchableOpacity
            className="items-center py-md"
            onPress={requestNewCode}
            disabled={isLoading}
          >
            <Text className="text-sm text-primary font-medium">
              Didn't receive a code? Request new code
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom button */}
      <View className="px-lg pb-2xl pt-md bg-white">
        <TouchableOpacity
          className={`py-md px-2xl bg-secondary rounded-xl items-center justify-center ${
            isLoading ? "opacity-70" : ""
          }`}
          onPress={handleVerify}
          disabled={isLoading || !code.trim()}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-background font-bold text-lg">
              Verify Code
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
