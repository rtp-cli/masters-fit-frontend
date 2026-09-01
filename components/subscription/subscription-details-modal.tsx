import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Alert, Modal, ScrollView,Text, TouchableOpacity, View } from "react-native";
import { PACKAGE_TYPE, type PurchasesPackage } from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MASTERSFIT_PLUS_BENEFITS } from "@/constants/subscription";
import { useEntitlements } from "@/hooks/use-entitlements";
import { useSubscriptionPlans } from "@/hooks/use-subscription-plans";
import { useSubscriptionStatus } from "@/hooks/use-subscription-status";
import { useThemeColors } from "@/lib/theme";

const isAnnualPackage = (p: PurchasesPackage): boolean =>
  p.packageType === PACKAGE_TYPE.ANNUAL ||
  /annual|yearly|_1y|\.1y/i.test(p.identifier);
const isMonthlyPackage = (p: PurchasesPackage): boolean =>
  p.packageType === PACKAGE_TYPE.MONTHLY ||
  /monthly|_1m|\.1m/i.test(p.identifier);

/**
 * "Switch to annual" CTA for a monthly subscriber. Broken out as its own
 * component so the RevenueCat offerings fetch (useSubscriptionPlans) only runs
 * when an eligible monthly subscriber actually opens the modal — not on every
 * Settings mount. RevenueCat's purchasePackage handles the upgrade + proration
 * via the native purchase sheet; we just kick it off and reconcile the backend.
 */
function AnnualSwitchCta({ onSwitched }: { onSwitched: () => void }) {
  const { packages, purchasePackage, isPurchasing } = useSubscriptionPlans();

  const annualPkg = packages.find(isAnnualPackage);
  const monthlyPkg = packages.find(isMonthlyPackage);
  if (!annualPkg) return null;

  const savingsPercent =
    monthlyPkg && annualPkg && monthlyPkg.product.price > 0
      ? Math.round(
          ((monthlyPkg.product.price * 12 - annualPkg.product.price) /
            (monthlyPkg.product.price * 12)) *
            100,
        )
      : null;

  const handleSwitch = () => {
    Alert.alert(
      "Switch to annual billing?",
      `You'll move to the annual plan at ${annualPkg.product.priceString}/year${
        savingsPercent && savingsPercent > 0
          ? `, saving about ${savingsPercent}%`
          : ""
      }. You'll confirm the charge on the next screen, and your monthly plan stops renewing.`,
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Switch",
          onPress: async () => {
            const ok = await purchasePackage(annualPkg);
            if (ok) {
              Alert.alert(
                "You're on annual",
                "Your plan switched to annual billing. Thanks for going all-in!",
              );
              onSwitched();
            }
          },
        },
      ],
    );
  };

  return (
    <TouchableOpacity
      onPress={handleSwitch}
      disabled={isPurchasing}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Switch to annual billing"
      className="flex-row items-center justify-center bg-primary rounded-xl py-3.5 px-4 mb-8"
      style={{ opacity: isPurchasing ? 0.6 : 1 }}
    >
      {isPurchasing ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          <Ionicons name="trending-up" size={18} color="#FFFFFF" />
          <Text className="text-white font-semibold text-base ml-2">
            Switch to Annual
            {savingsPercent && savingsPercent > 0
              ? ` · Save ${savingsPercent}%`
              : ""}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

interface SubscriptionDetailsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SubscriptionDetailsModal({
  visible,
  onClose,
}: SubscriptionDetailsModalProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { activeEntitlement, productIdentifier, expirationDate, willRenew } =
    useSubscriptionStatus();
  const { tier } = useEntitlements();

  const isPaidTier =
    tier === "PLUS" || tier === "COMPLIMENTARY" || tier === "BYPASS";
  const isGranted = tier === "COMPLIMENTARY" || tier === "BYPASS";

  // A real, auto-renewing monthly RevenueCat subscriber can switch to annual
  // in-app. Granted (COMPLIMENTARY/BYPASS) users have no RC subscription to
  // switch; annual subscribers have nothing to switch to.
  const isMonthlyPlan =
    !!productIdentifier && /monthly|_1m|\.1m/i.test(productIdentifier);
  const showAnnualSwitch =
    isPaidTier && !isGranted && isMonthlyPlan && willRenew;

  // Render for any paid tier. Backend-granted COMPLIMENTARY/BYPASS users have
  // no RevenueCat entitlement, so gating on activeEntitlement alone made this
  // modal a silent no-op for them (tapping the row did nothing).
  if (!isPaidTier && !activeEntitlement) {
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
    if (!identifier) return "MastersFit+";

    // Try to extract readable name from identifier
    if (identifier.includes("annual") || identifier.includes("yearly")) {
      return "MastersFit+ (Annual)";
    }
    if (identifier.includes("monthly")) {
      return "MastersFit+ (Monthly)";
    }
    if (identifier.includes("weekly")) {
      return "MastersFit+ (Weekly)";
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
    >
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-light-2">
          <View className="w-9" />
          <Text className="text-lg font-semibold text-text-primary">
            Subscription Details
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="size-9 items-center justify-center"
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
          {/* Plan Name */}
          <View className="items-center mb-8">
            <Text className="text-xl font-bold text-primary">
              MastersFit+
            </Text>
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
                <View
                  className="size-2 rounded-full"
                  style={{ backgroundColor: colors.brand.primary }}
                />
                <Text
                  className="text-sm font-semibold"
                  style={{ color: colors.brand.primary }}
                >
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

            {!expirationDate && isGranted && (
              <View className="flex-row justify-between items-center py-3 border-b border-neutral-light-1">
                <Text className="text-sm text-text-secondary">Access</Text>
                <Text className="text-sm font-semibold text-text-primary">
                  Complimentary
                </Text>
              </View>
            )}

            {activeEntitlement?.periodType && (
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

          {/* Switch to annual — only for a monthly, auto-renewing subscriber */}
          {showAnnualSwitch && <AnnualSwitchCta onSwitched={onClose} />}

          {/* Features */}
          <View className="mb-8">
            <Text className="text-lg font-semibold text-text-primary mb-4">
              MastersFit+ Benefits
            </Text>
            <View className="gap-3">
              {MASTERSFIT_PLUS_BENEFITS.map((benefit) => (
                <View key={benefit} className="flex-row items-center gap-3">
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.brand.primary}
                  />
                  <Text className="text-sm text-text-secondary flex-1">
                    {benefit}
                  </Text>
                </View>
              ))}
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
      </View>
    </Modal>
  );
}
