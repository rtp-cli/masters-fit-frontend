import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@contexts/AuthContext";
import { useRouter } from "expo-router";
import { Profile } from "@lib/profile";
import { useAppDataContext } from "@contexts/AppDataContext";
import { formatEnumValue, getIntensityText } from "@utils/index";
import { formatHeight } from "@/components/onboarding/utils/formatters";
import { colors } from "../../lib/theme";
import { SettingsSkeleton } from "../../components/skeletons/SkeletonScreens";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { data: { profileData }, refresh: { refreshProfile }, loading } = useAppDataContext();

  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  // Use profile data from the centralized store
  const profile = profileData;

  // Load user profile data
  const loadUserData = async () => {
    if (!user?.id) return;

    try {
      await refreshProfile();
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    await refreshProfile();
  };

  useEffect(() => {
    // Only fetch if we don't have profile data yet
    if (!profileData) {
      loadUserData();
    }
  }, [user?.id, profileData]);

  // Handle logout
  const handleLogout = async () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/");
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Format available days for display
  const formatAvailableDays = (days: string[] | undefined) => {
    if (!days || days.length === 0) return [];
    const dayMap: { [key: string]: string } = {
      monday: "M",
      tuesday: "T",
      wednesday: "W",
      thursday: "T",
      friday: "F",
      saturday: "S",
      sunday: "S",
    };

    return [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ].map((day, index) => ({
      day: dayMap[day],
      active: days.includes(day),
      index,
    }));
  };

  // Get user initials
  const getUserInitials = () => {
    if (user?.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return "U";
  };

  // Get fitness level display
  const getFitnessLevelDisplay = (level: string | undefined) => {
    if (!level) return "Not specified";
    return formatEnumValue(level);
  };

  // Handle environment display with robust error handling
  const getEnvironmentDisplay = (environment: string | undefined | null) => {
    if (!environment || environment === "") return "Not specified";
    try {
      return formatEnumValue(environment);
    } catch (error) {
      console.error("Environment formatting error:", error);
      return environment;
    }
  };

  // Get intensity level display with robust error handling
  const getIntensityLevelDisplay = (
    level: string | number | undefined | null
  ) => {
    if (!level || level === "") return "Not specified";

    try {
      // Handle string intensity levels ("low", "moderate", "high") - primary case
      if (typeof level === "string") {
        // Handle legacy numeric strings like "3" -> convert to proper text
        if (level === "1") return "Low";
        if (level === "2") return "Moderate";
        if (level === "3") return "High";

        // Handle proper enum strings
        return formatEnumValue(level);
      }

      // Handle numeric intensity levels (1-5 scale) - fallback for legacy data
      if (typeof level === "number") {
        if (level <= 3) {
          // Convert 1-3 scale to proper enum values
          return level === 1 ? "Low" : level === 2 ? "Moderate" : "High";
        } else {
          // Use 1-5 scale
          return getIntensityText(level);
        }
      }
    } catch (error) {
      console.error("Intensity level formatting error:", error);
      return String(level);
    }

    return "Not specified";
  };

  if (loading.profileLoading && !profile) {
    return <SettingsSkeleton />;
  }

  return (
    <View className="flex-1 pt-6 bg-background">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={loading.profileLoading} onRefresh={handleRefresh} />
        }
      >
        {/* Profile Section */}
        <View className="items-center px-6 mb-6">
          <View className="w-20 h-20 rounded-full bg-primary items-center justify-center mb-4">
            <Text className="text-3xl font-bold text-white">
              {getUserInitials()}
            </Text>
          </View>
          <Text className="text-xl font-bold text-text-primary">
            {user?.name || "User"}
          </Text>
          <Text className="text-sm text-text-muted mt-1">
            {user?.email || "No email provided"}
          </Text>
        </View>

        {/* Quick Actions */}
        <View className="px-6 mb-6">
          <Text className="text-base font-semibold text-text-primary p-4 mb-4">
            Quick Actions
          </Text>
          <View className="flex-row justify-around">
            <TouchableOpacity
              className="items-center"
              onPress={() => router.push("/profile-edit")}
            >
              <View className="w-12 h-12 rounded-full bg-primary items-center justify-center mb-2">
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={colors.neutral.light[1]}
                />
              </View>
              <Text className="text-xs text-text-muted">Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity className="items-center">
              <View className="w-12 h-12 rounded-full bg-primary items-center justify-center mb-2">
                <Ionicons
                  name="help-circle-outline"
                  size={20}
                  color={colors.neutral.light[1]}
                />
              </View>
              <Text className="text-xs text-text-muted">Help</Text>
            </TouchableOpacity>

            <TouchableOpacity className="items-center">
              <View className="w-12 h-12 rounded-full bg-primary items-center justify-center mb-2">
                <Ionicons
                  name="share-outline"
                  size={20}
                  color={colors.neutral.light[1]}
                />
              </View>
              <Text className="text-xs text-text-muted">Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Personal Information */}
        {profile && (
          <View className="px-6 mb-6 bg-white rounded-xl overflow-hidden">
            <Text className="text-base font-semibold text-text-primary p-4 pb-2">
              Personal Information
            </Text>

            <View className="px-4 py-3 border-t border-neutral-light-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-text-primary">Age</Text>
                <Text className="text-sm text-text-muted">
                  {profile.age ? `${profile.age} years` : "Not specified"}
                </Text>
              </View>
            </View>

            <View className="px-4 py-3 border-t border-neutral-light-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-text-primary">Height</Text>
                <Text className="text-sm text-text-muted">
                  {profile.height
                    ? formatHeight(profile.height)
                    : "Not specified"}
                </Text>
              </View>
            </View>

            <View className="px-4 py-3 border-t border-neutral-light-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-text-primary">Weight</Text>
                <Text className="text-sm text-text-muted">
                  {profile.weight ? `${profile.weight} lbs` : "Not specified"}
                </Text>
              </View>
            </View>

            <View className="px-4 py-3 border-t border-neutral-light-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-text-primary">Gender</Text>
                <Text className="text-sm text-text-muted">
                  {profile.gender
                    ? formatEnumValue(profile.gender)
                    : "Not specified"}
                </Text>
              </View>
            </View>

            <View className="px-4 py-3 border-t border-neutral-light-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-text-primary">Environment</Text>
                <Text className="text-sm text-text-muted">
                  {getEnvironmentDisplay(profile.environment)}
                </Text>
              </View>
            </View>

            <View className="px-4 py-3 border-t border-neutral-light-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-text-primary">Fitness Level</Text>
                <Text className="text-sm text-text-muted">
                  {getFitnessLevelDisplay(profile.fitnessLevel)}
                </Text>
              </View>
            </View>

            <View className="px-4 py-3 border-t border-neutral-light-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-text-primary">
                  Workout Duration
                </Text>
                <Text className="text-sm text-text-muted">
                  {profile.workoutDuration
                    ? `${profile.workoutDuration} minutes`
                    : "Not specified"}
                </Text>
              </View>
            </View>

            <View className="px-4 py-3 border-t border-neutral-light-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-text-primary">
                  Intensity Level
                </Text>
                <Text className="text-sm text-text-muted">
                  {getIntensityLevelDisplay(profile.intensityLevel)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Fitness Goals */}
        {profile?.goals && profile.goals.length > 0 && (
          <View className="px-6 mb-6 bg-white rounded-xl overflow-hidden">
            <Text className="text-base font-semibold text-text-primary p-4 pb-3">
              Fitness Goals
            </Text>
            <View className="px-4 pb-4">
              <View className="flex-row flex-wrap">
                {profile.goals.map((goal, index) => (
                  <View
                    key={index}
                    className="bg-primary rounded-xl px-3 py-1 mr-2 mb-2"
                  >
                    <Text className="text-xs font-medium text-neutral-light-1">
                      {formatEnumValue(goal)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Preferred Workout Types */}
        {profile?.preferredStyles && profile.preferredStyles.length > 0 && (
          <View className="mx-6 mb-6   rounded-xl overflow-hidden">
            <Text className="text-base font-semibold text-text-primary p-4 pb-3">
              Preferred Workout Types
            </Text>
            <View className="px-4 pb-4">
              <View className="flex-row flex-wrap">
                {profile.preferredStyles.map((style, index) => (
                  <View
                    key={index}
                    className="bg-primary rounded-xl px-3 py-1 mr-2 mb-2"
                  >
                    <Text className="text-xs font-medium text-neutral-light-1">
                      {style === "HIIT" ? "HIIT" : formatEnumValue(style)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Equipment Available */}
        {profile?.equipment && profile.equipment.length > 0 && (
          <View className="mx-6 mb-6   rounded-xl overflow-hidden">
            <Text className="text-base font-semibold text-text-primary p-4 pb-3">
              Available Equipment
            </Text>
            <View className="px-4 pb-4">
              <View className="flex-row flex-wrap mb-2">
                {profile.equipment.map((item, index) => (
                  <View
                    key={index}
                    className="bg-primary rounded-xl px-3 py-1 mr-2 mb-2"
                  >
                    <Text className="text-xs font-medium text-neutral-light-1">
                      {formatEnumValue(item)}
                    </Text>
                  </View>
                ))}
              </View>
              {profile.otherEquipment && (
                <View className="px-4 pb-4 border-t border-neutral-light-2 pt-3">
                  <Text className="text-sm font-medium text-text-primary mb-2">
                    Other Equipment
                  </Text>
                  <Text className="text-sm text-text-muted">
                    {profile.otherEquipment}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Weekly Schedule */}
        {profile?.availableDays && profile.availableDays.length > 0 && (
          <View className="mx-6 mb-6   rounded-xl overflow-hidden">
            <Text className="text-base font-semibold text-text-primary p-4 pb-3">
              Weekly Schedule
            </Text>
            <View className="flex-row justify-between px-4 pb-4">
              {formatAvailableDays(profile.availableDays).map((dayInfo) => (
                <View
                  key={dayInfo.index}
                  className={`w-8 h-8 rounded-full items-center justify-center ${
                    dayInfo.active ? "bg-text-primary" : "bg-neutral-light-2"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      dayInfo.active ? "text-white" : "text-text-muted"
                    }`}
                  >
                    {dayInfo.day}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Limitations & Medical Notes */}
        {((profile?.limitations && profile.limitations.length > 0) ||
          profile?.medicalNotes) && (
          <View className="mx-6 mb-6   rounded-xl overflow-hidden">
            <Text className="text-base font-semibold text-text-primary p-4 pb-3">
              Health Information
            </Text>

            {profile.limitations && profile.limitations.length > 0 && (
              <View className="px-4 pb-3">
                <Text className="text-sm font-medium text-text-primary mb-2">
                  Limitations
                </Text>
                <View className="flex-row flex-wrap">
                  {profile.limitations.map((limitation, index) => (
                    <View
                      key={index}
                      className="bg-primary rounded-xl px-3 py-1 mr-2 mb-2"
                    >
                      <Text className="text-xs font-medium text-neutral-light-1">
                        {formatEnumValue(limitation)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {profile.medicalNotes && (
              <View className="px-4 pb-4 border-t border-neutral-light-2 pt-3">
                <Text className="text-sm font-medium text-text-primary mb-2">
                  Medical Notes
                </Text>
                <Text className="text-sm text-text-muted">
                  {profile.medicalNotes}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* App Settings */}
        <View className="mx-6 mb-6   rounded-xl overflow-hidden">
          <Text className="text-base font-semibold text-text-primary p-4 pb-2">
            App Settings
          </Text>

          <View className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-light-2">
            <View className="flex-row items-center flex-1">
              <Ionicons
                name="notifications-outline"
                size={20}
                color={colors.text.muted}
              />
              <Text className="text-sm text-text-primary ml-3">
                Push Notifications
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{
                false: colors.neutral.medium[1],
                true: colors.brand.primary,
              }}
              thumbColor={
                notificationsEnabled
                  ? colors.neutral.white
                  : colors.neutral.light[1]
              }
            />
          </View>

          <View className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-light-2">
            <View className="flex-row items-center flex-1">
              <Ionicons
                name="moon-outline"
                size={20}
                color={colors.text.muted}
              />
              <Text className="text-sm text-text-primary ml-3">Dark Mode</Text>
            </View>
            <Switch
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
              trackColor={{
                false: colors.neutral.medium[1],
                true: colors.brand.primary,
              }}
              thumbColor={
                darkModeEnabled ? colors.neutral.white : colors.neutral.light[1]
              }
            />
          </View>

          <TouchableOpacity className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-light-2">
            <View className="flex-row items-center flex-1">
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={colors.text.muted}
              />
              <Text className="text-sm text-text-primary ml-3">
                Privacy Settings
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.neutral.medium[3]}
            />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <View className="px-6 mb-4">
          <TouchableOpacity
            className="bg-white rounded-xl p-4 flex-row items-center justify-center"
            onPress={handleLogout}
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color={colors.brand.secondary}
              className="mr-2"
            />
            <Text className="text-red-700 font-semibold">Log Out</Text>
          </TouchableOpacity>
        </View>

        {/* Version Info */}
        <View className="items-center pb-8">
          <Text className="text-xs text-text-muted">Masters Fit v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}
