import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View, type ViewStyle } from "react-native";

import { useThemeColors } from "@/lib/theme";

// "Just generated" pill shown on the surface the user lands on right after a
// generation completes (Workout hero / above the Calendar description). Uses
// the brand primary so the fresh result is obvious. See design_handoff §1.
export default function JustGeneratedBadge({ style }: { style?: ViewStyle }) {
  const colors = useThemeColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 9999,
        backgroundColor: colors.brand.primary,
        ...style,
      }}
    >
      <Ionicons name="flame" size={13} color={colors.contentOnPrimary} />
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: colors.contentOnPrimary,
        }}
      >
        Just generated
      </Text>
    </View>
  );
}
