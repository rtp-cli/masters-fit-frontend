import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { FormData, ArrayFields, ArrayValue } from "@/types/components";
import { WORKOUT_ENVIRONMENTS, AVAILABLE_EQUIPMENT } from "@/types/enums";
import { useThemeColors } from "@/lib/theme";
import { formatEnumValue } from "../utils/formatters";
import IconComponent from "../ui/icon-component";

interface WorkoutEnvironmentStepProps {
  formData: FormData;
  errors: Record<string, string>;
  onFieldChange: (
    field: keyof FormData,
    value: FormData[keyof FormData]
  ) => void;
  onToggle: (field: ArrayFields, value: ArrayValue) => void;
}

export default function WorkoutEnvironmentStep({
  formData,
  errors,
  onFieldChange,
  onToggle,
}: WorkoutEnvironmentStepProps) {
  const colors = useThemeColors();

  // Helper function to get environment configuration
  const getEnvironmentConfig = (envKey: WORKOUT_ENVIRONMENTS) => {
  switch (envKey) {
    case WORKOUT_ENVIRONMENTS.COMMERCIAL_GYM:
      return {
        icon: "business-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-green-100",
        description: "Full gym with all equipment available",
      };
    case WORKOUT_ENVIRONMENTS.HOME_GYM:
      return {
        icon: "home-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-purple-100",
        description: "Personal home gym setup",
      };
    case WORKOUT_ENVIRONMENTS.BODYWEIGHT_ONLY:
      return {
        icon: "body-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-blue-100",
        description: "No equipment needed, just your body",
      };
    default:
      return {
        icon: "fitness-outline",
        color: "#6B7280",
        bgColor: "bg-neutral-light-2",
        description: "Workout environment",
      };
  }
};

// Helper function to get equipment configuration
const getEquipmentConfig = (equipKey: AVAILABLE_EQUIPMENT) => {
  switch (equipKey) {
    case AVAILABLE_EQUIPMENT.BARBELLS:
      return {
        icon: "barbell-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-green-100",
      };
    case AVAILABLE_EQUIPMENT.DUMBBELLS:
      return {
        icon: "barbell-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-red-100",
      };
    case AVAILABLE_EQUIPMENT.KETTLEBELLS:
      return {
        icon: "barbell-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-orange-100",
      };
    case AVAILABLE_EQUIPMENT.BENCH:
      return {
        icon: "remove-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-pink-100",
      };
    case AVAILABLE_EQUIPMENT.INCLINE_DECLINE_BENCH:
      return {
        icon: "remove-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-yellow-100",
      };
    case AVAILABLE_EQUIPMENT.PULL_UP_BAR:
      return {
        icon: "body-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-indigo-100",
      };
    case AVAILABLE_EQUIPMENT.BIKE:
      return {
        icon: "bicycle-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-red-100",
      };
    case AVAILABLE_EQUIPMENT.MEDICINE_BALLS:
      return {
        icon: "basketball-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-indigo-100",
      };
    case AVAILABLE_EQUIPMENT.PLYO_BOX:
      return {
        icon: "apps-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-pink-100",
      };
    case AVAILABLE_EQUIPMENT.RINGS:
      return {
        icon: "radio-button-off-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-yellow-100",
      };
    case AVAILABLE_EQUIPMENT.RESISTANCE_BANDS:
      return {
        icon: "body-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-purple-100",
      };
    case AVAILABLE_EQUIPMENT.STABILITY_BALL:
      return {
        icon: "radio-button-off-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-teal-100",
      };
    case AVAILABLE_EQUIPMENT.SQUAT_RACK:
      return {
        icon: "body-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-teal-100",
      };
    case AVAILABLE_EQUIPMENT.DIP_BAR:
      return {
        icon: "body-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-green-100",
      };
    case AVAILABLE_EQUIPMENT.ROWING_MACHINE:
      return {
        icon: "boat-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-orange-100",
      };
    case AVAILABLE_EQUIPMENT.SLAM_BALLS:
      return {
        icon: "basketball-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-red-100",
      };
    case AVAILABLE_EQUIPMENT.CABLE_MACHINE:
      return {
        icon: "body-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-green-100",
      };
    case AVAILABLE_EQUIPMENT.JUMP_ROPE:
      return {
        icon: "body-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-purple-100",
      };
    case AVAILABLE_EQUIPMENT.FOAM_ROLLER:
      return {
        icon: "radio-button-off-outline",
        color: colors.contentOnPrimary,
        bgColor: "bg-orange-100",
      };
    default:
      return {
        icon: "fitness-outline",
        color: "#6B7280",
        bgColor: "bg-neutral-light-2",
      };
  }
};

  return (
    <View className="flex-1 px-6 pb-6">
      {/* Environment Selection */}
      <View className="mb-8">
        <Text className="text-lg font-semibold text-neutral-dark-1 mb-4">
          Workout Environment
        </Text>
        <View className="flex-row justify-between space-x-2">
          {Object.entries(WORKOUT_ENVIRONMENTS).map(([key, value]) => {
            const config = getEnvironmentConfig(value);
            return (
              <TouchableOpacity
                key={key}
                className={`flex-1 p-4 rounded-xl items-center ${
                  formData.environment === value ? "bg-primary" : "bg-surface"
                }`}
                onPress={() => onFieldChange("environment", value)}
              >
                <IconComponent
                  iconName={config.icon}
                  color={config.color}
                  backgroundColor={config.bgColor}
                  noMargin={true}
                />
                <View className="h-2" />
                <Text
                  className={`font-medium text-sm text-center ${
                    formData.environment === value
                      ? "text-content-on-primary"
                      : "text-neutral-dark-1"
                  }`}
                >
                  {formatEnumValue(value)}
                </Text>
                <Text
                  className={`text-xs text-center mt-1 ${
                    formData.environment === value
                      ? "text-content-on-primary"
                      : "text-neutral-medium-4"
                  }`}
                >
                  {config.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {errors.environment && (
          <Text className="text-red-500 text-xs mt-2">
            {errors.environment}
          </Text>
        )}
      </View>

      {/* Equipment Selection - Only show for HOME_GYM */}
      {formData.environment === WORKOUT_ENVIRONMENTS.HOME_GYM && (
        <View className="mb-6">
          <Text className="text-lg font-semibold text-neutral-dark-1 mb-4">
            Available Equipment
          </Text>
          <View className="flex-row flex-wrap">
            {/* First manually order the basic weights equipment */}
            {["BARBELLS", "DUMBBELLS", "KETTLEBELLS"].map((key) => {
              const value =
                AVAILABLE_EQUIPMENT[key as keyof typeof AVAILABLE_EQUIPMENT];
              const config = getEquipmentConfig(value);
              const isSelected = formData.equipment?.includes(value) || false;

              return (
                <TouchableOpacity
                  key={key}
                  className={`w-[32%] p-4 rounded-xl mb-3 mx-[0.66%] ${
                    isSelected ? "bg-primary" : "bg-surface"
                  }`}
                  onPress={() => onToggle("equipment", value)}
                >
                  <View className="items-center">
                    <IconComponent
                      iconName={config.icon}
                      color={config.color}
                      backgroundColor={config.bgColor}
                      noMargin={true}
                    />
                    <View className="h-2" />
                    <Text
                      className={`font-medium text-sm text-center ${
                        isSelected ? "text-content-on-primary" : "text-neutral-dark-1"
                      }`}
                      numberOfLines={2}
                    >
                      {formatEnumValue(key)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Then render the rest of the equipment */}
            {Object.entries(AVAILABLE_EQUIPMENT)
              .filter(
                ([key]) =>
                  !["BARBELLS", "DUMBBELLS", "KETTLEBELLS"].includes(key)
              )
              .map(([key, value]) => {
                const config = getEquipmentConfig(value);
                const isSelected = formData.equipment?.includes(value) || false;

                return (
                  <TouchableOpacity
                    key={key}
                    className={`w-[32%] p-4 rounded-xl mb-3 mx-[0.66%] ${
                      isSelected ? "bg-primary" : "bg-surface"
                    }`}
                    onPress={() => onToggle("equipment", value)}
                  >
                    <View className="items-center">
                      <IconComponent
                        iconName={config.icon}
                        color={config.color}
                        backgroundColor={config.bgColor}
                        noMargin={true}
                      />
                      <View className="h-2" />
                      <Text
                        className={`font-medium text-sm text-center ${
                          isSelected ? "text-content-on-primary" : "text-neutral-dark-1"
                        }`}
                        numberOfLines={2}
                      >
                        {formatEnumValue(key)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
          </View>
          {errors.equipment && (
            <Text className="text-red-500 text-xs mt-2">
              {errors.equipment}
            </Text>
          )}

          {/* Other Equipment Input */}
          <View className="mt-6">
            <Text className="text-lg font-semibold text-neutral-dark-1 mb-4">
              Other Equipment
            </Text>
            <Text className="text-sm text-neutral-medium-4 mb-3">
              List any other equipment you have that wasn't mentioned above
              (optional)
            </Text>
            <TextInput
              className="bg-surface p-4 rounded-xl text-neutral-dark-1 border border-neutral-medium-1"
              placeholder="e.g., TRX straps, battle ropes, agility ladder..."
              placeholderTextColor={colors.text.muted}
              value={formData.otherEquipment}
              onChangeText={(text) => onFieldChange("otherEquipment", text)}
            />
          </View>
        </View>
      )}
    </View>
  );
}
