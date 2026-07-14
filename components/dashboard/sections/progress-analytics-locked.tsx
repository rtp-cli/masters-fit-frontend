import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { PAYWALL_COPY } from "../../../lib/paywall-copy";
import { useThemeColors, shadows } from "../../../lib/theme";

type Props = {
  onUpgrade: () => void;
};

/**
 * Shown in place of the progress-analytics dashboard sections when the user
 * lacks VIEW_PROGRESS_ANALYTICS (FREE tier). Tapping opens the paywall. Uses
 * the accent-subtle tint (not solid ink) per [MF-006] — it's an upsell, not
 * the screen's primary CTA.
 */
const ProgressAnalyticsLocked: React.FC<Props> = ({ onUpgrade }) => {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      onPress={onUpgrade}
      activeOpacity={0.9}
      className="mx-5 mb-4 rounded-2xl overflow-hidden bg-accent-subtle border border-accent-subtle"
      style={shadows.card}
      accessibilityRole="button"
      accessibilityLabel="Unlock progress analytics with MastersFit+"
    >
      <View className="px-5 py-5">
        <View className="flex-row items-center mb-2">
          <Ionicons name="lock-closed" size={18} color={colors.brand.primary} />
          <Text
            className="text-base font-bold ml-2"
            style={{ color: colors.text.primary }}
          >
            Progress analytics
          </Text>
        </View>
        <Text
          className="text-sm leading-5 mb-3"
          style={{ color: colors.text.secondary }}
        >
          {PAYWALL_COPY.ANALYTICS}
        </Text>
        <View className="flex-row items-center">
          <Text
            className="text-sm font-semibold"
            style={{ color: colors.brand.primary }}
          >
            Upgrade to MastersFit+
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.brand.primary}
            style={{ marginLeft: 4 }}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ProgressAnalyticsLocked;
