import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { useThemeColors, shadows } from "../../../lib/theme";

type PremiumUpgradeBannerProps = {
  isPro: boolean;
  isLoading: boolean;
  onPress: () => void;
};

const PremiumUpgradeBanner: React.FC<PremiumUpgradeBannerProps> = ({
  isPro,
  isLoading,
  onPress,
}) => {
  const colors = useThemeColors();

  // Don't show banner if user is pro or subscription status is loading
  if (isLoading || isPro) {
    return null;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      className="mx-5 mb-4 rounded-2xl overflow-hidden"
      style={{
        backgroundColor: colors.brand.primary,
        ...shadows.card,
      }}
    >
      <View className="flex-row items-center px-5 py-4">
        {/* Icon Container */}
        <View className="w-12 h-12 rounded-full items-center justify-center mr-4">
          <Ionicons name="star" size={24} color={colors.contentOnPrimary} />
        </View>

        {/* Text Content */}
        <View className="flex-1">
          <Text
            className="text-base font-bold mb-1"
            style={{ color: colors.contentOnPrimary }}
          >
            Unlock Premium
          </Text>
          <Text
            className="text-sm leading-5"
            style={{ color: colors.contentOnPrimary, opacity: 0.9 }}
          >
            Get unlimited access to all features and workouts
          </Text>
        </View>

        {/* Arrow Icon */}
        <Ionicons
          name="chevron-forward"
          size={24}
          color={colors.contentOnPrimary}
          style={{ marginLeft: 8 }}
        />
      </View>
    </TouchableOpacity>
  );
};

export default PremiumUpgradeBanner;
