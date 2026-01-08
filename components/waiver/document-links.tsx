import { TouchableOpacity, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/theme";

interface DocumentLinksProps {
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  onOpenWaiver: () => void;
}

export default function DocumentLinks({ onOpenTerms, onOpenPrivacy, onOpenWaiver }: DocumentLinksProps) {
  const colors = useThemeColors();

  return (
    <View className="px-6 mb-8">
      <View className="flex-row justify-center items-center flex-wrap">
        <TouchableOpacity onPress={onOpenTerms} className="flex-row items-center mx-2 mb-3">
          <Ionicons name="newspaper-outline" size={16} color={colors.brand.primary} />
          <Text className="text-sm text-brand-primary ml-1 underline">Terms & Conditions</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onOpenPrivacy} className="flex-row items-center mx-2 mb-3">
          <Ionicons name="lock-closed-outline" size={16} color={colors.brand.primary} />
          <Text className="text-sm text-brand-primary ml-1 underline">Privacy Policy</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onOpenWaiver} className="flex-row items-center mx-2 mb-3">
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.brand.primary} />
          <Text className="text-sm text-brand-primary ml-1 underline">Waiver of Liability</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}