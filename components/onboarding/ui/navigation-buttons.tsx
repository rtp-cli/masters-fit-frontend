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
  // §A: single-step Settings editor. Adds the footer hairline + pinned page-bg
  // fill, and makes Save track `isDirty` — grey/inert until a real change.
  editScreen?: boolean;
  isDirty?: boolean;
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
  editScreen = false,
  isDirty = false,
}: NavigationButtonsProps) {
  const colors = useThemeColors();
  const isLastStep =
    totalSteps !== undefined && currentStepIndex !== undefined
      ? currentStepIndex === totalSteps - 1
      : currentStep === ONBOARDING_STEP.WORKOUT_STYLE;

  // §A1.4: on the edit screen Save is disabled until dirty — #F0F0F0/#3C3C3C at
  // rest (brand.light[1] / neutral.dark[1] in the default theme), ink once changed.
  // Everywhere else the primary button is always live, exactly as before.
  const isDisabled = isLoading || (editScreen && !isDirty);
  const restingFill = editScreen && !isDirty && !isLoading;
  const primaryFill = restingFill ? colors.brand.light[1] : colors.brand.primary;
  const primaryLabel = restingFill
    ? colors.neutral.dark[1]
    : colors.neutral.white;

  return (
    <View
      style={{
        paddingHorizontal: 24,
        paddingTop: onSkip ? 12 : 16,
        paddingBottom: onSkip ? 24 : 32,
        gap: onSkip ? 14 : 0,
        // §A1.3: hairline + explicit page-bg fill so the footer reads as a pinned
        // bar (it sits below the ScrollView, so it never travels up to the content).
        ...(editScreen
          ? {
              borderTopWidth: 1,
              borderTopColor: colors.neutral.medium[1],
              backgroundColor: colors.background,
            }
          : {}),
      }}
    >
      <TouchableOpacity
        onPress={isLastStep ? onSubmit : onNext}
        disabled={isDisabled}
        style={{
          height: 56,
          borderRadius: 9999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: primaryFill,
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
              color: primaryLabel,
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
