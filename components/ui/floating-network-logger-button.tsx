import React from "react";
import { TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSecretActivation } from "@/hooks/use-secret-activation";

export function FloatingNetworkLoggerButton() {
  const router = useRouter();
  const { isDebugModeActivated } = useSecretActivation();

  // Show in development mode OR when debug mode is activated via secret tap
  if (!__DEV__ && !isDebugModeActivated) {
    return null;
  }

  return (
    <TouchableOpacity
      className="absolute right-6 bottom-[152px] w-14 h-14 rounded-full justify-center items-center bg-primary shadow-lg z-[9999]"
      onPress={() => router.push("/network-logger")}
      activeOpacity={0.8}
    >
      <Ionicons name="bug" size={24} color="#FFFFFF" />
    </TouchableOpacity>
  );
}
