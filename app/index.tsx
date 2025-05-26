import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { useEffect } from "react";

export default function GetStarted() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // If user is already authenticated, redirect to main app
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace("/(tabs)/calendar");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleGetStarted = () => {
    router.push("/(auth)/login");
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Masters Fit</Text>
          <Text style={styles.subtitle}>
            Your personalized fitness journey starts here
          </Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    paddingBottom: 48,
    paddingTop: 48,
  },
  header: {
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 28,
  },
  button: {
    backgroundColor: "#4f46e5",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
});
