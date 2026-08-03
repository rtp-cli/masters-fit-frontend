import { Text, TouchableOpacity, View } from "react-native";

import { type FormData } from "@/types/components";
import { FITNESS_LEVELS, INTENSITY_LEVELS } from "@/types/enums";

import IconComponent from "../ui/icon-component";
import { formatEnumValue } from "../utils/formatters";

interface FitnessLevelStepProps {
  formData: FormData;
  onFieldChange: (
    field: keyof FormData,
    value: FormData[keyof FormData]
  ) => void;
}

// §5: this step now holds only fitness level + intensity. Available days,
// the plan card, and workout duration moved to schedule-step.tsx.
export default function FitnessLevelStep({
  formData,
  onFieldChange,
}: FitnessLevelStepProps) {
  // Fitness level configuration helper
  const getFitnessLevelConfig = (levelKey: FITNESS_LEVELS) => {
    switch (levelKey) {
      case FITNESS_LEVELS.BEGINNER:
        return {
          icon: "walk-outline",
          color: "black",
          bgColor: "bg-green-100",
          description: "New to fitness or returning after a long break",
        };
      case FITNESS_LEVELS.INTERMEDIATE:
        return {
          icon: "fitness-outline",
          color: "black",
          bgColor: "bg-yellow-100",
          description: "Consistent exercise for 6+ months",
        };
      case FITNESS_LEVELS.ADVANCED:
        return {
          icon: "flame-outline",
          color: "black",
          bgColor: "bg-red-100",
          description: "Regular challenging workouts for 1+ years",
        };
      default:
        return {
          icon: "fitness-outline",
          color: "black",
          bgColor: "bg-green-100",
          description: "Fitness level",
        };
    }
  };

  // Intensity level configuration helper
  const getIntensityLevelConfig = (intensityKey: INTENSITY_LEVELS) => {
    switch (intensityKey) {
      case INTENSITY_LEVELS.LOW:
        return {
          icon: "walk-outline",
          color: "black",
          bgColor: "bg-green-100",
          description: "Light, comfortable pace",
        };
      case INTENSITY_LEVELS.MODERATE:
        return {
          icon: "fitness-outline",
          color: "black",
          bgColor: "bg-yellow-100",
          description: "Moderate challenge, can still talk",
        };
      case INTENSITY_LEVELS.HIGH:
        return {
          icon: "flash-outline",
          color: "black",
          bgColor: "bg-red-100",
          description: "High intensity, challenging workouts",
        };
      default:
        return {
          icon: "pulse-outline",
          color: "black",
          bgColor: "bg-green-100",
          description: "Intensity level",
        };
    }
  };

  return (
    <View className="flex-1 px-6 pb-6">
      {/* Current fitness level */}
      <View className="mb-8">
        <Text className="text-lg font-semibold text-neutral-dark-1 mb-4">
          Current fitness level
        </Text>
        {Object.values(FITNESS_LEVELS).map((value) => {
          const config = getFitnessLevelConfig(value);
          const isSelected = formData.fitnessLevel === value;

          return (
            <TouchableOpacity
              key={value}
              className={`p-4 rounded-xl mb-3 flex-row items-center ${
                isSelected ? "bg-primary" : "bg-surface"
              }`}
              onPress={() => onFieldChange("fitnessLevel", value)}
            >
              <IconComponent
                iconName={config.icon}
                color={config.color}
                backgroundColor={config.bgColor}
              />
              <View className="flex-1">
                <Text
                  className={`font-medium text-sm ${
                    isSelected
                      ? "text-content-on-primary"
                      : "text-neutral-dark-1"
                  }`}
                >
                  {formatEnumValue(value)}
                </Text>
                <Text
                  className={`text-xs ${
                    isSelected
                      ? "text-content-on-primary"
                      : "text-neutral-medium-4"
                  }`}
                >
                  {config.description}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Preferred intensity */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-neutral-dark-1 mb-4">
          Preferred intensity
        </Text>
        {Object.entries(INTENSITY_LEVELS).map(([key, value]) => {
          const config = getIntensityLevelConfig(value);
          const isSelected = formData.intensityLevel === value;

          return (
            <TouchableOpacity
              key={key}
              className={`p-4 rounded-xl mb-3 flex-row items-center ${
                isSelected ? "bg-primary" : "bg-surface"
              }`}
              onPress={() => onFieldChange("intensityLevel", value)}
            >
              <IconComponent
                iconName={config.icon}
                color={config.color}
                backgroundColor={config.bgColor}
              />
              <View className="flex-1">
                <Text
                  className={`font-medium text-sm ${
                    isSelected
                      ? "text-content-on-primary"
                      : "text-neutral-dark-1"
                  }`}
                >
                  {formatEnumValue(key)}
                </Text>
                <Text
                  className={`text-xs ${
                    isSelected
                      ? "text-content-on-primary"
                      : "text-neutral-medium-4"
                  }`}
                >
                  {config.description}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
