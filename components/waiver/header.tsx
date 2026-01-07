import { TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/theme";

interface WaiverHeaderProps {
  onClose: () => void;
}

export default function WaiverHeader({ onClose }: WaiverHeaderProps) {
  const colors = useThemeColors();

  return (
    <View className="px-6 pt-4 pb-2">
      <TouchableOpacity onPress={onClose} className="p-2 -ml-2">
        <Ionicons name="close" size={24} color={colors.text.primary} />
      </TouchableOpacity>
    </View>
  );
}