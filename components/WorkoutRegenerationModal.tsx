import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fetchUserProfile, updateUserProfile } from "@lib/profile";
import { getCurrentUser } from "@lib/auth";
import OnboardingForm, { FormData } from "./OnboardingForm";

// Enums from onboarding (should be moved to a shared types file)
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

interface WorkoutRegenerationModalProps {
  visible: boolean;
  onClose: () => void;
  onRegenerate: (
    data: {
      customFeedback?: string;
      profileData?: {
        age?: number;
        height?: number;
        weight?: number;
        gender?: string;
        goals?: string[];
        limitations?: string[];
        fitnessLevel?: string;
        environment?: string;
        equipment?: string[];
        preferredStyles?: string[];
        availableDays?: string[];
        workoutDuration?: number;
        intensityLevel?: number;
        medicalNotes?: string;
      };
    },
    selectedType?: "week" | "day"
  ) => void;
  loading?: boolean;
  regenerationType?: "day" | "week";
}

// Add StyleSheet for pure React Native styling
const styles = StyleSheet.create({
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontWeight: "500",
    fontSize: 14,
  },
  toggleTextActive: {
    color: "#181917",
  },
  toggleTextInactive: {
    color: "#8A93A2",
  },
});

export default function WorkoutRegenerationModal({
  visible,
  onClose,
  onRegenerate,
  loading = false,
  regenerationType = "week",
}: WorkoutRegenerationModalProps) {
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [customFeedback, setCustomFeedback] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [selectedType, setSelectedType] = useState<"week" | "day">(
    regenerationType
  );

  useEffect(() => {
    if (visible) {
      loadUserProfile();
      setCustomFeedback("");
      setShowOnboardingForm(false);
      setSelectedType(regenerationType);
    }
  }, [visible, regenerationType]);

  const loadUserProfile = async () => {
    try {
      setLoadingProfile(true);
      const profile = await fetchUserProfile();
      if (profile) {
        setCurrentProfile(profile);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      console.error("Failed to load your profile data");
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleUpdateProfile = async (formData: FormData) => {
    try {
      setUpdatingProfile(true);
      const user = await getCurrentUser();
      if (!user) {
        console.error("User not found");
        return;
      }

      // Convert form data to profile update format
      const profileData = {
        age: formData.age,
        height: formData.height,
        weight: formData.weight,
        gender: formData.gender.toString(),
        goals: formData.goals.map((g) => g.toString()),
        limitations: formData.limitations?.map((l) => l.toString()) || [],
        fitnessLevel: formData.fitnessLevel.toString(),
        environment: formData.environment.toString(),
        equipment: formData.equipment?.map((e) => e.toString()) || [],
        preferredStyles: formData.preferredStyles.map((s) => s.toString()),
        availableDays: formData.availableDays.map((d) => d.toString()),
        workoutDuration: formData.workoutDuration,
        intensityLevel: formData.intensityLevel.toString(),
        medicalNotes: formData.medicalNotes,
      };

      // Update the profile first
      await updateUserProfile(profileData as any);

      // Close the onboarding form and regenerate with the updated profile
      setShowOnboardingForm(false);
      onRegenerate(
        {
          customFeedback: customFeedback.trim() || undefined,
          profileData: profileData,
        },
        selectedType
      );
    } catch (error) {
      console.error("Error updating profile:", error);
      console.error("Failed to update your profile");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleSaveProfileOnly = async (formData: FormData) => {
    try {
      setUpdatingProfile(true);
      const user = await getCurrentUser();
      if (!user) {
        console.error("User not found");
        return;
      }

      // Convert form data to profile update format
      const profileData = {
        age: formData.age,
        height: formData.height,
        weight: formData.weight,
        gender: formData.gender.toString(),
        goals: formData.goals.map((g) => g.toString()),
        limitations: formData.limitations?.map((l) => l.toString()) || [],
        fitnessLevel: formData.fitnessLevel.toString(),
        environment: formData.environment.toString(),
        equipment: formData.equipment?.map((e) => e.toString()) || [],
        preferredStyles: formData.preferredStyles.map((s) => s.toString()),
        availableDays: formData.availableDays.map((d) => d.toString()),
        workoutDuration: formData.workoutDuration,
        intensityLevel: formData.intensityLevel.toString(),
        medicalNotes: formData.medicalNotes,
      };

      // Only update the profile, don't regenerate
      await updateUserProfile(profileData as any);

      // Update the current profile state and close the form
      setCurrentProfile({ ...currentProfile, ...profileData });
      setShowOnboardingForm(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      console.error("Failed to save your profile");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleQuickSave = async () => {
    const partialFormData = convertProfileToFormData(currentProfile);
    const completeFormData: FormData = {
      email: partialFormData.email || "",
      age: partialFormData.age || 25,
      height: partialFormData.height || 170,
      weight: partialFormData.weight || 70,
      gender: partialFormData.gender || Gender.MALE,
      goals: partialFormData.goals || [],
      limitations: partialFormData.limitations || [],
      fitnessLevel: partialFormData.fitnessLevel || FitnessLevels.BEGINNER,
      environment: partialFormData.environment || [WorkoutEnvironments.HOME],
      equipment: partialFormData.equipment || [],
      preferredStyles: partialFormData.preferredStyles || [],
      availableDays: partialFormData.availableDays || [],
      workoutDuration: partialFormData.workoutDuration || 30,
      intensityLevel:
        partialFormData.intensityLevel || IntensityLevels.MODERATE,
      medicalNotes: partialFormData.medicalNotes || "",
    };
    await handleSaveProfileOnly(completeFormData);
  };

  const handleQuickSaveAndRegenerate = async () => {
    const partialFormData = convertProfileToFormData(currentProfile);
    const completeFormData: FormData = {
      email: partialFormData.email || "",
      age: partialFormData.age || 25,
      height: partialFormData.height || 170,
      weight: partialFormData.weight || 70,
      gender: partialFormData.gender || Gender.MALE,
      goals: partialFormData.goals || [],
      limitations: partialFormData.limitations || [],
      fitnessLevel: partialFormData.fitnessLevel || FitnessLevels.BEGINNER,
      environment: partialFormData.environment || [WorkoutEnvironments.HOME],
      equipment: partialFormData.equipment || [],
      preferredStyles: partialFormData.preferredStyles || [],
      availableDays: partialFormData.availableDays || [],
      workoutDuration: partialFormData.workoutDuration || 30,
      intensityLevel:
        partialFormData.intensityLevel || IntensityLevels.MODERATE,
      medicalNotes: partialFormData.medicalNotes || "",
    };
    await handleUpdateProfile(completeFormData);
  };

  const handleRegenerateWithFeedback = () => {
    onRegenerate(
      { customFeedback: customFeedback.trim() || undefined },
      selectedType
    );
  };

  const convertProfileToFormData = (profile: any): Partial<FormData> => {
    // Handle intensity level conversion
    let intensityLevel = IntensityLevels.MODERATE;
    if (profile.intensityLevel) {
      if (typeof profile.intensityLevel === "number") {
        intensityLevel =
          profile.intensityLevel === 1
            ? IntensityLevels.LOW
            : profile.intensityLevel === 2
            ? IntensityLevels.MODERATE
            : IntensityLevels.HIGH;
      } else {
        intensityLevel = profile.intensityLevel as IntensityLevels;
      }
    }

    // Handle environment - convert from string to enum if needed
    let environment = [WorkoutEnvironments.HOME];
    if (profile.environment) {
      if (Array.isArray(profile.environment)) {
        environment = profile.environment.map(
          (e: string) => e as WorkoutEnvironments
        );
      } else {
        environment = [profile.environment as WorkoutEnvironments];
      }
    }

    return {
      email: profile.email || "",
      age: profile.age || 25,
      height: profile.height || 170,
      weight: profile.weight || 70,
      gender: (profile.gender as Gender) || Gender.MALE,
      goals: (profile.goals as FitnessGoals[]) || [],
      limitations: (profile.limitations as PhysicalLimitations[]) || [],
      fitnessLevel:
        (profile.fitnessLevel as FitnessLevels) || FitnessLevels.BEGINNER,
      environment: environment,
      equipment: (profile.equipment as AvailableEquipment[]) || [],
      preferredStyles: (profile.preferredStyles as PreferredStyles[]) || [],
      availableDays: (profile.availableDays as PreferredDays[]) || [],
      workoutDuration: profile.workoutDuration || 30,
      intensityLevel: intensityLevel,
      medicalNotes: profile.medicalNotes || "",
    };
  };

  if (loadingProfile) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 justify-center items-center bg-background">
          <ActivityIndicator size="large" color="#BBDE51" />
          <Text className="mt-4 text-base text-primary font-medium">
            Loading your preferences...
          </Text>
        </View>
      </Modal>
    );
  }

  if (showOnboardingForm && currentProfile) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-background">
          {/* Custom Header with Save/Cancel Options */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-light-2">
            <TouchableOpacity
              onPress={() => setShowOnboardingForm(false)}
              className="py-2 px-3"
              disabled={updatingProfile}
            >
              <Text className="text-base text-text-muted font-medium">
                Cancel
              </Text>
            </TouchableOpacity>
            <Text className="text-base font-semibold text-text-primary">
              Update Preferences
            </Text>
            <TouchableOpacity
              onPress={handleQuickSaveAndRegenerate}
              className="py-2 px-3"
              disabled={updatingProfile}
            >
              {updatingProfile ? (
                <ActivityIndicator size="small" color="#BBDE51" />
              ) : (
                <Text className="text-base text-primary font-medium">Save</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* OnboardingForm */}
          <View className="flex-1">
            <OnboardingForm
              title="Update Your Preferences"
              initialData={convertProfileToFormData(currentProfile)}
              onSubmit={handleUpdateProfile}
              onCancel={() => setShowOnboardingForm(false)}
              isLoading={updatingProfile}
              submitButtonText="Save"
              showNavigation={false}
            />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-light-2">
          <TouchableOpacity
            onPress={onClose}
            className="w-8 h-8 items-center justify-center"
          >
            <Ionicons name="close" size={20} color="#8A93A2" />
          </TouchableOpacity>
          <Text className="text-base font-semibold text-text-primary">
            Regenerate Workout Plan
          </Text>
          <View className="w-8" />
        </View>

        {/* Content */}
        <View className="flex-1 px-5 py-5">
          <Text className="text-base text-text-muted mb-6 text-center">
            Choose how you would like to generate your workout plan:
          </Text>

          {/* Week/Day Toggle - Pure React Native */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                selectedType === "week" && styles.toggleButtonActive,
              ]}
              onPress={() => setSelectedType("week")}
            >
              <Text
                style={[
                  styles.toggleText,
                  selectedType === "week"
                    ? styles.toggleTextActive
                    : styles.toggleTextInactive,
                ]}
              >
                Week
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                selectedType === "day" && styles.toggleButtonActive,
              ]}
              onPress={() => setSelectedType("day")}
            >
              <Text
                style={[
                  styles.toggleText,
                  selectedType === "day"
                    ? styles.toggleTextActive
                    : styles.toggleTextInactive,
                ]}
              >
                Day
              </Text>
            </TouchableOpacity>
          </View>

          {/* Feedback Input */}
          <View className="flex-1">
            <Text className="text-sm text-text-muted mb-4">
              Tell us why you want to regenerate this{" "}
              {selectedType === "day" ? "day's" : "week's"} workout plan, and
              what you would like to change:
            </Text>
            <TextInput
              style={{
                backgroundColor: "#FFFFFF", // background color (white)
                borderWidth: 1,
                borderColor: "#E8E8E8", // neutral-medium-1 (thin grey)
                borderRadius: 8,
                minHeight: 120,
                fontSize: 14,
                color: "#181917",
                paddingHorizontal: 16,
                paddingVertical: 24,
                textAlignVertical: "top",
              }}
              placeholder="Add notes about your workout here..."
              placeholderTextColor="#A8A8A8"
              value={customFeedback}
              onChangeText={setCustomFeedback}
              multiline
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={() => {
                Keyboard.dismiss();
              }}
              enablesReturnKeyAutomatically={true}
              scrollEnabled={true}
            />
            {selectedType === "day" && (
              <Text className="text-xs text-text-muted mt-3">
                Only this day's workout will be changed. All other days will
                remain the same.
              </Text>
            )}

            {/* Update Preferences Link */}
            {selectedType === "week" && (
              <TouchableOpacity
                className="mt-4 py-2"
                onPress={() => setShowOnboardingForm(true)}
                disabled={loading}
              >
                <Text className="text-sm text-primary font-medium text-center">
                  Need to update your fitness preferences? Tap here
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Action Button */}
        <View className="px-5 pb-5">
          <TouchableOpacity
            className={`bg-primary py-4 rounded-xl items-center flex-row justify-center ${
              loading ? "opacity-70" : ""
            }`}
            onPress={handleRegenerateWithFeedback}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#181917" />
            ) : (
              <>
                <Ionicons name="refresh" size={18} color="#181917" />
                <Text className="text-secondary font-semibold text-sm ml-2">
                  Regenerate Workout Flow
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
