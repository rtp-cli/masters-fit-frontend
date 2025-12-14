import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { useAuth } from "@/contexts/auth-context";
import { colors } from "@/lib/theme";
import SearchModal from "./search/search-modal";
import SettingsModal from "./settings/settings-modal";

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

  // Modal state
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

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
            <View>
              <Text className="text-lg font-bold text-text-primary">
                Hey {user?.name || "User"}!
              </Text>
              {currentDate && (
                <Text className="text-sm text-text-muted mt-1">
                  {currentDate}
                </Text>
              )}
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
          <TouchableOpacity
            onPress={handleSearchPress}
            className="w-10 h-10 rounded-full items-center justify-center bg-white"
          >
            <Ionicons name="search" size={20} color={colors.text.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSettingsPress}
            className="w-10 h-10 rounded-full items-center justify-center bg-white"
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
    </View>
  );
}
