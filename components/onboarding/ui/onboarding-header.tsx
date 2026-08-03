import { Text, View } from "react-native";

import { type ONBOARDING_STEP } from "@/types/enums";

import { getStepConfig } from "../utils/step-config";

interface OnboardingHeaderProps {
  currentStep: ONBOARDING_STEP;
  name?: string;
  /**
   * §A1.2: the single-step Settings editor already carries the step title in its
   * nav bar, so the header renders the description only — no duplicated H1. With
   * the description as the first element the top padding also drops to pt-4 (the
   * pt-6 existed to give the 24px H1 room; the nav-bar hairline is the separator now).
   */
  editScreen?: boolean;
  /**
   * §A3: the step disclaimer (the limitations doctor note) is a first-collection
   * disclosure, so it renders in onboarding only — not in the edit editor and not
   * in the regeneration modal.
   */
  showDisclaimer?: boolean;
}

export default function OnboardingHeader({
  currentStep,
  name,
  editScreen = false,
  showDisclaimer = false,
}: OnboardingHeaderProps) {
  const stepConfig = getStepConfig(currentStep, { name });

  // The progress bar moved out to the fixed header row (§3); this component now
  // owns only the step title + description + disclaimer.
  return (
    <View className={`px-6 pb-4 ${editScreen ? "pt-4" : "pt-6"}`}>
      {!editScreen && (
        <Text className="text-2xl font-bold text-neutral-dark-1 mb-2">
          {stepConfig.title}
        </Text>
      )}
      {/* §8.1: 14px → 16px, colour matches app/index.tsx subhead (text-secondary) */}
      <Text className="text-base text-text-secondary mb-2">
        {stepConfig.description}
      </Text>
      {showDisclaimer && stepConfig.disclaimer && (
        <Text className="text-sm italic text-neutral-medium-4">
          {stepConfig.disclaimer}
        </Text>
      )}
    </View>
  );
}
