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
    <View className="px-6 mb-8 gap-3">
      {/* Log Out - Subtle ghost style */}
      <TouchableOpacity
        className="rounded-xl p-4 flex-row items-center justify-center border border-neutral-medium-1"
        onPress={onLogout}
        activeOpacity={0.7}
      >
        <Ionicons
          name="log-out-outline"
          size={20}
          color={colors.text.secondary}
          style={{ marginRight: 8 }}
        />
        <Text className="font-semibold text-text-secondary">Log Out</Text>
      </TouchableOpacity>

      {/* Delete Account - Destructive style */}
      <TouchableOpacity
        className="rounded-xl p-4 flex-row items-center justify-center"
        style={{ backgroundColor: `${colors.danger}15` }}
        onPress={onDeleteAccount}
        activeOpacity={0.7}
      >
        <Ionicons
          name="trash-outline"
          size={20}
          color={colors.danger}
          style={{ marginRight: 8 }}
        />
        <Text style={{ color: colors.danger }} className="font-semibold">
          Delete Account
        </Text>
      </TouchableOpacity>
    </View>
  );
}
