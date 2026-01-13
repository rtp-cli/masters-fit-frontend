import { View, Text, TouchableOpacity, Switch } from "react-native";
import { FormData, ArrayFields, ArrayValue } from "@/types/components";
import { PREFERRED_STYLES } from "@/types/enums";
import { formatEnumValue } from "../utils/formatters";
import IconComponent from "../ui/icon-component";
import { useThemeColors } from "@/lib/theme";

interface WorkoutStyleStepProps {
  formData: FormData;
  onToggle: (field: ArrayFields, value: ArrayValue) => void;
  onFieldChange: (field: keyof FormData, value: any) => void;
}

interface StyleConfig {
  icon: string;
  color: string;
  bgColor: string;
  description: string;
}

export default function WorkoutStyleStep({
  formData,
  onToggle,
  onFieldChange,
}: WorkoutStyleStepProps) {
  const colors = useThemeColors();

  const getStyleConfig = (styleKey: PREFERRED_STYLES): StyleConfig => {
  switch (styleKey) {
    case PREFERRED_STYLES.HIIT:
      return {
        icon: "flash-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-red-100",
        description: "High-intensity interval training",
      };
    case PREFERRED_STYLES.STRENGTH:
      return {
        icon: "barbell-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-blue-100",
        description: "Build muscle and increase strength",
      };
    case PREFERRED_STYLES.CARDIO:
      return {
        icon: "heart-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-brand-light-1",
        description: "Improve cardiovascular health",
      };
    case PREFERRED_STYLES.REHAB:
      return {
        icon: "medkit-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-purple-100",
        description: "Recovery and rehabilitation",
      };
    case PREFERRED_STYLES.CROSSFIT:
      return {
        icon: "stopwatch-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-orange-100",
        description: "High-intensity functional training",
      };
    case PREFERRED_STYLES.FUNCTIONAL:
      return {
        icon: "body-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-yellow-100",
        description: "Real-world movement patterns",
      };
    case PREFERRED_STYLES.PILATES:
      return {
        icon: "accessibility-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-pink-100",
        description: "Core strength and flexibility",
      };
    case PREFERRED_STYLES.YOGA:
      return {
        icon: "leaf-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-teal-100",
        description: "Mind-body connection and flexibility",
      };
    case PREFERRED_STYLES.BALANCE:
      return {
        icon: "infinite-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-indigo-100",
        description: "Stability and coordination training",
      };
    case PREFERRED_STYLES.MOBILITY:
      return {
        icon: "move-outline",
        color: colors.contentOnPrimary,
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

  return (
    <View className="flex-1 px-6 pb-6">
      {/* Warmup/Cooldown Preferences */}
      <View className="mb-6">
        <Text className="text-base font-semibold text-neutral-dark-1 mb-4">
          Workout Preferences
        </Text>

        {/* Include Warmup Toggle */}
        <View className="flex-row items-center justify-between p-4 bg-surface rounded-xl mb-3">
          <View className="flex-1">
            <Text className="font-medium text-sm text-neutral-dark-1">
              Include Warmup
            </Text>
            <Text className="text-xs mt-0.5 text-neutral-medium-4">
              Prepare your body with dynamic movements
            </Text>
          </View>
          <Switch
            value={formData.includeWarmup ?? true}
            onValueChange={(value) => onFieldChange("includeWarmup", value)}
            trackColor={{ false: "#E5E7EB", true: colors.brand.primary }}
            thumbColor={formData.includeWarmup ? "#FFFFFF" : "#9CA3AF"}
          />
        </View>

        {/* Include Cooldown Toggle */}
        <View className="flex-row items-center justify-between p-4 bg-surface rounded-xl">
          <View className="flex-1">
            <Text className="font-medium text-sm text-neutral-dark-1">
              Include Cooldown
            </Text>
            <Text className="text-xs mt-0.5 text-neutral-medium-4">
              Recovery stretches and mobility work
            </Text>
          </View>
          <Switch
            value={formData.includeCooldown ?? true}
            onValueChange={(value) => onFieldChange("includeCooldown", value)}
            trackColor={{ false: "#E5E7EB", true: colors.brand.primary }}
            thumbColor={formData.includeCooldown ? "#FFFFFF" : "#9CA3AF"}
          />
        </View>
      </View>

      {/* Workout Styles */}
      <View>
        <Text className="text-base font-semibold text-neutral-dark-1 mb-4">
          Workout Styles
        </Text>
        <Text className="text-sm text-neutral-medium-4 mb-4">
          Select the training styles you enjoy (choose multiple)
        </Text>

        {Object.entries(PREFERRED_STYLES).map(([key, value]) => {
          const config = getStyleConfig(value);
          const isSelected = formData.preferredStyles.includes(value);

          return (
            <TouchableOpacity
              key={key}
              className={`p-4 rounded-xl mb-3 flex-row items-center ${
                isSelected ? "bg-primary" : "bg-surface"
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
                    isSelected ? "text-content-on-primary" : "text-neutral-dark-1"
                  }`}
                >
                  {formatEnumValue(value)}
                </Text>
                <Text
                  className={`text-xs mt-0.5 ${
                    isSelected ? "text-content-on-primary" : "text-neutral-medium-4"
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
