import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
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

// Onboarding steps - matching the exact flow from images
enum OnboardingStep {
  PERSONAL_INFO = 0,
  FITNESS_GOALS = 1,
  PHYSICAL_LIMITATIONS = 2,
  FITNESS_LEVEL = 3,
  WORKOUT_ENVIRONMENT = 4,
  WORKOUT_STYLE = 5,
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

  if (field === "Weight" && (value < 90 || value > 440)) {
    return "Weight must be between 90 and 440 lbs";
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

type ArrayValue = string;

export default function OnboardingForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  showNavigation = true,
  title,
  submitButtonText = "Generate My Plan",
}: OnboardingFormProps) {
  const scrollRef = useRef<ScrollView | null>(null);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(
    OnboardingStep.PERSONAL_INFO
  );

  // Initialize form data with default values matching the design
  const [formData, setFormData] = useState<FormData>({
    email: "",
    age: 55,
    height: 170,
    weight: 165,
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
        const ageError = validateField("Age", formData.age);
        const heightError = validateField("Height", formData.height);
        const weightError = validateField("Weight", formData.weight);

        if (ageError) newErrors.age = ageError;
        if (heightError) newErrors.height = heightError;
        if (weightError) newErrors.weight = weightError;
        break;

      case OnboardingStep.FITNESS_GOALS:
        if (formData.goals.length === 0) {
          newErrors.goals = "Please select at least one goal";
        }
        break;

      case OnboardingStep.PHYSICAL_LIMITATIONS:
        // Physical limitations are optional, no validation needed
        break;

      case OnboardingStep.FITNESS_LEVEL:
        if (!formData.fitnessLevel) {
          newErrors.fitnessLevel = "Please select your fitness level";
        }
        if (formData.availableDays.length === 0) {
          newErrors.availableDays = "Please select at least one available day";
        }
        break;

      case OnboardingStep.WORKOUT_ENVIRONMENT:
        if (!formData.environment) {
          newErrors.environment = "Please select an environment";
        }
        break;

      case OnboardingStep.WORKOUT_STYLE:
        if (formData.preferredStyles.length === 0) {
          newErrors.preferredStyles =
            "Please select at least one workout style";
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

  // Get step configuration - matching exact titles from images
  const getStepConfig = () => {
    switch (currentStep) {
      case OnboardingStep.PERSONAL_INFO:
        return {
          title: "Personal Information",
          description:
            "Tell us about yourself so we can create a personalized fitness plan.",
        };
      case OnboardingStep.FITNESS_GOALS:
        return {
          title: "Fitness Goals",
          description:
            "What do you want to achieve? Select all goals that apply to you.",
        };
      case OnboardingStep.PHYSICAL_LIMITATIONS:
        return {
          title: "Physical Limitations",
          description:
            "Help us understand any physical limitations or health concerns you may have.",
        };
      case OnboardingStep.FITNESS_LEVEL:
        return {
          title: "Fitness Experience & Schedule",
          description:
            "Tell us about your fitness background and when you're available to workout.",
        };
      case OnboardingStep.WORKOUT_ENVIRONMENT:
        return {
          title: "Workout Environment & Equipment",
          description:
            "Where will you workout and what equipment do you have access to?",
        };
      case OnboardingStep.WORKOUT_STYLE:
        return {
          title: "Workout Preferences",
          description:
            "What types of workouts do you enjoy? This helps us create workouts you'll love.",
        };
      default:
        return { title: "", description: "" };
    }
  };

  // Render Personal Info step - matching image exactly
  const renderPersonalInfoStep = () => (
    <View className="flex-1 px-6 pb-6">
      {/* Age slider */}
      <View className="mb-8">
        <Text className="text-base font-semibold text-neutral-dark-1 mb-4">
          Age
        </Text>
        <View className="p-4">
          <Slider
            style={{ width: "100%", height: 20 }}
            minimumValue={40}
            maximumValue={80}
            step={1}
            value={formData.age}
            onValueChange={(value) => handleChange("age", value)}
            minimumTrackTintColor="#000000"
            maximumTrackTintColor="#E8E8E8"
            thumbTintColor="#000000"
          />
          <View className="flex-row justify-between items-center mt-2">
            <Text className="text-xs text-neutral-medium-4 font-medium">
              40
            </Text>
            <Text className="text-base font-semibold text-neutral-dark-1">
              {formData.age}
            </Text>
            <Text className="text-xs text-neutral-medium-4 font-medium">
              80+
            </Text>
          </View>
        </View>
        {errors.age && (
          <Text className="text-red-500 text-xs mt-2">{errors.age}</Text>
        )}
      </View>

      {/* Gender selection */}
      <View className="mb-8">
        <Text className="text-base font-semibold text-neutral-dark-1 mb-4">
          Gender
        </Text>
        <View className="flex-row justify-between">
          <TouchableOpacity
            className={`flex-1 p-4 rounded-xl items-center mx-1 ${
              formData.gender === Gender.MALE ? "bg-primary" : "bg-white"
            }`}
            onPress={() => handleChange("gender", Gender.MALE)}
          >
            <View
              className={`w-8 h-8 rounded-full items-center justify-center mb-2 ${
                formData.gender === Gender.MALE
                  ? "bg-white"
                  : "bg-neutral-light-2"
              }`}
            >
              <Ionicons
                name="male"
                size={14}
                color={formData.gender === Gender.MALE ? "#BBDE51" : "#8A93A2"}
              />
            </View>
            <Text
              className={`font-medium text-xs ${
                formData.gender === Gender.MALE
                  ? "text-secondary"
                  : "text-neutral-dark-1"
              }`}
            >
              Male
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 p-4 rounded-xl items-center mx-1 ${
              formData.gender === Gender.FEMALE ? "bg-primary" : "bg-white"
            }`}
            onPress={() => handleChange("gender", Gender.FEMALE)}
          >
            <View
              className={`w-8 h-8 rounded-full items-center justify-center mb-2 ${
                formData.gender === Gender.FEMALE
                  ? "bg-white"
                  : "bg-neutral-light-2"
              }`}
            >
              <Ionicons
                name="female"
                size={14}
                color={
                  formData.gender === Gender.FEMALE ? "#BBDE51" : "#8A93A2"
                }
              />
            </View>
            <Text
              className={`font-medium text-xs ${
                formData.gender === Gender.FEMALE
                  ? "text-secondary"
                  : "text-neutral-dark-1"
              }`}
            >
              Female
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 p-4 rounded-xl items-center mx-1 ${
              formData.gender === Gender.OTHER ? "bg-primary" : "bg-white"
            }`}
            onPress={() => handleChange("gender", Gender.OTHER)}
          >
            <View
              className={`w-8 h-8 rounded-full items-center justify-center mb-2 ${
                formData.gender === Gender.OTHER
                  ? "bg-white"
                  : "bg-neutral-light-2"
              }`}
            >
              <Ionicons
                name="person"
                size={14}
                color={formData.gender === Gender.OTHER ? "#BBDE51" : "#8A93A2"}
              />
            </View>
            <Text
              className={`font-medium text-xs ${
                formData.gender === Gender.OTHER
                  ? "text-secondary"
                  : "text-neutral-dark-1"
              }`}
            >
              Other
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Height slider */}
      <View className="mb-8">
        <Text className="text-base font-semibold text-neutral-dark-1 mb-4">
          Height
        </Text>
        <View className="p-4">
          <Slider
            style={{ width: "100%", height: 20 }}
            minimumValue={120}
            maximumValue={220}
            step={1}
            value={formData.height}
            onValueChange={(value) => handleChange("height", value)}
            minimumTrackTintColor="#000000"
            maximumTrackTintColor="#E8E8E8"
            thumbTintColor="#000000"
          />
          <View className="flex-row justify-between items-center mt-2">
            <Text className="text-xs text-neutral-medium-4 font-medium">
              4'0"
            </Text>
            <Text className="text-base font-semibold text-neutral-dark-1">
              {Math.floor(formData.height / 30.48)}'
            </Text>
            <Text className="text-xs text-neutral-medium-4 font-medium">
              7'0"
            </Text>
          </View>
        </View>
        {errors.height && (
          <Text className="text-red-500 text-xs mt-2">{errors.height}</Text>
        )}
      </View>

      {/* Weight slider */}
      <View className="mb-6">
        <Text className="text-base font-semibold text-neutral-dark-1 mb-4">
          Weight (lbs)
        </Text>
        <View className="p-4">
          <Slider
            style={{ width: "100%", height: 20 }}
            minimumValue={100}
            maximumValue={300}
            step={1}
            value={formData.weight}
            onValueChange={(value) => handleChange("weight", value)}
            minimumTrackTintColor="#000000"
            maximumTrackTintColor="#E8E8E8"
            thumbTintColor="#000000"
          />
          <View className="flex-row justify-between items-center mt-2">
            <Text className="text-xs text-neutral-medium-4 font-medium">
              100
            </Text>
            <Text className="text-base font-semibold text-neutral-dark-1">
              {formData.weight}
            </Text>
            <Text className="text-xs text-neutral-medium-4 font-medium">
              300+
            </Text>
          </View>
        </View>
        {errors.weight && (
          <Text className="text-red-500 text-xs mt-2">{errors.weight}</Text>
        )}
      </View>
    </View>
  );

  // Render Fitness Goals step - matching image colors exactly
  const renderFitnessGoalsStep = () => (
    <View className="flex-1 px-6 pb-6">
      {/* Recovery - Blue background as in image */}
      <TouchableOpacity
        className={`p-4 rounded-xl mb-3 flex-row items-center ${
          formData.goals.includes(FitnessGoals.RECOVERY)
            ? "bg-primary"
            : "bg-white"
        }`}
        onPress={() => handleMultiSelectToggle("goals", FitnessGoals.RECOVERY)}
      >
        <View className="w-8 h-8 bg-blue-100 rounded-xl items-center justify-center mr-4">
          <Ionicons name="medical-outline" size={16} color="#3B82F6" />
        </View>
        <View className="flex-1">
          <Text
            className={`font-medium text-sm ${
              formData.goals.includes(FitnessGoals.RECOVERY)
                ? "text-secondary"
                : "text-neutral-dark-1"
            }`}
          >
            Recovery
          </Text>
          <Text
            className={`text-xs ${
              formData.goals.includes(FitnessGoals.RECOVERY)
                ? "text-secondary"
                : "text-neutral-medium-4"
            }`}
          >
            Recover from injury or surgery
          </Text>
        </View>
        {formData.goals.includes(FitnessGoals.RECOVERY) && (
          <Ionicons name="checkmark-circle" size={16} color="#181917" />
        )}
      </TouchableOpacity>

      {/* Fat Loss - Green background as in image */}
      <TouchableOpacity
        className={`p-4 rounded-xl mb-3 flex-row items-center ${
          formData.goals.includes(FitnessGoals.WEIGHT_LOSS)
            ? "bg-primary"
            : "bg-white"
        }`}
        onPress={() =>
          handleMultiSelectToggle("goals", FitnessGoals.WEIGHT_LOSS)
        }
      >
        <View className="w-8 h-8 bg-green-100 rounded-xl items-center justify-center mr-4">
          <Ionicons name="fitness-outline" size={16} color="#10B981" />
        </View>
        <View className="flex-1">
          <Text
            className={`font-medium text-sm ${
              formData.goals.includes(FitnessGoals.WEIGHT_LOSS)
                ? "text-secondary"
                : "text-neutral-dark-1"
            }`}
          >
            Fat Loss
          </Text>
          <Text
            className={`text-xs ${
              formData.goals.includes(FitnessGoals.WEIGHT_LOSS)
                ? "text-secondary"
                : "text-neutral-medium-4"
            }`}
          >
            Reduce body fat and improve composition
          </Text>
        </View>
        {formData.goals.includes(FitnessGoals.WEIGHT_LOSS) && (
          <Ionicons name="checkmark-circle" size={16} color="#181917" />
        )}
      </TouchableOpacity>

      {/* Strength - Purple background as in image */}
      <TouchableOpacity
        className={`p-4 rounded-xl mb-3 flex-row items-center ${
          formData.goals.includes(FitnessGoals.STRENGTH)
            ? "bg-primary"
            : "bg-white"
        }`}
        onPress={() => handleMultiSelectToggle("goals", FitnessGoals.STRENGTH)}
      >
        <View className="w-8 h-8 bg-purple-100 rounded-xl items-center justify-center mr-4">
          <Ionicons name="barbell-outline" size={16} color="#8B5CF6" />
        </View>
        <View className="flex-1">
          <Text
            className={`font-medium text-sm ${
              formData.goals.includes(FitnessGoals.STRENGTH)
                ? "text-secondary"
                : "text-neutral-dark-1"
            }`}
          >
            Strength
          </Text>
          <Text
            className={`text-xs ${
              formData.goals.includes(FitnessGoals.STRENGTH)
                ? "text-secondary"
                : "text-neutral-medium-4"
            }`}
          >
            Build muscle and increase strength
          </Text>
        </View>
        {formData.goals.includes(FitnessGoals.STRENGTH) && (
          <Ionicons name="checkmark-circle" size={16} color="#181917" />
        )}
      </TouchableOpacity>

      {/* Endurance - Orange background as in image */}
      <TouchableOpacity
        className={`p-4 rounded-xl mb-3 flex-row items-center ${
          formData.goals.includes(FitnessGoals.ENDURANCE)
            ? "bg-primary"
            : "bg-white"
        }`}
        onPress={() => handleMultiSelectToggle("goals", FitnessGoals.ENDURANCE)}
      >
        <View className="w-8 h-8 bg-orange-100 rounded-xl items-center justify-center mr-4">
          <Ionicons name="heart-outline" size={16} color="#F97316" />
        </View>
        <View className="flex-1">
          <Text
            className={`font-medium text-sm ${
              formData.goals.includes(FitnessGoals.ENDURANCE)
                ? "text-secondary"
                : "text-neutral-dark-1"
            }`}
          >
            Endurance
          </Text>
          <Text
            className={`text-xs ${
              formData.goals.includes(FitnessGoals.ENDURANCE)
                ? "text-secondary"
                : "text-neutral-medium-4"
            }`}
          >
            Improve stamina and cardiovascular health
          </Text>
        </View>
        {formData.goals.includes(FitnessGoals.ENDURANCE) && (
          <Ionicons name="checkmark-circle" size={16} color="#181917" />
        )}
      </TouchableOpacity>

      {/* Mobility - Pink background as in image */}
      <TouchableOpacity
        className={`p-4 rounded-xl mb-3 flex-row items-center ${
          formData.goals.includes(FitnessGoals.MOBILITY)
            ? "bg-primary"
            : "bg-white"
        }`}
        onPress={() => handleMultiSelectToggle("goals", FitnessGoals.MOBILITY)}
      >
        <View className="w-8 h-8 bg-pink-100 rounded-xl items-center justify-center mr-4">
          <Ionicons name="body-outline" size={16} color="#EC4899" />
        </View>
        <View className="flex-1">
          <Text
            className={`font-medium text-sm ${
              formData.goals.includes(FitnessGoals.MOBILITY)
                ? "text-secondary"
                : "text-neutral-dark-1"
            }`}
          >
            Mobility
          </Text>
          <Text
            className={`text-xs ${
              formData.goals.includes(FitnessGoals.MOBILITY)
                ? "text-secondary"
                : "text-neutral-medium-4"
            }`}
          >
            Improve flexibility and joint health
          </Text>
        </View>
        {formData.goals.includes(FitnessGoals.MOBILITY) && (
          <Ionicons name="checkmark-circle" size={16} color="#181917" />
        )}
      </TouchableOpacity>

      {/* Add other goals with appropriate colors */}
      {Object.entries(FitnessGoals)
        .filter(
          ([key, value]) =>
            ![
              FitnessGoals.RECOVERY,
              FitnessGoals.WEIGHT_LOSS,
              FitnessGoals.STRENGTH,
              FitnessGoals.ENDURANCE,
              FitnessGoals.MOBILITY,
            ].includes(value)
        )
        .map(([key, value]) => {
          // Define specific colors and icons for each goal
          const getGoalConfig = (goalKey: string) => {
            switch (goalKey) {
              case "MUSCLE_GAIN":
                return {
                  icon: "fitness-outline",
                  color: "#8B5CF6",
                  bgColor: "bg-purple-100",
                  description: "Build lean muscle mass and strength",
                };
              case "FLEXIBILITY":
                return {
                  icon: "body-outline",
                  color: "#EC4899",
                  bgColor: "bg-pink-100",
                  description: "Improve range of motion and flexibility",
                };
              case "GENERAL_FITNESS":
                return {
                  icon: "checkmark-circle-outline",
                  color: "#10B981",
                  bgColor: "bg-green-100",
                  description: "Overall health and fitness improvement",
                };
              case "BALANCE":
                return {
                  icon: "git-branch-outline",
                  color: "#F59E0B",
                  bgColor: "bg-yellow-100",
                  description: "Improve stability and coordination",
                };
              default:
                return {
                  icon: "star-outline",
                  color: "#8A93A2",
                  bgColor: "bg-neutral-light-2",
                  description: "General fitness goal",
                };
            }
          };

          const config = getGoalConfig(key);

          return (
            <TouchableOpacity
              key={key}
              className={`p-4 rounded-xl mb-3 flex-row items-center ${
                formData.goals.includes(value) ? "bg-primary" : "bg-white"
              }`}
              onPress={() => handleMultiSelectToggle("goals", value)}
            >
              <View
                className={`w-8 h-8 ${config.bgColor} rounded-xl items-center justify-center mr-4`}
              >
                <Ionicons
                  name={config.icon as any}
                  size={16}
                  color={config.color}
                />
              </View>
              <View className="flex-1">
                <Text
                  className={`font-medium text-sm ${
                    formData.goals.includes(value)
                      ? "text-secondary"
                      : "text-neutral-dark-1"
                  }`}
                >
                  {formatEnumValue(key)}
                </Text>
                <Text
                  className={`text-xs ${
                    formData.goals.includes(value)
                      ? "text-secondary"
                      : "text-neutral-medium-4"
                  }`}
                >
                  {config.description}
                </Text>
              </View>
              {formData.goals.includes(value) && (
                <Ionicons name="checkmark-circle" size={16} color="#181917" />
              )}
            </TouchableOpacity>
          );
        })}
    </View>
  );

  // Render Physical Limitations step - matching image exactly
  const renderPhysicalLimitationsStep = () => (
    <View className="flex-1 px-6 pb-6">
      {/* Recent Surgery - Red background as in image */}
      <TouchableOpacity
        className={`p-4 rounded-xl mb-3 flex-row items-center ${
          formData.limitations?.includes(
            PhysicalLimitations.POST_SURGERY_RECOVERY
          )
            ? "bg-primary"
            : "bg-white"
        }`}
        onPress={() =>
          handleMultiSelectToggle(
            "limitations",
            PhysicalLimitations.POST_SURGERY_RECOVERY
          )
        }
      >
        <View className="w-8 h-8 bg-red-100 rounded-xl items-center justify-center mr-4">
          <Ionicons name="medical-outline" size={16} color="#EF4444" />
        </View>
        <View className="flex-1">
          <Text
            className={`font-medium text-sm ${
              formData.limitations?.includes(
                PhysicalLimitations.POST_SURGERY_RECOVERY
              )
                ? "text-secondary"
                : "text-neutral-dark-1"
            }`}
          >
            Recent Surgery
          </Text>
          <Text
            className={`text-xs ${
              formData.limitations?.includes(
                PhysicalLimitations.POST_SURGERY_RECOVERY
              )
                ? "text-secondary"
                : "text-neutral-medium-4"
            }`}
          >
            Surgery within the last 12 months
          </Text>
        </View>
        {formData.limitations?.includes(
          PhysicalLimitations.POST_SURGERY_RECOVERY
        ) && <Ionicons name="checkmark-circle" size={16} color="#181917" />}
      </TouchableOpacity>

      {/* Knee Issues - Orange background as in image */}
      <TouchableOpacity
        className={`p-4 rounded-xl mb-3 flex-row items-center ${
          formData.limitations?.includes(PhysicalLimitations.KNEE_PAIN)
            ? "bg-primary"
            : "bg-white"
        }`}
        onPress={() =>
          handleMultiSelectToggle("limitations", PhysicalLimitations.KNEE_PAIN)
        }
      >
        <View className="w-8 h-8 bg-orange-100 rounded-xl items-center justify-center mr-4">
          <Ionicons name="body-outline" size={16} color="#F97316" />
        </View>
        <View className="flex-1">
          <Text
            className={`font-medium text-sm ${
              formData.limitations?.includes(PhysicalLimitations.KNEE_PAIN)
                ? "text-secondary"
                : "text-neutral-dark-1"
            }`}
          >
            Knee Issues
          </Text>
          <Text
            className={`text-xs ${
              formData.limitations?.includes(PhysicalLimitations.KNEE_PAIN)
                ? "text-secondary"
                : "text-neutral-medium-4"
            }`}
          >
            Pain or limited mobility in knees
          </Text>
        </View>
        {formData.limitations?.includes(PhysicalLimitations.KNEE_PAIN) && (
          <Ionicons name="checkmark-circle" size={16} color="#181917" />
        )}
      </TouchableOpacity>

      {/* Shoulder Issues - Blue background as in image */}
      <TouchableOpacity
        className={`p-4 rounded-xl mb-3 flex-row items-center ${
          formData.limitations?.includes(PhysicalLimitations.SHOULDER_PAIN)
            ? "bg-primary"
            : "bg-white"
        }`}
        onPress={() =>
          handleMultiSelectToggle(
            "limitations",
            PhysicalLimitations.SHOULDER_PAIN
          )
        }
      >
        <View className="w-8 h-8 bg-blue-100 rounded-xl items-center justify-center mr-4">
          <Ionicons name="body-outline" size={16} color="#3B82F6" />
        </View>
        <View className="flex-1">
          <Text
            className={`font-medium text-sm ${
              formData.limitations?.includes(PhysicalLimitations.SHOULDER_PAIN)
                ? "text-secondary"
                : "text-neutral-dark-1"
            }`}
          >
            Shoulder Issues
          </Text>
          <Text
            className={`text-xs ${
              formData.limitations?.includes(PhysicalLimitations.SHOULDER_PAIN)
                ? "text-secondary"
                : "text-neutral-medium-4"
            }`}
          >
            Pain or limited mobility in shoulders
          </Text>
        </View>
        {formData.limitations?.includes(PhysicalLimitations.SHOULDER_PAIN) && (
          <Ionicons name="checkmark-circle" size={16} color="#181917" />
        )}
      </TouchableOpacity>

      {/* Back Pain - Purple background as in image */}
      <TouchableOpacity
        className={`p-4 rounded-xl mb-3 flex-row items-center ${
          formData.limitations?.includes(PhysicalLimitations.LOWER_BACK_PAIN)
            ? "bg-primary"
            : "bg-white"
        }`}
        onPress={() =>
          handleMultiSelectToggle(
            "limitations",
            PhysicalLimitations.LOWER_BACK_PAIN
          )
        }
      >
        <View className="w-8 h-8 bg-purple-100 rounded-xl items-center justify-center mr-4">
          <Ionicons name="body-outline" size={16} color="#8B5CF6" />
        </View>
        <View className="flex-1">
          <Text
            className={`font-medium text-sm ${
              formData.limitations?.includes(
                PhysicalLimitations.LOWER_BACK_PAIN
              )
                ? "text-secondary"
                : "text-neutral-dark-1"
            }`}
          >
            Back Pain
          </Text>
          <Text
            className={`text-xs ${
              formData.limitations?.includes(
                PhysicalLimitations.LOWER_BACK_PAIN
              )
                ? "text-secondary"
                : "text-neutral-medium-4"
            }`}
          >
            Chronic or recurring back pain
          </Text>
        </View>
        {formData.limitations?.includes(
          PhysicalLimitations.LOWER_BACK_PAIN
        ) && <Ionicons name="checkmark-circle" size={16} color="#181917" />}
      </TouchableOpacity>

      {/* Other Health Condition - Green background as in image */}
      <TouchableOpacity
        className={`p-4 rounded-xl mb-3 flex-row items-center ${
          formData.limitations?.includes(PhysicalLimitations.CHRONIC_FATIGUE)
            ? "bg-primary"
            : "bg-white"
        }`}
        onPress={() =>
          handleMultiSelectToggle(
            "limitations",
            PhysicalLimitations.CHRONIC_FATIGUE
          )
        }
      >
        <View className="w-8 h-8 bg-green-100 rounded-xl items-center justify-center mr-4">
          <Ionicons name="medical-outline" size={16} color="#10B981" />
        </View>
        <View className="flex-1">
          <Text
            className={`font-medium text-sm ${
              formData.limitations?.includes(
                PhysicalLimitations.CHRONIC_FATIGUE
              )
                ? "text-secondary"
                : "text-neutral-dark-1"
            }`}
          >
            Other Health Condition
          </Text>
          <Text
            className={`text-xs ${
              formData.limitations?.includes(
                PhysicalLimitations.CHRONIC_FATIGUE
              )
                ? "text-secondary"
                : "text-neutral-medium-4"
            }`}
          >
            Any other health condition we should know
          </Text>
        </View>
        {formData.limitations?.includes(
          PhysicalLimitations.CHRONIC_FATIGUE
        ) && <Ionicons name="checkmark-circle" size={16} color="#181917" />}
      </TouchableOpacity>

      {/* Add other limitations */}
      {Object.entries(PhysicalLimitations)
        .filter(
          ([key, value]) =>
            ![
              PhysicalLimitations.POST_SURGERY_RECOVERY,
              PhysicalLimitations.KNEE_PAIN,
              PhysicalLimitations.SHOULDER_PAIN,
              PhysicalLimitations.LOWER_BACK_PAIN,
              PhysicalLimitations.CHRONIC_FATIGUE,
            ].includes(value)
        )
        .map(([key, value]) => {
          // Define specific colors and icons for each limitation
          const getLimitationConfig = (limitationKey: string) => {
            switch (limitationKey) {
              case "NECK_PAIN":
                return {
                  icon: "arrow-up-outline",
                  color: "#F97316",
                  bgColor: "bg-orange-100",
                  description: "Pain or stiffness in neck area",
                };
              case "HIP_PAIN":
                return {
                  icon: "body-outline",
                  color: "#8B5CF6",
                  bgColor: "bg-purple-100",
                  description: "Pain or limited mobility in hips",
                };
              case "ANKLE_INSTABILITY":
                return {
                  icon: "walk-outline",
                  color: "#06B6D4",
                  bgColor: "bg-cyan-100",
                  description: "Weak or unstable ankles",
                };
              case "WRIST_PAIN":
                return {
                  icon: "hand-left-outline",
                  color: "#EC4899",
                  bgColor: "bg-pink-100",
                  description: "Pain or weakness in wrists",
                };
              case "ELBOW_PAIN":
                return {
                  icon: "remove-outline",
                  color: "#F59E0B",
                  bgColor: "bg-yellow-100",
                  description: "Tennis elbow or other elbow issues",
                };
              case "ARTHRITIS":
                return {
                  icon: "medical-outline",
                  color: "#EF4444",
                  bgColor: "bg-red-100",
                  description: "Joint inflammation and stiffness",
                };
              case "OSTEOPOROSIS":
                return {
                  icon: "body-outline",
                  color: "#6366F1",
                  bgColor: "bg-indigo-100",
                  description: "Weak or brittle bones",
                };
              case "SCIATICA":
                return {
                  icon: "flash-outline",
                  color: "#F97316",
                  bgColor: "bg-orange-100",
                  description: "Nerve pain down leg from lower back",
                };
              case "LIMITED_RANGE_OF_MOTION":
                return {
                  icon: "resize-outline",
                  color: "#8B5CF6",
                  bgColor: "bg-purple-100",
                  description: "Restricted movement in joints",
                };
              case "BALANCE_ISSUES":
                return {
                  icon: "git-branch-outline",
                  color: "#10B981",
                  bgColor: "bg-green-100",
                  description: "Difficulty with balance and stability",
                };
              case "BREATHING_ISSUES":
                return {
                  icon: "heart-outline",
                  color: "#3B82F6",
                  bgColor: "bg-blue-100",
                  description: "Asthma or other breathing conditions",
                };
              default:
                return {
                  icon: "warning-outline",
                  color: "#8A93A2",
                  bgColor: "bg-neutral-light-2",
                  description: "Physical limitation",
                };
            }
          };

          const config = getLimitationConfig(key);

          return (
            <TouchableOpacity
              key={key}
              className={`p-4 rounded-xl mb-3 flex-row items-center ${
                formData.limitations?.includes(value)
                  ? "bg-primary"
                  : "bg-white"
              }`}
              onPress={() => handleMultiSelectToggle("limitations", value)}
            >
              <View
                className={`w-8 h-8 ${config.bgColor} rounded-xl items-center justify-center mr-4`}
              >
                <Ionicons
                  name={config.icon as any}
                  size={16}
                  color={config.color}
                />
              </View>
              <View className="flex-1">
                <Text
                  className={`font-medium text-sm ${
                    formData.limitations?.includes(value)
                      ? "text-secondary"
                      : "text-neutral-dark-1"
                  }`}
                >
                  {formatEnumValue(key)}
                </Text>
                <Text
                  className={`text-xs ${
                    formData.limitations?.includes(value)
                      ? "text-secondary"
                      : "text-neutral-medium-4"
                  }`}
                >
                  {config.description}
                </Text>
              </View>
              {formData.limitations?.includes(value) && (
                <Ionicons name="checkmark-circle" size={16} color="#181917" />
              )}
            </TouchableOpacity>
          );
        })}
    </View>
  );

  // Render Fitness Level step - matching image exactly
  const renderFitnessLevelStep = () => (
    <View className="flex-1 px-6 pb-6">
      <Text className="text-xs text-neutral-medium-4 mb-6">
        Select your current fitness level to help us tailor your program.
      </Text>

      {/* Fitness Level Selection */}
      <View className="mb-8">
        <Text className="text-sm font-semibold text-neutral-dark-1 mb-4">
          Current Fitness Level
        </Text>

        {/* Beginner - Green background as in image */}
        <TouchableOpacity
          className={`p-4 rounded-xl mb-3 flex-row items-center ${
            formData.fitnessLevel === FitnessLevels.BEGINNER
              ? "bg-primary"
              : "bg-white"
          }`}
          onPress={() => handleChange("fitnessLevel", FitnessLevels.BEGINNER)}
        >
          <View className="w-8 h-8 bg-green-100 rounded-xl items-center justify-center mr-4">
            <Ionicons name="walk-outline" size={16} color="#10B981" />
          </View>
          <View className="flex-1">
            <Text
              className={`font-medium text-sm ${
                formData.fitnessLevel === FitnessLevels.BEGINNER
                  ? "text-secondary"
                  : "text-neutral-dark-1"
              }`}
            >
              Beginner
            </Text>
            <Text
              className={`text-xs ${
                formData.fitnessLevel === FitnessLevels.BEGINNER
                  ? "text-secondary"
                  : "text-neutral-medium-4"
              }`}
            >
              New to fitness or returning after a long break
            </Text>
          </View>
          {formData.fitnessLevel === FitnessLevels.BEGINNER && (
            <Ionicons name="checkmark-circle" size={16} color="#181917" />
          )}
        </TouchableOpacity>

        {/* Intermediate - Blue background as in image */}
        <TouchableOpacity
          className={`p-4 rounded-xl mb-3 flex-row items-center ${
            formData.fitnessLevel === FitnessLevels.INTERMEDIATE
              ? "bg-primary"
              : "bg-white"
          }`}
          onPress={() =>
            handleChange("fitnessLevel", FitnessLevels.INTERMEDIATE)
          }
        >
          <View className="w-8 h-8 bg-blue-100 rounded-xl items-center justify-center mr-4">
            <Ionicons name="bicycle-outline" size={16} color="#3B82F6" />
          </View>
          <View className="flex-1">
            <Text
              className={`font-medium text-sm ${
                formData.fitnessLevel === FitnessLevels.INTERMEDIATE
                  ? "text-secondary"
                  : "text-neutral-dark-1"
              }`}
            >
              Intermediate
            </Text>
            <Text
              className={`text-xs ${
                formData.fitnessLevel === FitnessLevels.INTERMEDIATE
                  ? "text-secondary"
                  : "text-neutral-medium-4"
              }`}
            >
              Consistent exercise for 6+ months
            </Text>
          </View>
          {formData.fitnessLevel === FitnessLevels.INTERMEDIATE && (
            <Ionicons name="checkmark-circle" size={16} color="#181917" />
          )}
        </TouchableOpacity>

        {/* Advanced - Purple background as in image */}
        <TouchableOpacity
          className={`p-4 rounded-xl mb-3 flex-row items-center ${
            formData.fitnessLevel === FitnessLevels.ADVANCED
              ? "bg-primary"
              : "bg-white"
          }`}
          onPress={() => handleChange("fitnessLevel", FitnessLevels.ADVANCED)}
        >
          <View className="w-8 h-8 bg-purple-100 rounded-xl items-center justify-center mr-4">
            <Ionicons name="barbell-outline" size={16} color="#8B5CF6" />
          </View>
          <View className="flex-1">
            <Text
              className={`font-medium text-sm ${
                formData.fitnessLevel === FitnessLevels.ADVANCED
                  ? "text-secondary"
                  : "text-neutral-dark-1"
              }`}
            >
              Advanced
            </Text>
            <Text
              className={`text-xs ${
                formData.fitnessLevel === FitnessLevels.ADVANCED
                  ? "text-secondary"
                  : "text-neutral-medium-4"
              }`}
            >
              Regular challenging workouts for 1+ years
            </Text>
          </View>
          {formData.fitnessLevel === FitnessLevels.ADVANCED && (
            <Ionicons name="checkmark-circle" size={16} color="#181917" />
          )}
        </TouchableOpacity>
        {errors.fitnessLevel && (
          <Text className="text-red-500 text-xs mt-2">
            {errors.fitnessLevel}
          </Text>
        )}
      </View>

      {/* Available Days */}
      <View className="mb-8">
        <Text className="text-sm font-semibold text-neutral-dark-1 mb-4">
          Available Days
        </Text>
        <Text className="text-xs text-neutral-medium-4 mb-4">
          Select the days you're available to workout.
        </Text>
        <View className="flex-row flex-wrap">
          {Object.entries(PreferredDays).map(([key, value]) => (
            <TouchableOpacity
              key={key}
              className={`px-3 py-2 rounded-lg mr-2 mb-2 ${
                formData.availableDays.includes(value)
                  ? "bg-primary"
                  : "bg-white"
              }`}
              onPress={() => handleMultiSelectToggle("availableDays", value)}
            >
              <Text
                className={`font-medium text-sm ${
                  formData.availableDays.includes(value)
                    ? "text-secondary"
                    : "text-neutral-dark-1"
                }`}
              >
                {value.charAt(0).toUpperCase() + value.slice(1, 3)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.availableDays && (
          <Text className="text-red-500 text-xs mt-2">
            {errors.availableDays}
          </Text>
        )}
      </View>

      {/* Time Per Session slider */}
      <View className="mb-8">
        <Text className="text-sm font-semibold text-neutral-dark-1 mb-4">
          Time Per Session
        </Text>
        <View className="p-4">
          <Slider
            style={{ width: "100%", height: 20 }}
            minimumValue={15}
            maximumValue={60}
            step={5}
            value={formData.workoutDuration}
            onValueChange={(value) => handleChange("workoutDuration", value)}
            minimumTrackTintColor="#000000"
            maximumTrackTintColor="#E8E8E8"
            thumbTintColor="#000000"
          />
          <View className="flex-row justify-between items-center mt-2">
            <Text className="text-xs text-neutral-medium-4 font-medium">
              15 min
            </Text>
            <Text className="text-sm font-semibold text-neutral-dark-1">
              {formData.workoutDuration} min
            </Text>
            <Text className="text-xs text-neutral-medium-4 font-medium">
              60+ min
            </Text>
          </View>
        </View>
      </View>

      {/* Intensity Level */}
      <View className="mb-8">
        <Text className="text-sm font-semibold text-neutral-dark-1 mb-4">
          Preferred Intensity Level
        </Text>
        <View className="flex-row justify-between">
          {Object.entries(IntensityLevels).map(([key, value]) => (
            <TouchableOpacity
              key={key}
              className={`flex-1 p-3 rounded-xl items-center mx-1 ${
                formData.intensityLevel === value ? "bg-primary" : "bg-white"
              }`}
              onPress={() => handleChange("intensityLevel", value)}
            >
              <Text
                className={`font-medium text-sm ${
                  formData.intensityLevel === value
                    ? "text-secondary"
                    : "text-neutral-dark-1"
                }`}
              >
                {formatEnumValue(key)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Medical Notes */}
      <View className="mb-6">
        <Text className="text-sm font-semibold text-neutral-dark-1 mb-4">
          Medical Notes (Optional)
        </Text>
        <Text className="text-xs text-neutral-medium-4 mb-4">
          Any additional medical information or concerns we should know about.
        </Text>
        <TextInput
          style={{
            backgroundColor: "#FFFFFF", // background color (white)
            borderWidth: 1,
            borderColor: "#E8E8E8", // neutral-medium-1 (thin grey)
            borderRadius: 12, // rounded-xl
            minHeight: 100,
            fontSize: 14,
            color: "#525252", // neutral-dark-1
            paddingHorizontal: 16,
            paddingVertical: 24,
            textAlignVertical: "top",
          }}
          placeholder="Enter any medical conditions, injuries, or concerns..."
          placeholderTextColor="#8A93A2"
          value={formData.medicalNotes}
          onChangeText={(text) => handleChange("medicalNotes", text)}
          multiline={true}
        />
      </View>
    </View>
  );

  // Render Workout Environment step - matching image exactly
  const renderWorkoutEnvironmentStep = () => (
    <View className="flex-1 px-6 pb-6">
      <Text className="text-xs text-neutral-medium-4 mb-6">
        Where will you be working out most often?
      </Text>

      {/* Environment selection */}
      <View className="mb-8">
        <Text className="text-sm font-semibold text-neutral-dark-1 mb-4">
          Workout Environment
        </Text>
        <View className="flex-row justify-between">
          <TouchableOpacity
            className={`flex-1 p-4 mx-1 rounded-xl items-center ${
              formData.environment === WorkoutEnvironments.HOME
                ? "bg-primary"
                : "bg-white"
            }`}
            onPress={() =>
              handleChange("environment", WorkoutEnvironments.HOME)
            }
          >
            <View className="w-8 h-8 bg-blue-100 rounded-xl items-center justify-center mb-3">
              <Ionicons name="home-outline" size={16} color="#3B82F6" />
            </View>
            <Text
              className={`font-medium text-sm ${
                formData.environment === WorkoutEnvironments.HOME
                  ? "text-secondary"
                  : "text-neutral-dark-1"
              }`}
            >
              Home
            </Text>
            <Text
              className={`text-xs text-center mt-1 ${
                formData.environment === WorkoutEnvironments.HOME
                  ? "text-secondary"
                  : "text-neutral-medium-4"
              }`}
            >
              Workout at home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 p-4 mx-1 rounded-xl items-center ${
              formData.environment === WorkoutEnvironments.GYM
                ? "bg-primary"
                : "bg-white"
            }`}
            onPress={() => handleChange("environment", WorkoutEnvironments.GYM)}
          >
            <View className="w-8 h-8 bg-purple-100 rounded-xl items-center justify-center mb-3">
              <Ionicons name="fitness-outline" size={16} color="#8B5CF6" />
            </View>
            <Text
              className={`font-medium text-sm ${
                formData.environment === WorkoutEnvironments.GYM
                  ? "text-secondary"
                  : "text-neutral-dark-1"
              }`}
            >
              Gym
            </Text>
            <Text
              className={`text-xs text-center mt-1 ${
                formData.environment === WorkoutEnvironments.GYM
                  ? "text-secondary"
                  : "text-neutral-medium-4"
              }`}
            >
              Go to a gym
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 p-4 mx-1 rounded-xl items-center ${
              formData.environment === WorkoutEnvironments.HYBRID
                ? "bg-primary"
                : "bg-white"
            }`}
            onPress={() =>
              handleChange("environment", WorkoutEnvironments.HYBRID)
            }
          >
            <View className="w-8 h-8 bg-green-100 rounded-xl items-center justify-center mb-3">
              <Ionicons
                name="swap-horizontal-outline"
                size={16}
                color="#10B981"
              />
            </View>
            <Text
              className={`font-medium text-sm ${
                formData.environment === WorkoutEnvironments.HYBRID
                  ? "text-secondary"
                  : "text-neutral-dark-1"
              }`}
            >
              Hybrid
            </Text>
            <Text
              className={`text-xs text-center mt-1 ${
                formData.environment === WorkoutEnvironments.HYBRID
                  ? "text-secondary"
                  : "text-neutral-medium-4"
              }`}
            >
              Both home & gym
            </Text>
          </TouchableOpacity>
        </View>
        {errors.environment && (
          <Text className="text-red-500 text-xs mt-2">
            {errors.environment}
          </Text>
        )}
      </View>

      {/* Available Equipment section */}
      <View className="mb-6">
        <Text className="text-sm font-semibold text-neutral-dark-1 mb-4">
          Available Equipment
        </Text>
        <Text className="text-xs text-neutral-medium-4 mb-6">
          Select all equipment you have access to.
        </Text>

        {/* Equipment options - All equipment from enum */}
        <View className="flex-row flex-wrap justify-between">
          {/* Dumbbells */}
          <TouchableOpacity
            className={`w-[48%] p-3 rounded-xl mb-3 items-center ${
              formData.equipment?.includes(AvailableEquipment.DUMBBELLS)
                ? "bg-primary"
                : "bg-white"
            }`}
            onPress={() =>
              handleMultiSelectToggle("equipment", AvailableEquipment.DUMBBELLS)
            }
          >
            <View className="w-8 h-8 bg-red-100 rounded-lg items-center justify-center mb-2">
              <Ionicons name="barbell-outline" size={16} color="#EF4444" />
            </View>
            <Text
              className={`font-medium text-sm text-center ${
                formData.equipment?.includes(AvailableEquipment.DUMBBELLS)
                  ? "text-secondary"
                  : "text-neutral-dark-1"
              }`}
            >
              Dumbbells
            </Text>
          </TouchableOpacity>

          {/* Kettlebells */}
          <TouchableOpacity
            className={`w-[48%] p-3 rounded-xl mb-3 items-center ${
              formData.equipment?.includes(AvailableEquipment.KETTLEBELLS)
                ? "bg-primary"
                : "bg-white"
            }`}
            onPress={() =>
              handleMultiSelectToggle(
                "equipment",
                AvailableEquipment.KETTLEBELLS
              )
            }
          >
            <View className="w-8 h-8 bg-yellow-100 rounded-lg items-center justify-center mb-2">
              <Ionicons name="fitness-outline" size={16} color="#F59E0B" />
            </View>
            <Text
              className={`font-medium text-sm text-center ${
                formData.equipment?.includes(AvailableEquipment.KETTLEBELLS)
                  ? "text-secondary"
                  : "text-neutral-dark-1"
              }`}
            >
              Kettlebells
            </Text>
          </TouchableOpacity>

          {/* Resistance Bands */}
          <TouchableOpacity
            className={`w-[48%] p-3 rounded-xl mb-3 items-center ${
              formData.equipment?.includes(AvailableEquipment.RESISTANCE_BANDS)
                ? "bg-primary"
                : "bg-white"
            }`}
            onPress={() =>
              handleMultiSelectToggle(
                "equipment",
                AvailableEquipment.RESISTANCE_BANDS
              )
            }
          >
            <View className="w-8 h-8 bg-green-100 rounded-lg items-center justify-center mb-2">
              <Ionicons name="remove-outline" size={16} color="#10B981" />
            </View>
            <Text
              className={`font-medium text-sm text-center ${
                formData.equipment?.includes(
                  AvailableEquipment.RESISTANCE_BANDS
                )
                  ? "text-secondary"
                  : "text-neutral-dark-1"
              }`}
            >
              Resistance Bands
            </Text>
          </TouchableOpacity>

          {/* Machines */}
          <TouchableOpacity
            className={`w-[48%] p-3 rounded-xl mb-3 items-center ${
              formData.equipment?.includes(AvailableEquipment.MACHINES)
                ? "bg-primary"
                : "bg-white"
            }`}
            onPress={() =>
              handleMultiSelectToggle("equipment", AvailableEquipment.MACHINES)
            }
          >
            <View className="w-8 h-8 bg-purple-100 rounded-lg items-center justify-center mb-2">
              <Ionicons
                name="hardware-chip-outline"
                size={16}
                color="#8B5CF6"
              />
            </View>
            <Text
              className={`font-medium text-sm text-center ${
                formData.equipment?.includes(AvailableEquipment.MACHINES)
                  ? "text-secondary"
                  : "text-neutral-dark-1"
              }`}
            >
              Weight Machines
            </Text>
          </TouchableOpacity>

          {/* Bodyweight */}
          <TouchableOpacity
            className={`w-[48%] p-3 rounded-xl mb-3 items-center ${
              formData.equipment?.includes(AvailableEquipment.BODYWEIGHT)
                ? "bg-primary"
                : "bg-white"
            }`}
            onPress={() =>
              handleMultiSelectToggle(
                "equipment",
                AvailableEquipment.BODYWEIGHT
              )
            }
          >
            <View className="w-8 h-8 bg-orange-100 rounded-lg items-center justify-center mb-2">
              <Ionicons name="body-outline" size={16} color="#F97316" />
            </View>
            <Text
              className={`font-medium text-sm text-center ${
                formData.equipment?.includes(AvailableEquipment.BODYWEIGHT)
                  ? "text-secondary"
                  : "text-neutral-dark-1"
              }`}
            >
              Bodyweight Only
            </Text>
          </TouchableOpacity>

          {/* Medicine Ball */}
          <TouchableOpacity
            className={`w-[48%] p-3 rounded-xl mb-3 items-center ${
              formData.equipment?.includes(AvailableEquipment.MEDICINE_BALL)
                ? "bg-primary"
                : "bg-white"
            }`}
            onPress={() =>
              handleMultiSelectToggle(
                "equipment",
                AvailableEquipment.MEDICINE_BALL
              )
            }
          >
            <View className="w-8 h-8 bg-indigo-100 rounded-lg items-center justify-center mb-2">
              <Ionicons name="basketball-outline" size={16} color="#6366F1" />
            </View>
            <Text
              className={`font-medium text-sm text-center ${
                formData.equipment?.includes(AvailableEquipment.MEDICINE_BALL)
                  ? "text-secondary"
                  : "text-neutral-dark-1"
              }`}
            >
              Medicine Ball
            </Text>
          </TouchableOpacity>

          {/* Foam Roller */}
          <TouchableOpacity
            className={`w-[48%] p-3 rounded-xl mb-3 items-center ${
              formData.equipment?.includes(AvailableEquipment.FOAM_ROLLER)
                ? "bg-primary"
                : "bg-white"
            }`}
            onPress={() =>
              handleMultiSelectToggle(
                "equipment",
                AvailableEquipment.FOAM_ROLLER
              )
            }
          >
            <View className="w-8 h-8 bg-pink-100 rounded-lg items-center justify-center mb-2">
              <Ionicons name="remove-outline" size={16} color="#EC4899" />
            </View>
            <Text
              className={`font-medium text-sm text-center ${
                formData.equipment?.includes(AvailableEquipment.FOAM_ROLLER)
                  ? "text-secondary"
                  : "text-neutral-dark-1"
              }`}
            >
              Foam Roller
            </Text>
          </TouchableOpacity>

          {/* Treadmill */}
          <TouchableOpacity
            className={`w-[48%] p-3 rounded-xl mb-3 items-center ${
              formData.equipment?.includes(AvailableEquipment.TREADMILL)
                ? "bg-primary"
                : "bg-white"
            }`}
            onPress={() =>
              handleMultiSelectToggle("equipment", AvailableEquipment.TREADMILL)
            }
          >
            <View className="w-8 h-8 bg-blue-100 rounded-lg items-center justify-center mb-2">
              <Ionicons name="walk-outline" size={16} color="#3B82F6" />
            </View>
            <Text
              className={`font-medium text-sm text-center ${
                formData.equipment?.includes(AvailableEquipment.TREADMILL)
                  ? "text-secondary"
                  : "text-neutral-dark-1"
              }`}
            >
              Treadmill
            </Text>
          </TouchableOpacity>

          {/* Exercise Bike */}
          <TouchableOpacity
            className={`w-[48%] p-3 rounded-xl mb-3 items-center ${
              formData.equipment?.includes(AvailableEquipment.BIKE)
                ? "bg-primary"
                : "bg-white"
            }`}
            onPress={() =>
              handleMultiSelectToggle("equipment", AvailableEquipment.BIKE)
            }
          >
            <View className="w-8 h-8 bg-cyan-100 rounded-lg items-center justify-center mb-2">
              <Ionicons name="bicycle-outline" size={16} color="#06B6D4" />
            </View>
            <Text
              className={`font-medium text-sm text-center ${
                formData.equipment?.includes(AvailableEquipment.BIKE)
                  ? "text-secondary"
                  : "text-neutral-dark-1"
              }`}
            >
              Exercise Bike
            </Text>
          </TouchableOpacity>

          {/* Yoga Mat */}
          <TouchableOpacity
            className={`w-[48%] p-3 rounded-xl mb-3 items-center ${
              formData.equipment?.includes(AvailableEquipment.YOGA_MAT)
                ? "bg-primary"
                : "bg-white"
            }`}
            onPress={() =>
              handleMultiSelectToggle("equipment", AvailableEquipment.YOGA_MAT)
            }
          >
            <View className="w-8 h-8 bg-teal-100 rounded-lg items-center justify-center mb-2">
              <MaterialCommunityIcons name="yoga" size={16} color="#14B8A6" />
            </View>
            <Text
              className={`font-medium text-sm text-center ${
                formData.equipment?.includes(AvailableEquipment.YOGA_MAT)
                  ? "text-secondary"
                  : "text-neutral-dark-1"
              }`}
            >
              Yoga Mat
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Render Workout Style step - matching image exactly
  const renderWorkoutStyleStep = () => (
    <View className="flex-1 px-6 pb-6">
      <Text className="text-xs text-neutral-medium-4 mb-6">
        Select your preferred workout styles. You can choose multiple.
      </Text>

      {/* HIIT - Red background as in image */}
      <TouchableOpacity
        className={`p-4 rounded-xl mb-3 flex-row items-center ${
          formData.preferredStyles.includes(PreferredStyles.HIIT)
            ? "bg-primary"
            : "bg-white"
        }`}
        onPress={() =>
          handleMultiSelectToggle("preferredStyles", PreferredStyles.HIIT)
        }
      >
        <View className="w-8 h-8 bg-red-100 rounded-xl items-center justify-center mr-4">
          <Ionicons name="flash-outline" size={16} color="#EF4444" />
        </View>
        <View className="flex-1">
          <Text
            className={`font-medium text-sm ${
              formData.preferredStyles.includes(PreferredStyles.HIIT)
                ? "text-secondary"
                : "text-neutral-dark-1"
            }`}
          >
            HIIT
          </Text>
          <Text
            className={`text-xs ${
              formData.preferredStyles.includes(PreferredStyles.HIIT)
                ? "text-secondary"
                : "text-neutral-medium-4"
            }`}
          >
            High intensity interval training
          </Text>
        </View>
        {formData.preferredStyles.includes(PreferredStyles.HIIT) && (
          <Ionicons name="checkmark-circle" size={16} color="#181917" />
        )}
      </TouchableOpacity>

      {/* Rehab/Recovery - Blue background as in image */}
      <TouchableOpacity
        className={`p-4 rounded-xl mb-3 flex-row items-center ${
          formData.preferredStyles.includes(PreferredStyles.REHAB)
            ? "bg-primary"
            : "bg-white"
        }`}
        onPress={() =>
          handleMultiSelectToggle("preferredStyles", PreferredStyles.REHAB)
        }
      >
        <View className="w-8 h-8 bg-blue-100 rounded-xl items-center justify-center mr-4">
          <Ionicons name="medical-outline" size={16} color="#3B82F6" />
        </View>
        <View className="flex-1">
          <Text
            className={`font-medium text-sm ${
              formData.preferredStyles.includes(PreferredStyles.REHAB)
                ? "text-secondary"
                : "text-neutral-dark-1"
            }`}
          >
            Rehab/Recovery
          </Text>
          <Text
            className={`text-xs ${
              formData.preferredStyles.includes(PreferredStyles.REHAB)
                ? "text-secondary"
                : "text-neutral-medium-4"
            }`}
          >
            Therapeutic exercises for recovery
          </Text>
        </View>
        {formData.preferredStyles.includes(PreferredStyles.REHAB) && (
          <Ionicons name="checkmark-circle" size={16} color="#181917" />
        )}
      </TouchableOpacity>

      {/* Strength Training - Purple background as in image */}
      <TouchableOpacity
        className={`p-4 rounded-xl mb-3 flex-row items-center ${
          formData.preferredStyles.includes(PreferredStyles.STRENGTH)
            ? "bg-primary"
            : "bg-white"
        }`}
        onPress={() =>
          handleMultiSelectToggle("preferredStyles", PreferredStyles.STRENGTH)
        }
      >
        <View className="w-8 h-8 bg-purple-100 rounded-xl items-center justify-center mr-4">
          <Ionicons name="barbell-outline" size={16} color="#8B5CF6" />
        </View>
        <View className="flex-1">
          <Text
            className={`font-medium text-sm ${
              formData.preferredStyles.includes(PreferredStyles.STRENGTH)
                ? "text-secondary"
                : "text-neutral-dark-1"
            }`}
          >
            Strength Training
          </Text>
          <Text
            className={`text-xs ${
              formData.preferredStyles.includes(PreferredStyles.STRENGTH)
                ? "text-secondary"
                : "text-neutral-medium-4"
            }`}
          >
            Focus on building muscle and strength
          </Text>
        </View>
        {formData.preferredStyles.includes(PreferredStyles.STRENGTH) && (
          <Ionicons name="checkmark-circle" size={16} color="#181917" />
        )}
      </TouchableOpacity>

      {/* Cardio - Green background as in image */}
      <TouchableOpacity
        className={`p-4 rounded-xl mb-3 flex-row items-center ${
          formData.preferredStyles.includes(PreferredStyles.CARDIO)
            ? "bg-primary"
            : "bg-white"
        }`}
        onPress={() =>
          handleMultiSelectToggle("preferredStyles", PreferredStyles.CARDIO)
        }
      >
        <View className="w-8 h-8 bg-green-100 rounded-xl items-center justify-center mr-4">
          <Ionicons name="heart-outline" size={16} color="#10B981" />
        </View>
        <View className="flex-1">
          <Text
            className={`font-medium text-sm ${
              formData.preferredStyles.includes(PreferredStyles.CARDIO)
                ? "text-secondary"
                : "text-neutral-dark-1"
            }`}
          >
            Cardio
          </Text>
          <Text
            className={`text-xs ${
              formData.preferredStyles.includes(PreferredStyles.CARDIO)
                ? "text-secondary"
                : "text-neutral-medium-4"
            }`}
          >
            Focus on cardiovascular health
          </Text>
        </View>
        {formData.preferredStyles.includes(PreferredStyles.CARDIO) && (
          <Ionicons name="checkmark-circle" size={16} color="#181917" />
        )}
      </TouchableOpacity>

      {/* CrossFit-Style - Orange background as in image */}
      <TouchableOpacity
        className={`p-4 rounded-xl mb-3 flex-row items-center ${
          formData.preferredStyles.includes(PreferredStyles.CROSSFIT)
            ? "bg-primary"
            : "bg-white"
        }`}
        onPress={() =>
          handleMultiSelectToggle("preferredStyles", PreferredStyles.CROSSFIT)
        }
      >
        <View className="w-8 h-8 bg-orange-100 rounded-xl items-center justify-center mr-4">
          <Ionicons name="fitness-outline" size={16} color="#F97316" />
        </View>
        <View className="flex-1">
          <Text
            className={`font-medium text-sm ${
              formData.preferredStyles.includes(PreferredStyles.CROSSFIT)
                ? "text-secondary"
                : "text-neutral-dark-1"
            }`}
          >
            CrossFit-Style
          </Text>
          <Text
            className={`text-xs ${
              formData.preferredStyles.includes(PreferredStyles.CROSSFIT)
                ? "text-secondary"
                : "text-neutral-medium-4"
            }`}
          >
            Mixed functional movements
          </Text>
        </View>
        {formData.preferredStyles.includes(PreferredStyles.CROSSFIT) && (
          <Ionicons name="checkmark-circle" size={16} color="#181917" />
        )}
      </TouchableOpacity>

      {/* Add other styles with neutral colors */}
      {Object.entries(PreferredStyles)
        .filter(
          ([key, value]) =>
            ![
              PreferredStyles.HIIT,
              PreferredStyles.REHAB,
              PreferredStyles.STRENGTH,
              PreferredStyles.CARDIO,
              PreferredStyles.CROSSFIT,
            ].includes(value)
        )
        .map(([key, value]) => {
          // Define specific colors and icons for each workout style
          const getStyleConfig = (styleKey: string) => {
            switch (styleKey) {
              case "FUNCTIONAL":
                return {
                  icon: "sync-outline",
                  color: "#10B981",
                  bgColor: "bg-green-100",
                  description: "Real-world movement patterns",
                };
              case "PILATES":
                return {
                  icon: "ellipse-outline",
                  color: "#EC4899",
                  bgColor: "bg-pink-100",
                  description: "Core strength and flexibility",
                };
              case "YOGA":
                return {
                  icon: "leaf-outline",
                  color: "#14B8A6",
                  bgColor: "bg-teal-100",
                  description: "Mind-body connection and flexibility",
                };
              case "BALANCE":
                return {
                  icon: "git-branch-outline",
                  color: "#F59E0B",
                  bgColor: "bg-yellow-100",
                  description: "Stability and coordination training",
                };
              case "MOBILITY":
                return {
                  icon: "resize-outline",
                  color: "#8B5CF6",
                  bgColor: "bg-purple-100",
                  description: "Joint mobility and movement quality",
                };
              default:
                return {
                  icon: "body-outline",
                  color: "#8A93A2",
                  bgColor: "bg-neutral-light-2",
                  description: "General workout style",
                };
            }
          };

          const config = getStyleConfig(key);

          return (
            <TouchableOpacity
              key={key}
              className={`p-4 rounded-xl mb-3 flex-row items-center ${
                formData.preferredStyles.includes(value)
                  ? "bg-primary"
                  : "bg-white"
              }`}
              onPress={() => handleMultiSelectToggle("preferredStyles", value)}
            >
              <View
                className={`w-8 h-8 ${config.bgColor} rounded-xl items-center justify-center mr-4`}
              >
                <Ionicons
                  name={config.icon as any}
                  size={16}
                  color={config.color}
                />
              </View>
              <View className="flex-1">
                <Text
                  className={`font-medium text-sm ${
                    formData.preferredStyles.includes(value)
                      ? "text-secondary"
                      : "text-neutral-dark-1"
                  }`}
                >
                  {formatEnumValue(key)}
                </Text>
                <Text
                  className={`text-xs ${
                    formData.preferredStyles.includes(value)
                      ? "text-secondary"
                      : "text-neutral-medium-4"
                  }`}
                >
                  {config.description}
                </Text>
              </View>
              {formData.preferredStyles.includes(value) && (
                <Ionicons name="checkmark-circle" size={16} color="#181917" />
              )}
            </TouchableOpacity>
          );
        })}
    </View>
  );

  // Render the current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case OnboardingStep.PERSONAL_INFO:
        return renderPersonalInfoStep();
      case OnboardingStep.FITNESS_GOALS:
        return renderFitnessGoalsStep();
      case OnboardingStep.PHYSICAL_LIMITATIONS:
        return renderPhysicalLimitationsStep();
      case OnboardingStep.FITNESS_LEVEL:
        return renderFitnessLevelStep();
      case OnboardingStep.WORKOUT_ENVIRONMENT:
        return renderWorkoutEnvironmentStep();
      case OnboardingStep.WORKOUT_STYLE:
        return renderWorkoutStyleStep();
      default:
        return (
          <View>
            <Text>Step not implemented yet</Text>
          </View>
        );
    }
  };

  // Render navigation buttons matching the design
  const renderNavButtons = () => {
    const isLastStep = currentStep === OnboardingStep.WORKOUT_STYLE;

    return (
      <View className="px-6 pb-8 pt-4 bg-neutral-light-1">
        <View className="flex-row">
          {currentStep > 0 && (
            <TouchableOpacity
              className="flex-1 py-4 items-center justify-center bg-white rounded-xl mr-3"
              onPress={handlePrevious}
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
            onPress={isLastStep ? handleSubmit : handleNext}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white font-bold text-lg">
                {isLastStep
                  ? submitButtonText || "Generate My Plan"
                  : "Continue"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const stepConfig = getStepConfig();

  return (
    <View className="flex-1 bg-neutral-light-1">
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        {/* Header with step indicator */}
        <View className="px-6 pt-12 pb-6 bg-neutral-light-1">
          <Text className="text-2xl font-bold text-neutral-dark-1 mb-2">
            {stepConfig.title}
          </Text>
          <Text
            className="text-sm text-neutral-medium-4"
            style={{ lineHeight: 20 }}
          >
            {stepConfig.description}
          </Text>
        </View>

        <View className="px-0 pt-6">{renderStepContent()}</View>
      </ScrollView>

      {renderNavButtons()}
    </View>
  );
}
