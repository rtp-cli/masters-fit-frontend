import { Ionicons } from "@expo/vector-icons";
import { getCurrentUser } from "@lib/auth";
import { fetchUserProfile, updateUserProfile } from "@lib/profile";
import {
  generateRestDayWorkoutAsync,
  regenerateDailyWorkoutAsync,
  regenerateWorkoutPlanAsync,
} from "@lib/workouts";
import React, { useEffect,useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RegenerationType } from "@/constants/global.enum";
import { useAuth } from "@/contexts/auth-context";
import { useBackgroundJobs } from "@/contexts/background-job-context";
import { useEntitlements } from "@/hooks/use-entitlements";
import { PaywallError } from "@/lib/api";
import { clearPendingResume, setPendingResume } from "@/lib/paywall-resume";
import { type Profile as UserProfile } from "@/types/api";
import {
  type AVAILABLE_EQUIPMENT,
  type FITNESS_GOALS,
  FITNESS_LEVELS,
  GENDER,
  INTENSITY_LEVELS,
  type PHYSICAL_LIMITATIONS,
  type PREFERRED_DAYS,
  type PREFERRED_STYLES,
  WORKOUT_ENVIRONMENTS,
} from "@/types/enums";
import { formatWorkoutPlanEndDate,formatWorkoutPlanStartDate } from "@/utils";
import { computeFreeAdjustmentNote } from "@/utils/entitlements";
import {
  describeOverrides,
  formatOverridesIntoReason,
  formatOverrideSummary,
} from "@/utils/override-summary";
import { resolveDefaultRegenerationTab } from "@/utils/regeneration-tab";

import { useThemeColors } from "../lib/theme";
import { useTheme } from "../lib/theme-context";
import OnboardingForm, {
  type FormData,
  ONBOARDING_STEPS_ALL,
} from "./onboarding-form";
import ProfileOverrideForm, {
  type TemporaryOverrides,
} from "./profile-override-form";
import { SegmentedControl } from "./segmented-control";
import { CustomDialog, type DialogButton } from "./ui";
import VoiceInputButton from "./voice-input-button";

// Overrides from the last submitted daily adjustment, so a retry a few
// minutes later starts from what the user chose (e.g. "20 min"), not a
// silent reset to profile defaults. Module-scoped: survives the modal
// unmounting but not an app restart. Expires so a stale choice doesn't
// leak into a different session days later — the Customize row always
// shows the active values either way.
const OVERRIDE_REUSE_WINDOW_MS = 30 * 60 * 1000;
let lastSubmittedOverrides: {
  overrides: TemporaryOverrides;
  savedAt: number;
} | null = null;

function rememberSubmittedOverrides(overrides: TemporaryOverrides): void {
  lastSubmittedOverrides = { overrides: { ...overrides }, savedAt: Date.now() };
}

function recallSubmittedOverrides(): TemporaryOverrides | null {
  if (
    lastSubmittedOverrides &&
    Date.now() - lastSubmittedOverrides.savedAt < OVERRIDE_REUSE_WINDOW_MS
  ) {
    return { ...lastSubmittedOverrides.overrides };
  }
  lastSubmittedOverrides = null;
  return null;
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
  singleTabOnly?: boolean; // When true, hides tab toggle and locks to single day mode
  onEditManually?: () => void; // "Edit it myself" exit — hands off to the manual editor
  onDismiss?: () => void; // iOS: fires once the sheet has finished dismissing
}

export default function WorkoutRegenerationModal({
  visible,
  onClose,
  loading = false,
  regenerationType = "day",
  onSuccess,
  onError,
  selectedPlanDay,
  isRestDay = false,
  noActiveWorkoutDay = false,
  selectedDate,
  singleTabOnly = false,
  onEditManually,
  onDismiss,
}: WorkoutRegenerationModalProps) {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const { freeAllowances } = useEntitlements();
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

  // Contextual free-adjustment note (FREE tier only; null for paid). Shown in
  // the normal adjust flow so the user knows this action spends an allowance.
  // Logic lives in a pure, unit-tested util; the component just renders it.
  const freeAdjustmentNote = computeFreeAdjustmentNote({
    freeAllowances,
    selectedType,
    isRestDay,
    noActiveWorkoutDay,
  });

  // State for daily workout temporary overrides
  const [showDailyOverrideForm, setShowDailyOverrideForm] = useState(false);
  const [tempOverridesBackup, setTempOverridesBackup] =
    useState<TemporaryOverrides | null>(null);
  const [temporaryOverrides, setTemporaryOverrides] =
    useState<TemporaryOverrides>({
      duration: 30,
      intensity: INTENSITY_LEVELS.MODERATE,
      styles: [],
      environment: WORKOUT_ENVIRONMENTS.HOME_GYM,
      equipment: [],
      otherEquipment: "",
      includeWarmup: true,
      includeCooldown: true,
    });

  // Summary line for the Customize row: what currently differs from the
  // profile ("45 min · Moderate intensity +1 more"), or "Using your profile
  // settings". Same describeOverrides entries feed the AI reason string.
  const overrideSummary = formatOverrideSummary(
    describeOverrides(temporaryOverrides, currentProfile)
  );

  const { setIsGeneratingWorkout } = useAuth();

  // Background job tracking
  const { addJob } = useBackgroundJobs();

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    description: string;
    primaryButton: DialogButton;
    secondaryButton?: DialogButton;
    icon?: keyof typeof Ionicons.glyphMap;
  } | null>(null);

  useEffect(() => {
    if (visible) {
      loadUserProfile();
      setCustomFeedback("");
      setShowOnboardingForm(false);
      setShowDailyOverrideForm(false);
      setTempOverridesBackup(null);
      setSelectedType(
        resolveDefaultRegenerationTab({
          singleTabOnly,
          isRestDay,
          noActiveWorkoutDay,
          regenerationType,
        })
      );
    }
  }, [visible, regenerationType, isRestDay, noActiveWorkoutDay, singleTabOnly]);

  // Initialize temporary overrides when profile loads
  useEffect(() => {
    if (currentProfile && visible) {
      // Convert profile data to temporary overrides with defaults
      let profileIntensity = INTENSITY_LEVELS.MODERATE;
      if (currentProfile.intensityLevel) {
        if (typeof currentProfile.intensityLevel === "number") {
          profileIntensity =
            currentProfile.intensityLevel === 1
              ? INTENSITY_LEVELS.LOW
              : currentProfile.intensityLevel === 2
                ? INTENSITY_LEVELS.MODERATE
                : INTENSITY_LEVELS.HIGH;
        } else {
          profileIntensity = currentProfile.intensityLevel as INTENSITY_LEVELS;
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

      // A recently submitted adjustment's overrides win over profile
      // defaults, so retrying doesn't silently drop e.g. a "20 min" choice.
      const recalled = recallSubmittedOverrides();
      setTemporaryOverrides(
        recalled ?? {
          duration: currentProfile.workoutDuration || 30,
          intensity: profileIntensity,
          styles: (currentProfile.preferredStyles as PREFERRED_STYLES[]) || [],
          environment: profileEnvironment,
          equipment: (currentProfile.equipment as AVAILABLE_EQUIPMENT[]) || [],
          otherEquipment: currentProfile.otherEquipment || "",
          includeWarmup: currentProfile.includeWarmup ?? true,
          includeCooldown: currentProfile.includeCooldown ?? true,
        }
      );
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
        gender: formData.gender!.toString(),
        goals: formData.goals.map((g) => g.toString()),
        limitations: formData.limitations?.map((l) => l.toString()) || [],
        fitnessLevel: formData.fitnessLevel!.toString(),
        environment: [formData.environment!.toString()],
        equipment: formData.equipment?.map((e) => e.toString()) || [],
        otherEquipment: formData.otherEquipment || "",
        preferredStyles: formData.preferredStyles.map((s) => s.toString()),
        availableDays: formData.availableDays.map((d) => d.toString()),
        workoutDuration: formData.workoutDuration,
        intensityLevel:
          formData.intensityLevel === INTENSITY_LEVELS.LOW
            ? 1
            : formData.intensityLevel === INTENSITY_LEVELS.MODERATE
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

      // Arm resume-after-purchase: if the server gates this adjustment behind a
      // paywall and the user subscribes, re-run this whole handler.
      setPendingResume(() => {
        void handleUpdateProfile(formData);
      });

      if (selectedType === "week") {
        // Weekly regeneration: call the weekly endpoint directly with profile data
        try {
          const result = await regenerateWorkoutPlanAsync(freshUser.id, {
            customFeedback: customFeedback.trim() || undefined,
            profileData: {
              ...profileData,
              workoutStyles: profileData.preferredStyles as string[],
            },
          });

          if (result?.success && result.jobId) {
            clearPendingResume();
            // Add job to background tracking
            await addJob(result.jobId, "regeneration");

            // Success callback
            onSuccess?.();
          } else if (result !== null) {
            // Only show error for genuine failures, not paywall-intercepted nulls
            setIsGeneratingWorkout(false);
            onError?.("Adjustment failed to start");
          }
        } catch (error) {
          if (!(error instanceof PaywallError)) {
            setIsGeneratingWorkout(false);
            onError?.("An error occurred while starting adjustment");
          }
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
                durationOverride: temporaryOverrides.duration,
              }
            );

            if (result?.success && result.jobId) {
              rememberSubmittedOverrides(temporaryOverrides);
              clearPendingResume();
              // Add job to background tracking
              await addJob(result.jobId, "daily-regeneration");

              // Close modal and let FAB handle progress
              onClose();
              onSuccess?.();
            } else if (result !== null) {
              // Only show error dialog for genuine failures, not paywall-intercepted nulls
              setDialogConfig({
                title: "Daily Adjustment Failed",
                description:
                  "Unable to start daily workout adjustment. Please check your connection and try again.",
                primaryButton: {
                  text: "OK",
                  onPress: () => setDialogVisible(false),
                },
                icon: "alert-circle",
              });
              setDialogVisible(true);
            }
          } catch (error) {
            if (!(error instanceof PaywallError)) {
              setDialogConfig({
                title: "Daily Adjustment Error",
                description:
                  "An error occurred while starting daily workout adjustment. Please try again.",
                primaryButton: {
                  text: "OK",
                  onPress: () => setDialogVisible(false),
                },
                icon: "alert-circle",
              });
              setDialogVisible(true);
            }
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
        partialFormData.intensityLevel || INTENSITY_LEVELS.MODERATE,
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

      // Arm resume-after-purchase: if the server gates this behind a paywall and
      // the user subscribes, re-run this whole handler.
      setPendingResume(() => {
        void handleRegenerateWithFeedback();
      });

      if (selectedType === "week") {
        // Weekly regeneration: call the weekly endpoint directly
        const user = await getCurrentUser();
        if (user) {
          const result = await regenerateWorkoutPlanAsync(user.id, {
            customFeedback: customFeedback.trim() || undefined,
          });

          if (result?.success && result.jobId) {
            clearPendingResume();
            // Add job to background tracking
            await addJob(result.jobId, "regeneration");

            // Success callback
            onSuccess?.();
          } else if (result !== null) {
            // Only show error for genuine failures, not paywall-intercepted nulls
            onError?.("Adjustment failed to start");
          }
        }
      } else {
        // Daily regeneration or standalone single-day workout
        const user = await getCurrentUser();
        if (user) {
          // A single day with no backing plan day -- either a rest day inside
          // the plan, or a day past the end of the series -- is generated as a
          // standalone workout for that date. Only an in-plan day (selectedPlanDay
          // set) goes through the daily-regeneration path below.
          if (selectedDate && !selectedPlanDay) {
            const result = await generateRestDayWorkoutAsync(user.id, {
              date: selectedDate,
              reason: formatOverridesIntoReason(
                customFeedback,
                temporaryOverrides,
                currentProfile
              ),
              durationOverride: temporaryOverrides.duration,
            });

            if (result?.success && result.jobId) {
              rememberSubmittedOverrides(temporaryOverrides);
              clearPendingResume();
              // Add job to background tracking
              await addJob(result.jobId, "daily-regeneration");

              // Success callback
              onSuccess?.();
            } else if (result !== null) {
              // Only show error dialog for genuine failures, not paywall-intercepted nulls
              setDialogConfig({
                title: "Workout Generation Failed",
                description:
                  "Unable to start single-day workout generation. Please check your connection and try again.",
                primaryButton: {
                  text: "OK",
                  onPress: () => setDialogVisible(false),
                },
                icon: "alert-circle",
              });
              setDialogVisible(true);
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
                durationOverride: temporaryOverrides.duration,
              }
            );

            if (result?.success && result.jobId) {
              rememberSubmittedOverrides(temporaryOverrides);
              clearPendingResume();
              // Add job to background tracking
              await addJob(result.jobId, "daily-regeneration");

              // Success callback
              onSuccess?.();
            } else if (result !== null) {
              // Only show error dialog for genuine failures, not paywall-intercepted nulls
              setDialogConfig({
                title: "Daily Adjustment Failed",
                description:
                  "Unable to start daily workout adjustment. Please check your connection and try again.",
                primaryButton: {
                  text: "OK",
                  onPress: () => setDialogVisible(false),
                },
                icon: "alert-circle",
              });
              setDialogVisible(true);
            }
          }
        }
      }
    } catch (error) {
      if (!(error instanceof PaywallError)) {
        const message =
          error instanceof Error
            ? error.message
            : "An error occurred while starting adjustment. Please try again.";
        setDialogConfig({
          title: "Adjustment Error",
          description: message,
          primaryButton: {
            text: "OK",
            onPress: () => setDialogVisible(false),
          },
          icon: "alert-circle",
        });
        setDialogVisible(true);
      }
    }
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
    let intensityLevel = INTENSITY_LEVELS.MODERATE;
    if (profile.intensityLevel) {
      if (typeof profile.intensityLevel === "number") {
        intensityLevel =
          profile.intensityLevel === 1
            ? INTENSITY_LEVELS.LOW
            : profile.intensityLevel === 2
              ? INTENSITY_LEVELS.MODERATE
              : INTENSITY_LEVELS.HIGH;
      } else {
        intensityLevel = profile.intensityLevel as INTENSITY_LEVELS;
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
      availableDays: (profile.availableDays as PREFERRED_DAYS[]) || [],
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
        statusBarTranslucent
      >
        <SafeAreaView
          edges={["top"]}
          className={`flex-1 justify-center items-center bg-background ${isDark ? "dark" : ""}`}
        >
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text className="mt-4 text-base text-primary font-medium">
            Loading your preferences...
          </Text>
        </SafeAreaView>
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
        statusBarTranslucent
      >
        <SafeAreaView
          edges={["top"]}
          className={`flex-1 bg-background ${isDark ? "dark" : ""}`}
        >
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
              mode="edit"
              steps={ONBOARDING_STEPS_ALL.slice(1)}
              initialData={convertProfileToFormData(currentProfile)}
              onSubmit={handleUpdateProfile}
              isLoading={updatingProfile}
              submitButtonText="Save"
            />
          </View>
        </SafeAreaView>
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
        statusBarTranslucent
      >
        <SafeAreaView
          edges={["top"]}
          className={`flex-1 bg-background ${isDark ? "dark" : ""}`}
        >
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
        </SafeAreaView>
      </Modal>
    );
  }

  // §6.7: the primary action and the day-scope exits are placed differently by
  // branch — pinned in a footer where the segmented control makes the content
  // tall, but moved into the scroll flow on the single-tab (scheduled-day)
  // entry, where the content is short and a pinned footer leaves a dead gap.
  // Defined once here so both placements share the same markup.
  const primaryActionButton = (
    <TouchableOpacity
      className={`bg-primary py-4 rounded-md items-center flex-row justify-center ${
        loading ? "opacity-70" : ""
      }`}
      onPress={handleRegenerateWithFeedback}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.neutral.white} />
      ) : (
        <>
          <Ionicons name="refresh" size={18} color={colors.neutral.white} />
          <Text
            className="text-neutral-white font-semibold text-sm ml-2"
            maxFontSizeMultiplier={1.3}
          >
            {/* §6.1: the rest-day sheet keeps "Update Today's Workout". It
                reaches this chain with selectedType === "day", so the new
                scheduled-day label must be gated behind isRestDay. */}
            {selectedType === "week"
              ? "Update Weekly Plan"
              : noActiveWorkoutDay
                ? "Generate Workout"
                : isRestDay
                  ? "Update Today's Workout"
                  : "Rebuild Today's Workout"}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );

  // §6.5: manual-edit exit + week-scope escape hatch. Scheduled-day flow only.
  // Fixed order; never reorders by usage.
  const dayScopeExits =
    selectedType === "day" && !isRestDay && !noActiveWorkoutDay ? (
      <>
        <View className="h-px bg-neutral-light-2 mt-5" />

        <TouchableOpacity
          className="flex-row items-center mt-4"
          style={{ minHeight: 44 }}
          onPress={() => onEditManually?.()}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Keep this workout, edit it myself. Remove or swap one exercise, change sets, reps and weight."
        >
          <View className="size-9 rounded-full bg-neutral-light-2 items-center justify-center">
            <Ionicons
              name="create-outline"
              size={18}
              color={colors.text.primary}
            />
          </View>
          <View className="flex-1 ml-3">
            <Text className="text-base font-semibold text-text-primary">
              Keep this workout, edit it myself
            </Text>
            <Text className="text-sm text-text-muted">
              Remove or swap one exercise, change sets, reps and weight.
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.text.muted}
          />
        </TouchableOpacity>

        {/* Approved deviation from SPEC §6.5.3: switch scope in place (keep
            selectedPlanDay + singleTabOnly) instead of closing/reopening with a
            null day. Nulling the day flips the parent's isRestDay true, which
            would reshow the tab control and block the "Change this week" title
            (§12.5). */}
        <TouchableOpacity
          className="py-3"
          onPress={() => setSelectedType("week")}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Adjust the whole week instead"
        >
          <Text className="text-sm font-medium text-text-muted text-center">
            Adjust the whole week instead
          </Text>
        </TouchableOpacity>
      </>
    ) : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onDismiss={onDismiss}
      statusBarTranslucent
    >
      <SafeAreaView edges={["top"]} className="flex-1">
        <KeyboardAvoidingView
          className={`flex-1 ${isDark ? "dark" : ""}`}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View className="flex-1 bg-background">
            {/* Header */}
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-light-2">
                <TouchableOpacity
                  onPress={onClose}
                  className="size-8 items-center justify-center"
                >
                  <Ionicons name="close" size={20} color={colors.text.muted} />
                </TouchableOpacity>
                <Text className="text-base font-semibold text-text-primary">
                  {/* §6.1: day/week scope named explicitly on the scheduled-day
                      flow. Rest-day and no-plan entries keep "Adjust Workout"
                      (they must stay pixel-identical), so both new titles are
                      gated on !isRestDay && !noActiveWorkoutDay. */}
                  {!isRestDay && !noActiveWorkoutDay && selectedType === "day"
                    ? "Change today's workout"
                    : !isRestDay &&
                        !noActiveWorkoutDay &&
                        selectedType === "week"
                      ? "Change this week"
                      : "Adjust Workout"}
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
              <View className="p-5">
                {isRestDay && selectedType === "day" ? (
                  <View className="mb-6">
                    <Text className="text-lg font-semibold text-text-primary mb-2 text-center">
                      Today is a Rest Day
                    </Text>
                    <Text className="text-sm text-text-muted mb-4 text-center">
                      Generate an optional workout for today.
                    </Text>
                  </View>
                ) : isRestDay && selectedType === "week" ? (
                  <View className="mb-6">
                    <Text className="text-lg font-semibold text-text-primary mb-2 text-center">
                      Generate a New Weekly Plan
                    </Text>
                    <Text className="text-sm text-text-muted mb-4 text-center">
                      Create a fresh workout plan for the upcoming week.
                    </Text>
                  </View>
                ) : noActiveWorkoutDay ? (
                  <View className="mb-6">
                    <Text className="text-lg font-semibold text-text-primary mb-2 text-center">
                      No Workout Generated
                    </Text>
                    <Text className="text-sm text-text-muted mb-4 text-center">
                      There's no workout for this day yet. Generate a single
                      workout for this day, or start a fresh 7-day plan.
                    </Text>
                  </View>
                ) : !singleTabOnly ? (
                  // §6.7: this caption is the segmented control's own label —
                  // it asks the user to pick a scope. Gate it on the same
                  // condition as the control so it never survives when the
                  // control is hidden (the sheet would name a choice it doesn't
                  // offer). The field label below carries the ask from here.
                  <Text className="text-base text-text-muted mb-6 text-center">
                    Choose how you would like to adjust your workout plan:
                  </Text>
                ) : null}

                {/* [MF-022] Shared SegmentedControl instead of a hand-rolled
                    duplicate -- consistent styling with the dashboard's
                    time-range control, one place to fix instead of many. */}
                {!singleTabOnly && (
                  <View className="mb-6">
                    <SegmentedControl
                      options={[
                        {
                          value: "day",
                          label: "Single Day",
                          sublabel: "Today only",
                        },
                        {
                          value: "week",
                          label: "Full Week",
                          sublabel: "Next 7 days",
                        },
                      ]}
                      value={selectedType}
                      onChange={setSelectedType}
                      accessibilityLabel="Adjustment scope"
                    />
                  </View>
                )}

                {/* Feedback Input */}
                <View>
                  <Text className="text-sm text-text-muted mb-4">
                    {isRestDay && selectedType === "day"
                      ? "What kind of workout would you like for this rest day?"
                      : isRestDay
                        ? "Tell us what you'd like to change about your weekly workout plan:"
                        : noActiveWorkoutDay
                          ? selectedType === "day"
                            ? "Tell us what kind of workout you'd like for this day:"
                            : "Tell us what you'd like to include in your next week's workout plan:"
                          : selectedType === "day"
                            ? // §6.3/§3: ask for a circumstance, not an
                              // instruction — "what you'd like to change" is the
                              // clause that invited people to type edits here.
                              "Tell us what's different today:"
                            : // Week wording is byte-identical to the old
                              // template's week output. "Adjust the whole week
                              // instead" switches scope in place, so this branch
                              // renders seconds after the day one.
                              "Tell us why you want to adjust this week's workout, and what you'd like to change:"}
                  </Text>
                  <View>
                    <TextInput
                      className="bg-surface border border-neutral-medium-1 rounded-md text-sm text-text-primary px-4 py-6"
                      style={{
                        minHeight: 120,
                        maxHeight: 200,
                        textAlignVertical: "top",
                        paddingBottom: 60, // keep typed text clear of the mic button
                      }}
                      placeholder={
                        isRestDay && selectedType === "day"
                          ? "E.g., '30 minutes of light cardio', 'Quick upper body strength', 'Gentle yoga flow'..."
                          : !isRestDay &&
                              !noActiveWorkoutDay &&
                              selectedType === "day"
                            ? // §6.3: teach what the coach can act on, rather
                              // than describing the field.
                              "Short on time? Sore shoulder? No rack today?"
                            : "Add notes about your workout here..."
                      }
                      placeholderTextColor={colors.text.muted}
                      value={customFeedback}
                      onChangeText={setCustomFeedback}
                      multiline
                      scrollEnabled={true}
                    />
                    {/* Dictation appends to the note — never replaces or submits. */}
                    <View className="absolute bottom-2 right-2">
                      <VoiceInputButton
                        surface="adjust"
                        onTranscript={(text) =>
                          setCustomFeedback((prev) =>
                            prev.trim() ? `${prev.trimEnd()} ${text}` : text
                          )
                        }
                      />
                    </View>
                  </View>
                  <Text className="text-xs text-text-muted mt-2">
                    Type it, or tap the mic to say it.
                  </Text>
                  {/* §5: name the rebuild before the tap. The old line scoped
                      the change in days, which read as reassurance that little
                      would change. Card treatment is lifted from
                      freeAdjustmentNote below rather than invented; when that
                      note is present the two cards would stack, so this one
                      drops the card and keeps the type hierarchy. */}
                  {selectedType === "day" &&
                    !isRestDay &&
                    !noActiveWorkoutDay && (
                      <View
                        className={
                          freeAdjustmentNote
                            ? "mt-3"
                            : "bg-card rounded-xl px-3.5 py-3 mt-3"
                        }
                      >
                        <Text className="text-sm font-semibold text-text-primary leading-5">
                          This builds a new workout for today.
                        </Text>
                        <Text className="text-xs text-text-muted leading-4 mt-0.5">
                          Exercises, sets and reps may all change. Other days
                          stay the same.
                        </Text>
                      </View>
                    )}

                  {selectedType === "week" && (
                    <Text className="text-xs text-text-muted mt-3">
                      Your adjusted weekly plan will begin on{" "}
                      {formatWorkoutPlanStartDate()} and end on{" "}
                      {formatWorkoutPlanEndDate()}.
                    </Text>
                  )}

                  {freeAdjustmentNote && (
                    <View className="flex-row items-center bg-card rounded-xl px-3.5 py-3 mt-4">
                      <Ionicons
                        name={
                          freeAdjustmentNote.exhausted
                            ? "lock-closed"
                            : "sparkles"
                        }
                        size={16}
                        color={colors.brand.primary}
                      />
                      <Text
                        className="text-xs font-medium ml-2 flex-1 leading-4"
                        style={{ color: colors.text.secondary }}
                      >
                        {freeAdjustmentNote.text}
                      </Text>
                    </View>
                  )}

                  {/* Daily Override Row — title + what currently differs from
                      the profile, so the duration/intensity knobs are
                      discoverable without opening the panel. */}
                  {selectedType === "day" && !noActiveWorkoutDay && (
                    <TouchableOpacity
                      className="mt-4 flex-row items-center bg-surface border border-neutral-medium-1 rounded-xl px-4 py-3"
                      style={{ minHeight: 44 }}
                      onPress={handleOpenDailyOverrideForm}
                      accessibilityRole="button"
                      accessibilityLabel={`Customize settings for this workout. ${overrideSummary}`}
                    >
                      <View className="flex-1 mr-2">
                        <Text className="text-base font-semibold text-text-primary">
                          Customize settings for this workout
                        </Text>
                        <Text
                          className="text-sm text-text-muted mt-0.5"
                          numberOfLines={2}
                        >
                          {overrideSummary}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.text.muted}
                      />
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
                        Update your fitness preferences
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* §6.7: on the single-tab (scheduled-day) entry the content
                      is short, so the primary action + exits live inline here —
                      directly after the Customize row — instead of in a pinned
                      footer that would leave a dead gap above it. */}
                  {singleTabOnly && (
                    <View className="mt-6">
                      {primaryActionButton}
                      {dayScopeExits}
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>

            {/* §6.7: pinned footer only where the segmented control makes the
                content tall enough to warrant it (rest-day / no-plan). On the
                single-tab entry the primary action + exits move into the scroll
                flow above, so the sheet no longer stretches. */}
            {!singleTabOnly && (
              <View className="px-5 pb-10 mb-5">{primaryActionButton}</View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Custom Dialog */}
      {dialogConfig && (
        <CustomDialog
          visible={dialogVisible}
          onClose={() => setDialogVisible(false)}
          title={dialogConfig.title}
          description={dialogConfig.description}
          primaryButton={dialogConfig.primaryButton}
          secondaryButton={dialogConfig.secondaryButton}
          icon={dialogConfig.icon}
        />
      )}
    </Modal>
  );
}
