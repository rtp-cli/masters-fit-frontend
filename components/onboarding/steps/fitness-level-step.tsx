import { View, Text, TouchableOpacity } from "react-native";
import CustomSlider from "@/components/ui/slider";
import { FormData, ArrayFields, ArrayValue } from "@/types/components";
import {
  FITNESS_LEVELS,
  PREFERRED_DAYS,
  INTENSITY_LEVELS,
} from "@/types/enums";
import { formatEnumValue } from "../utils/formatters";
import IconComponent from "../ui/icon-component";
import { colors } from "@/lib/theme";
import { formatWorkoutPlanStartDate, formatWorkoutPlanEndDate } from "@/utils";

interface FitnessLevelStepProps {
  formData: FormData;
  errors: Record<string, string>;
  onFieldChange: (
    field: keyof FormData,
    value: FormData[keyof FormData]
  ) => void;
  onToggle: (field: ArrayFields, value: ArrayValue) => void;
}

// Fitness level configuration helper
const getFitnessLevelConfig = (levelKey: FITNESS_LEVELS) => {
  switch (levelKey) {
    case FITNESS_LEVELS.BEGINNER:
      return {
        icon: "walk-outline",
        color: colors.brand.secondary,
        bgColor: "bg-green-100",
        description: "New to fitness or returning after a long break",
      };
    case FITNESS_LEVELS.INTERMEDIATE:
      return {
        icon: "fitness-outline",
        color: colors.brand.secondary,
        bgColor: "bg-yellow-100",
        description: "Consistent exercise for 6+ months",
      };
    case FITNESS_LEVELS.ADVANCED:
      return {
        icon: "flame-outline",
        color: colors.brand.secondary,
        bgColor: "bg-red-100",
        description: "Regular challenging workouts for 1+ years",
      };
    default:
      return {
        icon: "fitness-outline",
        color: "#6B7280",
        bgColor: "bg-neutral-light-2",
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
        color: colors.brand.secondary,
        bgColor: "bg-green-100",
        description: "Light, comfortable pace",
      };
    case INTENSITY_LEVELS.MODERATE:
      return {
        icon: "fitness-outline",
        color: colors.brand.secondary,
        bgColor: "bg-yellow-100",
        description: "Moderate challenge, can still talk",
      };
    case INTENSITY_LEVELS.HIGH:
      return {
        icon: "flash-outline",
        color: colors.brand.secondary,
        bgColor: "bg-red-100",
        description: "High intensity, challenging workouts",
      };
    default:
      return {
        icon: "pulse-outline",
        color: "#6B7280",
        bgColor: "bg-neutral-light-2",
        description: "Intensity level",
      };
  }
};

export default function FitnessLevelStep({
  formData,
  errors,
  onFieldChange,
  onToggle,
}: FitnessLevelStepProps) {
  return (
    <View className="flex-1 px-6 pb-6">
      {/* Fitness Level Selection */}
      <View className="mb-8">
        <Text className="text-lg font-semibold text-neutral-dark-1 mb-4">
          Current Fitness Level
        </Text>
        {Object.values(FITNESS_LEVELS).map((value) => {
          const config = getFitnessLevelConfig(value);
          const isSelected = formData.fitnessLevel === value;

          return (
            <TouchableOpacity
              key={value}
              className={`p-4 rounded-xl mb-3 flex-row items-center ${
                isSelected ? "bg-primary" : "bg-white"
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
        {errors.fitnessLevel && (
          <Text className="text-red-500 text-xs mt-2">
            {errors.fitnessLevel}
          </Text>
        )}
      </View>

      {/* Available Days */}
      <View className="mb-8">
        <Text className="text-lg font-semibold text-neutral-dark-1 mb-4">
          Available Days
        </Text>
        {/* Schedule Information - Show specific dates */}
        {formData.availableDays.length >= 1 && (
          <View className="mb-4 p-4 bg-brand-light-1 rounded-xl">
            <Text className="text-sm font-semibold text-text-primary mb-3">
              Your Workout Plan Timeline
            </Text>
            <Text className="text-sm text-text-primary mb-2">
              Your weekly plan will begin on {formatWorkoutPlanStartDate()} and
              end on {formatWorkoutPlanEndDate()}.
            </Text>
          </View>
        )}
        <View className="flex-row flex-wrap">
          {Object.entries(PREFERRED_DAYS).map(([key, value]) => (
            <TouchableOpacity
              key={key}
              className={`p-3 rounded-lg mr-2 mb-2 ${
                formData.availableDays.includes(value)
                  ? "bg-primary"
                  : "bg-white"
              }`}
              onPress={() => onToggle("availableDays", value)}
            >
              <Text
                className={`font-medium text-sm ${
                  formData.availableDays.includes(value)
                    ? "text-secondary"
                    : "text-neutral-dark-1"
                }`}
              >
                {formatEnumValue(value)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.availableDays && (
          <Text className="text-red-500 text-xs mt-2">
            {errors.availableDays}
          </Text>
        )}
      </View>

      {/* Workout Duration */}
      <View className="mb-8">
        <Text className="text-lg font-semibold text-neutral-dark-1">
          Workout Duration
        </Text>
        <CustomSlider
          value={formData.workoutDuration}
          minimumValue={15}
          maximumValue={90}
          step={5}
          onValueChange={(value) => onFieldChange("workoutDuration", value)}
          unit=" min"
        />
        {errors.workoutDuration && (
          <Text className="text-red-500 text-xs mt-2">
            {errors.workoutDuration}
          </Text>
        )}
      </View>

      {/* Intensity Level */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-neutral-dark-1 mb-4">
          Preferred Intensity Level
        </Text>
        {Object.entries(INTENSITY_LEVELS).map(([key, value]) => {
          const config = getIntensityLevelConfig(value);
          const isSelected = formData.intensityLevel === value;

          return (
            <TouchableOpacity
              key={key}
              className={`p-4 rounded-xl mb-3 flex-row items-center ${
                isSelected ? "bg-primary" : "bg-white"
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
                    isSelected ? "text-secondary" : "text-neutral-dark-1"
                  }`}
                >
                  {formatEnumValue(key)}
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
        {errors.intensityLevel && (
          <Text className="text-red-500 text-xs mt-2">
            {errors.intensityLevel}
          </Text>
        )}
      </View>
    </View>
  );
}
