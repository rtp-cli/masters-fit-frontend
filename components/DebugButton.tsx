import React, { useState } from "react";
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
        style={{
          position: "absolute",
          top: 60,
          right: 20,
          backgroundColor: "#ff0000",
          borderRadius: 20,
          width: 40,
          height: 40,
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }}
      >
        <Ionicons name="bug" size={20} color="white" />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: "gray-100" }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: "border-gray",
              backgroundColor: "white",
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "bold" }}>Debug Info</Text>
            <TouchableOpacity onPress={() => setIsVisible(false)}>
              <Ionicons name="close" size={24} color="text-gray" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: 20 }}>
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

          <View
            style={{
              padding: 20,
              backgroundColor: "white",
              borderTopWidth: 1,
              borderTopColor: "border-gray",
            }}
          >
            <TouchableOpacity
              onPress={clearAllData}
              style={{
                backgroundColor: "#ff0000",
                padding: 15,
                borderRadius: 8,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "bold" }}>
                Clear All Data
              </Text>
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
  <View
    style={{
      backgroundColor: "white",
      padding: 15,
      marginBottom: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "border-gray",
    }}
  >
    <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 8 }}>
      {title}
    </Text>
    <Text
      style={{
        fontSize: 12,
        color: "text-light-gray",
        backgroundColor: "bg-light",
        padding: 10,
        borderRadius: 4,
      }}
    >
      {typeof data === "object" ? JSON.stringify(data, null, 2) : String(data)}
    </Text>
  </View>
);

export default DebugButton;
