import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

import { colors } from "../../lib/theme";

interface LogoutSectionProps {
  onLogout: () => void;
}

export default function LogoutSection({ onLogout }: LogoutSectionProps) {
  return (
    <View className="px-6 mb-4">
      <TouchableOpacity
        className="bg-white rounded-xl p-4 flex-row items-center justify-center"
        onPress={onLogout}
      >
        <Ionicons
          name="log-out-outline"
          size={20}
          color={colors.brand.secondary}
          className="mr-2"
        />
        <Text className="text-red-700 font-semibold">Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}
