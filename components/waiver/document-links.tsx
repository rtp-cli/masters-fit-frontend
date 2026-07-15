import { Ionicons } from "@expo/vector-icons";
import { Text,TouchableOpacity, View } from "react-native";

import { useThemeColors } from "@/lib/theme";

interface DocumentLinksProps {
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  onOpenWaiver: () => void;
}

export default function DocumentLinks({
  onOpenTerms,
  onOpenPrivacy,
  onOpenWaiver,
}: DocumentLinksProps) {
  const colors = useThemeColors();

  const linkStyle = {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.text.secondary,
    textDecorationLine: "underline" as const,
    textDecorationStyle: "solid" as const,
  };

  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        rowGap: 10,
        columnGap: 18,
      }}
    >
      <TouchableOpacity
        onPress={onOpenTerms}
        style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
      >
        <Ionicons name="document-outline" size={14} color={colors.text.secondary} />
        <Text style={linkStyle}>Terms & Conditions</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onOpenPrivacy}
        style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
      >
        <Ionicons name="lock-closed-outline" size={14} color={colors.text.secondary} />
        <Text style={linkStyle}>Privacy Policy</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onOpenWaiver}
        style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
      >
        <Ionicons name="shield-checkmark-outline" size={14} color={colors.text.secondary} />
        <Text style={linkStyle}>Waiver of Liability</Text>
      </TouchableOpacity>
    </View>
  );
}
