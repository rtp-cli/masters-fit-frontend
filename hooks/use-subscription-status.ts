import { useCallback, useEffect, useState } from "react";
import Purchases, { type CustomerInfo } from "react-native-purchases";

import { useAuth } from "@/contexts/auth-context";

// Extract EntitlementInfo type from CustomerInfo
type EntitlementInfo = CustomerInfo["entitlements"]["active"][string];

// Single demo account that always reads as Pro (in any build) so demo/marketing
// screens show the app in a Pro state without a real RevenueCat entitlement.
// Deliberately scoped to this one company-owned account — every other user
// stays purely RevenueCat-driven. Remove this account from RevenueCat's concern
// entirely; it never goes through the store.
const DEMO_PRO_EMAIL = "rtp+demo@mastersfit.ai";

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
  const { user } = useAuth();

  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      setIsLoading(true);

      // Demo override: the demo account reads as Pro in every build (including
      // release) so the upgrade banner never shows during demos. Scoped to the
      // single demo account; all other users fall through to RevenueCat below.
      if (user?.email === DEMO_PRO_EMAIL) {
        setSubscriptionStatus({
          isPro: true,
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
  }, [user?.email]);

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
