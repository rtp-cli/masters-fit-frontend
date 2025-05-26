import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
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
    <SafeAreaView edges={["top"]} style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0) || "U"}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name || "User"}</Text>
          <Text style={styles.userEmail}>
            {user?.email || "user@example.com"}
          </Text>
          <TouchableOpacity style={styles.editProfileButton}>
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>Preferences</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons
                name="notifications-outline"
                size={24}
                color="#4b5563"
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive workout reminders and updates
                </Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: "#e5e7eb", true: "#4f46e5" }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="moon-outline" size={24} color="#4b5563" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Dark Mode</Text>
                <Text style={styles.settingDescription}>
                  Switch between light and dark themes
                </Text>
              </View>
            </View>
            <Switch
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
              trackColor={{ false: "#e5e7eb", true: "#4f46e5" }}
              thumbColor="#ffffff"
            />
          </View>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="fitness-outline" size={24} color="#4b5563" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Workout Preferences</Text>
                <Text style={styles.settingDescription}>
                  Update your workout settings
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="sync-outline" size={24} color="#4b5563" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Data Synchronization</Text>
                <Text style={styles.settingDescription}>
                  Manage data syncing options
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>Support</Text>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="help-circle-outline" size={24} color="#4b5563" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Help Center</Text>
                <Text style={styles.settingDescription}>
                  Get help with your fitness journey
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons
                name="document-text-outline"
                size={24}
                color="#4b5563"
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Terms of Service</Text>
                <Text style={styles.settingDescription}>
                  Read our terms and conditions
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons
                name="shield-checkmark-outline"
                size={24}
                color="#4b5563"
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Privacy Policy</Text>
                <Text style={styles.settingDescription}>
                  Learn how we protect your data
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <View style={styles.settingsGroup}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons
              name="log-out-outline"
              size={20}
              color="#ef4444"
              style={styles.logoutIcon}
            />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>Masters Fit v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    padding: 24,
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  userEmail: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  editProfileButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#4f46e5",
    borderRadius: 20,
  },
  editProfileText: {
    fontSize: 14,
    color: "#4f46e5",
    fontWeight: "600",
  },
  settingsGroup: {
    marginTop: 20,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginHorizontal: 16,
    marginVertical: 12,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
  },
  settingDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    fontSize: 16,
    color: "#ef4444",
    fontWeight: "600",
  },
  versionInfo: {
    alignItems: "center",
    padding: 24,
  },
  versionText: {
    fontSize: 14,
    color: "#9ca3af",
  },
});
