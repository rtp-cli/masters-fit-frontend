import React from "react";
import { TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";
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
      className="absolute right-6 bottom-[152px] w-14 h-14 rounded-full bg-primary items-center justify-center z-[9999]"
      style={{
        ...Platform.select({
          ios: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 4.65,
          },
          android: {
            elevation: 8,
          },
        }),
      }}
      onPress={() => router.push("/network-logger")}
      activeOpacity={0.8}
    >
      <Ionicons name="bug" size={24} color="#FFFFFF" />
    </TouchableOpacity>
  );
}
