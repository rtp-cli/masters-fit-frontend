import { usePathname, useRouter } from "expo-router";
import { useState } from "react";
import { Platform,Text, View } from "react-native";

import { IconButton } from "@/components/icon-button";
import { StreakChip, StreakPopover } from "@/components/streak";
import { useAuth } from "@/contexts/auth-context";

import SearchModal from "./search/search-modal";
import SettingsModal from "./settings/settings-modal";

interface HeaderProps {
  /** Screen title. When omitted on the dashboard, renders "Hey {name}!". */
  title?: string;
  /** One-line context under the title (date, plan name, workout meta). */
  subtitle?: string;
  currentDate?: string;
  /** Current workout streak; the chip is shown on the dashboard when >= 1. */
  streak?: number;
  /** Hide the search/settings actions (active workout). Default shown. */
  showActions?: boolean;
  /** Rendered on the right instead of icons (e.g. the elapsed-time clock). */
  rightAccessory?: React.ReactNode;
  /** Rendered full-width below the title row (e.g. the progress bar). */
  children?: React.ReactNode;
  onSearchPress?: () => void;
  onSettingsPress?: () => void;
}

export default function Header({
  title,
  subtitle,
  currentDate,
  streak,
  showActions = true,
  rightAccessory,
  children,
  onSearchPress,
  onSettingsPress,
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

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

  // The dashboard keeps its personalised greeting + streak chip; every other
  // screen passes an explicit title. (The old `if (isWorkout) return null`
  // is gone — the Workout tab renders this header now that the hero is dead.)
  const isDashboard =
    !title && (pathname === "/" || pathname.includes("dashboard"));

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
        {/* Left side - Title + subtitle */}
        <View className="flex-1 mr-3">
          <Text
            className="text-lg font-bold text-text-primary"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title ?? `Hey ${user?.name || "User"}!`}
          </Text>
          {(subtitle ?? (isDashboard ? currentDate : undefined)) && (
            <Text
              className="text-sm text-text-muted mt-1"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {subtitle ?? currentDate}
            </Text>
          )}
        </View>

        {/* Right side - accessory or icons */}
        {rightAccessory ?? (
          showActions ? (
            <View className="flex-row items-center space-x-4">
              {isDashboard && typeof streak === "number" && streak >= 1 && (
                <View className="mr-1">
                  <StreakChip
                    count={streak}
                    onPress={() => setStreakPopoverVisible(true)}
                  />
                </View>
              )}

              <IconButton
                icon="search"
                accessibilityLabel="Search"
                onPress={handleSearchPress}
                className="mr-1"
              />

              <IconButton
                icon="person"
                accessibilityLabel="Settings"
                onPress={handleSettingsPress}
              />
            </View>
          ) : null
        )}
      </View>

      {/* Below-row slot (e.g. the active workout's progress bar) */}
      {children}

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
