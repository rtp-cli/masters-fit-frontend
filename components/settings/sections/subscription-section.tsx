import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

import { useThemeColors } from "../../../lib/theme";

interface SubscriptionSectionProps {
  isPro: boolean;
  activeEntitlement: any;
  productIdentifier?: string | null;
  expirationDate?: Date | null;
  onPress: () => void;
  onUpgradePress?: () => void;
}

export default function SubscriptionSection({
  isPro,
  activeEntitlement,
  productIdentifier,
  expirationDate,
  onPress,
  onUpgradePress,
}: SubscriptionSectionProps) {
  const colors = useThemeColors();

  // Get plan name based on product identifier
  const getPlanName = (identifier: string | null): string => {
    if (!identifier) return "MastersFit Pro";
    if (identifier.includes("annual") || identifier.includes("yearly")) {
      return "MastersFit Pro (Annual)";
    }
    if (identifier.includes("monthly")) {
      return "MastersFit Pro (Monthly)";
    }
    if (identifier.includes("weekly")) {
      return "MastersFit Pro (Weekly)";
    }
    return "MastersFit Pro";
  };

  return (
    <View className="mx-6 mb-6 bg-surface rounded-xl overflow-hidden">
      <Text className="text-base font-semibold text-text-primary p-4 pb-2">
        Subscription
      </Text>

      {isPro && activeEntitlement ? (
        <TouchableOpacity
          className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-light-2"
          onPress={onPress}
          activeOpacity={0.7}
        >
          <View className="flex-1">
            <Text className="text-sm font-semibold text-text-primary">
              {getPlanName(productIdentifier ?? null)}
            </Text>
            {expirationDate && (
              <Text className="text-xs text-text-muted mt-0.5">
                {activeEntitlement.willRenew ? "Renews" : "Expires"}{" "}
                {expirationDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            )}
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.neutral.medium[3]}
          />
        </TouchableOpacity>
      ) : (
        <View className="px-4 py-3 border-t border-neutral-light-2">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-sm font-semibold text-text-primary">
                MastersFit Lite
              </Text>
              <Text className="text-xs text-text-muted mt-0.5">
                Limited workout generations
              </Text>
            </View>
            <TouchableOpacity
              onPress={onUpgradePress}
              activeOpacity={0.7}
              className="bg-primary px-4 py-2 rounded-lg"
            >
              <Text className="text-xs font-semibold text-content-on-primary">
                Upgrade
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
