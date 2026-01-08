import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

import { useThemeColors } from "../../../lib/theme";

interface LogoutSectionProps {
  onLogout: () => void;
  onDeleteAccount: () => void;
}

export default function LogoutSection({
  onLogout,
  onDeleteAccount,
}: LogoutSectionProps) {
  const colors = useThemeColors();

  return (
    <View className="px-6 mb-4 gap-3">
      <TouchableOpacity
        className="bg-surface rounded-xl p-4 flex-row items-center justify-center"
        onPress={onLogout}
      >
        <Ionicons
          name="log-out-outline"
          size={20}
          color={colors.brand.secondary}
          style={{ marginRight: 8 }}
        />
        <Text style={{ color: colors.brand.secondary }} className="font-semibold">Log Out</Text>
      </TouchableOpacity>
      <View className="border-t border-neutral-light-2" />
      <TouchableOpacity
        className="bg-surface rounded-xl p-4 flex-row items-center justify-center"
        onPress={onDeleteAccount}
      >
        <Ionicons
          name="trash-outline"
          size={20}
          color={colors.brand.secondary}
          style={{ marginRight: 8 }}
        />
        <Text style={{ color: colors.brand.secondary }} className="font-semibold">Delete Account</Text>
      </TouchableOpacity>
    </View>
  );
}
