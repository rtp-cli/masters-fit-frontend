import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth-context";
import { useAppDataContext } from "@/contexts/app-data-context";
import { fetchUserProfile, updateUserProfile, Profile } from "@lib/profile";
import OnboardingForm, { FormData } from "@/components/onboarding-form";
import { CustomDialog, DialogButton } from "@/components/ui";
import { useThemeColors } from "../lib/theme";
import {
  FITNESS_GOALS,
  FITNESS_LEVELS,
  GENDER,
  PHYSICAL_LIMITATIONS,
  WORKOUT_ENVIRONMENTS,
  AVAILABLE_EQUIPMENT,
  PREFERRED_STYLES,
  PREFERRED_DAYS,
  INTENSITY_LEVELS,
} from "@/types/enums/fitness.enums";

export default function ProfileEditScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const router = useRouter();

  // Get data refresh functions
  const {
    refresh: { refreshProfile },
  } = useAppDataContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

    // Handle gender conversion
    let gender = GENDER.MALE;
    if (profile.gender) {
      switch (profile.gender.toLowerCase()) {
        case GENDER.MALE:
          gender = GENDER.MALE;
          break;
        case GENDER.FEMALE:
          gender = GENDER.FEMALE;
          break;
        default:
          gender = GENDER.FEMALE;
      }
    }

    // Handle fitness level conversion
    let fitnessLevel = FITNESS_LEVELS.BEGINNER;
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
        default:
          fitnessLevel = FITNESS_LEVELS.BEGINNER;
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
      age: profile.age || 25,
      height: profile.height || 170,
      weight: profile.weight || 70,
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
      workoutDuration: profile.workoutDuration || 30,
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
        gender: formData.gender.toString(),
        goals: formData.goals.map((g: FITNESS_GOALS) => g.toString()),
        limitations:
          formData.limitations?.map((l: PHYSICAL_LIMITATIONS) =>
            l.toString()
          ) || [],
        fitnessLevel: formData.fitnessLevel.toString(),
        environment: formData.environment!.toString(),
        equipment:
          formData.equipment?.map((e: AVAILABLE_EQUIPMENT) => e.toString()) ||
          [],
        otherEquipment: formData.otherEquipment || "",
        workoutStyles: formData.preferredStyles.map((s: PREFERRED_STYLES) =>
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
      const updatedProfile = await updateUserProfile(profileData as any);

      if (updatedProfile) {
        // Refresh profile data after successful update
        await refreshProfile();
        setDialogConfig({
          title: "Success",
          description: "Your profile has been updated successfully!",
          primaryButton: {
            text: "OK",
            onPress: () => {
              setDialogVisible(false);
              router.back();
            },
          },
          icon: "checkmark-circle",
        });
        setDialogVisible(true);
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
    setDialogConfig({
      title: "Discard Changes?",
      description: "Are you sure you want to discard your changes?",
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
      icon: "warning",
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
          Edit Profile
        </Text>
        <View className="w-6" />
      </View>

      {/* Onboarding Form */}
      <OnboardingForm
        title="Update Your Profile"
        initialData={convertProfileToFormData(profile)}
        onSubmit={handleUpdateProfile}
        onCancel={handleCancel}
        isLoading={saving}
        submitButtonText="Save Changes"
        showNavigation={true}
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
