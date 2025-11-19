import React from "react";
import { View, Text, TextInput, TouchableOpacity, Switch } from "react-native";
import CustomSlider from "@/components/ui/Slider";
import IconComponent from "./onboarding/ui/IconComponent";
import { formatEnumValue } from "./onboarding/utils/formatters";
import { colors } from "../lib/theme";
import {
  IntensityLevels,
  WorkoutEnvironments,
  AvailableEquipment,
  PreferredStyles,
} from "@/types/enums";

// Interface for temporary overrides (not saved to profile)
export interface TemporaryOverrides {
  duration?: number;
  intensity?: IntensityLevels;
  styles?: PreferredStyles[];
  environment?: WorkoutEnvironments;
  equipment?: AvailableEquipment[];
  otherEquipment?: string;
  includeWarmup?: boolean;
  includeCooldown?: boolean;
}

interface ProfileOverrideFormProps {
  overrides: TemporaryOverrides;
  onOverrideChange: (overrides: TemporaryOverrides) => void;
}

// Intensity level configuration helper - exact copy from onboarding
const getIntensityLevelConfig = (intensityKey: string) => {
  switch (intensityKey) {
    case "LOW":
      return {
        icon: "walk-outline",
        color: colors.brand.secondary,
        bgColor: "bg-green-100",
        description: "Light, comfortable pace",
      };
    case "MODERATE":
      return {
        icon: "fitness-outline",
        color: colors.brand.secondary,
        bgColor: "bg-yellow-100",
        description: "Moderate challenge, can still talk",
      };
    case "HIGH":
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

// Workout style configuration helper - exact copy from onboarding
const getStyleConfig = (styleKey: string) => {
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

// Environment configuration helper - exact copy from onboarding
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
        description: "",
      };
  }
};

// Equipment configuration helper - exact copy from onboarding
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

export default function ProfileOverrideForm({
  overrides,
  onOverrideChange,
}: ProfileOverrideFormProps) {
  const updateOverride = (updates: Partial<TemporaryOverrides>) => {
    onOverrideChange({ ...overrides, ...updates });
  };

  return (
    <View className="mt-4 px-4 rounded-xl">
      <Text className="text-xs text-text-muted mb-4 text-center">
        These changes apply only to this workout and won't be saved to your
        profile
      </Text>

      {/* Duration Slider */}
      <View className="mb-6">
        <Text className="text-base font-semibold text-neutral-dark-1 mb-4">
          Workout Duration
        </Text>
        <CustomSlider
          value={overrides.duration || 30}
          minimumValue={15}
          maximumValue={90}
          step={5}
          unit=" min"
          onValueChange={(value) => updateOverride({ duration: value })}
        />
      </View>

      {/* Intensity Selector */}
      <View className="mb-6">
        <Text className="text-base font-semibold text-neutral-dark-1 mb-4">
          Intensity Level
        </Text>
        {Object.entries(IntensityLevels).map(([key, value]) => {
          const isSelected = overrides.intensity === value;
          const config = getIntensityLevelConfig(key);

          return (
            <TouchableOpacity
              key={key}
              className={`p-4 rounded-xl mb-3 flex-row items-center ${
                isSelected ? "bg-primary" : "bg-white"
              }`}
              onPress={() => updateOverride({ intensity: value })}
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
      </View>

      {/* Workout Styles Multi-Select */}
      <View className="mb-6">
        <Text className="text-base font-semibold text-neutral-dark-1 mb-4">
          Workout Styles
        </Text>
        <Text className="text-sm text-neutral-medium-4 mb-4">
          Select preferred styles for this workout (choose multiple)
        </Text>
        {Object.entries(PreferredStyles).map(([key, value]) => {
          const isSelected = overrides.styles?.includes(value) || false;
          const config = getStyleConfig(key);

          return (
            <TouchableOpacity
              key={key}
              className={`p-4 rounded-xl mb-3 flex-row items-center ${
                isSelected ? "bg-primary" : "bg-white"
              }`}
              onPress={() => {
                const currentStyles = overrides.styles || [];
                const newStyles = isSelected
                  ? currentStyles.filter((s) => s !== value)
                  : [...currentStyles, value];
                updateOverride({ styles: newStyles });
              }}
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

      {/* Environment Single-Select */}
      <View className="mb-6">
        <Text className="text-base font-semibold text-neutral-dark-1 mb-4">
          Workout Environment
        </Text>
        {Object.entries(WorkoutEnvironments).map(([key, value]) => {
          const isSelected = overrides.environment === value;
          const config = getEnvironmentConfig(key);

          return (
            <TouchableOpacity
              key={key}
              className={`p-4 rounded-xl mb-3 flex-row items-center ${
                isSelected ? "bg-primary" : "bg-white"
              }`}
              onPress={() => updateOverride({ environment: value })}
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
      </View>

      {/* Equipment Selection - Only show for HOME_GYM */}
      {overrides.environment === WorkoutEnvironments.HOME_GYM && (
        <View className="mb-6">
          <Text className="text-base font-semibold text-neutral-dark-1 mb-4">
            Available Equipment
          </Text>
          <View className="flex-row flex-wrap">
            {/* First manually order the basic weights equipment */}
            {["BARBELLS", "DUMBBELLS", "KETTLEBELLS"].map((key) => {
              const value =
                AvailableEquipment[key as keyof typeof AvailableEquipment];
              const config = getEquipmentConfig(key);
              const isSelected = overrides.equipment?.includes(value) || false;

              return (
                <TouchableOpacity
                  key={key}
                  className={`w-[32%] p-4 rounded-xl mb-3 mx-[0.66%] ${
                    isSelected ? "bg-primary" : "bg-white"
                  }`}
                  onPress={() => {
                    const currentEquipment = overrides.equipment || [];
                    const newEquipment = isSelected
                      ? currentEquipment.filter((e) => e !== value)
                      : [...currentEquipment, value];
                    updateOverride({ equipment: newEquipment });
                  }}
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
                const isSelected =
                  overrides.equipment?.includes(value) || false;

                return (
                  <TouchableOpacity
                    key={key}
                    className={`w-[32%] p-4 rounded-xl mb-3 mx-[0.66%] ${
                      isSelected ? "bg-primary" : "bg-white"
                    }`}
                    onPress={() => {
                      const currentEquipment = overrides.equipment || [];
                      const newEquipment = isSelected
                        ? currentEquipment.filter((e) => e !== value)
                        : [...currentEquipment, value];
                      updateOverride({ equipment: newEquipment });
                    }}
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

          {/* Other Equipment Input */}
          <View className="mt-6">
            <Text className="text-base font-semibold text-neutral-dark-1 mb-4">
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
              value={overrides.otherEquipment}
              onChangeText={(text) => updateOverride({ otherEquipment: text })}
            />
          </View>
        </View>
      )}

      {/* Warmup/Cooldown Toggles */}
      <View>
        <Text className="text-base font-semibold text-neutral-dark-1 mb-4">
          Workout Components
        </Text>

        {/* Include Warmup Toggle */}
        <View className="flex-row items-center justify-between p-4 bg-white rounded-xl mb-3">
          <View className="flex-1">
            <Text className="font-medium text-sm text-neutral-dark-1">
              Include Warmup
            </Text>
            <Text className="text-xs mt-0.5 text-neutral-medium-4">
              Prepare your body with dynamic movements
            </Text>
          </View>
          <Switch
            value={overrides.includeWarmup ?? true}
            onValueChange={(value) => updateOverride({ includeWarmup: value })}
            trackColor={{ false: "#E5E7EB", true: colors.brand.primary }}
            thumbColor={overrides.includeWarmup ? "#FFFFFF" : "#9CA3AF"}
          />
        </View>

        {/* Include Cooldown Toggle */}
        <View className="flex-row items-center justify-between p-4 bg-white rounded-xl">
          <View className="flex-1">
            <Text className="font-medium text-sm text-neutral-dark-1">
              Include Cooldown
            </Text>
            <Text className="text-xs mt-0.5 text-neutral-medium-4">
              Recovery stretches and mobility work
            </Text>
          </View>
          <Switch
            value={overrides.includeCooldown ?? true}
            onValueChange={(value) =>
              updateOverride({ includeCooldown: value })
            }
            trackColor={{ false: "#E5E7EB", true: colors.brand.primary }}
            thumbColor={overrides.includeCooldown ? "#FFFFFF" : "#9CA3AF"}
          />
        </View>
      </View>
    </View>
  );
}
