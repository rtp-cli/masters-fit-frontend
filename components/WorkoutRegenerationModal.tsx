import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
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
  onRegenerate: (data: { customFeedback?: string }) => void;
  loading?: boolean;
}

export default function WorkoutRegenerationModal({
  visible,
  onClose,
  onRegenerate,
  loading = false,
}: WorkoutRegenerationModalProps) {
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [customFeedback, setCustomFeedback] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    if (visible) {
      loadUserProfile();
      setCustomFeedback("");
      setShowOnboardingForm(false);
    }
  }, [visible]);

  const loadUserProfile = async () => {
    try {
      setLoadingProfile(true);
      const profile = await fetchUserProfile();
      if (profile) {
        setCurrentProfile(profile);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      Alert.alert("Error", "Failed to load your profile data");
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleUpdateProfile = async (formData: FormData) => {
    try {
      setUpdatingProfile(true);
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert("Error", "User not found");
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
        environment: [formData.environment.toString()],
        equipment: formData.equipment?.map((e) => e.toString()) || [],
        workoutStyles: formData.preferredStyles.map((s) => s.toString()),
        availableDays: formData.availableDays.map((d) => d.toString()),
        workoutDuration: formData.workoutDuration,
        intensityLevel:
          formData.intensityLevel === "low"
            ? 1
            : formData.intensityLevel === "moderate"
            ? 2
            : 3,
        medicalNotes: formData.medicalNotes,
      };

      await updateUserProfile(profileData);

      // Close the onboarding form and regenerate with the updated profile
      setShowOnboardingForm(false);
      onRegenerate({ customFeedback: customFeedback.trim() || undefined });
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update your profile");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleRegenerateWithFeedback = () => {
    onRegenerate({ customFeedback: customFeedback.trim() || undefined });
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
    let environment = WorkoutEnvironments.HOME;
    if (profile.environment) {
      if (Array.isArray(profile.environment)) {
        environment = profile.environment[0] as WorkoutEnvironments;
      } else {
        environment = profile.environment as WorkoutEnvironments;
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Loading your preferences...</Text>
        </View>
      </Modal>
    );
  }

  if (showOnboardingForm && currentProfile) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.container}>
          <OnboardingForm
            title="Update Your Preferences"
            initialData={convertProfileToFormData(currentProfile)}
            onSubmit={handleUpdateProfile}
            onCancel={() => setShowOnboardingForm(false)}
            isLoading={updatingProfile}
            submitButtonText="Update & Regenerate"
            showNavigation={true}
          />
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text style={styles.title}>Regenerate Workout Plan</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionDescription}>
            Choose how you'd like to regenerate your workout plan:
          </Text>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setShowOnboardingForm(true)}
            disabled={loading}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="settings" size={24} color="#4f46e5" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Update Preferences</Text>
              <Text style={styles.optionDescription}>
                Modify your fitness goals, equipment, schedule, and other
                preferences
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.feedbackSection}>
            <Text style={styles.sectionTitle}>Custom Feedback</Text>
            <Text style={styles.sectionSubtitle}>
              Tell us what you'd like to change about your current workout plan
            </Text>
            <TextInput
              style={styles.textArea}
              value={customFeedback}
              onChangeText={setCustomFeedback}
              placeholder="e.g., I want more cardio exercises, less upper body focus, shorter rest times..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.regenerateButton, loading && styles.buttonDisabled]}
            onPress={handleRegenerateWithFeedback}
            disabled={loading || !customFeedback.trim()}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="refresh" size={20} color="#ffffff" />
                <Text style={styles.regenerateButtonText}>
                  Regenerate with Feedback
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#4f46e5",
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionDescription: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 24,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    marginBottom: 20,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f0f9ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: "#9ca3af",
    fontWeight: "500",
  },
  feedbackSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
    lineHeight: 20,
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#374151",
    backgroundColor: "#ffffff",
    minHeight: 120,
    textAlignVertical: "top",
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  regenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4f46e5",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  regenerateButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
