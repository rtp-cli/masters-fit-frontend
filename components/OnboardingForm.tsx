import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import CustomSlider from "./ui/Slider";
import ProgressIndicator from "./ProgressIndicator";
import { colors } from "../lib/theme";

// Enums from server
enum Gender {
  MALE = "male",
  FEMALE = "female",
}

enum FitnessGoals {
  GENERAL_FITNESS = "general_fitness",
  FAT_LOSS = "fat_loss",
  ENDURANCE = "endurance",
  MUSCLE_GAIN = "muscle_gain",
  STRENGTH = "strength",
  MOBILITY_FLEXIBILITY = "mobility_flexibility",
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
  HOME_GYM = "home_gym",
  COMMERCIAL_GYM = "commercial_gym",
  BODYWEIGHT_ONLY = "bodyweight_only",
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
  BARBELLS = "barbells",
  BENCH = "bench",
  INCLINE_DECLINE_BENCH = "incline_decline_bench",
  PULL_UP_BAR = "pull_up_bar",
  BIKE = "bike",
  MEDICINE_BALLS = "medicine_balls",
  PLYO_BOX = "plyo_box",
  RINGS = "rings",
  RESISTANCE_BANDS = "resistance_bands",
  STABILITY_BALL = "stability_ball",
  DUMBBELLS = "dumbbells",
  KETTLEBELLS = "kettlebells",
  SQUAT_RACK = "squat_rack",
  DIP_BAR = "dip_bar",
  ROWING_MACHINE = "rowing_machine",
  SLAM_BALLS = "slam_balls",
  CABLE_MACHINE = "cable_machine",
  JUMP_ROPE = "jump_rope",
  FOAM_ROLLER = "foam_roller",
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
  environment?: WorkoutEnvironments; // Made optional so we can start with no default
  equipment?: AvailableEquipment[];
  otherEquipment?: string;
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
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

// Helper function to convert centimeters to inches
const convertCmToInches = (cm: number): number => {
  return Math.round(cm / 2.54);
};

// Helper function to convert inches to centimeters
const convertInchesToCm = (inches: number): number => {
  return Math.round(inches * 2.54);
};

// Helper function to convert centimeters to feet and inches
const convertCmToFeetInches = (
  cm: number
): { feet: number; inches: number } => {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
};

// Helper function to format height display
const formatHeight = (cm: number): string => {
  const { feet, inches } = convertCmToFeetInches(cm);
  return `${feet}'${inches}"`;
};

// Helper function to format height from inches
const formatHeightFromInches = (totalInches: number): string => {
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}"`;
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
    age: 40,
    height: 170,
    weight: 150,
    gender: Gender.MALE,
    goals: [],
    limitations: [],
    fitnessLevel: FitnessLevels.BEGINNER,
    // environment: WorkoutEnvironments.HOME_GYM, // Removed default - user must select
    equipment: [],
    otherEquipment: "",
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
    const updates: Partial<FormData> = { [field]: value };

    // Auto-assign equipment based on environment selection
    if (field === "environment") {
      switch (value) {
        case WorkoutEnvironments.COMMERCIAL_GYM:
          // Auto-assign all equipment for commercial gym
          updates.equipment = [
            AvailableEquipment.BARBELLS,
            AvailableEquipment.BENCH,
            AvailableEquipment.INCLINE_DECLINE_BENCH,
            AvailableEquipment.PULL_UP_BAR,
            AvailableEquipment.BIKE,
            AvailableEquipment.MEDICINE_BALLS,
            AvailableEquipment.PLYO_BOX,
            AvailableEquipment.RINGS,
            AvailableEquipment.RESISTANCE_BANDS,
            AvailableEquipment.STABILITY_BALL,
            AvailableEquipment.DUMBBELLS,
            AvailableEquipment.KETTLEBELLS,
            AvailableEquipment.SQUAT_RACK,
            AvailableEquipment.DIP_BAR,
            AvailableEquipment.ROWING_MACHINE,
            AvailableEquipment.SLAM_BALLS,
            AvailableEquipment.CABLE_MACHINE,
            AvailableEquipment.JUMP_ROPE,
            AvailableEquipment.FOAM_ROLLER,
          ];
          break;
        case WorkoutEnvironments.BODYWEIGHT_ONLY:
          // Auto-assign no equipment for bodyweight only
          updates.equipment = [];
          break;
        case WorkoutEnvironments.HOME_GYM:
          // Clear equipment so user can select manually
          updates.equipment = [];
          break;
      }
    }

    setFormData((prev) => ({
      ...prev,
      ...updates,
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
            "Tell us a bit about yourself so we can create a personalized fitness plan just for you. At MastersFit, your privacy matters - we'll keep your information secure and never share or sell it to third-parties.",
        };
      case OnboardingStep.FITNESS_GOALS:
        return {
          title: "Fitness Goals",
          description:
            "What do you want to achieve? Select all goals that apply to you.",
        };
      case OnboardingStep.PHYSICAL_LIMITATIONS:
        return {
          title: "Own Your Journey",
          description:
            "Let us know about any physical limitations or health concerns so we can build a workout plan that empowers you, safely and effectively.",
          disclaimer:
            "Before starting any new fitness program, check with your doctor, especially if you have existing health conditions.",
        };
      case OnboardingStep.FITNESS_LEVEL:
        return {
          title: "Let's Get Moving!",
          description:
            "Tell us about your fitness level and when you're available to workout. Whether you're just starting out or leveling up, we'll build powerful workouts that fit your goals and schedule.",
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
        <Text className="text-lg font-semibold text-neutral-dark-1">Age</Text>
        <CustomSlider
          value={formData.age}
          minimumValue={18}
          maximumValue={80}
          step={1}
          onValueChange={(value) => handleChange("age", value)}
          unit=" yrs"
        />
        {errors.age && (
          <Text className="text-red-500 text-xs mt-2">{errors.age}</Text>
        )}
      </View>

      {/* Gender selection */}
      <View className="mb-8">
        <Text className="text-lg font-semibold text-neutral-dark-1 mb-4">
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
        </View>
      </View>

      {/* Height slider */}
      <View className="mb-8">
        <Text className="text-lg font-semibold text-neutral-dark-1">
          Height
        </Text>
        <CustomSlider
          value={convertCmToInches(formData.height)}
          minimumValue={48} // 4'0" in inches
          maximumValue={96} // 8'0" in inches
          step={1}
          onValueChange={(value) =>
            handleChange("height", convertInchesToCm(value))
          }
          formatValue={(value) => formatHeightFromInches(value)}
          formatMinMax={(value) => formatHeightFromInches(value)}
        />
        {errors.height && (
          <Text className="text-red-500 text-xs mt-2">{errors.height}</Text>
        )}
      </View>

      {/* Weight slider */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-neutral-dark-1">
          Weight
        </Text>
        <CustomSlider
          value={formData.weight}
          minimumValue={100}
          maximumValue={300}
          step={1}
          onValueChange={(value) => handleChange("weight", value)}
          unit=" lbs"
        />
        {errors.weight && (
          <Text className="text-red-500 text-xs mt-2">{errors.weight}</Text>
        )}
      </View>
    </View>
  );

  // Render Fitness Goals step - matching image colors exactly
  const renderFitnessGoalsStep = () => (
    <View className="flex-1 px-6 pb-6">
      {/* General Fitness - Green background */}
      <TouchableOpacity
        className={`p-4 rounded-xl mb-3 flex-row items-center ${
          formData.goals.includes(FitnessGoals.GENERAL_FITNESS)
            ? "bg-primary"
            : "bg-white"
        }`}
        onPress={() =>
          handleMultiSelectToggle("goals", FitnessGoals.GENERAL_FITNESS)
        }
      >
        <View className="w-8 h-8 bg-green-100 rounded-xl items-center justify-center mr-4">
          <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
        </View>
        <View className="flex-1">
          <Text
            className={`font-medium text-sm ${
              formData.goals.includes(FitnessGoals.GENERAL_FITNESS)
                ? "text-secondary"
                : "text-neutral-dark-1"
            }`}
          >
            General Fitness
          </Text>
          <Text
            className={`text-xs ${
              formData.goals.includes(FitnessGoals.GENERAL_FITNESS)
                ? "text-secondary"
                : "text-neutral-medium-4"
            }`}
          >
            Overall health and fitness improvement
          </Text>
        </View>
        {formData.goals.includes(FitnessGoals.GENERAL_FITNESS) && (
          <Ionicons name="checkmark-circle" size={16} color="#181917" />
        )}
      </TouchableOpacity>

      {/* Fat Loss - Red background */}
      <TouchableOpacity
        className={`p-4 rounded-xl mb-3 flex-row items-center ${
          formData.goals.includes(FitnessGoals.FAT_LOSS)
            ? "bg-primary"
            : "bg-white"
        }`}
        onPress={() => handleMultiSelectToggle("goals", FitnessGoals.FAT_LOSS)}
      >
        <View className="w-8 h-8 bg-red-100 rounded-xl items-center justify-center mr-4">
          <Ionicons name="fitness-outline" size={16} color="#EF4444" />
        </View>
        <View className="flex-1">
          <Text
            className={`font-medium text-sm ${
              formData.goals.includes(FitnessGoals.FAT_LOSS)
                ? "text-secondary"
                : "text-neutral-dark-1"
            }`}
          >
            Fat Loss
          </Text>
          <Text
            className={`text-xs ${
              formData.goals.includes(FitnessGoals.FAT_LOSS)
                ? "text-secondary"
                : "text-neutral-medium-4"
            }`}
          >
            Reduce body fat and improve composition
          </Text>
        </View>
        {formData.goals.includes(FitnessGoals.FAT_LOSS) && (
          <Ionicons name="checkmark-circle" size={16} color="#181917" />
        )}
      </TouchableOpacity>

      {/* Endurance - Orange background */}
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

      {/* Muscle Gain - Purple background */}
      <TouchableOpacity
        className={`p-4 rounded-xl mb-3 flex-row items-center ${
          formData.goals.includes(FitnessGoals.MUSCLE_GAIN)
            ? "bg-primary"
            : "bg-white"
        }`}
        onPress={() =>
          handleMultiSelectToggle("goals", FitnessGoals.MUSCLE_GAIN)
        }
      >
        <View className="w-8 h-8 bg-purple-100 rounded-xl items-center justify-center mr-4">
          <Ionicons name="fitness-outline" size={16} color="#8B5CF6" />
        </View>
        <View className="flex-1">
          <Text
            className={`font-medium text-sm ${
              formData.goals.includes(FitnessGoals.MUSCLE_GAIN)
                ? "text-secondary"
                : "text-neutral-dark-1"
            }`}
          >
            Muscle Gain
          </Text>
          <Text
            className={`text-xs ${
              formData.goals.includes(FitnessGoals.MUSCLE_GAIN)
                ? "text-secondary"
                : "text-neutral-medium-4"
            }`}
          >
            Build lean muscle mass and strength
          </Text>
        </View>
        {formData.goals.includes(FitnessGoals.MUSCLE_GAIN) && (
          <Ionicons name="checkmark-circle" size={16} color="#181917" />
        )}
      </TouchableOpacity>

      {/* Strength - Blue background */}
      <TouchableOpacity
        className={`p-4 rounded-xl mb-3 flex-row items-center ${
          formData.goals.includes(FitnessGoals.STRENGTH)
            ? "bg-primary"
            : "bg-white"
        }`}
        onPress={() => handleMultiSelectToggle("goals", FitnessGoals.STRENGTH)}
      >
        <View className="w-8 h-8 bg-blue-100 rounded-xl items-center justify-center mr-4">
          <Ionicons name="barbell-outline" size={16} color="#3B82F6" />
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

      {/* Mobility & Flexibility - Pink background */}
      <TouchableOpacity
        className={`p-4 rounded-xl mb-3 flex-row items-center ${
          formData.goals.includes(FitnessGoals.MOBILITY_FLEXIBILITY)
            ? "bg-primary"
            : "bg-white"
        }`}
        onPress={() =>
          handleMultiSelectToggle("goals", FitnessGoals.MOBILITY_FLEXIBILITY)
        }
      >
        <View className="w-8 h-8 bg-pink-100 rounded-xl items-center justify-center mr-4">
          <Ionicons name="body-outline" size={16} color="#EC4899" />
        </View>
        <View className="flex-1">
          <Text
            className={`font-medium text-sm ${
              formData.goals.includes(FitnessGoals.MOBILITY_FLEXIBILITY)
                ? "text-secondary"
                : "text-neutral-dark-1"
            }`}
          >
            Mobility & Flexibility
          </Text>
          <Text
            className={`text-xs ${
              formData.goals.includes(FitnessGoals.MOBILITY_FLEXIBILITY)
                ? "text-secondary"
                : "text-neutral-medium-4"
            }`}
          >
            Improve flexibility and joint health
          </Text>
        </View>
        {formData.goals.includes(FitnessGoals.MOBILITY_FLEXIBILITY) && (
          <Ionicons name="checkmark-circle" size={16} color="#181917" />
        )}
      </TouchableOpacity>

      {/* Balance - Yellow background */}
      <TouchableOpacity
        className={`p-4 rounded-xl mb-3 flex-row items-center ${
          formData.goals.includes(FitnessGoals.BALANCE)
            ? "bg-primary"
            : "bg-white"
        }`}
        onPress={() => handleMultiSelectToggle("goals", FitnessGoals.BALANCE)}
      >
        <View className="w-8 h-8 bg-yellow-100 rounded-xl items-center justify-center mr-4">
          <Ionicons name="git-branch-outline" size={16} color="#F59E0B" />
        </View>
        <View className="flex-1">
          <Text
            className={`font-medium text-sm ${
              formData.goals.includes(FitnessGoals.BALANCE)
                ? "text-secondary"
                : "text-neutral-dark-1"
            }`}
          >
            Balance
          </Text>
          <Text
            className={`text-xs ${
              formData.goals.includes(FitnessGoals.BALANCE)
                ? "text-secondary"
                : "text-neutral-medium-4"
            }`}
          >
            Improve stability and coordination
          </Text>
        </View>
        {formData.goals.includes(FitnessGoals.BALANCE) && (
          <Ionicons name="checkmark-circle" size={16} color="#181917" />
        )}
      </TouchableOpacity>

      {/* Recovery - Teal background */}
      <TouchableOpacity
        className={`p-4 rounded-xl mb-3 flex-row items-center ${
          formData.goals.includes(FitnessGoals.RECOVERY)
            ? "bg-primary"
            : "bg-white"
        }`}
        onPress={() => handleMultiSelectToggle("goals", FitnessGoals.RECOVERY)}
      >
        <View className="w-8 h-8 bg-teal-100 rounded-xl items-center justify-center mr-4">
          <Ionicons name="medical-outline" size={16} color="#14B8A6" />
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
            Any other health condition we should know about
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

      {/* Medical Notes */}
      <View className="mt-6">
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
          returnKeyType="done"
          blurOnSubmit={true}
          onSubmitEditing={() => {
            Keyboard.dismiss();
          }}
          onFocus={() => {
            // Scroll to the bottom to ensure the input is visible
            setTimeout(() => {
              scrollRef.current?.scrollToEnd({ animated: true });
            }, 300);
          }}
          enablesReturnKeyAutomatically={true}
          scrollEnabled={true}
        />
      </View>
    </View>
  );

  // Render Fitness Level step - matching image exactly
  const renderFitnessLevelStep = () => (
    <View className="flex-1 px-6 pb-6">
      {/* Fitness Level Selection */}
      <View className="mb-8">
        <Text className="text-lg font-semibold text-neutral-dark-1 mb-2">
          Current Fitness Level
        </Text>
        <Text className="text-sm text-neutral-medium-4 mb-6">
          Select your current fitness level to help us tailor your program.
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
        <Text className="text-lg font-semibold text-neutral-dark-1 mb-2">
          Available Days
        </Text>
        <Text className="text-sm text-neutral-medium-4 mb-4">
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
        <Text className="text-lg font-semibold text-neutral-dark-1">
          Workout Duration
        </Text>
        <CustomSlider
          value={Number(formData.workoutDuration)}
          minimumValue={10}
          maximumValue={60}
          step={5}
          onValueChange={(value) =>
            handleChange("workoutDuration", Math.round(value))
          }
          unit=" min"
        />
      </View>

      {/* Intensity Level */}
      <View className="mb-8">
        <Text className="text-lg font-semibold text-neutral-dark-1 mb-4">
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
    </View>
  );

  // Render Workout Environment step - matching image exactly
  const renderWorkoutEnvironmentStep = () => (
    <View className="flex-1 px-6 pb-6">
      <Text className="text-sm text-neutral-medium-4 mb-6">
        Choose the primary location in which you will train.
      </Text>

      {/* Environment selection */}
      <View className="mb-8">
        <Text className="text-sm font-semibold text-neutral-dark-1 mb-4">
          Workout Environment
        </Text>
        <View className="flex-row justify-between">
          <TouchableOpacity
            className={`flex-1 p-4 mx-1 rounded-xl items-center ${
              formData.environment === WorkoutEnvironments.HOME_GYM
                ? "bg-primary"
                : "bg-white"
            }`}
            onPress={() =>
              handleChange("environment", WorkoutEnvironments.HOME_GYM)
            }
          >
            <View className="w-8 h-8 bg-blue-100 rounded-xl items-center justify-center mb-3">
              <Ionicons name="home-outline" size={16} color="#3B82F6" />
            </View>
            <Text
              className={`font-medium text-sm ${
                formData.environment === WorkoutEnvironments.HOME_GYM
                  ? "text-secondary"
                  : "text-neutral-dark-1"
              }`}
            >
              Home Gym
            </Text>
            <Text
              className={`text-xs text-center mt-1 ${
                formData.environment === WorkoutEnvironments.HOME_GYM
                  ? "text-secondary"
                  : "text-neutral-medium-4"
              }`}
            >
              Home setup with equipment
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 p-4 mx-1 rounded-xl items-center ${
              formData.environment === WorkoutEnvironments.COMMERCIAL_GYM
                ? "bg-primary"
                : "bg-white"
            }`}
            onPress={() =>
              handleChange("environment", WorkoutEnvironments.COMMERCIAL_GYM)
            }
          >
            <View className="w-8 h-8 bg-purple-100 rounded-xl items-center justify-center mb-3">
              <Ionicons name="fitness-outline" size={16} color="#8B5CF6" />
            </View>
            <Text
              className={`font-medium text-sm ${
                formData.environment === WorkoutEnvironments.COMMERCIAL_GYM
                  ? "text-secondary"
                  : "text-neutral-dark-1"
              }`}
            >
              Commercial Gym
            </Text>
            <Text
              className={`text-xs text-center mt-1 ${
                formData.environment === WorkoutEnvironments.COMMERCIAL_GYM
                  ? "text-secondary"
                  : "text-neutral-medium-4"
              }`}
            >
              Full gym facility
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 p-4 mx-1 rounded-xl items-center ${
              formData.environment === WorkoutEnvironments.BODYWEIGHT_ONLY
                ? "bg-primary"
                : "bg-white"
            }`}
            onPress={() =>
              handleChange("environment", WorkoutEnvironments.BODYWEIGHT_ONLY)
            }
          >
            <View className="w-8 h-8 bg-green-100 rounded-xl items-center justify-center mb-3">
              <Ionicons name="body-outline" size={16} color="#10B981" />
            </View>
            <Text
              className={`font-medium text-sm ${
                formData.environment === WorkoutEnvironments.BODYWEIGHT_ONLY
                  ? "text-secondary"
                  : "text-neutral-dark-1"
              }`}
            >
              Bodyweight Only
            </Text>
            <Text
              className={`text-xs text-center mt-1 ${
                formData.environment === WorkoutEnvironments.BODYWEIGHT_ONLY
                  ? "text-secondary"
                  : "text-neutral-medium-4"
              }`}
            >
              No equipment needed
            </Text>
          </TouchableOpacity>
        </View>
        {errors.environment && (
          <Text className="text-red-500 text-xs mt-2">
            {errors.environment}
          </Text>
        )}
      </View>

      {/* Available Equipment section - Only show for Home Gym */}
      {formData.environment === WorkoutEnvironments.HOME_GYM && (
        <View className="mb-6">
          <Text className="text-lg font-semibold text-neutral-dark-1 mb-2">
            Customize Equipment
          </Text>
          <Text className="text-sm text-neutral-medium-4 mb-6">
            Select the equipment you have available in your home gym
          </Text>

          {/* Equipment options - All 19 equipment types in 3-column grid */}
          <View className="flex-row flex-wrap justify-between">
            {/* Barbells */}
            <TouchableOpacity
              className={`w-[30%] p-2 rounded-xl mb-3 items-center ${
                formData.equipment?.includes(AvailableEquipment.BARBELLS)
                  ? "bg-primary"
                  : "bg-white"
              }`}
              onPress={() =>
                handleMultiSelectToggle(
                  "equipment",
                  AvailableEquipment.BARBELLS
                )
              }
            >
              <View className="w-8 h-8 bg-red-100 rounded-lg items-center justify-center mb-2">
                <Ionicons name="barbell-outline" size={16} color="#EF4444" />
              </View>
              <Text
                className={`font-medium text-xs text-center ${
                  formData.equipment?.includes(AvailableEquipment.BARBELLS)
                    ? "text-secondary"
                    : "text-neutral-dark-1"
                }`}
              >
                Barbells
              </Text>
            </TouchableOpacity>

            {/* Bench */}
            <TouchableOpacity
              className={`w-[30%] p-2 rounded-xl mb-3 items-center ${
                formData.equipment?.includes(AvailableEquipment.BENCH)
                  ? "bg-primary"
                  : "bg-white"
              }`}
              onPress={() =>
                handleMultiSelectToggle("equipment", AvailableEquipment.BENCH)
              }
            >
              <View className="w-8 h-8 bg-blue-100 rounded-lg items-center justify-center mb-2">
                <Ionicons name="bed-outline" size={16} color="#3B82F6" />
              </View>
              <Text
                className={`font-medium text-xs text-center ${
                  formData.equipment?.includes(AvailableEquipment.BENCH)
                    ? "text-secondary"
                    : "text-neutral-dark-1"
                }`}
              >
                Bench
              </Text>
            </TouchableOpacity>

            {/* Incline/Decline Bench */}
            <TouchableOpacity
              className={`w-[30%] p-2 rounded-xl mb-3 items-center ${
                formData.equipment?.includes(
                  AvailableEquipment.INCLINE_DECLINE_BENCH
                )
                  ? "bg-primary"
                  : "bg-white"
              }`}
              onPress={() =>
                handleMultiSelectToggle(
                  "equipment",
                  AvailableEquipment.INCLINE_DECLINE_BENCH
                )
              }
            >
              <View className="w-8 h-8 bg-indigo-100 rounded-lg items-center justify-center mb-2">
                <Ionicons
                  name="trending-up-outline"
                  size={16}
                  color="#6366F1"
                />
              </View>
              <Text
                className={`font-medium text-xs text-center ${
                  formData.equipment?.includes(
                    AvailableEquipment.INCLINE_DECLINE_BENCH
                  )
                    ? "text-secondary"
                    : "text-neutral-dark-1"
                }`}
              >
                Incline Bench
              </Text>
            </TouchableOpacity>

            {/* Pull Up Bar */}
            <TouchableOpacity
              className={`w-[30%] p-2 rounded-xl mb-3 items-center ${
                formData.equipment?.includes(AvailableEquipment.PULL_UP_BAR)
                  ? "bg-primary"
                  : "bg-white"
              }`}
              onPress={() =>
                handleMultiSelectToggle(
                  "equipment",
                  AvailableEquipment.PULL_UP_BAR
                )
              }
            >
              <View className="w-8 h-8 bg-green-100 rounded-lg items-center justify-center mb-2">
                <Ionicons name="remove-outline" size={16} color="#10B981" />
              </View>
              <Text
                className={`font-medium text-xs text-center ${
                  formData.equipment?.includes(AvailableEquipment.PULL_UP_BAR)
                    ? "text-secondary"
                    : "text-neutral-dark-1"
                }`}
              >
                Pull Up Bar
              </Text>
            </TouchableOpacity>

            {/* Exercise Bike */}
            <TouchableOpacity
              className={`w-[30%] p-2 rounded-xl mb-3 items-center ${
                formData.equipment?.includes(AvailableEquipment.BIKE)
                  ? "bg-primary"
                  : "bg-white"
              }`}
              onPress={() =>
                handleMultiSelectToggle("equipment", AvailableEquipment.BIKE)
              }
            >
              <View className="w-8 h-8 bg-purple-100 rounded-lg items-center justify-center mb-2">
                <Ionicons name="bicycle-outline" size={16} color="#8B5CF6" />
              </View>
              <Text
                className={`font-medium text-xs text-center ${
                  formData.equipment?.includes(AvailableEquipment.BIKE)
                    ? "text-secondary"
                    : "text-neutral-dark-1"
                }`}
              >
                Exercise Bike
              </Text>
            </TouchableOpacity>

            {/* Medicine Balls */}
            <TouchableOpacity
              className={`w-[30%] p-2 rounded-xl mb-3 items-center ${
                formData.equipment?.includes(AvailableEquipment.MEDICINE_BALLS)
                  ? "bg-primary"
                  : "bg-white"
              }`}
              onPress={() =>
                handleMultiSelectToggle(
                  "equipment",
                  AvailableEquipment.MEDICINE_BALLS
                )
              }
            >
              <View className="w-8 h-8 bg-orange-100 rounded-lg items-center justify-center mb-2">
                <Ionicons name="basketball-outline" size={16} color="#F97316" />
              </View>
              <Text
                className={`font-medium text-xs text-center ${
                  formData.equipment?.includes(
                    AvailableEquipment.MEDICINE_BALLS
                  )
                    ? "text-secondary"
                    : "text-neutral-dark-1"
                }`}
              >
                Medicine Balls
              </Text>
            </TouchableOpacity>

            {/* Plyo Box */}
            <TouchableOpacity
              className={`w-[30%] p-2 rounded-xl mb-3 items-center ${
                formData.equipment?.includes(AvailableEquipment.PLYO_BOX)
                  ? "bg-primary"
                  : "bg-white"
              }`}
              onPress={() =>
                handleMultiSelectToggle(
                  "equipment",
                  AvailableEquipment.PLYO_BOX
                )
              }
            >
              <View className="w-8 h-8 bg-teal-100 rounded-lg items-center justify-center mb-2">
                <Ionicons name="cube-outline" size={16} color="#14B8A6" />
              </View>
              <Text
                className={`font-medium text-xs text-center ${
                  formData.equipment?.includes(AvailableEquipment.PLYO_BOX)
                    ? "text-secondary"
                    : "text-neutral-dark-1"
                }`}
              >
                Plyo Box
              </Text>
            </TouchableOpacity>

            {/* Rings */}
            <TouchableOpacity
              className={`w-[30%] p-2 rounded-xl mb-3 items-center ${
                formData.equipment?.includes(AvailableEquipment.RINGS)
                  ? "bg-primary"
                  : "bg-white"
              }`}
              onPress={() =>
                handleMultiSelectToggle("equipment", AvailableEquipment.RINGS)
              }
            >
              <View className="w-8 h-8 bg-pink-100 rounded-lg items-center justify-center mb-2">
                <Ionicons
                  name="radio-button-off-outline"
                  size={16}
                  color="#EC4899"
                />
              </View>
              <Text
                className={`font-medium text-xs text-center ${
                  formData.equipment?.includes(AvailableEquipment.RINGS)
                    ? "text-secondary"
                    : "text-neutral-dark-1"
                }`}
              >
                Rings
              </Text>
            </TouchableOpacity>

            {/* Resistance Bands */}
            <TouchableOpacity
              className={`w-[30%] p-2 rounded-xl mb-3 items-center ${
                formData.equipment?.includes(
                  AvailableEquipment.RESISTANCE_BANDS
                )
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
              <View className="w-8 h-8 bg-yellow-100 rounded-lg items-center justify-center mb-2">
                <Ionicons name="remove-outline" size={16} color="#F59E0B" />
              </View>
              <Text
                className={`font-medium text-xs text-center ${
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

            {/* Stability Ball */}
            <TouchableOpacity
              className={`w-[30%] p-2 rounded-xl mb-3 items-center ${
                formData.equipment?.includes(AvailableEquipment.STABILITY_BALL)
                  ? "bg-primary"
                  : "bg-white"
              }`}
              onPress={() =>
                handleMultiSelectToggle(
                  "equipment",
                  AvailableEquipment.STABILITY_BALL
                )
              }
            >
              <View className="w-8 h-8 bg-cyan-100 rounded-lg items-center justify-center mb-2">
                <Ionicons name="ellipse-outline" size={16} color="#06B6D4" />
              </View>
              <Text
                className={`font-medium text-xs text-center ${
                  formData.equipment?.includes(
                    AvailableEquipment.STABILITY_BALL
                  )
                    ? "text-secondary"
                    : "text-neutral-dark-1"
                }`}
              >
                Stability Ball
              </Text>
            </TouchableOpacity>

            {/* Dumbbells */}
            <TouchableOpacity
              className={`w-[30%] p-2 rounded-xl mb-3 items-center ${
                formData.equipment?.includes(AvailableEquipment.DUMBBELLS)
                  ? "bg-primary"
                  : "bg-white"
              }`}
              onPress={() =>
                handleMultiSelectToggle(
                  "equipment",
                  AvailableEquipment.DUMBBELLS
                )
              }
            >
              <View className="w-8 h-8 bg-red-100 rounded-lg items-center justify-center mb-2">
                <Ionicons name="fitness-outline" size={16} color="#EF4444" />
              </View>
              <Text
                className={`font-medium text-xs text-center ${
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
              className={`w-[30%] p-2 rounded-xl mb-3 items-center ${
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
              <View className="w-8 h-8 bg-amber-100 rounded-lg items-center justify-center mb-2">
                <Ionicons name="fitness-outline" size={16} color="#F59E0B" />
              </View>
              <Text
                className={`font-medium text-xs text-center ${
                  formData.equipment?.includes(AvailableEquipment.KETTLEBELLS)
                    ? "text-secondary"
                    : "text-neutral-dark-1"
                }`}
              >
                Kettlebells
              </Text>
            </TouchableOpacity>

            {/* Squat Rack */}
            <TouchableOpacity
              className={`w-[30%] p-2 rounded-xl mb-3 items-center ${
                formData.equipment?.includes(AvailableEquipment.SQUAT_RACK)
                  ? "bg-primary"
                  : "bg-white"
              }`}
              onPress={() =>
                handleMultiSelectToggle(
                  "equipment",
                  AvailableEquipment.SQUAT_RACK
                )
              }
            >
              <View className="w-8 h-8 bg-slate-100 rounded-lg items-center justify-center mb-2">
                <Ionicons name="grid-outline" size={16} color="#64748B" />
              </View>
              <Text
                className={`font-medium text-xs text-center ${
                  formData.equipment?.includes(AvailableEquipment.SQUAT_RACK)
                    ? "text-secondary"
                    : "text-neutral-dark-1"
                }`}
              >
                Squat Rack
              </Text>
            </TouchableOpacity>

            {/* Dip Bar */}
            <TouchableOpacity
              className={`w-[30%] p-2 rounded-xl mb-3 items-center ${
                formData.equipment?.includes(AvailableEquipment.DIP_BAR)
                  ? "bg-primary"
                  : "bg-white"
              }`}
              onPress={() =>
                handleMultiSelectToggle("equipment", AvailableEquipment.DIP_BAR)
              }
            >
              <View className="w-8 h-8 bg-emerald-100 rounded-lg items-center justify-center mb-2">
                <Ionicons
                  name="git-compare-outline"
                  size={16}
                  color="#10B981"
                />
              </View>
              <Text
                className={`font-medium text-xs text-center ${
                  formData.equipment?.includes(AvailableEquipment.DIP_BAR)
                    ? "text-secondary"
                    : "text-neutral-dark-1"
                }`}
              >
                Dip Bar
              </Text>
            </TouchableOpacity>

            {/* Rowing Machine */}
            <TouchableOpacity
              className={`w-[30%] p-2 rounded-xl mb-3 items-center ${
                formData.equipment?.includes(AvailableEquipment.ROWING_MACHINE)
                  ? "bg-primary"
                  : "bg-white"
              }`}
              onPress={() =>
                handleMultiSelectToggle(
                  "equipment",
                  AvailableEquipment.ROWING_MACHINE
                )
              }
            >
              <View className="w-8 h-8 bg-sky-100 rounded-lg items-center justify-center mb-2">
                <Ionicons name="boat-outline" size={16} color="#0EA5E9" />
              </View>
              <Text
                className={`font-medium text-xs text-center ${
                  formData.equipment?.includes(
                    AvailableEquipment.ROWING_MACHINE
                  )
                    ? "text-secondary"
                    : "text-neutral-dark-1"
                }`}
              >
                Rowing Machine
              </Text>
            </TouchableOpacity>

            {/* Slam Balls */}
            <TouchableOpacity
              className={`w-[30%] p-2 rounded-xl mb-3 items-center ${
                formData.equipment?.includes(AvailableEquipment.SLAM_BALLS)
                  ? "bg-primary"
                  : "bg-white"
              }`}
              onPress={() =>
                handleMultiSelectToggle(
                  "equipment",
                  AvailableEquipment.SLAM_BALLS
                )
              }
            >
              <View className="w-8 h-8 bg-stone-100 rounded-lg items-center justify-center mb-2">
                <Ionicons
                  name="american-football-outline"
                  size={16}
                  color="#78716C"
                />
              </View>
              <Text
                className={`font-medium text-xs text-center ${
                  formData.equipment?.includes(AvailableEquipment.SLAM_BALLS)
                    ? "text-secondary"
                    : "text-neutral-dark-1"
                }`}
              >
                Slam Balls
              </Text>
            </TouchableOpacity>

            {/* Cable Machine */}
            <TouchableOpacity
              className={`w-[30%] p-2 rounded-xl mb-3 items-center ${
                formData.equipment?.includes(AvailableEquipment.CABLE_MACHINE)
                  ? "bg-primary"
                  : "bg-white"
              }`}
              onPress={() =>
                handleMultiSelectToggle(
                  "equipment",
                  AvailableEquipment.CABLE_MACHINE
                )
              }
            >
              <View className="w-8 h-8 bg-violet-100 rounded-lg items-center justify-center mb-2">
                <Ionicons
                  name="hardware-chip-outline"
                  size={16}
                  color="#8B5CF6"
                />
              </View>
              <Text
                className={`font-medium text-xs text-center ${
                  formData.equipment?.includes(AvailableEquipment.CABLE_MACHINE)
                    ? "text-secondary"
                    : "text-neutral-dark-1"
                }`}
              >
                Cable Machine
              </Text>
            </TouchableOpacity>

            {/* Jump Rope */}
            <TouchableOpacity
              className={`w-[30%] p-2 rounded-xl mb-3 items-center ${
                formData.equipment?.includes(AvailableEquipment.JUMP_ROPE)
                  ? "bg-primary"
                  : "bg-white"
              }`}
              onPress={() =>
                handleMultiSelectToggle(
                  "equipment",
                  AvailableEquipment.JUMP_ROPE
                )
              }
            >
              <View className="w-8 h-8 bg-lime-100 rounded-lg items-center justify-center mb-2">
                <Ionicons name="ellipse-outline" size={16} color="#84CC16" />
              </View>
              <Text
                className={`font-medium text-xs text-center ${
                  formData.equipment?.includes(AvailableEquipment.JUMP_ROPE)
                    ? "text-secondary"
                    : "text-neutral-dark-1"
                }`}
              >
                Jump Rope
              </Text>
            </TouchableOpacity>

            {/* Foam Roller */}
            <TouchableOpacity
              className={`w-[30%] p-2 rounded-xl mb-3 items-center ${
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
              <View className="w-8 h-8 bg-rose-100 rounded-lg items-center justify-center mb-2">
                <Ionicons name="remove-outline" size={16} color="#F43F5E" />
              </View>
              <Text
                className={`font-medium text-xs text-center ${
                  formData.equipment?.includes(AvailableEquipment.FOAM_ROLLER)
                    ? "text-secondary"
                    : "text-neutral-dark-1"
                }`}
              >
                Foam Roller
              </Text>
            </TouchableOpacity>
          </View>

          {/* Other Equipment Text Input */}
          <View className="mt-4">
            <Text className="text-sm font-semibold text-neutral-dark-1 mb-2">
              Other Equipment
            </Text>
            <Text className="text-xs text-neutral-medium-4 mb-3">
              Specify any additional equipment you have (optional)
            </Text>
            <TextInput
              className="w-full p-3 bg-white rounded-xl border border-neutral-light-3 text-neutral-dark-1"
              placeholder="e.g., TRX straps, balance board, resistance tubes..."
              value={formData.otherEquipment || ""}
              onChangeText={(text) => handleChange("otherEquipment", text)}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={() => {
                Keyboard.dismiss();
              }}
              onFocus={() => {
                // Scroll to the bottom to ensure the input is visible
                setTimeout(() => {
                  scrollRef.current?.scrollToEnd({ animated: true });
                }, 300);
              }}
              enablesReturnKeyAutomatically={true}
              scrollEnabled={true}
            />
          </View>
        </View>
      )}
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
      <View className="px-6 pb-8 pt-4">
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
              <ActivityIndicator size="small" color={colors.neutral.white} />
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
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with step indicator */}
        <View className="px-6 pt-12 pb-6 ">
          {/* Progress Indicator */}
          <ProgressIndicator
            currentStep={currentStep}
            totalSteps={6}
            className="mb-6"
          />

          <Text className="text-2xl font-bold text-neutral-dark-1 mb-2">
            {stepConfig.title}
          </Text>
          <Text
            className="text-sm text-neutral-medium-4 mb-2"
            style={{ lineHeight: 20 }}
          >
            {stepConfig.description}
          </Text>
          <Text className="text-sm italic text-neutral-medium-4">
            {stepConfig.disclaimer}
          </Text>
        </View>

        <View className="px-0">{renderStepContent()}</View>
      </ScrollView>

      {renderNavButtons()}
    </KeyboardAvoidingView>
  );
}
