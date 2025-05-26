import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
        <Ionicons name="arrow-back" size={24} color="#111827" />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>
            {showNameField ? "Create Account" : "Welcome Back"}
          </Text>
          <Text style={styles.subtitle}>
            {showNameField
              ? "Please enter your name to continue"
              : "Enter your email to continue"}
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[styles.textInput, emailError ? styles.inputError : null]}
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              editable={!showNameField && !isLoading}
            />
            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}
          </View>

          {showNameField && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your full name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!isLoading}
              />
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              isLoading ? styles.buttonDisabled : null,
            ]}
            onPress={showNameField ? handleSignup : handleContinue}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {showNameField ? "Sign Up" : "Continue"}
              </Text>
            )}
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
  backButton: {
    padding: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  headerContainer: {
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
  formContainer: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: "#4f46e5",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
