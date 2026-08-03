import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "@/contexts/auth-context";
import { useThemeColors } from "@/lib/theme";

interface DeveloperToolsSectionProps {
  isAdmin: boolean;
  isDebugModeActivated: boolean;
  isSecretActivated: boolean;
  onDeactivateDebugMode: () => void;
  onShowPaywallTest?: () => void;
  onResetFeedbackCadence?: () => void;
  onForceLogout?: () => void;
  onClose?: () => void;
}

export default function DeveloperToolsSection({
  isAdmin,
  isDebugModeActivated,
  isSecretActivated,
  onDeactivateDebugMode,
  onShowPaywallTest,
  onResetFeedbackCadence,
  onForceLogout,
  onClose,
}: DeveloperToolsSectionProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const { enterImpersonation } = useAuth();

  const [showImpersonate, setShowImpersonate] = useState(false);
  const [impEmail, setImpEmail] = useState("");
  const [impReason, setImpReason] = useState("");
  const [impBusy, setImpBusy] = useState(false);

  const handleImpersonate = async () => {
    const email = impEmail.trim();
    if (!email) {
      Alert.alert("Email required", "Enter the user's email to view as them.");
      return;
    }
    setImpBusy(true);
    try {
      const result = await enterImpersonation(email, impReason.trim());
      if (result.success) {
        setShowImpersonate(false);
        setImpEmail("");
        setImpReason("");
        if (onClose) onClose();
      } else {
        Alert.alert("Couldn't impersonate", result.error || "Unknown error");
      }
    } finally {
      setImpBusy(false);
    }
  };

  // Release builds: admins only, and only once debug mode is on. The admin gate
  // also hides the tools from a non-admin who activated debug mode on an older
  // build. __DEV__ keeps everything available locally.
  if (!__DEV__ && (!isDebugModeActivated || !isAdmin)) {
    return null;
  }

  return (
    <View
      className="mx-6 mb-6 rounded-xl overflow-hidden border"
      style={{
        backgroundColor: colors.background,
        borderColor: colors.brand.primary,
      }}
    >
      <View className="flex-row items-center p-4 pb-2">
        <Ionicons name="construct" size={18} color={colors.brand.primary} />
        <Text
          className="text-base font-semibold ml-2"
          style={{ color: colors.brand.primary }}
        >
          Developer Tools
        </Text>
        {!__DEV__ && (
          <View
            className="ml-auto px-2 py-0.5 rounded"
            style={{ backgroundColor: colors.brand.primary }}
          >
            <Text
              className="text-xs font-medium"
              style={{ color: colors.contentOnPrimary }}
            >
              DEBUG
            </Text>
          </View>
        )}
      </View>

      {/* Test RevenueCat Paywall */}
      <TouchableOpacity
        className="flex-row items-center justify-between px-4 py-3 border-t"
        style={{ borderColor: colors.brand.primary }}
        onPress={() => {
          if (onShowPaywallTest) {
            onShowPaywallTest();
          }
        }}
      >
        <View className="flex-row items-center flex-1">
          <Ionicons name="card-outline" size={20} color={colors.brand.primary} />
          <Text
            className="text-sm ml-3"
            style={{ color: colors.brand.primary }}
          >
            Test RevenueCat Paywall
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.brand.primary} />
      </TouchableOpacity>

      {/* Network Logger */}
      <TouchableOpacity
        className="flex-row items-center justify-between px-4 py-3 border-t"
        style={{ borderColor: colors.brand.primary }}
        onPress={() => {
          if (onClose) onClose();
          router.push("/network-logger");
        }}
      >
        <View className="flex-row items-center flex-1">
          <Ionicons name="bug-outline" size={20} color={colors.brand.primary} />
          <Text
            className="text-sm ml-3"
            style={{ color: colors.brand.primary }}
          >
            Network Logger
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.brand.primary} />
      </TouchableOpacity>

      {/* Impersonate User — admin "view as user" for troubleshooting. Opens a
          READ-ONLY session as the target (backend blocks any write); a red
          banner stays up app-wide until you exit. Admin-gated server-side. */}
      <TouchableOpacity
        className="flex-row items-center justify-between px-4 py-3 border-t"
        style={{ borderColor: colors.brand.primary }}
        onPress={() => setShowImpersonate((v) => !v)}
      >
        <View className="flex-row items-center flex-1">
          <Ionicons name="eye-outline" size={20} color={colors.brand.primary} />
          <Text className="text-sm ml-3" style={{ color: colors.brand.primary }}>
            Impersonate User (read-only)
          </Text>
        </View>
        <Ionicons
          name={showImpersonate ? "chevron-down" : "chevron-forward"}
          size={16}
          color={colors.brand.primary}
        />
      </TouchableOpacity>

      {showImpersonate && (
        <View
          className="px-4 py-3 border-t"
          style={{ borderColor: colors.brand.primary }}
        >
          <TextInput
            value={impEmail}
            onChangeText={setImpEmail}
            placeholder="user@email.com"
            placeholderTextColor={colors.text.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            className="rounded-lg border px-3 py-2 text-sm mb-2"
            style={{
              borderColor: colors.brand.primary,
              color: colors.text.primary,
            }}
          />
          <TextInput
            value={impReason}
            onChangeText={setImpReason}
            placeholder="Reason (optional, audited)"
            placeholderTextColor={colors.text.muted}
            className="rounded-lg border px-3 py-2 text-sm mb-3"
            style={{
              borderColor: colors.brand.primary,
              color: colors.text.primary,
            }}
          />
          <TouchableOpacity
            onPress={handleImpersonate}
            disabled={impBusy}
            className="rounded-lg py-2.5 items-center"
            style={{ backgroundColor: colors.brand.primary }}
          >
            {impBusy ? (
              <ActivityIndicator size="small" color={colors.contentOnPrimary} />
            ) : (
              <Text
                className="text-sm font-semibold"
                style={{ color: colors.contentOnPrimary }}
              >
                View as this user
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Reset Feedback Cadence — clears @workout_feedback_cadence so the
          post-workout feedback prompt shows again for already-answered days. */}
      <TouchableOpacity
        className="flex-row items-center justify-between px-4 py-3 border-t"
        style={{ borderColor: colors.brand.primary }}
        onPress={onResetFeedbackCadence}
      >
        <View className="flex-row items-center flex-1">
          <Ionicons
            name="refresh-outline"
            size={20}
            color={colors.brand.primary}
          />
          <Text className="text-sm ml-3" style={{ color: colors.brand.primary }}>
            Reset Feedback Cadence
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.brand.primary} />
      </TouchableOpacity>

      {/* AI Provider Selection (if secret activated) */}
      {isSecretActivated && (
        <TouchableOpacity
          className="flex-row items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: colors.brand.primary }}
          onPress={() => {
            if (onClose) onClose();
            router.push("/ai-provider-selection");
          }}
        >
          <View className="flex-row items-center flex-1">
            <Ionicons
              name="hardware-chip-outline"
              size={20}
              color={colors.brand.primary}
            />
            <Text
              className="text-sm ml-3"
              style={{ color: colors.brand.primary }}
            >
              AI Provider Selection
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.brand.primary} />
        </TouchableOpacity>
      )}

      {/* Force Clear Auth Data */}
      <TouchableOpacity
        className="flex-row items-center justify-between px-4 py-3 border-t"
        style={{ borderColor: colors.brand.primary }}
        onPress={onForceLogout}
      >
        <View className="flex-row items-center flex-1">
          <Ionicons name="key-outline" size={20} color={colors.brand.primary} />
          <Text className="text-sm ml-3" style={{ color: colors.brand.primary }}>
            Force Clear Auth Data
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.brand.primary} />
      </TouchableOpacity>

      {/* Deactivate Debug Mode (only in production) */}
      {!__DEV__ && isDebugModeActivated && (
        <TouchableOpacity
          className="flex-row items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: colors.brand.primary }}
          onPress={onDeactivateDebugMode}
        >
          <View className="flex-row items-center flex-1">
            <Ionicons
              name="close-circle-outline"
              size={20}
              color={colors.brand.primary}
            />
            <Text className="text-sm ml-3" style={{ color: colors.brand.primary }}>
              Deactivate Debug Mode
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}
