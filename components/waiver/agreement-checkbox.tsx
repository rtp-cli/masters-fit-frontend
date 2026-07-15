import { Ionicons } from "@expo/vector-icons";
import { Text,TouchableOpacity, View } from "react-native";

import { CURRENT_WAIVER_VERSION } from "@/constants/waiver";
import { useThemeColors } from "@/lib/theme";

interface AgreementCheckboxProps {
  isAgreed: boolean;
  onToggle: () => void;
}

export default function AgreementCheckbox({
  isAgreed,
  onToggle,
}: AgreementCheckboxProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      onPress={onToggle}
      style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 7,
          borderWidth: 2,
          borderColor: isAgreed ? colors.brand.primary : colors.neutral.medium[1],
          backgroundColor: isAgreed ? colors.brand.primary : "transparent",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {isAgreed && (
          <Ionicons name="checkmark" size={15} color={colors.neutral.white} />
        )}
      </View>
      <Text
        style={{
          flex: 1,
          fontSize: 15,
          lineHeight: 21,
          fontWeight: "500",
          color: colors.text.primary,
        }}
      >
        I agree to the Terms & Conditions, Privacy Policy, and Waiver of
        Liability{" "}
        <Text style={{ color: colors.text.muted }}>
          (v{CURRENT_WAIVER_VERSION})
        </Text>
      </Text>
    </TouchableOpacity>
  );
}
