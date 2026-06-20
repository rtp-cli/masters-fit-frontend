import { useState } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { StreakChip, StreakPopover } from "@/components/streak";
import { useAuth } from "@/contexts/auth-context";
import { useThemeColors } from "@/lib/theme";
import SearchModal from "./search/search-modal";
import SettingsModal from "./settings/settings-modal";

interface HeaderProps {
  workoutTitle?: string;
  currentDate?: string;
  /** Current workout streak; the chip is shown on the dashboard when >= 1. */
  streak?: number;
  onSearchPress?: () => void;
  onSettingsPress?: () => void;
}

export default function Header({
  workoutTitle,
  currentDate,
  streak,
  onSearchPress,
  onSettingsPress,
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const colors = useThemeColors();

  // Modal state
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [streakPopoverVisible, setStreakPopoverVisible] = useState(false);
  // True between a logout request and the sheet finishing its dismiss animation.
  const [logoutPending, setLogoutPending] = useState(false);

  // Perform the actual logout: clear auth state, then navigate to the root.
  // Only runs once the settings sheet has fully dismissed, so router.replace
  // (which unmounts this Header) never tears down the sheet mid-animation.
  const finishLogout = () => {
    logout();
    router.replace("/");
  };

  const handleRequestLogout = () => {
    setLogoutPending(true);
    setSettingsModalVisible(false);
    // iOS waits for the pageSheet dismiss animation via Modal.onDismiss.
    // Android has no onDismiss and no orphaned-sheet issue, so act now.
    if (Platform.OS !== "ios") {
      setLogoutPending(false);
      finishLogout();
    }
  };

  // Determine which header to show based on current route
  const isDashboard = pathname === "/" || pathname.includes("dashboard");
  const isCalendar = pathname.includes("calendar");
  const isWorkout = pathname.includes("workout");

  // Don't show header on workout tab
  if (isWorkout) {
    return null;
  }

  // Handle search icon press
  const handleSearchPress = () => {
    if (onSearchPress) {
      onSearchPress();
    } else {
      setSearchModalVisible(true);
    }
  };

  // Handle settings icon press
  const handleSettingsPress = () => {
    if (onSettingsPress) {
      onSettingsPress();
    } else {
      setSettingsModalVisible(true);
    }
  };

  return (
    <View className="p-1">
      <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
        {/* Left side - Title */}
        <View className="flex-1">
          {isDashboard && (
            <View className="flex-row items-center gap-2">
              <View className="flex-1">
                <Text className="text-lg font-bold text-text-primary">
                  Hey {user?.name || "User"}!
                </Text>
                {currentDate && (
                  <Text className="text-sm text-text-muted mt-1">
                    {currentDate}
                  </Text>
                )}
              </View>
            </View>
          )}
          {isCalendar && (
            <Text className="text-lg font-bold text-text-primary">
              {workoutTitle || "Workout Calendar"}
            </Text>
          )}
        </View>

        {/* Right side - Icons */}
        <View className="flex-row items-center space-x-4">
          {isDashboard && typeof streak === "number" && streak >= 1 && (
            <View className="mr-3">
              <StreakChip
                count={streak}
                onPress={() => setStreakPopoverVisible(true)}
              />
            </View>
          )}

          <TouchableOpacity
            onPress={handleSearchPress}
            className="w-10 h-10 rounded-full items-center justify-center bg-surface mr-1"
          >
            <Ionicons name="search" size={20} color={colors.text.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSettingsPress}
            className="w-10 h-10 rounded-full items-center justify-center bg-surface"
          >
            <Ionicons name="person" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Modals */}
      <StreakPopover
        visible={streakPopoverVisible}
        count={streak ?? 0}
        onClose={() => setStreakPopoverVisible(false)}
      />
      <SearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
      />
      <SettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        onRequestLogout={handleRequestLogout}
        onDismiss={() => {
          if (logoutPending) {
            setLogoutPending(false);
            finishLogout();
          }
        }}
      />
    </View>
  );
}
