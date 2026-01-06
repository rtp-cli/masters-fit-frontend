import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";
import { useSubscriptionStatus } from "@/hooks/use-subscription-status";

interface SubscriptionDetailsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SubscriptionDetailsModal({
  visible,
  onClose,
}: SubscriptionDetailsModalProps) {
  const { activeEntitlement, productIdentifier, expirationDate, willRenew } =
    useSubscriptionStatus();

  if (!activeEntitlement) {
    return null;
  }

  const formatDate = (date: Date | null): string => {
    if (!date) return "N/A";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Extract product name from identifier (e.g., "masters_fit_monthly" -> "Monthly Premium")
  const getProductName = (identifier: string | null): string => {
    if (!identifier) return "Premium Subscription";

    // Try to extract readable name from identifier
    if (identifier.includes("annual") || identifier.includes("yearly")) {
      return "Annual Premium";
    }
    if (identifier.includes("monthly")) {
      return "Monthly Premium";
    }
    if (identifier.includes("weekly")) {
      return "Weekly Premium";
    }

    // Fallback: capitalize and format
    return identifier
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-light-2">
          <View className="w-9" />
          <Text className="text-lg font-semibold text-text-primary">
            Subscription Details
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="w-9 h-9 items-center justify-center"
          >
            <Ionicons name="close" size={28} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 40,
          }}
        >
          {/* Pro Badge */}
          <View className="items-center mb-8">
            <View className="flex-row items-center bg-primary/10 px-5 py-3 rounded-3xl gap-2">
              <Ionicons name="star" size={24} color="#FFD700" />
              <Text className="text-lg font-bold text-primary tracking-wide">
                PRO
              </Text>
            </View>
          </View>

          {/* Subscription Info */}
          <View className="mb-8">
            <View className="flex-row justify-between items-center py-3 border-b border-neutral-light-1">
              <Text className="text-sm text-text-secondary">Plan</Text>
              <Text className="text-sm font-semibold text-text-primary">
                {getProductName(productIdentifier)}
              </Text>
            </View>

            <View className="flex-row justify-between items-center py-3 border-b border-neutral-light-1">
              <Text className="text-sm text-text-secondary">Status</Text>
              <View className="flex-row items-center gap-1.5">
                <View className="w-2 h-2 rounded-full bg-[#10B981]" />
                <Text className="text-sm font-semibold text-[#10B981]">
                  Active
                </Text>
              </View>
            </View>

            {expirationDate && (
              <View className="flex-row justify-between items-center py-3 border-b border-neutral-light-1">
                <Text className="text-sm text-text-secondary">
                  {willRenew ? "Renews on" : "Expires on"}
                </Text>
                <Text className="text-sm font-semibold text-text-primary">
                  {formatDate(expirationDate)}
                </Text>
              </View>
            )}

            {activeEntitlement.periodType && (
              <View className="flex-row justify-between items-center py-3 border-b border-neutral-light-1">
                <Text className="text-sm text-text-secondary">
                  Billing Period
                </Text>
                <Text className="text-sm font-semibold text-text-primary">
                  {activeEntitlement.periodType === "NORMAL"
                    ? "Subscription"
                    : activeEntitlement.periodType.charAt(0).toUpperCase() +
                      activeEntitlement.periodType.slice(1).toLowerCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Features */}
          <View className="mb-8">
            <Text className="text-lg font-semibold text-text-primary mb-4">
              Premium Benefits
            </Text>
            <View className="gap-3">
              <View className="flex-row items-center gap-3">
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.brand.primary}
                />
                <Text className="text-sm text-text-secondary flex-1">
                  Unlimited workout regenerations
                </Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.brand.primary}
                />
                <Text className="text-sm text-text-secondary flex-1">
                  Priority AI processing
                </Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.brand.primary}
                />
                <Text className="text-sm text-text-secondary flex-1">
                  Advanced analytics
                </Text>
              </View>
            </View>
          </View>

          {/* Footer Note */}
          {willRenew && (
            <View className="flex-row items-start bg-neutral-light-1 p-3 rounded-lg gap-2 mt-2">
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={colors.text.muted}
              />
              <Text className="text-xs text-text-muted flex-1 leading-[18px]">
                Your subscription will automatically renew. You can manage or
                cancel your subscription in your device settings.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
