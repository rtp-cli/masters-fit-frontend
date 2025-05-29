import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Dimensions,
  StyleProp,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";

// Enums from server
enum Gender {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
}

enum FitnessGoals {
  WEIGHT_LOSS = "weight_loss",
  MUSCLE_GAIN = "muscle_gain",
  STRENGTH = "strength",
  ENDURANCE = "endurance",
  FLEXIBILITY = "flexibility",
  GENERAL_FITNESS = "general_fitness",
  MOBILITY = "mobility",
  BALANCE = "balance",
  RECOVERY = "recovery",
}

enum FitnessLevels {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
}

enum IntensityLevels {
  LOW = "low",
  MODERATE = "moderate",
  HIGH = "high",
}

enum WorkoutEnvironments {
  HOME = "home",
  GYM = "gym",
  HYBRID = "hybrid",
}

enum PreferredDays {
  MONDAY = "monday",
  TUESDAY = "tuesday",
  WEDNESDAY = "wednesday",
  THURSDAY = "thursday",
  FRIDAY = "friday",
  SATURDAY = "saturday",
  SUNDAY = "sunday",
}

enum PhysicalLimitations {
  KNEE_PAIN = "knee_pain",
  SHOULDER_PAIN = "shoulder_pain",
  LOWER_BACK_PAIN = "lower_back_pain",
  NECK_PAIN = "neck_pain",
  HIP_PAIN = "hip_pain",
  ANKLE_INSTABILITY = "ankle_instability",
  WRIST_PAIN = "wrist_pain",
  ELBOW_PAIN = "elbow_pain",
  ARTHRITIS = "arthritis",
  OSTEOPOROSIS = "osteoporosis",
  SCIATICA = "sciatica",
  LIMITED_RANGE_OF_MOTION = "limited_range_of_motion",
  POST_SURGERY_RECOVERY = "post_surgery_recovery",
  BALANCE_ISSUES = "balance_issues",
  CHRONIC_FATIGUE = "chronic_fatigue",
  BREATHING_ISSUES = "breathing_issues",
}

enum AvailableEquipment {
  DUMBBELLS = "dumbbells",
  RESISTANCE_BANDS = "resistance_bands",
  MACHINES = "machines",
  BODYWEIGHT = "bodyweight",
  KETTLEBELLS = "kettlebells",
  MEDICINE_BALL = "medicine_ball",
  FOAM_ROLLER = "foam_roller",
  TREADMILL = "treadmill",
  BIKE = "bike",
  YOGA_MAT = "yoga_mat",
}

enum PreferredStyles {
  HIIT = "HIIT",
  STRENGTH = "strength",
  CARDIO = "cardio",
  REHAB = "rehab",
  CROSSFIT = "crossfit",
  FUNCTIONAL = "functional",
  PILATES = "pilates",
  YOGA = "yoga",
  BALANCE = "balance",
  MOBILITY = "mobility",
}

// Form data interface matching the schema
export interface FormData {
  email: string;
  age: number;
  height: number;
  weight: number;
  gender: Gender;
  goals: FitnessGoals[];
  limitations?: PhysicalLimitations[];
  fitnessLevel: FitnessLevels;
  environment: WorkoutEnvironments;
  equipment?: AvailableEquipment[];
  preferredStyles: PreferredStyles[];
  availableDays: PreferredDays[];
  workoutDuration: number;
  intensityLevel: IntensityLevels;
  medicalNotes?: string;
}

// Onboarding steps
enum OnboardingStep {
  PERSONAL_INFO = 0,
  FITNESS_PROFILE = 1,
  WORKOUT_PREFERENCES = 2,
  SCHEDULE = 3,
}

interface OnboardingFormProps {
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  showNavigation?: boolean;
  title?: string;
  submitButtonText?: string;
}

// Helper function to format enum values for display
const formatEnumValue = (value: string): string => {
  return value
    .split("_")
    .map((word) => {
      if (word === "HIIT") {
        return "HIIT";
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

// Get screen dimensions
const { width: screenWidth } = Dimensions.get("window");

// Form validation helper
const validateField = (field: string, value: any): string => {
  if (value === null || value === undefined || value === "") {
    return `${field} is required`;
  }

  if (field === "Age" && (value < 16 || value > 100)) {
    return "Age must be between 16 and 100";
  }

  if (field === "Height" && (value < 120 || value > 220)) {
    return "Height must be between 120 and 220 cm";
  }

  if (field === "Weight" && (value < 40 || value > 200)) {
    return "Weight must be between 40 and 200 kg";
  }

  return "";
};

// Type for array fields in FormData
type ArrayFields = Extract<
  keyof FormData,
  | "goals"
  | "limitations"
  | "environment"
  | "equipment"
  | "preferredStyles"
  | "availableDays"
>;

// Type for array values
type ArrayValue = string;

export default function OnboardingForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  showNavigation = true,
  title,
  submitButtonText = "Complete",
}: OnboardingFormProps) {
  const scrollRef = useRef<ScrollView | null>(null);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(
    OnboardingStep.PERSONAL_INFO
  );

  // Initialize form data with default values and merge with initial data
  const [formData, setFormData] = useState<FormData>({
    email: "",
    age: 25,
    height: 170,
    weight: 70,
    gender: Gender.MALE,
    goals: [],
    limitations: [],
    fitnessLevel: FitnessLevels.BEGINNER,
    environment: WorkoutEnvironments.HOME,
    equipment: [],
    preferredStyles: [],
    availableDays: [],
    workoutDuration: 30,
    intensityLevel: IntensityLevels.MODERATE,
    medicalNotes: "",
    ...initialData,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [currentStep]);

  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Helper function for type-safe form updates
  const handleChange = (
    field: keyof FormData,
    value: FormData[keyof FormData]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle multi-select options
  const handleMultiSelectToggle = (field: ArrayFields, value: ArrayValue) => {
    setFormData((prev) => {
      const currentValue = prev[field] as ArrayValue[];
      const newValue = currentValue.includes(value)
        ? currentValue.filter((v) => v !== value)
        : [...currentValue, value];

      return {
        ...prev,
        [field]: newValue,
      };
    });

    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate current step before proceeding
  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case OnboardingStep.PERSONAL_INFO:
        // Validate personal info fields
        const ageError = validateField("Age", formData.age);
        const heightError = validateField("Height", formData.height);
        const weightError = validateField("Weight", formData.weight);

        if (ageError) newErrors.age = ageError;
        if (heightError) newErrors.height = heightError;
        if (weightError) newErrors.weight = weightError;
        break;

      case OnboardingStep.FITNESS_PROFILE:
        // Validate fitness profile fields
        if (!formData.fitnessLevel) {
          newErrors.fitnessLevel = "Please select your fitness level";
        }

        if (formData.goals.length === 0) {
          newErrors.goals = "Please select at least one goal";
        }
        break;

      case OnboardingStep.WORKOUT_PREFERENCES:
        // Validate workout preferences
        if (formData.preferredStyles.length === 0) {
          newErrors.preferredStyles =
            "Please select at least one workout style";
        }

        if (!formData.environment) {
          newErrors.environment = "Please select an environment";
        }
        break;

      case OnboardingStep.SCHEDULE:
        // Validate schedule
        if (formData.availableDays.length === 0) {
          newErrors.availableDays = "Please select at least one day";
        }

        if (!formData.workoutDuration) {
          newErrors.workoutDuration =
            "Please specify your preferred workout duration";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Move to next step
  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  // Move to previous step
  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  // Submit form data
  const handleSubmit = () => {
    if (validateStep()) {
      onSubmit(formData);
    }
  };

  // Render step title and description
  const renderStepHeader = () => {
    let stepTitle = "";
    let description = "";

    switch (currentStep) {
      case OnboardingStep.PERSONAL_INFO:
        stepTitle = "Personal Information";
        description =
          "Let's get to know you better. This information helps us create a personalized fitness experience.";
        break;
      case OnboardingStep.FITNESS_PROFILE:
        stepTitle = "Fitness Profile";
        description =
          "Tell us about your current fitness level and any limitations you may have.";
        break;
      case OnboardingStep.WORKOUT_PREFERENCES:
        stepTitle = "Workout Preferences";
        description = "Let us know when and how you prefer to work out.";
        break;
      case OnboardingStep.SCHEDULE:
        stepTitle = "Workout Schedule";
        description = "Let us know when you prefer to work out.";
        break;
    }

    return (
      <View style={styles.stepHeader}>
        {title && <Text style={styles.mainTitle}>{title}</Text>}
        <Text style={styles.stepIndicator}>Step {currentStep + 1} of 4</Text>
        <Text style={styles.stepTitle}>{stepTitle}</Text>
        <Text style={styles.stepDescription}>{description}</Text>
      </View>
    );
  };

  // Render a slider with labels
  const renderSlider = (
    field: keyof FormData,
    label: string,
    min: number,
    max: number,
    step: number = 1
  ) => (
    <View style={styles.sliderContainer}>
      <Text style={styles.sliderLabel}>{label}</Text>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={formData[field] as number}
        onValueChange={(value) => handleChange(field, value)}
        minimumTrackTintColor="#4f46e5"
        maximumTrackTintColor="#e5e7eb"
        thumbTintColor="#4f46e5"
      />
      <Text style={styles.sliderValue}>{formData[field]}</Text>
    </View>
  );

  // Render a multi-select option with icon
  const renderMultiSelectOption = (
    field: ArrayFields,
    value: ArrayValue,
    label: string,
    iconName: keyof typeof Ionicons.glyphMap,
    extraStyles?: StyleProp<ViewStyle> | undefined
  ) => {
    const values = formData[field] as ArrayValue[];
    const isSelected = values.includes(value);

    return (
      <TouchableOpacity
        style={[
          styles.optionButton,
          isSelected && styles.selectedOption,
          extraStyles,
        ]}
        onPress={() => handleMultiSelectToggle(field, value)}
      >
        <Ionicons
          name={iconName}
          size={24}
          color={isSelected ? "#ffffff" : "#4b5563"}
          style={styles.optionIcon}
        />
        <Text
          style={[styles.optionText, isSelected && styles.selectedOptionText]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render a single select option with icon
  const renderSingleSelectOption = (
    field: keyof FormData,
    value: string,
    label: string,
    iconName: keyof typeof MaterialCommunityIcons.glyphMap,
    extraStyles?: StyleProp<ViewStyle> | undefined
  ) => {
    const isSelected = formData[field] === value;

    return (
      <TouchableOpacity
        style={[
          styles.optionButton,
          isSelected && styles.selectedOption,
          extraStyles,
        ]}
        onPress={() => handleChange(field, value)}
      >
        <MaterialCommunityIcons
          name={iconName}
          size={24}
          color={isSelected ? "#ffffff" : "#4b5563"}
          style={styles.optionIcon}
        />
        <Text
          style={[styles.optionText, isSelected && styles.selectedOptionText]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render content for the Personal Info step
  const renderPersonalInfoStep = () => (
    <View style={styles.stepContent}>
      {renderSlider("age", "Age", 16, 100)}
      {renderSlider("height", "Height (cm)", 120, 220)}
      {renderSlider("weight", "Weight (kg)", 40, 200)}

      <View style={styles.formGroup}>
        <Text style={styles.inputLabel}>Gender</Text>
        <View style={styles.optionsRow}>
          {renderSingleSelectOption(
            "gender",
            Gender.MALE,
            "Male",
            "gender-male"
          )}
          {renderSingleSelectOption(
            "gender",
            Gender.FEMALE,
            "Female",
            "gender-female"
          )}
          {renderSingleSelectOption("gender", Gender.OTHER, "Other", "account")}
        </View>
      </View>
    </View>
  );

  // Render content for the Fitness Profile step
  const renderFitnessProfileStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.formGroup}>
        <Text style={styles.inputLabel}>Current Fitness Level</Text>
        <View style={styles.optionsColumn}>
          {renderSingleSelectOption(
            "fitnessLevel",
            FitnessLevels.BEGINNER,
            "Beginner",
            "walk"
          )}
          {renderSingleSelectOption(
            "fitnessLevel",
            FitnessLevels.INTERMEDIATE,
            "Intermediate",
            "bike"
          )}
          {renderSingleSelectOption(
            "fitnessLevel",
            FitnessLevels.ADVANCED,
            "Advanced",
            "weight-lifter"
          )}
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.inputLabel}>Your Fitness Goals</Text>
        <View style={styles.optionsGrid}>
          {Object.entries(FitnessGoals).map(([key, value], index) => (
            <View key={key} style={styles.gridItem}>
              {renderMultiSelectOption(
                "goals",
                value,
                formatEnumValue(key),
                "checkmark-circle",
                index === Object.entries(FitnessGoals).length - 1 && {
                  justifyContent: "center",
                  alignItems: "center",
                }
              )}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.inputLabel}>Any Health Limitations?</Text>
        <View style={styles.optionsGrid}>
          {Object.entries(PhysicalLimitations).map(([key, value]) => (
            <View key={key} style={styles.gridItem}>
              {renderMultiSelectOption(
                "limitations",
                value,
                formatEnumValue(key),
                "warning"
              )}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.inputLabel}>Medical Notes (Optional)</Text>
        <TextInput
          style={[styles.textArea]}
          value={formData.medicalNotes}
          onChangeText={(value) => handleChange("medicalNotes", value)}
          placeholder="Enter any additional health information here..."
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
    </View>
  );

  // Render content for the Workout Preferences step
  const renderWorkoutPreferencesStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.formGroup}>
        <Text style={styles.inputLabel}>Preferred Workout Styles</Text>
        <View style={styles.optionsGrid}>
          {Object.entries(PreferredStyles).map(([key, value]) => (
            <View key={`style-${key}`} style={styles.gridItem}>
              {renderMultiSelectOption(
                "preferredStyles",
                value,
                formatEnumValue(key),
                "barbell"
              )}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.inputLabel}>Where do you work out?</Text>
        <View style={styles.optionsGrid}>
          {Object.entries(WorkoutEnvironments).map(([key, value], index) => (
            <View key={`env-${key}`} style={styles.gridItem}>
              {renderSingleSelectOption(
                "environment",
                value,
                formatEnumValue(key),
                "map-marker",
                index === Object.entries(WorkoutEnvironments).length - 1 && {
                  justifyContent: "center",
                  alignItems: "center",
                }
              )}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.inputLabel}>Available Equipment</Text>
        <View style={styles.optionsGrid}>
          {Object.entries(AvailableEquipment).map(([key, value]) => (
            <View key={`equip-${key}`} style={styles.gridItem}>
              {renderMultiSelectOption(
                "equipment",
                value,
                formatEnumValue(key),
                "fitness"
              )}
            </View>
          ))}
        </View>
      </View>

      {renderSlider("workoutDuration", "Workout Duration (minutes)", 10, 90, 5)}

      <View style={styles.formGroup}>
        <Text style={styles.inputLabel}>Intensity Level</Text>
        <View style={styles.optionsRow}>
          {Object.entries(IntensityLevels).map(([key, value], index) => (
            <View key={`intensity-${key}`} style={styles.gridItem}>
              {renderSingleSelectOption(
                "intensityLevel",
                value,
                formatEnumValue(key),
                "fire",
                index === Object.entries(IntensityLevels).length - 1 && {
                  justifyContent: "center",
                  alignItems: "center",
                }
              )}
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  // Render content for the Schedule step
  const renderScheduleStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.formGroup}>
        <Text style={styles.inputLabel}>Available Days</Text>
        <View style={styles.optionsGrid}>
          {Object.entries(PreferredDays).map(([key, value], index) => (
            <View key={`day-${key}`} style={styles.gridItem}>
              {renderMultiSelectOption(
                "availableDays",
                value,
                formatEnumValue(key),
                "calendar",
                index === Object.entries(PreferredDays).length - 1 && {
                  justifyContent: "center",
                  alignItems: "center",
                }
              )}
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  // Render the current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case OnboardingStep.PERSONAL_INFO:
        return renderPersonalInfoStep();
      case OnboardingStep.FITNESS_PROFILE:
        return renderFitnessProfileStep();
      case OnboardingStep.WORKOUT_PREFERENCES:
        return renderWorkoutPreferencesStep();
      case OnboardingStep.SCHEDULE:
        return renderScheduleStep();
      default:
        return null;
    }
  };

  // Render navigation buttons
  const renderNavButtons = () => {
    const isLastStep = currentStep === OnboardingStep.SCHEDULE;

    return (
      <View style={styles.buttonsContainer}>
        {showNavigation && currentStep > 0 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handlePrevious}
            disabled={isLoading}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        {onCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.actionButton,
            isLoading && styles.buttonDisabled,
            currentStep === 0 && !onCancel && styles.fullWidthButton,
          ]}
          onPress={isLastStep ? handleSubmit : handleNext}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.actionButtonText}>
              {isLastStep ? submitButtonText : "Next"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        scrollsToTop
      >
        {renderStepHeader()}
        {renderStepContent()}
        {renderNavButtons()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  } as ViewStyle,
  scrollView: {
    flex: 1,
  } as ViewStyle,
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  } as ViewStyle,
  stepHeader: {
    paddingVertical: 20,
  } as ViewStyle,
  mainTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
    textAlign: "center",
  } as TextStyle,
  stepIndicator: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  } as TextStyle,
  stepTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  } as TextStyle,
  stepDescription: {
    fontSize: 16,
    color: "#6b7280",
    lineHeight: 24,
  } as TextStyle,
  stepContent: {
    marginTop: 20,
  } as ViewStyle,
  formGroup: {
    marginBottom: 24,
  } as ViewStyle,
  formRow: {
    flexDirection: "row",
  } as ViewStyle,
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  } as TextStyle,
  textInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1f2937",
  } as TextStyle,
  textArea: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1f2937",
    height: 100,
  } as TextStyle,
  inputError: {
    borderColor: "#ef4444",
  } as TextStyle,
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    marginTop: 8,
  } as TextStyle,
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  } as ViewStyle,
  optionsColumn: {
    marginHorizontal: -4,
  } as ViewStyle,
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  } as ViewStyle,
  optionButton: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    marginBottom: 8,
    minWidth: 100,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-start",
  } as ViewStyle,
  selectedOption: {
    backgroundColor: "#4f46e5",
  } as ViewStyle,
  optionText: {
    color: "#4b5563",
    fontWeight: "500",
  } as TextStyle,
  selectedOptionText: {
    color: "#ffffff",
  } as TextStyle,
  optionIcon: {
    marginRight: 8,
  } as ViewStyle,
  gridItem: {
    flex: 1,
    minWidth: screenWidth / 2 - 32,
    marginBottom: 8,
  } as ViewStyle,
  sliderContainer: {
    marginVertical: 10,
  } as ViewStyle,
  slider: {
    width: "100%",
    height: 40,
  } as ViewStyle,
  sliderLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  } as TextStyle,
  sliderValue: {
    fontSize: 16,
    color: "#4f46e5",
    textAlign: "center",
    marginTop: 8,
  } as TextStyle,
  buttonsContainer: {
    flexDirection: "row",
    marginTop: 30,
    gap: 12,
  } as ViewStyle,
  backButton: {
    flex: 1,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  backButtonText: {
    color: "#4f46e5",
    fontSize: 16,
    fontWeight: "600",
  } as TextStyle,
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
  } as ViewStyle,
  cancelButtonText: {
    color: "#6b7280",
    fontSize: 16,
    fontWeight: "600",
  } as TextStyle,
  actionButton: {
    flex: 2,
    backgroundColor: "#4f46e5",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  fullWidthButton: {
    flex: 1,
  } as ViewStyle,
  buttonDisabled: {
    opacity: 0.7,
  } as ViewStyle,
  actionButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  } as TextStyle,
});
