import { useState, useEffect, useRef } from "react";
import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import {
  FormData,
  OnboardingFormProps,
  ArrayFields,
  ArrayValue,
} from "@/types/components";
import {
  OnboardingStep,
  Gender,
  FitnessLevels,
  IntensityLevels,
  WorkoutEnvironments,
} from "@/types/enums";
import { validateStep } from "./onboarding/utils/validation";
import { getEquipmentForEnvironment } from "./onboarding/utils/equipment-logic";
import OnboardingHeader from "./onboarding/ui/onboarding-header";
import NavigationButtons from "./onboarding/ui/navigation-buttons";
import PersonalInfoStep from "./onboarding/steps/personal-info-step";
import FitnessGoalsStep from "./onboarding/steps/fitness-goals-step";
import PhysicalLimitationsStep from "./onboarding/steps/physical-limitations-step";
import FitnessLevelStep from "./onboarding/steps/fitness-level-step";
import WorkoutEnvironmentStep from "./onboarding/steps/workout-environment-step";
import WorkoutStyleStep from "./onboarding/steps/workout-style-step";
import HealthConnectStep from "./onboarding/steps/health-connect-step";

// Re-export types for backward compatibility
export type {
  FormData,
  OnboardingFormProps,
  ArrayFields,
  ArrayValue,
} from "@/types/components";

export default function OnboardingForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  showNavigation = true,
  title,
  submitButtonText = "Generate Weekly Plan",
  excludePersonalInfo = false,
}: OnboardingFormProps) {
  const scrollRef = useRef<ScrollView | null>(null);

  // Create dynamic step flow based on excludePersonalInfo
  const getAvailableSteps = (): OnboardingStep[] => {
    const allSteps = [
      OnboardingStep.PERSONAL_INFO,
      OnboardingStep.FITNESS_GOALS,
      OnboardingStep.PHYSICAL_LIMITATIONS,
      OnboardingStep.FITNESS_LEVEL,
      OnboardingStep.WORKOUT_ENVIRONMENT,
      OnboardingStep.HEALTH_CONNECT,
      OnboardingStep.WORKOUT_STYLE,
    ];

    return excludePersonalInfo
      ? allSteps.slice(1) // Remove PERSONAL_INFO step
      : allSteps;
  };

  const availableSteps = getAvailableSteps();
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const currentStep = availableSteps[currentStepIndex];

  // Initialize form data with default values
  const [formData, setFormData] = useState<FormData>({
    email: "",
    age: 40,
    height: 170,
    weight: 150,
    gender: Gender.MALE,
    goals: [],
    limitations: [],
    fitnessLevel: FitnessLevels.BEGINNER,
    equipment: [],
    otherEquipment: "",
    preferredStyles: [],
    availableDays: [],
    workoutDuration: 30,
    intensityLevel: IntensityLevels.MODERATE,
    medicalNotes: "",
    includeWarmup: true,
    includeCooldown: true,
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Helper function for type-safe form updates
  const handleChange = (
    field: keyof FormData,
    value: FormData[keyof FormData]
  ) => {
    const updates: Partial<FormData> = { [field]: value };

    // Auto-assign equipment based on environment selection
    if (field === "environment") {
      updates.equipment = getEquipmentForEnvironment(
        value as WorkoutEnvironments
      );
    }

    setFormData((prev) => ({
      ...prev,
      ...updates,
    }));

    // Clear error for this field
    if (errors[field as string]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  // Helper function for multi-select toggles
  const handleMultiSelectToggle = (field: ArrayFields, value: ArrayValue) => {
    setFormData((prev) => {
      const currentArray = prev[field] as ArrayValue[];
      const isSelected = currentArray.includes(value);

      return {
        ...prev,
        [field]: isSelected
          ? currentArray.filter((item) => item !== value)
          : [...currentArray, value],
      };
    });

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleNext = () => {
    const validation = validateStep(currentStep, formData);
    if (validation.isValid) {
      setCurrentStepIndex((prev) => prev + 1);
      setErrors({});
    } else {
      setErrors(validation.errors);
    }
  };

  const handlePrevious = () => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
    setErrors({});
  };

  const handleSubmit = () => {
    const validation = validateStep(currentStep, formData);
    if (validation.isValid) {
      onSubmit(formData);
    } else {
      setErrors(validation.errors);
    }
  };

  // Render the current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case OnboardingStep.PERSONAL_INFO:
        return (
          <PersonalInfoStep
            formData={formData}
            errors={errors}
            onFieldChange={handleChange}
          />
        );
      case OnboardingStep.FITNESS_GOALS:
        return (
          <FitnessGoalsStep
            formData={formData}
            onToggle={handleMultiSelectToggle}
          />
        );
      case OnboardingStep.PHYSICAL_LIMITATIONS:
        return (
          <PhysicalLimitationsStep
            formData={formData}
            onToggle={handleMultiSelectToggle}
            onFieldChange={handleChange}
            scrollViewRef={scrollRef}
          />
        );
      case OnboardingStep.FITNESS_LEVEL:
        return (
          <FitnessLevelStep
            formData={formData}
            errors={errors}
            onFieldChange={handleChange}
            onToggle={handleMultiSelectToggle}
          />
        );
      case OnboardingStep.WORKOUT_ENVIRONMENT:
        return (
          <WorkoutEnvironmentStep
            formData={formData}
            errors={errors}
            onFieldChange={handleChange}
            onToggle={handleMultiSelectToggle}
          />
        );
      case OnboardingStep.HEALTH_CONNECT:
        return <HealthConnectStep />;
      case OnboardingStep.WORKOUT_STYLE:
        return (
          <WorkoutStyleStep
            formData={formData}
            onToggle={handleMultiSelectToggle}
            onFieldChange={handleChange}
          />
        );
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        key={currentStep}
        ref={scrollRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with step indicator */}
        <OnboardingHeader
          currentStep={currentStep}
          totalSteps={availableSteps.length}
          currentStepIndex={currentStepIndex}
        />

        {/* Step Content */}
        {renderStepContent()}
      </ScrollView>

      {/* Navigation Buttons */}
      <NavigationButtons
        currentStep={currentStep}
        isLoading={isLoading}
        submitButtonText={submitButtonText}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onSubmit={handleSubmit}
        currentStepIndex={currentStepIndex}
        totalSteps={availableSteps.length}
      />
    </KeyboardAvoidingView>
  );
}
