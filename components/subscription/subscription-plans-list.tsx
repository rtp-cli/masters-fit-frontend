import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
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
        className={`bg-background rounded-2xl p-5 border-2 relative ${
          isSelected
            ? "border-primary bg-primary/10"
            : isPopular
              ? "border-primary"
              : "border-neutral-light-2"
        }`}
        activeOpacity={0.7}
      >
        {isPopular && (
          <View className="absolute -top-2.5 right-5 bg-primary px-3 py-1 rounded-xl z-10">
            <Text className="text-white text-xs font-bold">
              Save {savingsInfo?.savingsPercent}%
            </Text>
          </View>
        )}

        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <Text className="text-xl font-bold text-text-primary mb-1">
              {pkg.product.title || pkg.identifier}
            </Text>
            {pkg.product.description && (
              <Text className="text-sm text-text-secondary leading-5">
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

        <View className="mb-4">
          <Text className="text-[32px] font-bold text-text-primary mb-1">
            {pkg.product.priceString}
            <Text className="text-base font-normal text-text-secondary">
              {" "}
              {getPeriodDescription(pkg)}
            </Text>
          </Text>
          {isAnnual && savingsInfo && savingsInfo.savings > 0 && (
            <Text className="text-sm text-primary font-semibold">
              Save {pkg.product.currencyCode} {savingsInfo.savings.toFixed(2)}
              /year
            </Text>
          )}
        </View>

        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={colors.brand.primary}
            />
            <Text className="text-sm text-text-secondary flex-1">
              Unlimited workout regenerations
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={colors.brand.primary}
            />
            <Text className="text-sm text-text-secondary flex-1">
              Priority AI processing
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={colors.brand.primary}
            />
            <Text className="text-sm text-text-secondary flex-1">
              Advanced analytics
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="gap-3">
      {/* Annual packages first (usually better value) */}
      {annualPackages.length > 0 && (
        <View className="gap-3">
          {annualPackages.map((pkg) => renderPackage(pkg, true))}
        </View>
      )}

      {/* Monthly packages */}
      {monthlyPackages.length > 0 && (
        <View className="gap-3">
          {monthlyPackages.map((pkg) => renderPackage(pkg, false))}
        </View>
      )}

      {/* Other packages (weekly, lifetime, etc.) */}
      {otherPackages.length > 0 && (
        <View className="gap-3">
          {otherPackages.map((pkg) => renderPackage(pkg, false))}
        </View>
      )}
    </View>
  );
}
