import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { ONBOARDING_STEP } from "@/types/enums";
import { useThemeColors } from "@/lib/theme";

interface NavigationButtonsProps {
  currentStep: ONBOARDING_STEP;
  isLoading: boolean;
  submitButtonText?: string;
  onNext: () => void;
  onSubmit: () => void;
  currentStepIndex?: number;
  totalSteps?: number;
}

export default function NavigationButtons({
  currentStep,
  isLoading,
  submitButtonText = "Generate My Plan",
  onNext,
  onSubmit,
  currentStepIndex,
  totalSteps,
}: NavigationButtonsProps) {
  const colors = useThemeColors();
  const isLastStep =
    totalSteps !== undefined && currentStepIndex !== undefined
      ? currentStepIndex === totalSteps - 1
      : currentStep === ONBOARDING_STEP.WORKOUT_STYLE;

  return (
    <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 }}>
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
    </View>
  );
}
