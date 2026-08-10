import { Ionicons } from "@expo/vector-icons";
import { fetchUserProfile, type Profile,updateUserProfile } from "@lib/profile";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getStepConfig } from "@/components/onboarding/utils/step-config";
import OnboardingForm, {
  type FormData,
  ONBOARDING_SLIDER_DEFAULTS,
} from "@/components/onboarding-form";
import { CustomDialog, type DialogButton } from "@/components/ui";
import { useAppDataContext } from "@/contexts/app-data-context";
import { useAuth } from "@/contexts/auth-context";
import {
  AVAILABLE_EQUIPMENT,
  FITNESS_GOALS,
  FITNESS_LEVELS,
  GENDER,
  INTENSITY_LEVELS,
  ONBOARDING_STEP,
  PHYSICAL_LIMITATIONS,
  PREFERRED_DAYS,
  PREFERRED_STYLES,
  WORKOUT_ENVIRONMENTS,
} from "@/types/enums/fitness.enums";

import { useThemeColors } from "../lib/theme";

export default function ProfileEditScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const router = useRouter();

  // §9: a Settings card passes ?step=<ENUM_NAME> to edit exactly one step. The
  // form still initialises from the full profile, so untouched fields are saved
  // unchanged. Without a valid step we fall back to the full form (legacy link).
  const { step } = useLocalSearchParams<{ step?: string }>();
  const editStep =
    step && step in ONBOARDING_STEP
      ? ONBOARDING_STEP[step as keyof typeof ONBOARDING_STEP]
      : undefined;
  const editSteps = editStep !== undefined ? [editStep] : undefined;
  const headerTitle =
    editStep !== undefined ? getStepConfig(editStep).title : "Edit Profile";

  // Get data refresh functions
  const {
    refresh: { refreshProfile },
  } = useAppDataContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // §A2.2: the form reports when its values diverge from what it mounted with, so
  // the back arrow only raises the discard dialog when there is something to lose.
  const [isDirty, setIsDirty] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    description: string;
    primaryButton: DialogButton;
    secondaryButton?: DialogButton;
    icon?: keyof typeof Ionicons.glyphMap;
  } | null>(null);

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const profileData = await fetchUserProfile();
        setProfile(profileData);
      } catch (error) {
        console.error("Error loading profile:", error);
        setDialogConfig({
          title: "Error",
          description: "Failed to load your profile data",
          primaryButton: {
            text: "OK",
            onPress: () => setDialogVisible(false),
          },
          icon: "alert-circle",
        });
        setDialogVisible(true);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      loadProfile();
    }
  }, [user?.id]);

  // Convert profile data to form data format
  const convertProfileToFormData = (profile: Profile): FormData => {
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
        // Handle string values
        switch (profile.intensityLevel.toLowerCase()) {
          case "low":
            intensityLevel = INTENSITY_LEVELS.LOW;
            break;
          case "moderate":
            intensityLevel = INTENSITY_LEVELS.MODERATE;
            break;
          case "high":
            intensityLevel = INTENSITY_LEVELS.HIGH;
            break;
          default:
            intensityLevel = INTENSITY_LEVELS.MODERATE;
        }
      }
    }

    // Handle environment - convert from string to enum if needed
    let environment = WORKOUT_ENVIRONMENTS.HOME_GYM;
    if (profile.environment) {
      if (Array.isArray(profile.environment)) {
        environment = profile.environment[0] as WORKOUT_ENVIRONMENTS;
      } else {
        // Map string values to enum (handle both old and new values)
        switch (profile.environment.toLowerCase()) {
          case "home":
          case "home_gym":
            environment = WORKOUT_ENVIRONMENTS.HOME_GYM;
            break;
          case "gym":
          case "commercial_gym":
            environment = WORKOUT_ENVIRONMENTS.COMMERCIAL_GYM;
            break;
          case "hybrid":
          case "bodyweight_only":
            environment = WORKOUT_ENVIRONMENTS.BODYWEIGHT_ONLY;
            break;
          default:
            environment = WORKOUT_ENVIRONMENTS.HOME_GYM;
        }
      }
    }

    // §9.3: absent → nothing selected. Was defaulted to MALE, with unrecognised
    // strings silently becoming FEMALE — both hid that the user never answered.
    let gender: GENDER | undefined;
    if (profile.gender) {
      switch (profile.gender.toLowerCase()) {
        case GENDER.MALE:
          gender = GENDER.MALE;
          break;
        case GENDER.FEMALE:
          gender = GENDER.FEMALE;
          break;
      }
    }

    // §9.3: absent → nothing selected (was defaulted to BEGINNER).
    let fitnessLevel: FITNESS_LEVELS | undefined;
    if (profile.fitnessLevel) {
      switch (profile.fitnessLevel.toLowerCase()) {
        case "beginner":
          fitnessLevel = FITNESS_LEVELS.BEGINNER;
          break;
        case "intermediate":
          fitnessLevel = FITNESS_LEVELS.INTERMEDIATE;
          break;
        case "advanced":
          fitnessLevel = FITNESS_LEVELS.ADVANCED;
          break;
      }
    }

    // Convert string arrays to enum arrays
    const convertStringArrayToEnum = <T extends string>(
      arr: string[] | undefined,
      enumObj: Record<string, T>
    ): T[] => {
      if (!arr) return [];
      return arr
        .map((item) => {
          const enumKey = Object.keys(enumObj).find(
            (key) => enumObj[key].toLowerCase() === item.toLowerCase()
          );
          return enumKey ? enumObj[enumKey] : null;
        })
        .filter((item): item is T => item !== null);
    };

    return {
      email: user?.email || "",
      age: profile.age ?? ONBOARDING_SLIDER_DEFAULTS.age,
      height: profile.height ?? ONBOARDING_SLIDER_DEFAULTS.height,
      weight: profile.weight ?? ONBOARDING_SLIDER_DEFAULTS.weight,
      gender: gender,
      goals: convertStringArrayToEnum(profile.goals, FITNESS_GOALS),
      limitations: convertStringArrayToEnum(
        profile.limitations,
        PHYSICAL_LIMITATIONS
      ),
      fitnessLevel: fitnessLevel,
      environment: environment,
      equipment: convertStringArrayToEnum(
        profile.equipment,
        AVAILABLE_EQUIPMENT
      ),
      otherEquipment: profile.otherEquipment || "",
      preferredStyles: convertStringArrayToEnum(
        profile.preferredStyles,
        PREFERRED_STYLES
      ),
      availableDays: convertStringArrayToEnum(
        profile.availableDays,
        PREFERRED_DAYS
      ),
      workoutDuration:
        profile.workoutDuration ?? ONBOARDING_SLIDER_DEFAULTS.workoutDuration,
      intensityLevel: intensityLevel,
      medicalNotes: profile.medicalNotes || "",
      includeWarmup: profile.includeWarmup ?? true,
      includeCooldown: profile.includeCooldown ?? true,
    };
  };

  // Handle profile update
  const handleUpdateProfile = async (formData: FormData) => {
    try {
      setSaving(true);

      // Convert form data to profile update format - matching the working onboarding format
      const profileData = {
        age: formData.age,
        height: formData.height,
        weight: formData.weight,
        gender: formData.gender!.toString(),
        goals: formData.goals.map((g: FITNESS_GOALS) => g.toString()),
        limitations:
          formData.limitations?.map((l: PHYSICAL_LIMITATIONS) =>
            l.toString()
          ) || [],
        fitnessLevel: formData.fitnessLevel!.toString(),
        environment: formData.environment!.toString(),
        equipment:
          formData.equipment?.map((e: AVAILABLE_EQUIPMENT) => e.toString()) ||
          [],
        otherEquipment: formData.otherEquipment || "",
        preferredStyles: formData.preferredStyles.map((s: PREFERRED_STYLES) =>
          s.toString()
        ),
        availableDays: formData.availableDays.map((d: PREFERRED_DAYS) =>
          d.toString()
        ),
        workoutDuration: formData.workoutDuration,
        intensityLevel: formData.intensityLevel.toString(),
        medicalNotes: formData.medicalNotes,
        includeWarmup: formData.includeWarmup ?? true,
        includeCooldown: formData.includeCooldown ?? true,
      };

      // Update the profile
      const updatedProfile = await updateUserProfile(profileData);

      if (updatedProfile) {
        // §A2.3: return to Settings silently — no success dialog, no toast. The
        // new value on the card you came from is the confirmation.
        await refreshProfile();
        router.back();
      } else {
        throw new Error("Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setDialogConfig({
        title: "Error",
        description: "Failed to update your profile. Please try again.",
        primaryButton: {
          text: "OK",
          onPress: () => setDialogVisible(false),
        },
        icon: "alert-circle",
      });
      setDialogVisible(true);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // §A2.2: a clean editor pops immediately; a dirty one confirms first. (Dirty
    // tracking is what fixes the old bug where this fired with nothing edited.)
    if (!isDirty) {
      router.back();
      return;
    }
    setDialogConfig({
      title: "Discard changes?",
      description: "Your edits won't be saved.",
      icon: "warning",
      secondaryButton: {
        text: "Cancel",
        onPress: () => setDialogVisible(false),
      },
      primaryButton: {
        text: "Discard",
        onPress: () => {
          setDialogVisible(false);
          router.back();
        },
      },
    });
    setDialogVisible(true);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color={colors.brand.primary} />
        <Text className="text-text-muted mt-4">Loading your profile...</Text>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <Text className="text-text-muted">Failed to load profile</Text>
        <TouchableOpacity
          className="mt-4 bg-primary px-6 py-3 rounded-xl"
          onPress={() => router.back()}
        >
          <Text className="text-secondary font-semibold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-background border-b border-neutral-light-2">
        <TouchableOpacity onPress={handleCancel}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-text-primary">
          {headerTitle}
        </Text>
        <View className="w-6" />
      </View>

      {/* Onboarding Form — pinned to one step when opened from a Settings card */}
      <OnboardingForm
        mode="edit"
        steps={editSteps}
        initialData={convertProfileToFormData(profile)}
        onSubmit={handleUpdateProfile}
        isLoading={saving}
        submitButtonText="Save"
        onDirtyChange={setIsDirty}
      />

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
    </SafeAreaView>
  );
}
