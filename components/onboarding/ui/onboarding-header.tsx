import { Text, View } from "react-native";

import { type ONBOARDING_STEP } from "@/types/enums";

import { getStepConfig } from "../utils/step-config";

interface OnboardingHeaderProps {
  currentStep: ONBOARDING_STEP;
  name?: string;
}

export default function OnboardingHeader({
  currentStep,
  name,
}: OnboardingHeaderProps) {
  const stepConfig = getStepConfig(currentStep, { name });

  // The progress bar moved out to the fixed header row (§3); this component now
  // owns only the step title + description + disclaimer.
  return (
    <View className="px-6 pt-6 pb-4">
      <Text className="text-2xl font-bold text-neutral-dark-1 mb-2">
        {stepConfig.title}
      </Text>
      {/* §8.1: 14px → 16px, colour matches app/index.tsx subhead (text-secondary) */}
      <Text className="text-base text-text-secondary mb-2">
        {stepConfig.description}
      </Text>
      {stepConfig.disclaimer && (
        <Text className="text-sm italic text-neutral-medium-4">
          {stepConfig.disclaimer}
        </Text>
      )}
    </View>
  );
}
