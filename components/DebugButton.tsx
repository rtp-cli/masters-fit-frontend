import React, { useState } from "react";
import { colors } from "../lib/theme";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../contexts/AuthContext";
import { getCurrentUser, getPendingEmail, getPendingUserId } from "../lib/auth";

const DebugButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const { user, logout } = useAuth();

  const gatherDebugInfo = async () => {
    try {
      const [token, storedUser, pendingEmail, pendingUserId, currentUser] =
        await Promise.all([
          SecureStore.getItemAsync("token"),
          SecureStore.getItemAsync("user"),
          getPendingEmail(),
          getPendingUserId(),
          getCurrentUser(),
        ]);

      setDebugInfo({
        contextUser: user,
        storedUserString: storedUser,
        storedUserParsed: storedUser ? JSON.parse(storedUser) : null,
        currentUser,
        pendingEmail,
        pendingUserId,
        hasToken: !!token,
        tokenPreview: token ? token.substring(0, 20) + "..." : null,
      });
      setIsVisible(true);
    } catch (error) {
      console.error("Error gathering debug info:", error);
      Alert.alert("Error", "Failed to gather debug info");
    }
  };

  const clearAllData = async () => {
    Alert.alert(
      "Clear All Data",
      "This will clear all stored authentication data. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
              await Promise.all([
                SecureStore.deleteItemAsync("token").catch(() => {}),
                SecureStore.deleteItemAsync("user").catch(() => {}),
                SecureStore.deleteItemAsync("pendingEmail").catch(() => {}),
                SecureStore.deleteItemAsync("pendingUserId").catch(() => {}),
              ]);
              Alert.alert("Success", "All data cleared");
              setIsVisible(false);
            } catch (error) {
              console.error("Error clearing data:", error);
              Alert.alert("Error", "Failed to clear all data");
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <TouchableOpacity
        onPress={gatherDebugInfo}
        className="absolute top-12 right-5 bg-primary rounded-full w-10 h-10 justify-center items-center z-50"
      >
        <Ionicons name="bug" size={20} color="white" />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-neutral-light-1">
          <View className="flex-row justify-between items-center p-5 border-b border-neutral-medium-1 bg-white">
            <Text className="text-lg font-bold">Debug Info</Text>
            <TouchableOpacity onPress={() => setIsVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-5">
            <DebugSection
              title="Auth Context User"
              data={debugInfo.contextUser}
            />
            <DebugSection
              title="Stored User (Raw)"
              data={debugInfo.storedUserString}
            />
            <DebugSection
              title="Stored User (Parsed)"
              data={debugInfo.storedUserParsed}
            />
            <DebugSection
              title="Current User (getCurrentUser)"
              data={debugInfo.currentUser}
            />
            <DebugSection title="Pending Email" data={debugInfo.pendingEmail} />
            <DebugSection
              title="Pending User ID"
              data={debugInfo.pendingUserId}
            />
            <DebugSection title="Has Token" data={debugInfo.hasToken} />
            <DebugSection title="Token Preview" data={debugInfo.tokenPreview} />
          </ScrollView>

          <View className="p-5 bg-white border-t border-neutral-medium-1">
            <TouchableOpacity
              onPress={clearAllData}
              className="bg-primary p-4 rounded-sm items-center"
            >
              <Text className="text-white font-bold">Clear All Data</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const DebugSection: React.FC<{ title: string; data: any }> = ({
  title,
  data,
}) => (
  <View className="bg-white p-4 mb-3 rounded-sm border border-neutral-medium-1">
    <Text className="text-base font-bold mb-2">{title}</Text>
    <Text className="text-xs text-neutral-dark-1 bg-neutral-light-2 p-3 rounded-xs">
      {typeof data === "object" ? JSON.stringify(data, null, 2) : String(data)}
    </Text>
  </View>
);

export default DebugButton;
