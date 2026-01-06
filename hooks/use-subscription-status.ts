import { useCallback, useEffect, useState } from "react";
import Purchases, { type CustomerInfo } from "react-native-purchases";

// Extract EntitlementInfo type from CustomerInfo
type EntitlementInfo = CustomerInfo["entitlements"]["active"][string];

interface SubscriptionStatus {
  isPro: boolean;
  isTrial: boolean;
  isBlocked: boolean;
  activeEntitlement: EntitlementInfo | null;
  productIdentifier: string | null;
  expirationDate: Date | null;
  willRenew: boolean;
}

export function useSubscriptionStatus() {
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus>({
      isPro: false,
      isTrial: false,
      isBlocked: false,
      activeEntitlement: null,
      productIdentifier: null,
      expirationDate: null,
      willRenew: false,
    });
  const [isLoading, setIsLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const info = await Purchases.getCustomerInfo();

      setCustomerInfo(info);

      // Check for active entitlements
      const activeEntitlements = Object.values(info.entitlements.active);

      if (activeEntitlements.length === 0) {
        setSubscriptionStatus({
          isPro: false,
          isTrial: false,
          isBlocked: false,
          activeEntitlement: null,
          productIdentifier: null,
          expirationDate: null,
          willRenew: false,
        });
        setIsLoading(false);
        return;
      }

      // Get the first active entitlement (assuming you have a "premium" or "pro" entitlement)
      // RevenueCat typically uses entitlements like "premium", "pro", etc.
      const entitlementId = Object.keys(info.entitlements.active)[0];
      const entitlement = info.entitlements.active[entitlementId];

      if (!entitlement) {
        setSubscriptionStatus({
          isPro: false,
          isTrial: false,
          isBlocked: false,
          activeEntitlement: null,
          productIdentifier: null,
          expirationDate: null,
          willRenew: false,
        });
        setIsLoading(false);
        return;
      }

      // Check if entitlement is active and not in grace period
      const isActive = entitlement.isActive;
      const isInGracePeriod =
        entitlement.willRenew === false && entitlement.periodType === "NORMAL";

      // Check if it's a trial
      const isTrial =
        entitlement.periodType === "TRIAL" ||
        entitlement.periodType === "INTRO";

      // Check if blocked (expired, not renewing, and past expiration)
      const expirationDate = entitlement.expirationDate
        ? new Date(entitlement.expirationDate)
        : null;
      const isExpired = expirationDate ? expirationDate < new Date() : false;
      const isBlocked = !isActive || (isExpired && !entitlement.willRenew);

      // Only show Pro badge if:
      // 1. Entitlement is active
      // 2. Not in trial mode
      // 3. Not blocked/expired
      const isPro = isActive && !isTrial && !isBlocked && !isInGracePeriod;

      setSubscriptionStatus({
        isPro,
        isTrial,
        isBlocked,
        activeEntitlement: entitlement,
        productIdentifier: entitlement.productIdentifier || null,
        expirationDate,
        willRenew: entitlement.willRenew || false,
      });
    } catch (error) {
      console.error(
        "[SubscriptionStatus] Error fetching subscription status:",
        error
      );
      setSubscriptionStatus({
        isPro: false,
        isTrial: false,
        isBlocked: false,
        activeEntitlement: null,
        productIdentifier: null,
        expirationDate: null,
        willRenew: false,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptionStatus();

    // Listen for subscription updates
    const customerInfoListener = (info: CustomerInfo) => {
      setCustomerInfo(info);
      fetchSubscriptionStatus();
    };

    Purchases.addCustomerInfoUpdateListener(customerInfoListener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
    };
  }, [fetchSubscriptionStatus]);

  return {
    ...subscriptionStatus,
    customerInfo,
    isLoading,
    refetch: fetchSubscriptionStatus,
  };
}
