import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { TouchableOpacity,View } from "react-native";
import NetworkLogger from "react-native-network-logger";
import { SafeAreaView } from "react-native-safe-area-context";

import { useThemeColors } from "@/lib/theme";

export default function NetworkLoggerScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <StatusBar style="dark" backgroundColor={colors.background} />
      <View className="flex-row items-center px-4 py-3 border-b border-neutral-medium-1">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.brand.secondary}
          />
        </TouchableOpacity>
      </View>
      <NetworkLogger theme="light" />
    </SafeAreaView>
  );
}
