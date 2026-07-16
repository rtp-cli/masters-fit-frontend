import { useCallback, useEffect, useState } from "react";
import Purchases, {
  type CustomerInfo,
  PURCHASES_ERROR_CODE,
  type PurchasesError,
  type PurchasesOffering,
  type PurchasesPackage,
} from "react-native-purchases";

import { SUPPRESS_REVENUECAT_LOGS } from "@/config";
import { useAuth } from "@/contexts/auth-context";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics-events";
import { ensureIdentifiedBeforePurchase } from "@/lib/revenuecat-identity";
import { Sentry } from "@/lib/sentry";
import { syncSubscription } from "@/lib/subscriptions";

const rcLog = (...args: unknown[]) => {
  if (!SUPPRESS_REVENUECAT_LOGS) console.log(...args);
};
const rcWarn = (...args: unknown[]) => {
  if (!SUPPRESS_REVENUECAT_LOGS) console.warn(...args);
};
const rcError = (...args: unknown[]) => {
  if (!SUPPRESS_REVENUECAT_LOGS) console.error(...args);
};

// Type for offering metadata with benefits
export interface OfferingMetadata {
  benefits?: {
    [packageId: string]: string[];
  };
  paywall_title?: string;
  paywall_subtitle?: string;
  [key: string]: unknown;
}

interface UseSubscriptionPlansReturn {
  offering: PurchasesOffering | null;
  packages: PurchasesPackage[];
  metadata: OfferingMetadata | null;
  isLoading: boolean;
  error: string | null;
  customerInfo: CustomerInfo | null;
  isPurchasing: boolean;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useSubscriptionPlans(): UseSubscriptionPlansReturn {
  const { user } = useAuth();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [metadata, setMetadata] = useState<OfferingMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const fetchOfferings = useCallback(async (retryCount = 0) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get offerings from RevenueCat (with timeout to prevent infinite hang)
      const offerings = await Promise.race([
        Purchases.getOfferings(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(new Error("RevenueCat getOfferings timed out after 10s")),
            10000,
          ),
        ),
      ]);

      Sentry.addBreadcrumb({
        category: "revenuecat",
        message: "Offerings fetched",
        data: {
          hasCurrent: !!offerings.current,
          allOfferingIds: Object.keys(offerings.all || {}),
        },
        level: "info",
      });

      if (offerings.current) {
        setOffering(offerings.current);
        setPackages(offerings.current.availablePackages);

        const offeringMetadata =
          (offerings.current.metadata as OfferingMetadata) || null;
        setMetadata(offeringMetadata);

        rcLog("[RevenueCat] Loaded offerings:", offerings.current.identifier);
        rcLog(
          "[RevenueCat] Available packages:",
          offerings.current.availablePackages.map((p) => p.identifier),
        );
      } else {
        // This is the silent failure — capture it explicitly
        Sentry.captureMessage("RevenueCat: No current offering available", {
          level: "warning",
          extra: {
            allOfferingIds: Object.keys(offerings.all || {}),
            offeringsRaw: JSON.stringify(offerings),
          },
        });
        rcWarn("[RevenueCat] No current offering available");
        setOffering(null);
        setPackages([]);
        setMetadata(null);
        // Was previously silent past this point — the paywall modal already
        // has error+retry UI wired to this hook's `error` field, it just
        // never got set for this specific failure mode. [LR-009]
        setError(
          "We couldn't load subscription plans right now. Please try again.",
        );
      }

      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      rcLog(
        "[RevenueCat] Customer entitlements:",
        Object.keys(info.entitlements.active),
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to fetch subscription plans";
      rcError("[RevenueCat] Error fetching offerings:", err);

      // If SDK isn't configured yet, retry up to 3 times with delay
      const isNotConfigured =
        errorMessage.includes("singleton") ||
        errorMessage.includes("configure");
      if (isNotConfigured && retryCount < 3) {
        rcWarn(
          `[RevenueCat] SDK not ready, retrying in ${retryCount + 1}s... (attempt ${retryCount + 1}/3)`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, (retryCount + 1) * 1000),
        );
        return fetchOfferings(retryCount + 1);
      }

      Sentry.captureException(err, {
        tags: { component: "revenuecat" },
        extra: { operation: "fetchOfferings", retryCount },
      });
      setError(errorMessage);
      setOffering(null);
      setPackages([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const purchasePackage = useCallback(
    async (pkg: PurchasesPackage): Promise<boolean> => {
      setIsPurchasing(true);
      setError(null);

      try {
        if (user) {
          await ensureIdentifiedBeforePurchase(user.id, {
            getAppUserID: () => Purchases.getAppUserID(),
            logIn: (userId) => Purchases.logIn(userId),
            captureException: Sentry.captureException,
          });
        }

        rcLog("[RevenueCat] Starting purchase for:", pkg.identifier);

        const { customerInfo: updatedInfo } =
          await Purchases.purchasePackage(pkg);

        setCustomerInfo(updatedInfo);

        // Check if the purchase was successful by checking entitlements
        const hasActiveEntitlement =
          Object.keys(updatedInfo.entitlements.active).length > 0;

        rcLog("[RevenueCat] Purchase completed:", {
          hasActiveEntitlement,
          activeEntitlements: Object.keys(updatedInfo.entitlements.active),
        });

        // RevenueCat confirms the purchase locally, but our backend gates
        // features on its own subscription row — which only flips once the
        // RevenueCat webhook lands. That webhook never reaches a localhost
        // backend in dev and lags in prod, so instead of passively polling we
        // actively reconcile via POST /subscriptions/sync (backend re-checks
        // RevenueCat's REST API and flips the DB to ACTIVE now). This closes
        // the post-purchase race so a resume-after-purchase / immediate gated
        // call isn't bounced right back to the paywall. RevenueCat's local
        // confirmation is still authoritative — we never fail the purchase
        // just because our own backend hasn't caught up yet.
        if (hasActiveEntitlement) {
          // [AN-08] Client purchase-completed (intent-confirmed-locally). The backend
          // webhook owns the *verified* purchase; this is the client-side signal.
          const activeEntitlement = Object.values(
            updatedInfo.entitlements.active,
          )[0];
          const isTrial =
            activeEntitlement?.periodType === "TRIAL" ||
            activeEntitlement?.periodType === "INTRO";
          trackEvent(AnalyticsEvent.PURCHASE_COMPLETED, {
            package_id: pkg.identifier,
            product_id: pkg.product.identifier,
            plan: pkg.product.title,
            price: pkg.product.price,
            is_trial: isTrial,
          });
          if (isTrial) {
            trackEvent(AnalyticsEvent.TRIAL_STARTED, {
              package_id: pkg.identifier,
              product_id: pkg.product.identifier,
              plan: pkg.product.title,
            });
          }

          let backendSynced = false;
          for (let attempt = 0; attempt < 3 && !backendSynced; attempt++) {
            if (attempt > 0) {
              await new Promise((resolve) => setTimeout(resolve, 1500));
            }
            const status = await syncSubscription();
            // Converted once the server tier is anything but FREE (new P2 model);
            // fall back to the legacy accessLevel for older backends.
            backendSynced =
              (!!status?.entitlements && status.entitlements.tier !== "FREE") ||
              status?.subscription?.accessLevel === "unlimited";
          }

          if (!backendSynced) {
            rcWarn(
              "[RevenueCat] Purchase confirmed locally but backend hasn't synced yet",
            );
            Sentry.captureMessage(
              "Backend subscription status not synced after purchase",
              { level: "warning", tags: { component: "revenuecat" } },
            );
          }
        }

        return hasActiveEntitlement;
      } catch (err) {
        const purchaseError = err as PurchasesError;

        // Handle user cancellation gracefully
        if (
          purchaseError.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
        ) {
          rcLog("[RevenueCat] Purchase cancelled by user");
          trackEvent(AnalyticsEvent.PURCHASE_FAILED, {
            package_id: pkg.identifier,
            product_id: pkg.product.identifier,
            user_cancelled: true,
            error_code: purchaseError.code,
          });
          return false;
        }

        // Handle other errors
        const errorMessage =
          purchaseError.message || "Failed to complete purchase";
        rcError("[RevenueCat] Purchase error:", purchaseError);
        setError(errorMessage);
        trackEvent(AnalyticsEvent.PURCHASE_FAILED, {
          package_id: pkg.identifier,
          product_id: pkg.product.identifier,
          user_cancelled: false,
          error: errorMessage,
          error_code: purchaseError.code,
        });
        return false;
      } finally {
        setIsPurchasing(false);
      }
    },
    [user],
  );

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    setIsPurchasing(true);
    setError(null);

    try {
      rcLog("[RevenueCat] Restoring purchases...");

      const restoredInfo = await Purchases.restorePurchases();
      setCustomerInfo(restoredInfo);

      const hasActiveEntitlement =
        Object.keys(restoredInfo.entitlements.active).length > 0;

      rcLog("[RevenueCat] Restore completed:", {
        hasActiveEntitlement,
        activeEntitlements: Object.keys(restoredInfo.entitlements.active),
      });

      if (!hasActiveEntitlement) {
        setError("No previous purchases found to restore");
      }

      return hasActiveEntitlement;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to restore purchases";
      rcError("[RevenueCat] Restore error:", err);
      setError(errorMessage);
      return false;
    } finally {
      setIsPurchasing(false);
    }
  }, []);

  useEffect(() => {
    fetchOfferings();
  }, [fetchOfferings]);

  // Listen for customer info updates
  useEffect(() => {
    const customerInfoListener = (info: CustomerInfo) => {
      rcLog("[RevenueCat] Customer info updated");
      setCustomerInfo(info);
    };

    Purchases.addCustomerInfoUpdateListener(customerInfoListener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
    };
  }, []);

  return {
    offering,
    packages,
    metadata,
    isLoading,
    error,
    customerInfo,
    isPurchasing,
    purchasePackage,
    restorePurchases,
    refetch: fetchOfferings,
  };
}
