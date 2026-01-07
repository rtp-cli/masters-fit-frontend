import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { FormData, ArrayFields, ArrayValue } from "@/types/components";
import { PHYSICAL_LIMITATIONS } from "@/types/enums/fitness.enums";
import { useThemeColors } from "@/lib/theme";
import { formatEnumValue } from "../utils/formatters";
import IconComponent from "../ui/icon-component";

interface PhysicalLimitationsStepProps {
  formData: FormData;
  onToggle: (field: ArrayFields, value: ArrayValue) => void;
  onFieldChange: (
    field: keyof FormData,
    value: FormData[keyof FormData]
  ) => void;
  scrollViewRef?: React.RefObject<ScrollView | null>;
}

export default function PhysicalLimitationsStep({
  formData,
  onToggle,
  onFieldChange,
  scrollViewRef,
}: PhysicalLimitationsStepProps) {
  const colors = useThemeColors();

  const getLimitationConfig = (limitationKey: string) => {
  switch (limitationKey) {
    case PHYSICAL_LIMITATIONS.KNEE_PAIN:
      return {
        icon: "walk-outline",
        color: colors.brand.secondary,
        bgColor: "bg-green-100",
        description: "Pain or discomfort in the knee joint",
      };
    case PHYSICAL_LIMITATIONS.SHOULDER_PAIN:
      return {
        icon: "body-outline",
        color: colors.brand.secondary,
        bgColor: "bg-red-100",
        description: "Pain or discomfort in the shoulder area",
      };
    case PHYSICAL_LIMITATIONS.LOWER_BACK_PAIN:
      return {
        icon: "arrow-down-outline",
        color: colors.brand.secondary,
        bgColor: "bg-orange-100",
        description: "Pain or discomfort in the lower back",
      };
    case PHYSICAL_LIMITATIONS.NECK_PAIN:
      return {
        icon: "arrow-up-outline",
        color: colors.brand.secondary,
        bgColor: "bg-purple-100",
        description: "Pain or stiffness in neck area",
      };
    case PHYSICAL_LIMITATIONS.HIP_PAIN:
      return {
        icon: "body-outline",
        color: colors.brand.secondary,
        bgColor: "bg-indigo-100",
        description: "Pain or limited mobility in hips",
      };
    case PHYSICAL_LIMITATIONS.ANKLE_INSTABILITY:
      return {
        icon: "walk-outline",
        color: colors.brand.secondary,
        bgColor: "bg-pink-100",
        description: "Weak or unstable ankles",
      };
    case PHYSICAL_LIMITATIONS.WRIST_PAIN:
      return {
        icon: "hand-left-outline",
        color: colors.brand.secondary,
        bgColor: "bg-yellow-100",
        description: "Pain or weakness in wrists",
      };
    case PHYSICAL_LIMITATIONS.ELBOW_PAIN:
      return {
        icon: "remove-outline",
        color: colors.brand.secondary,
        bgColor: "bg-teal-100",
        description: "Tennis elbow or other elbow issues",
      };
    case PHYSICAL_LIMITATIONS.ARTHRITIS:
      return {
        icon: "medical-outline",
        color: colors.brand.secondary,
        bgColor: "bg-green-100",
        description: "Joint inflammation and stiffness",
      };
    case PHYSICAL_LIMITATIONS.OSTEOPOROSIS:
      return {
        icon: "pulse-outline",
        color: colors.brand.secondary,
        bgColor: "bg-red-100",
        description: "Weak or brittle bones",
      };
    case PHYSICAL_LIMITATIONS.SCIATICA:
      return {
        icon: "flash-outline",
        color: colors.brand.secondary,
        bgColor: "bg-orange-100",
        description: "Nerve pain down leg from lower back",
      };
    case PHYSICAL_LIMITATIONS.LIMITED_RANGE_OF_MOTION:
      return {
        icon: "resize-outline",
        color: colors.brand.secondary,
        bgColor: "bg-purple-100",
        description: "Restricted movement in joints",
      };
    case PHYSICAL_LIMITATIONS.POST_SURGERY_RECOVERY:
      return {
        icon: "medical-outline",
        color: colors.brand.secondary,
        bgColor: "bg-indigo-100",
        description: "Recovering from a recent surgery",
      };
    case PHYSICAL_LIMITATIONS.BALANCE_ISSUES:
      return {
        icon: "analytics-outline",
        color: colors.brand.secondary,
        bgColor: "bg-pink-100",
        description: "Difficulty with balance and stability",
      };
    case PHYSICAL_LIMITATIONS.CHRONIC_FATIGUE:
      return {
        icon: "battery-half-outline",
        color: colors.brand.secondary,
        bgColor: "bg-yellow-100",
        description: "Persistent and extreme tiredness",
      };
    case PHYSICAL_LIMITATIONS.BREATHING_ISSUES:
      return {
        icon: "heart-outline",
        color: colors.brand.secondary,
        bgColor: "bg-teal-100",
        description: "Asthma or other breathing conditions",
      };
    default:
      return {
        icon: "warning-outline",
        color: colors.text.muted,
        bgColor: "bg-green-100",
        description: "Physical limitation",
      };
  }
};

  return (
    <ScrollView
      className="flex-1 px-6 pb-6"
      keyboardShouldPersistTaps="handled"
      ref={scrollViewRef}
    >
      {Object.entries(PHYSICAL_LIMITATIONS).map(([key, value]) => {
        const config = getLimitationConfig(value);
        const isSelected = formData.limitations?.includes(value) || false;

        return (
          <TouchableOpacity
            key={key}
            className={`p-4 rounded-xl mb-3 flex-row items-center ${
              isSelected ? "bg-primary" : "bg-white"
            }`}
            onPress={() => onToggle("limitations", value)}
          >
            <IconComponent
              iconName={config.icon}
              color={config.color}
              backgroundColor={config.bgColor}
            />
            <View className="flex-1">
              <Text
                className={`font-medium text-sm ${
                  isSelected ? "text-secondary" : "text-neutral-dark-1"
                }`}
              >
                {formatEnumValue(value)}
              </Text>
              <Text
                className={`text-xs ${
                  isSelected ? "text-secondary" : "text-neutral-medium-4"
                }`}
              >
                {config.description}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Medical Notes Section */}
      <View className="mt-6">
        <Text className="text-lg font-semibold text-neutral-dark-1 mb-4">
          Additional Medical Notes
        </Text>
        <Text className="text-sm text-neutral-medium-4 mb-3">
          Share any additional medical information or concerns that might affect
          your workout plan (optional)
        </Text>
        <TextInput
          className="bg-white p-4 rounded-xl text-neutral-dark-1 min-h-[100px] border border-neutral-medium-1"
          placeholder="Enter any additional medical notes here..."
          placeholderTextColor={colors.text.muted}
          value={formData.medicalNotes}
          onChangeText={(text) => onFieldChange("medicalNotes", text)}
          multiline
          textAlignVertical="top"
        />
      </View>
    </ScrollView>
  );
}
