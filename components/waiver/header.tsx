import { Image, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/theme";

interface WaiverHeaderProps {
  onBack: () => void;
}

export default function WaiverHeader({ onBack }: WaiverHeaderProps) {
  const colors = useThemeColors();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingTop: 14,
        paddingHorizontal: 20,
      }}
    >
      <TouchableOpacity
        onPress={onBack}
        style={{
          width: 40,
          height: 40,
          borderRadius: 9999,
          alignItems: "center",
          justifyContent: "center",
          marginLeft: -8,
        }}
      >
        <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 14,
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Image
            source={require("../../assets/logo-dark.png")}
            style={{ width: 24, height: 22 }}
            resizeMode="contain"
          />
          <Text
            style={{
              fontSize: 17,
              fontWeight: "600",
              letterSpacing: -0.17,
              color: colors.text.primary,
            }}
          >
            MastersFit
          </Text>
        </View>
      </View>
      <View style={{ width: 40, marginLeft: "auto" }} />
    </View>
  );
}
