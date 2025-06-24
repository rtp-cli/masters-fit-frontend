import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { OnboardingStep } from "@/types/enums";
import { colors } from "@/lib/theme";

interface NavigationButtonsProps {
  currentStep: OnboardingStep;
  isLoading: boolean;
  submitButtonText?: string;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: () => void;
}

export default function NavigationButtons({
  currentStep,
  isLoading,
  submitButtonText = "Generate My Plan",
  onNext,
  onPrevious,
  onSubmit,
}: NavigationButtonsProps) {
  const isLastStep = currentStep === OnboardingStep.WORKOUT_STYLE;

  return (
    <View className="px-6 pb-8 pt-4">
      <View className="flex-row">
        {currentStep > 0 && (
          <TouchableOpacity
            className="flex-1 py-4 items-center justify-center bg-white rounded-xl mr-3"
            onPress={onPrevious}
            disabled={isLoading}
          >
            <Text className="text-neutral-dark-1 font-semibold text-lg">
              Back
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          className={`py-4 px-8 bg-black rounded-xl items-center justify-center ${
            currentStep === 0 ? "flex-1" : "flex-1 ml-3"
          } ${isLoading ? "opacity-70" : ""}`}
          onPress={isLastStep ? onSubmit : onNext}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.neutral.white} />
          ) : (
            <Text className="text-white font-bold text-lg">
              {isLastStep ? submitButtonText : "Continue"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
