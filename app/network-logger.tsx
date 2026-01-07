import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import NetworkLogger from "react-native-network-logger";
import { useThemeColors } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";

export default function NetworkLoggerScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <StatusBar style="dark" backgroundColor={colors.background} />
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.neutral.medium[1] },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.brand.secondary} />
        </TouchableOpacity>
      </View>
      <NetworkLogger theme="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
});
