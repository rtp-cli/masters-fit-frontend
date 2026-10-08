import { Ionicons } from "@expo/vector-icons";
import { useCallback,useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { askToImport } from "@/components/health-activity-sync";
import {
  getImportPref,
  setImportPref,
  syncHealthActivities,
} from "@/lib/health-activity-import";
import { type ThemeColorPalette } from "@/lib/theme";
import {
  clearHealthConnection,
  connectHealth,
  getHealthConnection,
} from "@/utils/health";

import { useThemeColors } from "../../../lib/theme";

export default function HealthConnectSection() {
  const colors = useThemeColors();
  const [healthConnected, setHealthConnected] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  // Unset counts as off here: nothing is imported until the user has said yes,
  // either to the one-time question or to this switch.
  const [importOn, setImportOn] = useState(false);

  // Health connect status
  const loadHealthStatus = useCallback(async () => {
    try {
      const connected = await getHealthConnection();
      setHealthConnected(connected);
      setImportOn((await getImportPref()) === "on");
      if (connected) setHealthError(null);
    } catch {
      setHealthConnected(false);
    }
  }, []);

  useEffect(() => {
    loadHealthStatus();
  }, [loadHealthStatus]);

  const handleConnectHealth = useCallback(async () => {
    setHealthError(null);
    setHealthLoading(true);
    try {
      const granted = await connectHealth();
      if (granted) {
        setHealthConnected(true);
      } else {
        setHealthConnected(false);
        setHealthError("Health permissions not granted");
      }
    } catch (err: any) {
      setHealthConnected(false);
      setHealthError(err?.message || "Unable to connect health right now.");
    } finally {
      setHealthLoading(false);
    }
  }, []);

  if (!healthConnected) {
    return (
      <View className="px-4 py-3 border-t border-neutral-light-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-sm font-semibold text-text-primary">
              Connect Health
            </Text>
            <Text className="text-xs text-text-secondary mt-1">
              Sync steps, calories, heart rate, and workouts from Apple Health
              or Health Connect.
            </Text>
            {healthError && (
              <Text className="text-xs text-danger mt-2">{healthError}</Text>
            )}
          </View>
          <TouchableOpacity
            // [Bug fix] bg-secondary + contentOnPrimary text resolve to the
            // SAME color in every theme -- this text was invisible.
            className="bg-neutral-light-2 px-4 py-2 rounded-xl items-center justify-center"
            onPress={handleConnectHealth}
            disabled={healthLoading}
          >
            {healthLoading ? (
              <ActivityIndicator size="small" color={colors.text.primary} />
            ) : (
              <Text
                style={{ color: colors.text.primary }}
                className="text-sm font-semibold"
              >
                Connect
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleImportToggle = async (value: boolean) => {
    setImportOn(value);
    await setImportPref(value);
    // Flipping it on is consent already — import right away rather than
    // waiting for the next app open. (confirm is never reached: pref is on.)
    if (value) {
      void syncHealthActivities({ confirm: askToImport, force: true });
    }
  };

  const switchOnTrackColor =
    (colors as ThemeColorPalette).success ?? colors.brand.primary;

  const handleDisconnectHealth = async () => {
    await clearHealthConnection();
    setHealthConnected(false);
    setHealthError(null);
  };

  return (
    <View className="px-4 py-3 border-t border-neutral-light-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons
            name="checkmark-circle"
            size={18}
            color={colors.brand.primary}
          />
          <Text className="text-sm font-semibold text-text-primary ml-2">
            Health Connected
          </Text>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity
            // [Bug fix] bg-secondary/20 + text-secondary both key off the same
            // top-level "secondary" token as the fill -- text was invisible.
            className="bg-neutral-light-2 px-3 py-1.5 rounded-lg"
            onPress={handleConnectHealth}
            disabled={healthLoading}
          >
            {healthLoading ? (
              <ActivityIndicator size="small" color={colors.text.primary} />
            ) : (
              <Text className="text-xs font-semibold text-text-primary">
                Update Permissions
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-neutral-light-2 px-3 py-1.5 rounded-lg ml-2"
            onPress={handleDisconnectHealth}
            disabled={healthLoading}
          >
            <Text className="text-xs font-semibold text-danger">
              Disconnect
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <View className="flex-row items-center justify-between mt-3">
        <View className="flex-1 pr-3">
          <Text className="text-sm text-text-primary">
            Import watch workouts
          </Text>
          <Text className="text-xs text-text-secondary mt-1">
            Walks, runs, rides and other workouts you record on your watch
            appear in your activity log. Strength and interval sessions are
            skipped so they don't double up with your MastersFit workouts.
          </Text>
        </View>
        <Switch
          value={importOn}
          onValueChange={handleImportToggle}
          trackColor={{
            false: colors.neutral.medium[1],
            true: switchOnTrackColor,
          }}
          thumbColor={
            Platform.OS === "android" ? colors.text.primary : undefined
          }
          ios_backgroundColor={colors.neutral.medium[1]}
          accessibilityLabel="Import watch workouts"
        />
      </View>
      <Text className="text-xs text-text-secondary mt-2">
        Disconnecting stops MastersFit from reading or saving health data. To
        revoke permissions entirely, use the Health app (iOS) or Health
        Connect settings (Android).
      </Text>
    </View>
  );
}
