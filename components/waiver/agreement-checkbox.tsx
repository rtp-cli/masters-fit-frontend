import { TouchableOpacity, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
    <View className="px-6 mb-6">
      <TouchableOpacity
        onPress={onToggle}
        className="flex-row items-center bg-surface rounded-xl p-4"
      >
        <View
          className={`w-6 h-6 rounded-md border-2 mr-3 items-center justify-center ${
            isAgreed
              ? "bg-brand-primary border-brand-primary"
              : "bg-surface border-neutral-medium-2"
          }`}
        >
          {isAgreed && <Ionicons name="checkmark" size={16} color={colors.neutral.white} />}
        </View>
        <Text className="flex-1 text-base text-text-primary">
          I have read and accept all legal agreements (v{CURRENT_WAIVER_VERSION}
          )
        </Text>
      </TouchableOpacity>
    </View>
  );
}
