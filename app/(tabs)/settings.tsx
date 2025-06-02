import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@contexts/AuthContext";
import { useRouter } from "expo-router";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

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

  return (
    <SafeAreaView className="flex-1 bg-neutral-light-1">
      <ScrollView className="flex-1">
        {/* Profile Section */}
        <View className="p-6 bg-white items-center">
          <View className="w-20 h-20 rounded-full bg-indigo-500 items-center justify-center mb-4">
            <Text className="text-3xl font-bold text-white">
              {user?.name?.charAt(0) || "M"}
            </Text>
          </View>
          <Text className="text-xl font-bold text-text-primary">
            {user?.name || "Michael Thompson"}
          </Text>
        </View>

        {/* Quick Actions */}
        <View className="px-6 py-4">
          <Text className="text-base font-semibold text-text-primary mb-4">
            Quick Actions
          </Text>
          <View className="flex-row justify-between">
            <TouchableOpacity className="items-center">
              <View className="w-12 h-12 rounded-full bg-yellow-100 items-center justify-center mb-2">
                <Ionicons name="person-outline" size={20} color="#F59E0B" />
              </View>
              <Text className="text-xs text-text-muted">Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity className="items-center">
              <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center mb-2">
                <Ionicons
                  name="help-circle-outline"
                  size={20}
                  color="#3B82F6"
                />
              </View>
              <Text className="text-xs text-text-muted">Help</Text>
            </TouchableOpacity>

            <TouchableOpacity className="items-center">
              <View className="w-12 h-12 rounded-full bg-orange-100 items-center justify-center mb-2">
                <Ionicons name="share-outline" size={20} color="#F97316" />
              </View>
              <Text className="text-xs text-text-muted">Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Settings */}
        <View className="mx-6 mb-4 bg-white rounded-xl overflow-hidden">
          <Text className="text-base font-semibold text-text-primary p-4 pb-2">
            Account Settings
          </Text>

          <TouchableOpacity className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-light-2">
            <View className="flex-row items-center flex-1">
              <Ionicons name="person-outline" size={20} color="#6B7280" />
              <Text className="text-sm text-text-primary ml-3">
                Personal Information
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-light-2">
            <View className="flex-row items-center flex-1">
              <Ionicons
                name="notifications-outline"
                size={20}
                color="#6B7280"
              />
              <Text className="text-sm text-text-primary ml-3">
                Notification Preferences
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-light-2">
            <View className="flex-row items-center flex-1">
              <Ionicons
                name="phone-portrait-outline"
                size={20}
                color="#6B7280"
              />
              <Text className="text-sm text-text-primary ml-3">
                Connected Devices & Apps
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-xs text-text-muted mr-2">3 connected</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-light-2">
            <View className="flex-row items-center flex-1">
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#6B7280"
              />
              <Text className="text-sm text-text-primary ml-3">
                Privacy Settings
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-light-2">
            <View className="flex-row items-center flex-1">
              <Ionicons name="flag-outline" size={20} color="#6B7280" />
              <Text className="text-sm text-text-primary ml-3">
                Goals & Preferences
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Fitness Preferences */}
        <View className="mx-6 mb-4 bg-white rounded-xl overflow-hidden">
          <Text className="text-base font-semibold text-text-primary p-4 pb-3">
            Fitness Preferences
          </Text>

          {/* Preferred Workout Types */}
          <View className="px-4 pb-3">
            <Text className="text-sm font-medium text-text-primary mb-3">
              Preferred Workout Types
            </Text>
            <View className="flex-row flex-wrap">
              <View className="bg-primary rounded-full px-3 py-1 mr-2 mb-2">
                <Text className="text-xs font-medium text-secondary">
                  Strength Training
                </Text>
              </View>
              <View className="bg-blue-100 rounded-full px-3 py-1 mr-2 mb-2">
                <Text className="text-xs font-medium text-blue-700">HIIT</Text>
              </View>
              <View className="bg-green-100 rounded-full px-3 py-1 mr-2 mb-2">
                <Text className="text-xs font-medium text-green-700">Yoga</Text>
              </View>
              <View className="bg-orange-100 rounded-full px-3 py-1 mr-2 mb-2">
                <Text className="text-xs font-medium text-orange-700">
                  Walking
                </Text>
              </View>
              <View className="bg-purple-100 rounded-full px-3 py-1 mr-2 mb-2">
                <Text className="text-xs font-medium text-purple-700">
                  Cycling
                </Text>
              </View>
            </View>
          </View>

          {/* Fitness Goals */}
          <View className="px-4 pb-4 border-t border-neutral-light-2 pt-3">
            <Text className="text-sm font-medium text-text-primary mb-3">
              Fitness Goals
            </Text>
            <View className="flex-row flex-wrap">
              <View className="bg-primary rounded-full px-3 py-1 mr-2 mb-2">
                <Text className="text-xs font-medium text-secondary">
                  Weight Loss
                </Text>
              </View>
              <View className="bg-teal-100 rounded-full px-3 py-1 mr-2 mb-2">
                <Text className="text-xs font-medium text-teal-700">
                  Muscle Gain
                </Text>
              </View>
              <View className="bg-indigo-100 rounded-full px-3 py-1 mr-2 mb-2">
                <Text className="text-xs font-medium text-indigo-700">
                  Endurance
                </Text>
              </View>
              <View className="bg-pink-100 rounded-full px-3 py-1 mr-2 mb-2">
                <Text className="text-xs font-medium text-pink-700">
                  Flexibility
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Weekly Schedule */}
        <View className="mx-6 mb-6 bg-white rounded-xl overflow-hidden">
          <Text className="text-base font-semibold text-text-primary p-4 pb-3">
            Weekly Schedule
          </Text>
          <View className="flex-row justify-between px-4 pb-4">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
              <View
                key={index}
                className={`w-8 h-8 rounded-full items-center justify-center ${
                  [0, 2, 4].includes(index)
                    ? "bg-text-primary"
                    : "bg-neutral-light-2"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    [0, 2, 4].includes(index) ? "text-white" : "text-text-muted"
                  }`}
                >
                  {day}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Logout Button */}
        <View className="mx-6 mb-8">
          <TouchableOpacity
            className="bg-white rounded-xl p-4 flex-row items-center justify-center"
            onPress={handleLogout}
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color="#EF4444"
              style={{ marginRight: 8 }}
            />
            <Text className="text-red-500 font-semibold">Log Out</Text>
          </TouchableOpacity>
        </View>

        {/* Version Info */}
        <View className="items-center pb-8">
          <Text className="text-xs text-text-muted">Masters Fit v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
