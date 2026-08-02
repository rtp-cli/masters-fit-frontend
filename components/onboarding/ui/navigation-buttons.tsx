import { ActivityIndicator,Text, TouchableOpacity, View } from "react-native";

import { useThemeColors } from "@/lib/theme";
import { ONBOARDING_STEP } from "@/types/enums";

interface NavigationButtonsProps {
  currentStep: ONBOARDING_STEP;
  isLoading: boolean;
  submitButtonText?: string;
  onNext: () => void;
  onSubmit: () => void;
  currentStepIndex?: number;
  totalSteps?: number;
  // §7: when provided (WORKOUT_ENVIRONMENT step, onboarding mode), renders the
  // single skip control below the primary button. Same submit path as the final
  // step — it generates the plan rather than advancing.
  onSkip?: () => void;
}

export default function NavigationButtons({
  currentStep,
  isLoading,
  submitButtonText = "Generate My Plan",
  onNext,
  onSubmit,
  currentStepIndex,
  totalSteps,
  onSkip,
}: NavigationButtonsProps) {
  const colors = useThemeColors();
  const isLastStep =
    totalSteps !== undefined && currentStepIndex !== undefined
      ? currentStepIndex === totalSteps - 1
      : currentStep === ONBOARDING_STEP.WORKOUT_STYLE;

  return (
    <View
      style={{
        paddingHorizontal: 24,
        paddingTop: onSkip ? 12 : 16,
        paddingBottom: onSkip ? 24 : 32,
        gap: onSkip ? 14 : 0,
      }}
    >
      <TouchableOpacity
        onPress={isLastStep ? onSubmit : onNext}
        disabled={isLoading}
        style={{
          height: 56,
          borderRadius: 9999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.brand.primary,
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.neutral.white} />
        ) : (
          <Text
            style={{
              fontSize: 17,
              fontWeight: "600",
              color: colors.neutral.white,
            }}
          >
            {isLastStep ? submitButtonText : "Continue"}
          </Text>
        )}
      </TouchableOpacity>

      {onSkip && !isLoading && (
        <TouchableOpacity onPress={onSkip}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: colors.text.muted,
              textAlign: "center",
            }}
          >
            Skip the rest and generate my plan
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
