import { TouchableOpacity, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";
import { CURRENT_WAIVER_VERSION } from "@/constants/waiver";

interface AgreementCheckboxProps {
  isAgreed: boolean;
  onToggle: () => void;
}

export default function AgreementCheckbox({ isAgreed, onToggle }: AgreementCheckboxProps) {
  return (
    <View className="px-6 mb-6">
      <TouchableOpacity onPress={onToggle} className="flex-row items-center bg-white rounded-xl p-4 shadow-sm">
        <View
          className={`w-6 h-6 rounded-md border-2 mr-3 items-center justify-center ${
            isAgreed ? "bg-brand-primary border-brand-primary" : "bg-white border-neutral-medium-2"
          }`}
          style={
            isAgreed
              ? {
                  backgroundColor: colors.brand.primary,
                  borderColor: colors.brand.primary,
                }
              : {}
          }
        >
          {isAgreed && <Ionicons name="checkmark" size={16} color="white" />}
        </View>
        <Text className="flex-1 text-base text-text-primary">
          I have read and accept all legal agreements (v{CURRENT_WAIVER_VERSION})
        </Text>
      </TouchableOpacity>
    </View>
  );
}