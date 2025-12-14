import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FormData, ArrayFields, ArrayValue } from "@/types/components";
import { WorkoutEnvironments, AvailableEquipment } from "@/types/enums";
import { colors } from "@/lib/theme";
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

// Helper function to get environment configuration
const getEnvironmentConfig = (envKey: string) => {
  switch (envKey) {
    case "COMMERCIAL_GYM":
      return {
        icon: "business-outline",
        color: colors.brand.secondary,
        bgColor: "bg-green-100",
        description: "Full gym with all equipment available",
      };
    case "HOME_GYM":
      return {
        icon: "home-outline",
        color: colors.brand.secondary,
        bgColor: "bg-purple-100",
        description: "Personal home gym setup",
      };
    case "BODYWEIGHT_ONLY":
      return {
        icon: "body-outline",
        color: colors.brand.secondary,
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
const getEquipmentConfig = (equipKey: string) => {
  switch (equipKey) {
    case "BARBELLS":
      return {
        icon: "barbell-outline",
        color: colors.brand.secondary,
        bgColor: "bg-green-100",
      };
    case "DUMBBELLS":
      return {
        icon: "barbell-outline",
        color: colors.brand.secondary,
        bgColor: "bg-red-100",
      };
    case "KETTLEBELLS":
      return {
        icon: "barbell-outline",
        color: colors.brand.secondary,
        bgColor: "bg-orange-100",
      };
    case "BENCH":
      return {
        icon: "remove-outline",
        color: colors.brand.secondary,
        bgColor: "bg-pink-100",
      };
    case "INCLINE_DECLINE_BENCH":
      return {
        icon: "remove-outline",
        color: colors.brand.secondary,
        bgColor: "bg-yellow-100",
      };
    case "PULL_UP_BAR":
      return {
        icon: "body-outline",
        color: colors.brand.secondary,
        bgColor: "bg-indigo-100",
      };
    case "BIKE":
      return {
        icon: "bicycle-outline",
        color: colors.brand.secondary,
        bgColor: "bg-red-100",
      };
    case "MEDICINE_BALLS":
      return {
        icon: "basketball-outline",
        color: colors.brand.secondary,
        bgColor: "bg-indigo-100",
      };
    case "PLYO_BOX":
      return {
        icon: "apps-outline",
        color: colors.brand.secondary,
        bgColor: "bg-pink-100",
      };
    case "RINGS":
      return {
        icon: "radio-button-off-outline",
        color: colors.brand.secondary,
        bgColor: "bg-yellow-100",
      };
    case "RESISTANCE_BANDS":
      return {
        icon: "body-outline",
        color: colors.brand.secondary,
        bgColor: "bg-purple-100",
      };
    case "STABILITY_BALL":
      return {
        icon: "radio-button-off-outline",
        color: colors.brand.secondary,
        bgColor: "bg-teal-100",
      };
    case "SQUAT_RACK":
      return {
        icon: "body-outline",
        color: colors.brand.secondary,
        bgColor: "bg-teal-100",
      };
    case "DIP_BAR":
      return {
        icon: "body-outline",
        color: colors.brand.secondary,
        bgColor: "bg-green-100",
      };
    case "ROWING_MACHINE":
      return {
        icon: "boat-outline",
        color: colors.brand.secondary,
        bgColor: "bg-orange-100",
      };
    case "SLAM_BALLS":
      return {
        icon: "basketball-outline",
        color: colors.brand.secondary,
        bgColor: "bg-red-100",
      };
    case "CABLE_MACHINE":
      return {
        icon: "body-outline",
        color: colors.brand.secondary,
        bgColor: "bg-green-100",
      };
    case "JUMP_ROPE":
      return {
        icon: "body-outline",
        color: colors.brand.secondary,
        bgColor: "bg-purple-100",
      };
    case "FOAM_ROLLER":
      return {
        icon: "radio-button-off-outline",
        color: colors.brand.secondary,
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

export default function WorkoutEnvironmentStep({
  formData,
  errors,
  onFieldChange,
  onToggle,
}: WorkoutEnvironmentStepProps) {
  return (
    <View className="flex-1 px-6 pb-6">
      {/* Environment Selection */}
      <View className="mb-8">
        <Text className="text-lg font-semibold text-neutral-dark-1 mb-4">
          Workout Environment
        </Text>
        <View className="flex-row justify-between space-x-2">
          {Object.entries(WorkoutEnvironments).map(([key, value]) => {
            const config = getEnvironmentConfig(key);
            return (
              <TouchableOpacity
                key={key}
                className={`flex-1 p-4 rounded-xl items-center ${
                  formData.environment === value ? "bg-primary" : "bg-white"
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
                      ? "text-secondary"
                      : "text-neutral-dark-1"
                  }`}
                >
                  {formatEnumValue(key)}
                </Text>
                <Text
                  className={`text-xs text-center mt-1 ${
                    formData.environment === value
                      ? "text-secondary"
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
      {formData.environment === WorkoutEnvironments.HOME_GYM && (
        <View className="mb-6">
          <Text className="text-lg font-semibold text-neutral-dark-1 mb-4">
            Available Equipment
          </Text>
          <View className="flex-row flex-wrap">
            {/* First manually order the basic weights equipment */}
            {["BARBELLS", "DUMBBELLS", "KETTLEBELLS"].map((key) => {
              const value =
                AvailableEquipment[key as keyof typeof AvailableEquipment];
              const config = getEquipmentConfig(key);
              const isSelected = formData.equipment?.includes(value) || false;

              return (
                <TouchableOpacity
                  key={key}
                  className={`w-[32%] p-4 rounded-xl mb-3 mx-[0.66%] ${
                    isSelected ? "bg-primary" : "bg-white"
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
                        isSelected ? "text-secondary" : "text-neutral-dark-1"
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
            {Object.entries(AvailableEquipment)
              .filter(
                ([key]) =>
                  !["BARBELLS", "DUMBBELLS", "KETTLEBELLS"].includes(key)
              )
              .map(([key, value]) => {
                const config = getEquipmentConfig(key);
                const isSelected = formData.equipment?.includes(value) || false;

                return (
                  <TouchableOpacity
                    key={key}
                    className={`w-[32%] p-4 rounded-xl mb-3 mx-[0.66%] ${
                      isSelected ? "bg-primary" : "bg-white"
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
                          isSelected ? "text-secondary" : "text-neutral-dark-1"
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
              className="bg-white p-4 rounded-xl text-neutral-dark-1 border border-neutral-medium-1"
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
