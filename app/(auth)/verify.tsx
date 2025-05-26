import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { verify, generateAuthCode } from "../../lib/auth";
import { useAuth } from "../../contexts/AuthContext";
import * as SecureStore from "expo-secure-store";

export default function VerifyScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { isSigningUp } = useAuth();

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

  if (!email) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Enter Verification Code</Text>
          <Text style={styles.subtitle}>
            We've sent a verification code to {email}
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Enter code"
            value={code}
            onChangeText={setCode}
            keyboardType="default"
            editable={!isLoading}
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Verify Code</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={requestNewCode}
            disabled={isLoading}
          >
            <Text style={styles.linkText}>Request New Code</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    textAlign: "center",
    letterSpacing: 8,
  },
  button: {
    backgroundColor: "#4f46e5",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  linkButton: {
    alignItems: "center",
  },
  linkText: {
    color: "#4f46e5",
    fontSize: 16,
    fontWeight: "500",
  },
});
