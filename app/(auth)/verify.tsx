import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { verify, generateAuthCode } from "../../lib/auth";
import { useAuth } from "../../contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

export default function VerifyScreen() {
  const router = useRouter();
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
          setUserData(response.user);
        }

        // If user is signing up or response indicates onboarding is needed, store email and go to onboarding
        if (isSigningUp || response.needsOnboarding) {
          await SecureStore.setItemAsync("pendingEmail", email);
          router.replace("/(auth)/onboarding");
        } else {
          // Otherwise go to main app
          router.replace("/(tabs)/calendar");
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
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="dark" />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header with back button */}
        <View className="flex-row items-center justify-between px-lg pt-md pb-sm">
          <TouchableOpacity
            className="w-10 h-10 justify-center items-center"
            onPress={handleGoBack}
            disabled={isLoading}
          >
            <Ionicons name="chevron-back" size={24} color="#525252" />
          </TouchableOpacity>
          <View className="flex-1" />
        </View>

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
              placeholder="Enter 6-digit code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
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
      <View className="px-lg pb-2xl pt-md bg-background">
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
