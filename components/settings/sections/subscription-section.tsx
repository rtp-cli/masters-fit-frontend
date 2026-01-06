import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

import { colors } from "../../../lib/theme";

interface SubscriptionSectionProps {
  isPro: boolean;
  activeEntitlement: any;
  productIdentifier?: string | null;
  expirationDate?: Date | null;
  onPress: () => void;
}

export default function SubscriptionSection({
  isPro,
  activeEntitlement,
  productIdentifier,
  expirationDate,
  onPress,
}: SubscriptionSectionProps) {
  return (
    <View className="mx-6 mb-6 bg-white rounded-xl overflow-hidden">
      <Text className="text-base font-semibold text-text-primary p-4 pb-2">
        Subscription
      </Text>

      {isPro && activeEntitlement ? (
        <TouchableOpacity
          className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-light-2"
          onPress={onPress}
          activeOpacity={0.7}
        >
          <View className="flex-row items-center flex-1">
            <View className="flex-row items-center bg-primary/10 px-3 py-1.5 rounded-lg mr-3">
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text className="text-sm font-bold text-primary ml-1.5">PRO</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-text-primary">
                {productIdentifier
                  ?.replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase()) ||
                  "Premium Subscription"}
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
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.neutral.medium[3]}
          />
        </TouchableOpacity>
      ) : (
        <View className="px-4 py-3 border-t border-neutral-light-2">
          <Text className="text-sm text-text-secondary">
            No active subscription
          </Text>
        </View>
      )}
    </View>
  );
}
