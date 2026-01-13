import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { useAuth } from "@/contexts/auth-context";
import { useThemeColors } from "@/lib/theme";
import SearchModal from "./search/search-modal";
import SettingsModal from "./settings/settings-modal";
import SubscriptionDetailsModal from "./subscription/subscription-details-modal";
import { useSubscriptionStatus } from "@/hooks/use-subscription-status";

interface HeaderProps {
  workoutTitle?: string;
  currentDate?: string;
  onSearchPress?: () => void;
  onSettingsPress?: () => void;
}

export default function Header({
  workoutTitle,
  currentDate,
  onSearchPress,
  onSettingsPress,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const colors = useThemeColors();

  // Modal state
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [subscriptionDetailsVisible, setSubscriptionDetailsVisible] =
    useState(false);

  // Subscription status
  const { isPro } = useSubscriptionStatus();

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
                <View className="flex-row items-center gap-2">
                  <Text className="text-lg font-bold text-text-primary">
                    Hey {user?.name || "User"}!
                  </Text>
                  {isPro && (
                    <TouchableOpacity
                      onPress={() => setSubscriptionDetailsVisible(true)}
                      className="flex-row items-center bg-primary/15 px-2 py-1 rounded-xl gap-1"
                      activeOpacity={0.7}
                    >
                      <Ionicons name="star" size={14} color={colors.warning} />
                      <Text className="text-[11px] font-bold text-primary tracking-wide">
                        PRO
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                {currentDate && (
                  <Text className="text-sm text-text-muted mt-1">
                    {currentDate}
                  </Text>
                )}
              </View>
            </View>
          )}
          {isCalendar && (
            <View className="flex-row items-center gap-2">
              <Text className="text-lg font-bold text-text-primary">
                {workoutTitle || "Workout Calendar"}
              </Text>
              {isPro && (
                <TouchableOpacity
                  onPress={() => setSubscriptionDetailsVisible(true)}
                  className="flex-row items-center bg-primary/15 px-2 py-1 rounded-xl gap-1"
                  activeOpacity={0.7}
                >
                  <Ionicons name="star" size={14} color={colors.warning} />
                  <Text className="text-[11px] font-bold text-primary tracking-wide">
                    PRO
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Right side - Icons */}
        <View className="flex-row items-center space-x-4">
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
      <SearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
      />
      <SettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
      />
      <SubscriptionDetailsModal
        visible={subscriptionDetailsVisible}
        onClose={() => setSubscriptionDetailsVisible(false)}
      />
    </View>
  );
}
