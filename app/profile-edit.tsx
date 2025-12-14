import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth-context";
import { useAppDataContext } from "@/contexts/app-data-context";
import { fetchUserProfile, updateUserProfile, Profile } from "@lib/profile";
import OnboardingForm, { FormData } from "@/components/onboarding-form";
import { colors } from "../lib/theme";
import {
  FITNESS_GOALS,
  FITNESS_LEVELS,
  GENDER,
  PHYSICAL_LIMITATIONS,
  WORKOUT_ENVIRONMENTS,
  AVAILABLE_EQUIPMENT,
  PREFERRED_STYLES,
  PREFERRED_DAYS,
} from "@/types/enums/fitness.enums";

// TODO: move this to components and use constants from separate file

// Import enums directly from OnboardingForm since they're defined there

enum IntensityLevels {
  LOW = "low",
  MODERATE = "moderate",
  HIGH = "high",
}

export default function ProfileEditScreen() {
  const { user } = useAuth();
  const router = useRouter();

  // Get data refresh functions
  const {
    refresh: { refreshProfile },
  } = useAppDataContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const profileData = await fetchUserProfile();
        setProfile(profileData);
      } catch (error) {
        console.error("Error loading profile:", error);
        Alert.alert("Error", "Failed to load your profile data");
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
        // Handle string values
        switch (profile.intensityLevel.toLowerCase()) {
          case "low":
            intensityLevel = IntensityLevels.LOW;
            break;
          case "moderate":
            intensityLevel = IntensityLevels.MODERATE;
            break;
          case "high":
            intensityLevel = IntensityLevels.HIGH;
            break;
          default:
            intensityLevel = IntensityLevels.MODERATE;
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
        Alert.alert("Success", "Your profile has been updated successfully!", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      } else {
        throw new Error("Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Discard Changes?",
      "Are you sure you want to discard your changes?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => router.back(),
        },
      ]
    );
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
    </SafeAreaView>
  );
}
