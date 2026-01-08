import { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { connectHealth, getHealthConnection } from "@/utils/health";
import { useThemeColors } from "../../../lib/theme";

export default function HealthConnectSection() {
  const colors = useThemeColors();
  const [healthConnected, setHealthConnected] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  // Health connect status
  const loadHealthStatus = useCallback(async () => {
    try {
      const connected = await getHealthConnection();
      setHealthConnected(connected);
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
            className="bg-secondary px-4 py-2 rounded-xl items-center justify-center"
            onPress={handleConnectHealth}
            disabled={healthLoading}
          >
            {healthLoading ? (
              <ActivityIndicator size="small" color={colors.contentOnPrimary} />
            ) : (
              <Text style={{ color: colors.contentOnPrimary }} className="text-sm font-semibold">Connect</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
        <TouchableOpacity
          className="bg-secondary/20 px-3 py-1.5 rounded-lg"
          onPress={handleConnectHealth}
          disabled={healthLoading}
        >
          {healthLoading ? (
            <ActivityIndicator size="small" color={colors.brand.secondary} />
          ) : (
            <Text className="text-xs font-semibold text-secondary">
              Update Permissions
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
