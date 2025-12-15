import { View, Text, TouchableOpacity } from "react-native";
import { FormData, ArrayFields, ArrayValue } from "@/types/components";
import { FITNESS_GOALS } from "@/types/enums/fitness.enums";
import { formatEnumValue } from "../utils/formatters";
import IconComponent from "../ui/icon-component";
import { colors } from "@/lib/theme";

interface FitnessGoalsStepProps {
  formData: FormData;
  onToggle: (field: ArrayFields, value: ArrayValue) => void;
}

// Goal configuration helper
const getGoalConfig = (goalKey: FITNESS_GOALS) => {
  switch (goalKey) {
    case FITNESS_GOALS.GENERAL_FITNESS:
      return {
        icon: "checkmark-outline",
        bgColor: "bg-green-100",
        color: colors.brand.secondary,
        description: "Overall health and fitness improvement",
      };
    case FITNESS_GOALS.FAT_LOSS:
      return {
        icon: "fitness-outline",
        bgColor: "bg-red-100",
        color: colors.brand.secondary,
        description: "Reduce body fat and improve composition",
      };
    case FITNESS_GOALS.ENDURANCE:
      return {
        icon: "heart-outline",
        bgColor: "bg-orange-100",
        color: colors.brand.secondary,
        description: "Improve stamina and cardiovascular health",
      };
    case FITNESS_GOALS.MUSCLE_GAIN:
      return {
        icon: "fitness-outline",
        bgColor: "bg-purple-100",
        color: colors.brand.secondary,
        description: "Build lean muscle mass and strength",
      };
    case FITNESS_GOALS.STRENGTH:
      return {
        icon: "barbell-outline",
        bgColor: "bg-blue-100",
        color: colors.brand.secondary,
        description: "Build muscle and increase strength",
      };
    case FITNESS_GOALS.MOBILITY_FLEXIBILITY:
      return {
        icon: "body-outline",
        bgColor: "bg-pink-100",
        color: colors.brand.secondary,
        description: "Improve flexibility and joint health",
      };
    case FITNESS_GOALS.BALANCE:
      return {
        icon: "analytics-outline",
        bgColor: "bg-yellow-100",
        color: colors.brand.secondary,
        description: "Improve stability and coordination",
      };
    case FITNESS_GOALS.RECOVERY:
      return {
        icon: "medical-outline",
        bgColor: "bg-teal-100",
        color: colors.brand.secondary,
        description: "Recover from injury or surgery",
      };
    default:
      return {
        icon: "fitness-outline",
        color: "#6B7280",
        bgColor: "bg-neutral-light-2",
        description: "General fitness goal",
      };
  }
};

export default function FitnessGoalsStep({
  formData,
  onToggle,
}: FitnessGoalsStepProps) {
  return (
    <View className="flex-1 px-6 pb-6">
      {Object.entries(FITNESS_GOALS).map(([key, value]) => {
        const config = getGoalConfig(value);
        const isSelected = formData.goals?.includes(value) || false;

        return (
          <TouchableOpacity
            key={key}
            className={`p-4 rounded-xl mb-3 flex-row items-center ${
              isSelected ? "bg-primary" : "bg-white"
            }`}
            onPress={() => onToggle("goals", value)}
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
    </View>
  );
}
