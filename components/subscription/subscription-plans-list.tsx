import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PurchasesPackage, PACKAGE_TYPE } from "react-native-purchases";
import { colors } from "@/lib/theme";

interface SubscriptionPlansListProps {
  packages: PurchasesPackage[];
  selectedPackageId?: string;
  onPackageSelect: (pkg: PurchasesPackage) => void;
}

export default function SubscriptionPlansList({
  packages,
  selectedPackageId,
  onPackageSelect,
}: SubscriptionPlansListProps) {
  // Helper to determine if a package is annual
  const isAnnualPackage = (pkg: PurchasesPackage): boolean => {
    return (
      pkg.packageType === PACKAGE_TYPE.ANNUAL ||
      pkg.identifier.toLowerCase().includes("annual") ||
      pkg.identifier.toLowerCase().includes("yearly")
    );
  };

  // Helper to determine if a package is monthly
  const isMonthlyPackage = (pkg: PurchasesPackage): boolean => {
    return (
      pkg.packageType === PACKAGE_TYPE.MONTHLY ||
      pkg.identifier.toLowerCase().includes("monthly")
    );
  };

  // Calculate savings between monthly and annual
  const calculateAnnualSavings = (
    monthlyPkg: PurchasesPackage | undefined,
    annualPkg: PurchasesPackage | undefined
  ) => {
    if (!monthlyPkg || !annualPkg) return null;

    const monthlyPrice = monthlyPkg.product.price;
    const annualPrice = annualPkg.product.price;
    const monthlyYearly = monthlyPrice * 12;
    const savings = monthlyYearly - annualPrice;
    const savingsPercent = Math.round((savings / monthlyYearly) * 100);

    return { savings, savingsPercent };
  };

  // Separate monthly and annual packages
  const monthlyPackages = packages.filter(isMonthlyPackage);
  const annualPackages = packages.filter(isAnnualPackage);
  const otherPackages = packages.filter(
    (p) => !isMonthlyPackage(p) && !isAnnualPackage(p)
  );

  // Calculate savings if both exist
  const savingsInfo = calculateAnnualSavings(
    monthlyPackages[0],
    annualPackages[0]
  );

  // Get product description with period
  const getPeriodDescription = (pkg: PurchasesPackage): string => {
    if (isAnnualPackage(pkg)) return "per year";
    if (isMonthlyPackage(pkg)) return "per month";

    // Try to get from subscription period
    const period = pkg.product.subscriptionPeriod;
    if (period) {
      if (period.includes("year") || period.includes("Y")) return "per year";
      if (period.includes("month") || period.includes("M")) return "per month";
      if (period.includes("week") || period.includes("W")) return "per week";
    }

    return "";
  };

  const renderPackage = (pkg: PurchasesPackage, isAnnual: boolean = false) => {
    const isSelected = selectedPackageId === pkg.identifier;
    const isPopular = isAnnual && savingsInfo && savingsInfo.savingsPercent > 0;

    return (
      <TouchableOpacity
        key={pkg.identifier}
        onPress={() => onPackageSelect(pkg)}
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
            <Text style={styles.planName}>
              {pkg.product.title || pkg.identifier}
            </Text>
            {pkg.product.description && (
              <Text style={styles.planDescription}>
                {pkg.product.description}
              </Text>
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
            {pkg.product.priceString}
            <Text style={styles.planPeriod}> {getPeriodDescription(pkg)}</Text>
          </Text>
          {isAnnual && savingsInfo && savingsInfo.savings > 0 && (
            <Text style={styles.planSavings}>
              Save {pkg.product.currencyCode} {savingsInfo.savings.toFixed(2)}
              /year
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
      {/* Annual packages first (usually better value) */}
      {annualPackages.length > 0 && (
        <View style={styles.planSection}>
          {annualPackages.map((pkg) => renderPackage(pkg, true))}
        </View>
      )}

      {/* Monthly packages */}
      {monthlyPackages.length > 0 && (
        <View style={styles.planSection}>
          {monthlyPackages.map((pkg) => renderPackage(pkg, false))}
        </View>
      )}

      {/* Other packages (weekly, lifetime, etc.) */}
      {otherPackages.length > 0 && (
        <View style={styles.planSection}>
          {otherPackages.map((pkg) => renderPackage(pkg, false))}
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
    borderColor: colors.neutral.medium[1],
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
  planPeriod: {
    fontSize: 16,
    fontWeight: "400",
    color: colors.text.secondary,
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
