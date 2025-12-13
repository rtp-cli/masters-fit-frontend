import React, { useEffect, useState } from "react";
import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";
import { connectHealth, getHealthConnection } from "@/utils/health";
import Text from "@/components/Text";

export default function HealthConnectStep() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadStatus = async () => {
      try {
        const stored = await getHealthConnection();
        if (isMounted) {
          setIsConnected(stored);
        }
      } finally {
        if (isMounted) {
          setCheckingStatus(false);
        }
      }
    };
    loadStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleConnect = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const granted = await connectHealth();
      if (granted) {
        setIsConnected(true);
      } else {
        setError("Health permissions not granted");
      }
    } catch (err: any) {
      setError(err?.message || "Unable to connect to Health right now.");
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const showButton = !isConnected && !checkingStatus;
  const buttonLabel = isLoading ? "Connecting..." : "Connect Health";

  return (
    <View className="px-6">
      <View className="bg-white rounded-2xl p-5 shadow-rn-sm">
        <View className="flex-row items-center mb-3">
          <View className="w-10 h-10 rounded-full bg-secondary/10 items-center justify-center mr-3">
            <Ionicons name="fitness" size={22} color={colors.brand.secondary} />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-text-primary">
              Connect Health
            </Text>
            <Text className="text-sm text-text-muted">
              Share steps, calories, heart rate, and workouts so we can keep
              your plan in sync.
            </Text>
          </View>
        </View>

        {isConnected && (
          <View className="flex-row items-center bg-primary/10 px-3 py-2 rounded-xl mb-3">
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.brand.primary}
            />
            <Text className="ml-2 font-semibold text-text-primary">
              Health connected
            </Text>
          </View>
        )}

        {error && (
          <Text className="text-danger mb-3 text-sm" accessibilityRole="alert">
            {error}
          </Text>
        )}

        {checkingStatus && !isConnected && (
          <View className="flex-row items-center mb-3">
            <ActivityIndicator size="small" color={colors.brand.secondary} />
            <Text className="ml-2 text-sm text-text-muted">
              Checking connection status...
            </Text>
          </View>
        )}

        {showButton && (
          <TouchableOpacity
            className="bg-secondary rounded-xl py-4 items-center"
            onPress={handleConnect}
            disabled={isLoading || checkingStatus}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.neutral.white} />
            ) : (
              <Text className="text-white font-semibold text-base">
                {buttonLabel}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {!showButton && (
          <Text className="text-sm text-text-muted">
            You're all set. We'll keep your health metrics up to date.
          </Text>
        )}
      </View>
    </View>
  );
}
