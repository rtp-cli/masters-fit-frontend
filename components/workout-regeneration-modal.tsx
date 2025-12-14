import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  ActivityIndicator,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProfileOverrideForm, {
  TemporaryOverrides,
} from "./profile-override-form";
import { fetchUserProfile, updateUserProfile } from "@lib/profile";
import { getCurrentUser } from "@lib/auth";
import OnboardingForm, { FormData } from "./onboarding-form";
import { formatEnumValue } from "./onboarding/utils/formatters";
import { colors } from "../lib/theme";
import { useAppDataContext } from "@/contexts/app-data-context";
import { useAuth } from "@/contexts/auth-context";
import { useBackgroundJobs } from "@/contexts/background-job-context";
import { formatWorkoutPlanStartDate, formatWorkoutPlanEndDate } from "@/utils";
import {
  regenerateWorkoutPlanAsync,
  regenerateDailyWorkoutAsync,
  generateRestDayWorkoutAsync,
} from "@lib/workouts";
import { Profile as UserProfile } from "@/types/api";

import {
  GENDER,
  FITNESS_GOALS,
  FITNESS_LEVELS,
  IntensityLevels,
  WORKOUT_ENVIRONMENTS,
  PreferredDays,
  PHYSICAL_LIMITATIONS,
  AVAILABLE_EQUIPMENT,
  PREFERRED_STYLES,
} from "@/types/enums";
import { RegenerationType } from "@/constants/global.enum";

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
        otherEquipment?: string;
        preferredStyles?: string[];
        availableDays?: string[];
        workoutDuration?: number;
        intensityLevel?: string;
        medicalNotes?: string;
      };
    },
    selectedType?: "week" | "day"
  ) => void;
  loading?: boolean;
  regenerationType?: "day" | "week";
  onSuccess?: () => void; // New prop for refresh callback
  onError?: (error: string) => void; // Add error callback
  selectedPlanDay?: { id: number } | null; // Add selectedPlanDay for daily regeneration
  isRestDay?: boolean; // Add isRestDay prop to indicate rest day modal
  noActiveWorkoutDay?: boolean; // Add noActiveWorkoutDay prop for days outside workout plan
  selectedDate?: string; // The date for rest day workout generation
}

export default function WorkoutRegenerationModal({
  visible,
  onClose,
  onRegenerate,
  loading = false,
  regenerationType = "day",
  onSuccess,
  onError,
  selectedPlanDay,
  isRestDay = false,
  noActiveWorkoutDay = false,
  selectedDate,
}: WorkoutRegenerationModalProps) {
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(
    null
  );
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [customFeedback, setCustomFeedback] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [selectedType, setSelectedType] = useState<"week" | "day">(
    regenerationType
  );

  // State for daily workout temporary overrides
  const [showDailyOverrideForm, setShowDailyOverrideForm] = useState(false);
  const [tempOverridesBackup, setTempOverridesBackup] =
    useState<TemporaryOverrides | null>(null);
  const [temporaryOverrides, setTemporaryOverrides] =
    useState<TemporaryOverrides>({
      duration: 30,
      intensity: IntensityLevels.MODERATE,
      styles: [],
      environment: WORKOUT_ENVIRONMENTS.HOME_GYM,
      equipment: [],
      otherEquipment: "",
      includeWarmup: true,
      includeCooldown: true,
    });

  // Get refresh functions for data refresh after regeneration
  const {
    refresh: { refreshAll },
  } = useAppDataContext();
  const { setIsGeneratingWorkout } = useAuth();

  // Background job tracking
  const { addJob } = useBackgroundJobs();

  useEffect(() => {
    if (visible) {
      loadUserProfile();
      setCustomFeedback("");
      setShowOnboardingForm(false);
      setShowDailyOverrideForm(false);
      setTempOverridesBackup(null);
      // For rest days and no active workout days, always default to "week" tab
      setSelectedType(
        isRestDay ? "day" : noActiveWorkoutDay ? "week" : regenerationType
      );
    }
  }, [visible, regenerationType, isRestDay, noActiveWorkoutDay]);

  // Initialize temporary overrides when profile loads
  useEffect(() => {
    if (currentProfile && visible) {
      // Convert profile data to temporary overrides with defaults
      let profileIntensity = IntensityLevels.MODERATE;
      if (currentProfile.intensityLevel) {
        if (typeof currentProfile.intensityLevel === "number") {
          profileIntensity =
            currentProfile.intensityLevel === 1
              ? IntensityLevels.LOW
              : currentProfile.intensityLevel === 2
                ? IntensityLevels.MODERATE
                : IntensityLevels.HIGH;
        } else {
          profileIntensity = currentProfile.intensityLevel as IntensityLevels;
        }
      }

      let profileEnvironment = WORKOUT_ENVIRONMENTS.HOME_GYM;
      if (currentProfile.environment) {
        if (Array.isArray(currentProfile.environment)) {
          profileEnvironment = currentProfile
            .environment[0] as WORKOUT_ENVIRONMENTS;
        } else {
          profileEnvironment =
            currentProfile.environment as WORKOUT_ENVIRONMENTS;
        }
      }

      setTemporaryOverrides({
        duration: currentProfile.workoutDuration || 30,
        intensity: profileIntensity,
        styles: (currentProfile.preferredStyles as PREFERRED_STYLES[]) || [],
        environment: profileEnvironment,
        equipment: (currentProfile.equipment as AVAILABLE_EQUIPMENT[]) || [],
        otherEquipment: currentProfile.otherEquipment || "",
        includeWarmup: currentProfile.includeWarmup ?? true,
        includeCooldown: currentProfile.includeCooldown ?? true,
      });
    }
  }, [currentProfile, visible]);

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
        environment: [formData.environment!.toString()],
        equipment: formData.equipment?.map((e) => e.toString()) || [],
        otherEquipment: formData.otherEquipment || "",
        preferredStyles: formData.preferredStyles.map((s) => s.toString()),
        availableDays: formData.availableDays.map((d) => d.toString()),
        workoutDuration: formData.workoutDuration,
        intensityLevel:
          formData.intensityLevel === IntensityLevels.LOW
            ? 1
            : formData.intensityLevel === IntensityLevels.MODERATE
              ? 2
              : 3,
        medicalNotes: formData.medicalNotes,
        includeWarmup: formData.includeWarmup ?? true,
        includeCooldown: formData.includeCooldown ?? true,
      };

      // Update the profile first
      await updateUserProfile(profileData as any);

      // Get fresh user after profile update in case auth changed
      const freshUser = await getCurrentUser();
      if (!freshUser) {
        console.error("User session lost after profile update");
        setUpdatingProfile(false);
        return;
      }

      // Close the onboarding form
      setShowOnboardingForm(false);

      // Close the modal and show generating screen
      onClose();
      setIsGeneratingWorkout(
        true,
        selectedType === "week"
          ? RegenerationType.Weekly
          : RegenerationType.Daily
      );

      if (selectedType === "week") {
        // Weekly regeneration: call the weekly endpoint directly with profile data
        try {
          const result = await regenerateWorkoutPlanAsync(freshUser.id, {
            customFeedback: customFeedback.trim() || undefined,
            profileData: profileData,
          });

          if (result?.success && result.jobId) {
            // Add job to background tracking
            await addJob(result.jobId, "regeneration");

            // Success callback
            onSuccess?.();
          } else {
            setIsGeneratingWorkout(false);
            onError?.("Regeneration failed to start");
          }
        } catch (error) {
          setIsGeneratingWorkout(false);
          onError?.("An error occurred while starting regeneration");
        }
      } else {
        // Daily regeneration: call regenerateDailyWorkout directly
        const user = await getCurrentUser();
        if (user && selectedPlanDay) {
          try {
            const result = await regenerateDailyWorkoutAsync(
              user.id,
              selectedPlanDay.id,
              {
                reason: formatOverridesIntoReason(
                  customFeedback,
                  temporaryOverrides,
                  currentProfile
                ),
              }
            );

            if (result?.success && result.jobId) {
              // Add job to background tracking
              await addJob(result.jobId, "daily-regeneration");

              // Close modal and let FAB handle progress
              onClose();
              onSuccess?.();
            } else {
              Alert.alert(
                "Daily Regeneration Failed",
                "Unable to start daily workout regeneration. Please check your connection and try again.",
                [{ text: "OK" }]
              );
            }
          } catch (error) {
            Alert.alert(
              "Daily Regeneration Error",
              "An error occurred while starting daily workout regeneration. Please try again.",
              [{ text: "OK" }]
            );
          }
        }
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      console.error("Failed to update your profile");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleQuickSaveAndRegenerate = async () => {
    if (!currentProfile) {
      return;
    }
    const partialFormData = convertProfileToFormData(currentProfile);
    const completeFormData: FormData = {
      email: partialFormData.email || "",
      age: partialFormData.age || 25,
      height: partialFormData.height || 170,
      weight: partialFormData.weight || 70,
      gender: partialFormData.gender || GENDER.MALE,
      goals: partialFormData.goals || [],
      limitations: partialFormData.limitations || [],
      fitnessLevel: partialFormData.fitnessLevel || FITNESS_LEVELS.BEGINNER,
      environment: partialFormData.environment || WORKOUT_ENVIRONMENTS.HOME_GYM,
      equipment: partialFormData.equipment || [],
      otherEquipment: partialFormData.otherEquipment || "",
      preferredStyles: partialFormData.preferredStyles || [],
      availableDays: partialFormData.availableDays || [],
      workoutDuration: partialFormData.workoutDuration || 30,
      intensityLevel:
        partialFormData.intensityLevel || IntensityLevels.MODERATE,
      medicalNotes: partialFormData.medicalNotes || "",
      includeWarmup: partialFormData.includeWarmup ?? true,
      includeCooldown: partialFormData.includeCooldown ?? true,
    };
    await handleUpdateProfile(completeFormData);
  };

  const handleRegenerateWithFeedback = async () => {
    try {
      // Close modal immediately - no generating screen
      onClose();

      if (selectedType === "week") {
        // Weekly regeneration: call the weekly endpoint directly
        const user = await getCurrentUser();
        if (user) {
          const result = await regenerateWorkoutPlanAsync(user.id, {
            customFeedback: customFeedback.trim() || undefined,
          });

          if (result?.success && result.jobId) {
            // Add job to background tracking
            await addJob(result.jobId, "regeneration");

            // Success callback
            onSuccess?.();
          } else {
            onError?.("Regeneration failed to start");
          }
        }
      } else {
        // Daily regeneration or rest day workout
        const user = await getCurrentUser();
        if (user) {
          // Check if this is a rest day workout request
          if (isRestDay && selectedDate) {
            console.log("Rest day workout generation started", {
              userId: user.id,
              date: selectedDate,
              reason:
                customFeedback.trim() || "User requested rest day workout",
            });

            const result = await generateRestDayWorkoutAsync(user.id, {
              date: selectedDate,
              reason: formatOverridesIntoReason(
                customFeedback,
                temporaryOverrides,
                currentProfile
              ),
            });

            console.log("Rest day workout API response:", result);

            if (result?.success && result.jobId) {
              // Add job to background tracking
              await addJob(result.jobId, "daily-regeneration");

              // Success callback
              onSuccess?.();
            } else {
              Alert.alert(
                "Rest Day Workout Failed",
                "Unable to start rest day workout generation. Please check your connection and try again.",
                [{ text: "OK" }]
              );
            }
          } else if (selectedPlanDay) {
            // Regular daily regeneration
            const result = await regenerateDailyWorkoutAsync(
              user.id,
              selectedPlanDay.id,
              {
                reason: formatOverridesIntoReason(
                  customFeedback,
                  temporaryOverrides,
                  currentProfile
                ),
              }
            );

            if (result?.success && result.jobId) {
              // Add job to background tracking
              await addJob(result.jobId, "daily-regeneration");

              // Success callback
              onSuccess?.();
            } else {
              Alert.alert(
                "Daily Regeneration Failed",
                "Unable to start daily workout regeneration. Please check your connection and try again.",
                [{ text: "OK" }]
              );
            }
          }
        }
      }
    } catch (error) {
      Alert.alert(
        "Regeneration Error",
        "An error occurred while starting regeneration. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const formatOverridesIntoReason = (
    customFeedback: string,
    overrides: TemporaryOverrides,
    currentProfile: UserProfile | null
  ): string => {
    if (!currentProfile) {
      return customFeedback.trim() || "User requested regeneration";
    }

    // Build array of override descriptions
    const overrideDescriptions: string[] = [];

    // Check duration override
    if (
      overrides.duration !== undefined &&
      overrides.duration !== (currentProfile.workoutDuration || 30)
    ) {
      overrideDescriptions.push(`Duration: ${overrides.duration} minutes`);
    }

    // Check intensity override
    let currentIntensity = IntensityLevels.MODERATE;
    if (currentProfile.intensityLevel) {
      if (typeof currentProfile.intensityLevel === "number") {
        currentIntensity =
          currentProfile.intensityLevel === 1
            ? IntensityLevels.LOW
            : currentProfile.intensityLevel === 2
              ? IntensityLevels.MODERATE
              : IntensityLevels.HIGH;
      } else {
        currentIntensity = currentProfile.intensityLevel as IntensityLevels;
      }
    }

    if (
      overrides.intensity !== undefined &&
      overrides.intensity !== currentIntensity
    ) {
      const intensityLabel =
        overrides.intensity === IntensityLevels.LOW
          ? "Low"
          : overrides.intensity === IntensityLevels.MODERATE
            ? "Moderate"
            : "High";
      overrideDescriptions.push(`Intensity: ${intensityLabel}`);
    }

    // Check styles override
    const currentStyles =
      (currentProfile.preferredStyles as PREFERRED_STYLES[]) || [];
    const newStyles = overrides.styles || [];

    // Compare arrays to see if they're different
    const stylesChanged =
      newStyles.length !== currentStyles.length ||
      !newStyles.every((style) => currentStyles.includes(style)) ||
      !currentStyles.every((style) => newStyles.includes(style));

    if (stylesChanged && newStyles.length > 0) {
      const styleLabels = newStyles.map((style) => {
        return style === PREFERRED_STYLES.HIIT
          ? "HIIT"
          : style === PREFERRED_STYLES.STRENGTH
            ? "Strength"
            : style === PREFERRED_STYLES.CARDIO
              ? "Cardio"
              : style === PREFERRED_STYLES.REHAB
                ? "Rehab"
                : style === PREFERRED_STYLES.CROSSFIT
                  ? "CrossFit"
                  : style === PREFERRED_STYLES.FUNCTIONAL
                    ? "Functional"
                    : style === PREFERRED_STYLES.PILATES
                      ? "Pilates"
                      : style === PREFERRED_STYLES.YOGA
                        ? "Yoga"
                        : style === PREFERRED_STYLES.BALANCE
                          ? "Balance"
                          : style === PREFERRED_STYLES.MOBILITY
                            ? "Mobility"
                            : style;
      });
      overrideDescriptions.push(`Styles: ${styleLabels.join(", ")}`);
    }

    // Check environment override
    let currentEnvironment = WORKOUT_ENVIRONMENTS.HOME_GYM;
    if (currentProfile.environment) {
      if (Array.isArray(currentProfile.environment)) {
        currentEnvironment = currentProfile
          .environment[0] as WORKOUT_ENVIRONMENTS;
      } else {
        currentEnvironment = currentProfile.environment as WORKOUT_ENVIRONMENTS;
      }
    }

    if (
      overrides.environment !== undefined &&
      overrides.environment !== currentEnvironment
    ) {
      const environmentLabel =
        overrides.environment === WORKOUT_ENVIRONMENTS.HOME_GYM
          ? "Home Gym"
          : overrides.environment === WORKOUT_ENVIRONMENTS.COMMERCIAL_GYM
            ? "Commercial Gym"
            : "Bodyweight Only";
      overrideDescriptions.push(`Environment: ${environmentLabel}`);
    }

    // Check equipment overrides (only for HOME_GYM)
    if (overrides.environment === WORKOUT_ENVIRONMENTS.HOME_GYM) {
      const currentEquipment =
        (currentProfile.equipment as AVAILABLE_EQUIPMENT[]) || [];
      const newEquipment = overrides.equipment || [];

      // Compare arrays to see if they're different
      const equipmentChanged =
        newEquipment.length !== currentEquipment.length ||
        !newEquipment.every((eq) => currentEquipment.includes(eq)) ||
        !currentEquipment.every((eq) => newEquipment.includes(eq));

      if (equipmentChanged) {
        const equipmentLabels = newEquipment.map((equipment) => {
          return formatEnumValue(equipment.toUpperCase());
        });
        if (equipmentLabels.length > 0) {
          overrideDescriptions.push(`Equipment: ${equipmentLabels.join(", ")}`);
        }
      }

      // Check other equipment override
      const currentOtherEquipment = currentProfile.otherEquipment || "";
      if (
        overrides.otherEquipment !== undefined &&
        overrides.otherEquipment.trim() !== currentOtherEquipment.trim()
      ) {
        if (overrides.otherEquipment.trim()) {
          overrideDescriptions.push(
            `Other Equipment: ${overrides.otherEquipment.trim()}`
          );
        }
      }
    }

    // Check warmup/cooldown overrides
    const currentWarmup = currentProfile.includeWarmup ?? true;
    const currentCooldown = currentProfile.includeCooldown ?? true;

    if (
      overrides.includeWarmup !== undefined &&
      overrides.includeWarmup !== currentWarmup
    ) {
      overrideDescriptions.push(
        `${overrides.includeWarmup ? "Include" : "Skip"} warmup`
      );
    }

    if (
      overrides.includeCooldown !== undefined &&
      overrides.includeCooldown !== currentCooldown
    ) {
      overrideDescriptions.push(
        `${overrides.includeCooldown ? "Include" : "Skip"} cooldown`
      );
    }

    // Build final reason string
    let finalReason = customFeedback.trim();

    if (overrideDescriptions.length > 0) {
      const overrideText = `Profile overrides for this workout: ${overrideDescriptions.join(
        ", "
      )}`;
      if (finalReason) {
        finalReason += `\n\n${overrideText}`;
      } else {
        finalReason = `User requested regeneration with the following changes: ${overrideDescriptions.join(
          ", "
        )}`;
      }
    }

    return finalReason || "User requested regeneration";
  };

  const handleOpenDailyOverrideForm = () => {
    // Backup current overrides so we can restore them if user cancels
    setTempOverridesBackup({ ...temporaryOverrides });
    setShowDailyOverrideForm(true);
  };

  const handleCancelDailyOverrides = () => {
    // Restore the backed up overrides
    if (tempOverridesBackup) {
      setTemporaryOverrides(tempOverridesBackup);
    }
    setTempOverridesBackup(null);
    setShowDailyOverrideForm(false);
  };

  const handleApplyDailyOverrides = () => {
    // Keep the current overrides and close modal
    setTempOverridesBackup(null);
    setShowDailyOverrideForm(false);
  };

  const convertProfileToFormData = (
    profile: UserProfile
  ): Partial<FormData> => {
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
    let environment = WORKOUT_ENVIRONMENTS.HOME_GYM;
    if (profile.environment) {
      if (Array.isArray(profile.environment)) {
        environment = profile.environment[0] as WORKOUT_ENVIRONMENTS;
      } else {
        environment = profile.environment as WORKOUT_ENVIRONMENTS;
      }
    }

    return {
      email: profile.email || "",
      age: profile.age || 25,
      height: profile.height || 170,
      weight: profile.weight || 70,
      gender: (profile.gender as GENDER) || GENDER.MALE,
      goals: (profile.goals as FITNESS_GOALS[]) || [],
      limitations: (profile.limitations as PHYSICAL_LIMITATIONS[]) || [],
      fitnessLevel:
        (profile.fitnessLevel as FITNESS_LEVELS) || FITNESS_LEVELS.BEGINNER,
      environment: environment,
      equipment: (profile.equipment as AVAILABLE_EQUIPMENT[]) || [],
      otherEquipment: profile.otherEquipment || "",
      preferredStyles: (profile.preferredStyles as PREFERRED_STYLES[]) || [],
      availableDays: (profile.availableDays as PreferredDays[]) || [],
      workoutDuration: profile.workoutDuration || 30,
      intensityLevel: intensityLevel,
      medicalNotes: profile.medicalNotes || "",
      includeWarmup: profile.includeWarmup ?? true,
      includeCooldown: profile.includeCooldown ?? true,
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
          <ActivityIndicator size="large" color={colors.brand.primary} />
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
        onRequestClose={() => setShowOnboardingForm(false)}
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
                <ActivityIndicator size="small" color={colors.brand.primary} />
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
              excludePersonalInfo={true}
            />
          </View>
        </View>
      </Modal>
    );
  }

  if (showDailyOverrideForm) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCancelDailyOverrides}
      >
        <View className="flex-1 bg-background">
          {/* Custom Header with Cancel/Apply Options */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-light-2">
            <TouchableOpacity
              onPress={handleCancelDailyOverrides}
              className="py-2 px-3"
            >
              <Text className="text-base text-text-muted font-medium">
                Cancel
              </Text>
            </TouchableOpacity>
            <Text className="text-base font-semibold text-text-primary">
              Customize Workout Settings
            </Text>
            <TouchableOpacity
              onPress={handleApplyDailyOverrides}
              className="py-2 px-3"
            >
              <Text className="text-base text-primary font-medium">Apply</Text>
            </TouchableOpacity>
          </View>

          {/* Daily Override Form */}
          <View className="flex-1">
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ padding: 20 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <ProfileOverrideForm
                overrides={temporaryOverrides}
                onOverrideChange={setTemporaryOverrides}
              />
            </ScrollView>
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
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 bg-background">
          {/* Header */}
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-light-2">
              <TouchableOpacity
                onPress={onClose}
                className="w-8 h-8 items-center justify-center"
              >
                <Ionicons name="close" size={20} color={colors.text.muted} />
              </TouchableOpacity>
              <Text className="text-base font-semibold text-text-primary">
                Edit Workout Plan
              </Text>
              <View className="w-8" />
            </View>
          </TouchableWithoutFeedback>

          {/* Content */}
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            bounces={true}
            scrollEventThrottle={16}
            removeClippedSubviews={true}
          >
            <View className="px-5 py-5">
              {isRestDay ? (
                <View className="mb-6">
                  <Text className="text-lg font-semibold text-text-primary mb-2 text-center">
                    Today is a Rest Day
                  </Text>
                  <Text className="text-sm text-text-muted mb-4 text-center">
                    You can generate an optional workout for today, or
                    regenerate your entire weekly plan.
                  </Text>
                </View>
              ) : noActiveWorkoutDay ? (
                <View className="mb-6">
                  <Text className="text-lg font-semibold text-text-primary mb-2 text-center">
                    No Workout Generated
                  </Text>
                  <Text className="text-sm text-text-muted mb-4 text-center">
                    Workouts for this period haven't been generated yet. To
                    create workouts for this period, complete your current week
                    and generate the next week's workout plan.
                  </Text>
                </View>
              ) : (
                <Text className="text-base text-text-muted mb-6 text-center">
                  Choose how you would like to generate your workout plan:
                </Text>
              )}

              {/* Week/Day Toggle - Fixed shadow issue */}
              <View className="flex-row bg-neutral-light-2 rounded-md p-1 mb-6">
                <TouchableOpacity
                  className={`flex-1 py-3 px-2 rounded-sm items-center ${
                    selectedType === "day" ? "bg-white" : "bg-transparent"
                  } ${noActiveWorkoutDay ? "opacity-50" : ""}`}
                  style={
                    selectedType === "day"
                      ? {
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.1,
                          shadowRadius: 2,
                          elevation: 2,
                        }
                      : undefined
                  }
                  onPress={() => !noActiveWorkoutDay && setSelectedType("day")}
                  disabled={noActiveWorkoutDay}
                >
                  <Text
                    className={`font-medium text-sm ${
                      selectedType === "day"
                        ? "text-secondary"
                        : "text-text-muted"
                    }`}
                  >
                    Single Day
                  </Text>
                  <Text
                    className={`text-xs mt-1 text-center ${
                      selectedType === "day"
                        ? "text-secondary"
                        : "text-text-muted"
                    }`}
                  >
                    Today only
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 py-3 px-2 rounded-sm items-center ${
                    selectedType === "week" ? "bg-white" : "bg-transparent"
                  }`}
                  style={
                    selectedType === "week"
                      ? {
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.1,
                          shadowRadius: 2,
                          elevation: 2,
                        }
                      : undefined
                  }
                  onPress={() => setSelectedType("week")}
                >
                  <Text
                    className={`font-medium text-sm ${
                      selectedType === "week"
                        ? "text-secondary"
                        : "text-text-muted"
                    }`}
                  >
                    Full Week
                  </Text>
                  <Text
                    className={`text-xs mt-1 text-center ${
                      selectedType === "week"
                        ? "text-secondary"
                        : "text-text-muted"
                    }`}
                  >
                    Next 7 days
                  </Text>
                </TouchableOpacity>
              </View>

              {noActiveWorkoutDay && (
                <Text className="text-xs text-text-muted mb-4 text-center">
                  Day regeneration is not available for days outside your
                  workout plan
                </Text>
              )}

              {/* Feedback Input */}
              <View>
                <Text className="text-sm text-text-muted mb-4">
                  {isRestDay && selectedType === "day"
                    ? "What kind of workout would you like for this rest day?"
                    : isRestDay
                      ? "Tell us what you'd like to change about your weekly workout plan:"
                      : noActiveWorkoutDay
                        ? "Tell us what you'd like to include in your next week's workout plan:"
                        : `Tell us why you want to regenerate this ${
                            selectedType === "day" ? "day's" : "week's"
                          } workout plan, and what you would like to change:`}
                </Text>
                <TextInput
                  className="bg-white border border-neutral-medium-1 rounded-md text-sm text-secondary px-4 py-6"
                  style={{
                    minHeight: 120,
                    maxHeight: 200,
                    textAlignVertical: "top",
                  }}
                  placeholder={
                    isRestDay && selectedType === "day"
                      ? "E.g., '30 minutes of light cardio', 'Quick upper body strength', 'Gentle yoga flow'..."
                      : "Add notes about your workout here..."
                  }
                  placeholderTextColor={colors.text.muted}
                  value={customFeedback}
                  onChangeText={setCustomFeedback}
                  multiline
                  scrollEnabled={true}
                />
                {selectedType === "day" &&
                  !isRestDay &&
                  !noActiveWorkoutDay && (
                    <Text className="text-xs text-text-muted mt-3">
                      Only this day's workout will be changed. All other days
                      will remain the same.
                    </Text>
                  )}

                {selectedType === "week" && (
                  <Text className="text-xs text-text-muted mt-3">
                    Your regenerated weekly plan will begin on{" "}
                    {formatWorkoutPlanStartDate()} and end on{" "}
                    {formatWorkoutPlanEndDate()}.
                  </Text>
                )}

                {/* Daily Override Button */}
                {selectedType === "day" && !noActiveWorkoutDay && (
                  <TouchableOpacity
                    className="mt-4 py-2"
                    onPress={handleOpenDailyOverrideForm}
                  >
                    <Text className="text-sm text-primary font-medium text-center">
                      Customize settings for this workout
                    </Text>
                  </TouchableOpacity>
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
          </ScrollView>

          {/* Action Button */}
          <View className="px-5 pb-10 mb-5">
            <TouchableOpacity
              className={`bg-primary py-4 rounded-md items-center flex-row justify-center ${
                loading ? "opacity-70" : ""
              }`}
              onPress={handleRegenerateWithFeedback}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="refresh" size={18} color="white" />
                  <Text className="text-white font-semibold text-sm ml-2">
                    {selectedType === "week"
                      ? "Regenerate Weekly Plan"
                      : "Regenerate Today's Workout"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
