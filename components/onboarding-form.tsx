import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { AnalyticsEvent, trackEvent } from "@/lib/analytics-events";
import { useThemeColors } from "@/lib/theme";
import {
  type ArrayFields,
  type ArrayValue,
  type FormData,
  type OnboardingFormProps,
} from "@/types/components";
import {
  INTENSITY_LEVELS,
  ONBOARDING_STEP,
  WORKOUT_ENVIRONMENTS,
} from "@/types/enums";

import FitnessGoalsStep from "./onboarding/steps/fitness-goals-step";
import FitnessLevelStep from "./onboarding/steps/fitness-level-step";
import PersonalInfoStep from "./onboarding/steps/personal-info-step";
import PhysicalLimitationsStep from "./onboarding/steps/physical-limitations-step";
import ScheduleStep from "./onboarding/steps/schedule-step";
import WorkoutEnvironmentStep from "./onboarding/steps/workout-environment-step";
import WorkoutStyleStep from "./onboarding/steps/workout-style-step";
import NavigationButtons from "./onboarding/ui/navigation-buttons";
import OnboardingHeader from "./onboarding/ui/onboarding-header";
import { getEquipmentForEnvironment } from "./onboarding/utils/equipment-logic";
import { validateStep } from "./onboarding/utils/validation";
import ProgressIndicator from "./progressive-indicator";

// Re-export types for backward compatibility
export type {
  ArrayFields,
  ArrayValue,
  FormData,
  OnboardingFormProps,
} from "@/types/components";

// §9.3: one shared source for the slider fallbacks, so onboarding init and
// convertProfileToFormData (edit) agree — a slider always sits somewhere.
export const ONBOARDING_SLIDER_DEFAULTS = {
  age: 40,
  height: 170,
  weight: 150,
  workoutDuration: 30,
} as const;

// §5/§10: the canonical ordered step list. Callers render a subset via `steps`
// (regeneration = ONBOARDING_STEPS_ALL.slice(1); a Settings editor = one step).
export const ONBOARDING_STEPS_ALL: ONBOARDING_STEP[] = [
  ONBOARDING_STEP.PERSONAL_INFO,
  ONBOARDING_STEP.FITNESS_GOALS,
  ONBOARDING_STEP.FITNESS_LEVEL,
  ONBOARDING_STEP.SCHEDULE,
  ONBOARDING_STEP.PHYSICAL_LIMITATIONS,
  ONBOARDING_STEP.WORKOUT_ENVIRONMENT,
  ONBOARDING_STEP.WORKOUT_STYLE,
];

// §A2.1: a stable fingerprint of the form's values for dirty tracking. Multi-select
// fields are order-insensitive (toggling a day off then on must read as clean), so
// their arrays are sorted before serialising.
function fingerprintFormData(data: FormData): string {
  const normalised: Record<string, unknown> = {};
  (Object.keys(data) as (keyof FormData)[]).forEach((key) => {
    const value = data[key];
    normalised[key as string] = Array.isArray(value)
      ? [...value].map(String).sort()
      : value;
  });
  return JSON.stringify(normalised);
}

export default function OnboardingForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitButtonText,
  mode = "edit",
  steps,
  userName,
  onDirtyChange,
}: OnboardingFormProps) {
  const colors = useThemeColors();
  const scrollRef = useRef<ScrollView | null>(null);

  // §10: render the requested steps, or all seven by default.
  const availableSteps = steps ?? ONBOARDING_STEPS_ALL;
  // §A: the single-step Settings editor. The multi-step regeneration modal is also
  // mode="edit" but must behave exactly as before, so the §A chrome (no H1, footer
  // hairline, dirty-gated Save, moved sessions readout) is scoped to length === 1.
  const isEditScreen = mode === "edit" && availableSteps.length === 1;
  const submitLabel =
    submitButtonText ?? (mode === "edit" ? "Save" : "Generate Weekly Plan");
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const currentStep = availableSteps[currentStepIndex];

  // [AN-04] Onboarding funnel step views. Gated on mode==="onboarding" so the
  // reused profile-edit / regeneration mounts of this form don't pollute the
  // funnel. Fires on mount (step 0) and on each forward/back navigation.
  // step_name is the reverse-mapped enum name (numeric enum → readable label).
  useEffect(() => {
    if (mode !== "onboarding") return;
    trackEvent(AnalyticsEvent.ONBOARDING_STEP_VIEWED, {
      step_index: currentStepIndex,
      step_name: ONBOARDING_STEP[currentStep],
      total_steps: availableSteps.length,
    });
    // availableSteps.length is stable for a given mount; key the effect on the index.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIndex, mode]);

  // Initialize form data with default values
  const [formData, setFormData] = useState<FormData>({
    email: "",
    age: ONBOARDING_SLIDER_DEFAULTS.age,
    height: ONBOARDING_SLIDER_DEFAULTS.height,
    weight: ONBOARDING_SLIDER_DEFAULTS.weight,
    // §4: nothing pre-answered. Onboarding starts with no gender/fitness level
    // selected; edit mode fills them from initialData below. Sliders keep their
    // defaults (age/height/weight) — a slider position is a value, not a claim.
    gender: undefined,
    goals: [],
    limitations: [],
    fitnessLevel: undefined,
    equipment: [],
    otherEquipment: "",
    preferredStyles: [],
    availableDays: [],
    workoutDuration: ONBOARDING_SLIDER_DEFAULTS.workoutDuration,
    intensityLevel: INTENSITY_LEVELS.MODERATE,
    medicalNotes: "",
    includeWarmup: true,
    includeCooldown: true,
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // §A2.1: dirty is measured against the values the form was mounted with (edit
  // mode always mounts with a fully-loaded profile), not against the blank
  // defaults — and a revert to the original value reads as clean again.
  const initialFingerprintRef = useRef(fingerprintFormData(formData));
  const isDirty = useMemo(
    () =>
      isEditScreen &&
      fingerprintFormData(formData) !== initialFingerprintRef.current,
    [formData, isEditScreen]
  );
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

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
      // Bring the error into view — inline messages can otherwise sit below the
      // fold on long list steps or under the fixed Continue button.
      scrollRef.current?.scrollTo({ y: 0, animated: true });
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
      // Bring the error into view — inline messages can otherwise sit below the
      // fold on long list steps or under the fixed Continue button.
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  // §7: "Skip the rest and generate my plan." Steps 1–5 are already validated on
  // Continue, so skip goes straight to generation — it does NOT re-run step-6
  // validation (which would block on a not-yet-picked environment). If the user
  // skipped before choosing where they train, fall back to bodyweight (works
  // anywhere, needs no equipment) so a plan can always generate.
  const handleSkip = () => {
    if (formData.environment) {
      onSubmit(formData);
      return;
    }
    const environment = WORKOUT_ENVIRONMENTS.BODYWEIGHT_ONLY;
    onSubmit({
      ...formData,
      environment,
      equipment: getEquipmentForEnvironment(environment),
    });
  };

  // Render the current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case ONBOARDING_STEP.PERSONAL_INFO:
        return (
          <PersonalInfoStep
            formData={formData}
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
            onFieldChange={handleChange}
          />
        );
      case ONBOARDING_STEP.SCHEDULE:
        return (
          <ScheduleStep
            formData={formData}
            onFieldChange={handleChange}
            onToggle={handleMultiSelectToggle}
            editScreen={isEditScreen}
          />
        );
      case ONBOARDING_STEP.WORKOUT_ENVIRONMENT:
        return (
          <WorkoutEnvironmentStep
            formData={formData}
            onFieldChange={handleChange}
            onToggle={handleMultiSelectToggle}
          />
        );
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
      {/* Header — back chevron (steps > 0), then the fixed progress bar + step
          counter (§3). The brand lockup was deleted; the row it vacated is where
          the progress chrome now lives. Bar shows for multi-step; counter is
          onboarding-only (§10). */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
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

        {/* §10: bar follows steps.length > 1 (so regeneration keeps its bar);
            counter is onboarding-only (so regeneration stays bar-no-counter). */}
        {availableSteps.length > 1 && (
          <View
            style={{ flex: 1 }}
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 1,
              max: availableSteps.length,
              now: currentStepIndex + 1,
            }}
          >
            <ProgressIndicator
              currentStep={currentStepIndex}
              totalSteps={availableSteps.length}
            />
          </View>
        )}
        {mode === "onboarding" && (
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: colors.text.muted,
              flexShrink: 0,
            }}
          >
            Step {currentStepIndex + 1} of {availableSteps.length}
          </Text>
        )}
      </View>

      <ScrollView
        key={currentStep}
        ref={scrollRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step title + description (progress bar moved to the fixed row) */}
        <OnboardingHeader
          currentStep={currentStep}
          name={mode === "onboarding" ? userName : undefined}
          editScreen={isEditScreen}
        />

        {/* Top-of-step error banner: a blocked Continue is otherwise invisible —
            inline field errors can sit below the fold or under the fixed button.
            handleNext/handleSubmit scroll to top on failure, revealing this. */}
        {Object.values(errors).some(Boolean) && (
          <View className="mx-6 mb-4 flex-row items-center rounded-xl border border-danger/30 bg-surface px-4 py-3">
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text
              className="ml-2 flex-1 text-sm font-medium"
              style={{ color: colors.danger }}
            >
              {Object.values(errors).find(Boolean)}
            </Text>
          </View>
        )}

        {/* Step Content */}
        {renderStepContent()}
      </ScrollView>

      {/* Navigation Buttons */}
      <NavigationButtons
        currentStep={currentStep}
        isLoading={isLoading}
        submitButtonText={submitLabel}
        onNext={handleNext}
        onSubmit={handleSubmit}
        currentStepIndex={currentStepIndex}
        totalSteps={availableSteps.length}
        // §7: one skip, on WORKOUT_ENVIRONMENT, onboarding mode only. Generates
        // now (handleSkip) rather than re-validating this step.
        onSkip={
          mode === "onboarding" &&
          currentStep === ONBOARDING_STEP.WORKOUT_ENVIRONMENT
            ? handleSkip
            : undefined
        }
        editScreen={isEditScreen}
        isDirty={isDirty}
      />
    </KeyboardAvoidingView>
  );
}
