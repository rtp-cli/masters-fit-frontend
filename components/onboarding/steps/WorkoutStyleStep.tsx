import { View, Text, TouchableOpacity } from "react-native";
import { FormData, ArrayFields, ArrayValue } from "@/types/components";
import { PreferredStyles } from "@/types/enums";
import { formatEnumValue } from "../utils/formatters";
import IconComponent from "../ui/IconComponent";
import { colors } from "@/lib/theme";

interface WorkoutStyleStepProps {
  formData: FormData;
  onToggle: (field: ArrayFields, value: ArrayValue) => void;
}

interface StyleConfig {
  icon: string;
  color: string;
  bgColor: string;
  description: string;
}

const getStyleConfig = (styleKey: string): StyleConfig => {
  switch (styleKey) {
    case "HIIT":
      return {
        icon: "flash-outline",
        color: colors.brand.secondary,
        bgColor: "bg-red-100",
        description: "High-intensity interval training",
      };
    case "STRENGTH":
      return {
        icon: "barbell-outline",
        color: colors.brand.secondary,
        bgColor: "bg-blue-100",
        description: "Build muscle and increase strength",
      };
    case "CARDIO":
      return {
        icon: "heart-outline",
        color: colors.brand.secondary,
        bgColor: "bg-green-100",
        description: "Improve cardiovascular health",
      };
    case "REHAB":
      return {
        icon: "medkit-outline",
        color: colors.brand.secondary,
        bgColor: "bg-purple-100",
        description: "Recovery and rehabilitation",
      };
    case "CROSSFIT":
      return {
        icon: "stopwatch-outline",
        color: colors.brand.secondary,
        bgColor: "bg-orange-100",
        description: "High-intensity functional training",
      };
    case "FUNCTIONAL":
      return {
        icon: "body-outline",
        color: colors.brand.secondary,
        bgColor: "bg-yellow-100",
        description: "Real-world movement patterns",
      };
    case "PILATES":
      return {
        icon: "accessibility-outline",
        color: colors.brand.secondary,
        bgColor: "bg-pink-100",
        description: "Core strength and flexibility",
      };
    case "YOGA":
      return {
        icon: "leaf-outline",
        color: colors.brand.secondary,
        bgColor: "bg-teal-100",
        description: "Mind-body connection and flexibility",
      };
    case "BALANCE":
      return {
        icon: "infinite-outline",
        color: colors.brand.secondary,
        bgColor: "bg-indigo-100",
        description: "Stability and coordination training",
      };
    case "MOBILITY":
      return {
        icon: "move-outline",
        color: colors.brand.secondary,
        bgColor: "bg-cyan-100",
        description: "Joint mobility and movement quality",
      };
    default:
      return {
        icon: "fitness-outline",
        color: "#6B7280",
        bgColor: "bg-neutral-light-2",
        description: "General workout style",
      };
  }
};

export default function WorkoutStyleStep({
  formData,
  onToggle,
}: WorkoutStyleStepProps) {
  return (
    <View className="flex-1 px-6 pb-6">
      {Object.entries(PreferredStyles).map(([key, value]) => {
        const config = getStyleConfig(key);
        const isSelected = formData.preferredStyles.includes(value);

        return (
          <TouchableOpacity
            key={key}
            className={`p-4 rounded-xl mb-3 flex-row items-center ${
              isSelected ? "bg-primary" : "bg-white"
            }`}
            onPress={() => onToggle("preferredStyles", value)}
          >
            <IconComponent
              iconName={config.icon}
              color={config.color}
              backgroundColor={config.bgColor}
              noMargin={true}
            />
            <View className="flex-1 ml-3">
              <Text
                className={`font-medium text-sm ${
                  isSelected ? "text-secondary" : "text-neutral-dark-1"
                }`}
              >
                {formatEnumValue(key)}
              </Text>
              <Text
                className={`text-xs mt-0.5 ${
                  isSelected ? "text-secondary" : "text-neutral-medium-4"
                }`}
              >
                {config.description}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
