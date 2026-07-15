import { Ionicons } from "@expo/vector-icons";
import { useRef,useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useThemeColors } from "@/lib/theme";
import {
  type ArrayFields,
  type ArrayValue,
  type FormData,
  type OnboardingFormProps,
} from "@/types/components";
import {
  FITNESS_LEVELS,
  GENDER,
  INTENSITY_LEVELS,
  ONBOARDING_STEP,
  type WORKOUT_ENVIRONMENTS,
} from "@/types/enums";

import FitnessGoalsStep from "./onboarding/steps/fitness-goals-step";
import FitnessLevelStep from "./onboarding/steps/fitness-level-step";
import HealthConnectStep from "./onboarding/steps/health-connect-step";
import PersonalInfoStep from "./onboarding/steps/personal-info-step";
import PhysicalLimitationsStep from "./onboarding/steps/physical-limitations-step";
import WorkoutEnvironmentStep from "./onboarding/steps/workout-environment-step";
import WorkoutStyleStep from "./onboarding/steps/workout-style-step";
import NavigationButtons from "./onboarding/ui/navigation-buttons";
import OnboardingHeader from "./onboarding/ui/onboarding-header";
import { getEquipmentForEnvironment } from "./onboarding/utils/equipment-logic";
import { validateStep } from "./onboarding/utils/validation";

// Re-export types for backward compatibility
export type {
  ArrayFields,
  ArrayValue,
  FormData,
  OnboardingFormProps,
} from "@/types/components";

export default function OnboardingForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitButtonText = "Generate Weekly Plan",
  excludePersonalInfo = false,
}: OnboardingFormProps) {
  const colors = useThemeColors();
  const scrollRef = useRef<ScrollView | null>(null);

  // Create dynamic step flow based on excludePersonalInfo
  const getAvailableSteps = (): ONBOARDING_STEP[] => {
    const allSteps = [
      ONBOARDING_STEP.PERSONAL_INFO,
      ONBOARDING_STEP.FITNESS_GOALS,
      ONBOARDING_STEP.PHYSICAL_LIMITATIONS,
      ONBOARDING_STEP.FITNESS_LEVEL,
      ONBOARDING_STEP.WORKOUT_ENVIRONMENT,
      ONBOARDING_STEP.HEALTH_CONNECT,
      ONBOARDING_STEP.WORKOUT_STYLE,
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
    gender: GENDER.MALE,
    goals: [],
    limitations: [],
    fitnessLevel: FITNESS_LEVELS.BEGINNER,
    equipment: [],
    otherEquipment: "",
    preferredStyles: [],
    availableDays: [],
    workoutDuration: 30,
    intensityLevel: INTENSITY_LEVELS.MODERATE,
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
        value as WORKOUT_ENVIRONMENTS
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
      case ONBOARDING_STEP.PERSONAL_INFO:
        return (
          <PersonalInfoStep
            formData={formData}
            errors={errors}
            onFieldChange={handleChange}
          />
        );
      case ONBOARDING_STEP.FITNESS_GOALS:
        return (
          <FitnessGoalsStep
            formData={formData}
            onToggle={handleMultiSelectToggle}
          />
        );
      case ONBOARDING_STEP.PHYSICAL_LIMITATIONS:
        return (
          <PhysicalLimitationsStep
            formData={formData}
            onToggle={handleMultiSelectToggle}
            onFieldChange={handleChange}
            scrollViewRef={scrollRef}
          />
        );
      case ONBOARDING_STEP.FITNESS_LEVEL:
        return (
          <FitnessLevelStep
            formData={formData}
            errors={errors}
            onFieldChange={handleChange}
            onToggle={handleMultiSelectToggle}
          />
        );
      case ONBOARDING_STEP.WORKOUT_ENVIRONMENT:
        return (
          <WorkoutEnvironmentStep
            formData={formData}
            errors={errors}
            onFieldChange={handleChange}
            onToggle={handleMultiSelectToggle}
          />
        );
      case ONBOARDING_STEP.HEALTH_CONNECT:
        return <HealthConnectStep />;
      case ONBOARDING_STEP.WORKOUT_STYLE:
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
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header — back chevron (steps > 0) + centered brand lockup */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: 14,
          paddingHorizontal: 20,
        }}
      >
        {currentStepIndex > 0 ? (
          <TouchableOpacity
            onPress={handlePrevious}
            style={{
              width: 40,
              height: 40,
              borderRadius: 9999,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: -8,
            }}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={colors.text.primary}
            />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40, height: 40 }} />
        )}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 14,
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Image
              source={require("../assets/logo-dark.png")}
              style={{ width: 24, height: 22 }}
              resizeMode="contain"
            />
            <Text
              style={{
                fontSize: 17,
                fontWeight: "600",
                letterSpacing: -0.17,
                color: colors.text.primary,
              }}
            >
              MastersFit
            </Text>
          </View>
        </View>
        <View style={{ width: 40, marginLeft: "auto" }} />
      </View>

      <ScrollView
        key={currentStep}
        ref={scrollRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress indicator + step title */}
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
        onSubmit={handleSubmit}
        currentStepIndex={currentStepIndex}
        totalSteps={availableSteps.length}
      />
    </KeyboardAvoidingView>
  );
}
