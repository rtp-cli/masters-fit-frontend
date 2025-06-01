import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
  const router = useRouter();
  const { checkEmail, signup, login, setIsSigningUp } = useAuth();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [showNameField, setShowNameField] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  const handleContinue = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      const response = await checkEmail(email.trim().toLowerCase());

      if (response.success) {
        if (response.needsOnboarding) {
          // Show name field for signup
          setShowNameField(true);
          setIsLoading(false);
          return;
        }
        // Existing user, proceed with login
        setIsSigningUp(false);
        const loginResponse = await login({
          email: email.trim().toLowerCase(),
        });
        if (loginResponse.success) {
          router.push(
            `/(auth)/verify?email=${encodeURIComponent(
              email.trim().toLowerCase()
            )}`
          );
        } else {
          Alert.alert("Error", "Failed to login. Please try again.");
        }
      } else {
        Alert.alert("Error", "Something went wrong. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to process your request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }

    setIsLoading(true);
    try {
      setIsSigningUp(true);
      const signupResponse = await signup({
        email: email.trim().toLowerCase(),
        name: name.trim(),
      });

      if (signupResponse.success) {
        router.push(
          `/(auth)/verify?email=${encodeURIComponent(
            email.trim().toLowerCase()
          )}`
        );
      } else {
        Alert.alert("Error", "Failed to sign up. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to sign up. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle back button press
  const handleGoBack = () => {
    if (showNameField) {
      setShowNameField(false);
      setName("");
      setIsSigningUp(false);
    } else {
      router.back();
    }
  };

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
            {showNameField ? "Create Account" : "Welcome Back"}
          </Text>
          <Text className="text-sm text-text-muted" style={{ lineHeight: 20 }}>
            {showNameField
              ? "Please enter your name to continue"
              : "Enter your email to continue"}
          </Text>
        </View>

        {/* Form content */}
        <View className="px-lg pt-lg">
          {/* Email input */}
          <View className="mb-lg">
            <Text className="text-base font-medium text-text-primary mb-sm">
              Email
            </Text>
            <TextInput
              className={`bg-background px-md py-md rounded-xl text-base border ${
                emailError ? "border-red-500" : "border-neutral-medium-1"
              }`}
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              editable={!showNameField && !isLoading}
              placeholderTextColor="#A8A8A8"
            />
            {emailError ? (
              <Text className="text-red-500 text-sm mt-sm">{emailError}</Text>
            ) : null}
          </View>

          {/* Name input (conditional) */}
          {showNameField && (
            <View className="mb-lg">
              <Text className="text-base font-medium text-text-primary mb-sm">
                Full Name
              </Text>
              <TextInput
                className="bg-background px-md py-md rounded-xl text-base border border-neutral-medium-1"
                placeholder="Enter your full name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!isLoading}
                placeholderTextColor="#A8A8A8"
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom button */}
      <View className="px-lg pb-2xl pt-md bg-background">
        <TouchableOpacity
          className={`py-md px-2xl bg-secondary rounded-xl items-center justify-center ${
            isLoading ? "opacity-70" : ""
          }`}
          onPress={showNameField ? handleSignup : handleContinue}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-background font-bold text-lg">
              {showNameField ? "Sign Up" : "Continue"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
