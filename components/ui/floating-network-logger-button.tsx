import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { TouchableOpacity } from "react-native";

import { useSecretActivationContext } from "@/contexts/secret-activation-context";
import { useThemeColors } from "@/lib/theme";

export function FloatingNetworkLoggerButton() {
  const router = useRouter();
  const { isDebugModeActivated } = useSecretActivationContext();
  const colors = useThemeColors();

  // Show in development mode OR when debug mode is activated via secret tap
  if (!__DEV__ && !isDebugModeActivated) {
    return null;
  }

  return (
    <TouchableOpacity
      className="absolute right-6 bottom-[152px] size-14 rounded-full justify-center items-center bg-primary shadow-lg z-[9999]"
      onPress={() => router.push("/network-logger")}
      activeOpacity={0.8}
    >
      <Ionicons name="bug" size={24} color={colors.contentOnPrimary} />
    </TouchableOpacity>
  );
}
