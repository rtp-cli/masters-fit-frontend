import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

import { useEntitlements } from "@/hooks/use-entitlements";

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
  const { tier } = useEntitlements();

  // Server-authoritative paid state. Backend-granted PLUS/COMPLIMENTARY/BYPASS
  // users have no RevenueCat `activeEntitlement` locally, so the old
  // `isPro && activeEntitlement` check wrongly showed them the "Upgrade" CTA.
  // Trust the entitlements tier first; fall back to RC for the detail display.
  const isPaidTier =
    tier === "PLUS" || tier === "COMPLIMENTARY" || tier === "BYPASS";
  const showSubscribed = isPaidTier || (isPro && !!activeEntitlement);

  // Get plan name based on product identifier
  const getPlanName = (identifier: string | null): string => {
    if (!identifier) return "MastersFit+";
    if (identifier.includes("annual") || identifier.includes("yearly")) {
      return "MastersFit+ (Annual)";
    }
    if (identifier.includes("monthly")) {
      return "MastersFit+ (Monthly)";
    }
    if (identifier.includes("weekly")) {
      return "MastersFit+ (Weekly)";
    }
    return "MastersFit+";
  };

  return (
    <View className="mx-6 mb-6 bg-surface rounded-xl overflow-hidden border border-neutral-medium-1">
      <Text className="text-base font-semibold text-text-primary p-4 pb-2">
        Subscription
      </Text>

      {showSubscribed ? (
        <TouchableOpacity
          className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-light-2"
          onPress={onPress}
          activeOpacity={0.7}
        >
          <View className="flex-1">
            <Text className="text-sm font-semibold text-text-primary">
              {getPlanName(productIdentifier ?? null)}
            </Text>
            {expirationDate ? (
              <Text className="text-xs text-text-muted mt-0.5">
                {activeEntitlement?.willRenew ? "Renews" : "Expires"}{" "}
                {expirationDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            ) : (
              <Text className="text-xs text-text-muted mt-0.5">
                {tier === "PLUS"
                  ? "Active subscription"
                  : "Complimentary access"}
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
                MastersFit
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
