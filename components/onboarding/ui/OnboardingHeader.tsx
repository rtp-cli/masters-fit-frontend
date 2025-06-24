import { View, Text } from "react-native";
import ProgressIndicator from "@/components/ProgressIndicator";
import { OnboardingStep } from "@/types/enums";
import { getStepConfig } from "../utils/stepConfig";

interface OnboardingHeaderProps {
  currentStep: OnboardingStep;
  totalSteps: number;
}

export default function OnboardingHeader({
  currentStep,
  totalSteps,
}: OnboardingHeaderProps) {
  const stepConfig = getStepConfig(currentStep);

  return (
    <View className="px-6 pt-12 pb-6">
      {/* Progress Indicator */}
      <ProgressIndicator
        currentStep={currentStep}
        totalSteps={totalSteps}
        className="mb-6"
      />

      <Text className="text-2xl font-bold text-neutral-dark-1 mb-2">
        {stepConfig.title}
      </Text>
      <Text className="text-sm text-neutral-medium-4 mb-2 leading-5">
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
