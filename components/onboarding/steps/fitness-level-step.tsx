import { useEffect, useRef } from "react";
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
  // [LR-084] "Getting moving" and "High" contradict each other.
  const isHighBlocked = formData.fitnessLevel === FITNESS_LEVELS.BEGINNER;

  // [LR-084] Choosing "Getting moving" DEFAULTS intensity to Low.
  //
  // The form-wide default is Moderate and nobody changes it — on prod, 5 of 6
  // beginners sat on Moderate and 1 on Low, which is the shape of a control
  // nobody touched rather than a choice anyone made. Someone doing little or no
  // exercise silently getting "moderate challenge" is the wrong default for the
  // one cohort we most need to keep.
  //
  // Fires only on the level TRANSITION, not on every render, so a user who then
  // deliberately picks Moderate keeps it — this sets a starting point, it
  // doesn't hold them at Low.
  const previousLevel = useRef(formData.fitnessLevel);
  useEffect(() => {
    if (previousLevel.current === formData.fitnessLevel) return;
    previousLevel.current = formData.fitnessLevel;
    if (formData.fitnessLevel === FITNESS_LEVELS.BEGINNER) {
      onFieldChange("intensityLevel", INTENSITY_LEVELS.LOW);
    }
  }, [formData.fitnessLevel, onFieldChange]);

  // Invariant guard, separate from the default above because it must also catch
  // a profile LOADED with an already-invalid pair (beginner + high) that never
  // transitioned in this session. Without it, High would render selected but
  // un-tappable and the user could not change their own answer.
  useEffect(() => {
    if (isHighBlocked && formData.intensityLevel === INTENSITY_LEVELS.HIGH) {
      onFieldChange("intensityLevel", INTENSITY_LEVELS.LOW);
    }
  }, [isHighBlocked, formData.intensityLevel, onFieldChange]);

  // Fitness level configuration helper
  const getFitnessLevelConfig = (levelKey: FITNESS_LEVELS) => {
    switch (levelKey) {
      case FITNESS_LEVELS.BEGINNER:
        return {
          icon: "walk-outline",
          color: "black",
          bgColor: "bg-green-100",
          description:
            "Little or no exercise right now. Building basic activity and consistency.",
        };
      case FITNESS_LEVELS.INTERMEDIATE:
        return {
          icon: "fitness-outline",
          color: "black",
          bgColor: "bg-yellow-100",
          description:
            "Exercising somewhat regularly. Ready for structured strength and cardio.",
        };
      case FITNESS_LEVELS.ADVANCED:
        return {
          icon: "flame-outline",
          color: "black",
          bgColor: "bg-red-100",
          description:
            "Already active and training consistently. Looking for progression and performance.",
        };
      default:
        return {
          icon: "fitness-outline",
          color: "black",
          bgColor: "bg-green-100",
          description: "Where you're starting from",
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
        {/* [LR-084] Was "Current fitness level" over Beginner/Intermediate/
            Advanced. A self-rating is both badly answered and quietly shaming;
            this asks what the user actually DOES right now, which they can
            answer accurately and which we can check against their logs later.
            The stored values are unchanged, so nothing downstream moves. */}
        <Text className="text-lg font-semibold text-neutral-dark-1 mb-1">
          Where are you starting from?
        </Text>
        <Text className="text-sm text-neutral-medium-4 mb-4">
          Choose what best describes you today. We'll build from there, and you
          can change it anytime.
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
        <Text className="text-lg font-semibold text-neutral-dark-1 mb-1">
          Preferred intensity
        </Text>
        <Text className="text-sm text-neutral-medium-4 mb-4">
          How hard you want your workouts to feel, based on where you're
          starting.
        </Text>
        {Object.entries(INTENSITY_LEVELS).map(([key, value]) => {
          const config = getIntensityLevelConfig(value);
          const isSelected = formData.intensityLevel === value;
          // [LR-084] "Getting moving" + "High" is an incoherent pair of answers
          // to OUR OWN questions — someone doing little or no exercise cannot
          // also want high-intensity sessions, and the generator has no honest
          // way to satisfy both. Unlike overriding stated availability (a fact
          // about the user's life we shouldn't contradict), this is internal
          // consistency, so a hard block is fair. It is disabled visibly and
          // with a stated reason, never silently inert.
          const isDisabled = isHighBlocked && value === INTENSITY_LEVELS.HIGH;

          return (
            <TouchableOpacity
              key={key}
              disabled={isDisabled}
              accessibilityState={{ disabled: isDisabled, selected: isSelected }}
              accessibilityHint={
                isDisabled
                  ? "Not available while Getting moving is selected"
                  : undefined
              }
              className={`p-4 rounded-xl mb-3 flex-row items-center ${
                isSelected ? "bg-primary" : "bg-surface"
              }`}
              style={isDisabled ? { opacity: 0.4 } : undefined}
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
                  {isDisabled
                    ? "Available once you're building fitness"
                    : config.description}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
