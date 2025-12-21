import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SubscriptionPlan } from "@/types/api";
import { colors } from "@/lib/theme";

interface SubscriptionPlansListProps {
  plans: SubscriptionPlan[];
  selectedPlanId?: string;
  onPlanSelect: (plan: SubscriptionPlan) => void;
}

export default function SubscriptionPlansList({
  plans,
  selectedPlanId,
  onPlanSelect,
}: SubscriptionPlansListProps) {
  const formatPrice = (price: number, billingPeriod: string) => {
    const formattedPrice = price.toFixed(2);
    const period = billingPeriod === "annual" ? "year" : "month";
    return `$${formattedPrice}/${period}`;
  };

  const calculateAnnualSavings = (
    monthlyPrice: number,
    annualPrice: number
  ) => {
    const monthlyYearly = monthlyPrice * 12;
    const savings = monthlyYearly - annualPrice;
    const savingsPercent = Math.round((savings / monthlyYearly) * 100);
    return { savings, savingsPercent };
  };

  // Separate monthly and annual plans
  const monthlyPlans = plans.filter((p) => p.billingPeriod === "monthly");
  const annualPlans = plans.filter((p) => p.billingPeriod === "annual");

  // Calculate savings if both exist
  const savingsInfo =
    monthlyPlans.length > 0 && annualPlans.length > 0
      ? calculateAnnualSavings(
          monthlyPlans[0].priceUsd,
          annualPlans[0].priceUsd
        )
      : null;

  const renderPlan = (plan: SubscriptionPlan, isAnnual: boolean = false) => {
    const isSelected = selectedPlanId === plan.planId;
    const isPopular = isAnnual && savingsInfo && savingsInfo.savingsPercent > 0;

    return (
      <TouchableOpacity
        key={plan.id}
        onPress={() => onPlanSelect(plan)}
        style={[
          styles.planCard,
          isSelected && styles.planCardSelected,
          isPopular && styles.planCardPopular,
        ]}
        activeOpacity={0.7}
      >
        {isPopular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>
              Save {savingsInfo?.savingsPercent}%
            </Text>
          </View>
        )}

        <View style={styles.planHeader}>
          <View style={styles.planHeaderLeft}>
            <Text style={styles.planName}>{plan.name}</Text>
            {plan.description && (
              <Text style={styles.planDescription}>{plan.description}</Text>
            )}
          </View>
          {isSelected && (
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={colors.brand.primary}
            />
          )}
        </View>

        <View style={styles.planPriceContainer}>
          <Text style={styles.planPrice}>
            {formatPrice(plan.priceUsd, plan.billingPeriod)}
          </Text>
          {isAnnual && savingsInfo && savingsInfo.savings > 0 && (
            <Text style={styles.planSavings}>
              Save ${savingsInfo.savings.toFixed(2)}/year
            </Text>
          )}
        </View>

        <View style={styles.planFeatures}>
          <View style={styles.featureRow}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={colors.brand.primary}
            />
            <Text style={styles.featureText}>
              Unlimited workout regenerations
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={colors.brand.primary}
            />
            <Text style={styles.featureText}>Priority AI processing</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={colors.brand.primary}
            />
            <Text style={styles.featureText}>Advanced analytics</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {annualPlans.length > 0 && (
        <View style={styles.planSection}>
          {annualPlans.map((plan) => renderPlan(plan, true))}
        </View>
      )}

      {monthlyPlans.length > 0 && (
        <View style={styles.planSection}>
          {monthlyPlans.map((plan) => renderPlan(plan, false))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  planSection: {
    gap: 12,
  },
  planCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.border,
    position: "relative",
  },
  planCardSelected: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primary + "10",
  },
  planCardPopular: {
    borderColor: colors.brand.primary,
  },
  popularBadge: {
    position: "absolute",
    top: -10,
    right: 20,
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  popularBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  planHeaderLeft: {
    flex: 1,
  },
  planName: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  planPriceContainer: {
    marginBottom: 16,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: 4,
  },
  planSavings: {
    fontSize: 14,
    color: colors.brand.primary,
    fontWeight: "600",
  },
  planFeatures: {
    gap: 8,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: colors.text.secondary,
    flex: 1,
  },
});
