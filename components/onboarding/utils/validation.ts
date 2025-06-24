import { FormData } from "@/types/components";
import { OnboardingStep, WorkoutEnvironments } from "@/types/enums";

// Form validation helper
export const validateField = (field: string, value: any): string => {
  if (value === null || value === undefined || value === "") {
    return `${field} is required`;
  }

  if (field === "Age" && (value < 16 || value > 100)) {
    return "Age must be between 16 and 100";
  }

  if (field === "Height" && (value < 120 || value > 220)) {
    return "Height must be between 120 and 220 cm";
  }

  if (field === "Weight" && (value < 90 || value > 440)) {
    return "Weight must be between 90 and 440 lbs";
  }

  return "";
};

// Validate current step
export const validateStep = (
  currentStep: OnboardingStep,
  formData: FormData
): { isValid: boolean; errors: Record<string, string> } => {
  const newErrors: Record<string, string> = {};

  switch (currentStep) {
    case OnboardingStep.PERSONAL_INFO:
      if (!formData.age) newErrors.age = "Age is required";
      if (!formData.height) newErrors.height = "Height is required";
      if (!formData.weight) newErrors.weight = "Weight is required";
      if (!formData.gender) newErrors.gender = "Gender is required";

      // Additional field validations
      if (formData.age) {
        const ageError = validateField("Age", formData.age);
        if (ageError) newErrors.age = ageError;
      }
      if (formData.height) {
        const heightError = validateField("Height", formData.height);
        if (heightError) newErrors.height = heightError;
      }
      if (formData.weight) {
        const weightError = validateField("Weight", formData.weight);
        if (weightError) newErrors.weight = weightError;
      }
      break;

    case OnboardingStep.FITNESS_GOALS:
      if (formData.goals.length === 0) {
        newErrors.goals = "Please select at least one fitness goal";
      }
      break;

    case OnboardingStep.PHYSICAL_LIMITATIONS:
      // Physical limitations are optional, no validation required
      break;

    case OnboardingStep.FITNESS_LEVEL:
      if (!formData.fitnessLevel) {
        newErrors.fitnessLevel = "Please select your fitness level";
      }
      if (formData.availableDays.length === 0) {
        newErrors.availableDays = "Please select at least one available day";
      }
      if (!formData.workoutDuration) {
        newErrors.workoutDuration = "Please select workout duration";
      }
      if (!formData.intensityLevel) {
        newErrors.intensityLevel = "Please select intensity level";
      }
      break;

    case OnboardingStep.WORKOUT_ENVIRONMENT:
      // Environment is now required - user must make a selection
      if (!formData.environment) {
        newErrors.environment = "Please select a workout environment";
      }
      // Only validate equipment for HOME_GYM environment
      if (
        formData.environment === WorkoutEnvironments.HOME_GYM &&
        (!formData.equipment || formData.equipment.length === 0)
      ) {
        newErrors.equipment =
          "Please select at least one piece of equipment for your home gym";
      }
      break;

    case OnboardingStep.WORKOUT_STYLE:
      if (formData.preferredStyles.length === 0) {
        newErrors.preferredStyles = "Please select at least one workout style";
      }
      break;
  }

  return {
    isValid: Object.keys(newErrors).length === 0,
    errors: newErrors,
  };
};
