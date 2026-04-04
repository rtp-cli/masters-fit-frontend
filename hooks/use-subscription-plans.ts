import { useCallback, useEffect, useState } from "react";
import Purchases, {
  type CustomerInfo,
  PURCHASES_ERROR_CODE,
  type PurchasesError,
  type PurchasesOffering,
  type PurchasesPackage,
} from "react-native-purchases";
import { Sentry } from "@/lib/sentry";

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
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [metadata, setMetadata] = useState<OfferingMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const fetchOfferings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Wait for RevenueCat to be configured before fetching
      const isConfigured = await Purchases.isConfigured();
      if (!isConfigured) {
        console.warn("[RevenueCat] SDK not configured yet, retrying in 1s...");
        // Retry after a short delay to allow configure() to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const retryConfigured = await Purchases.isConfigured();
        if (!retryConfigured) {
          Sentry.captureMessage("RevenueCat: SDK not configured after retry", {
            level: "error",
          });
          setError("Payment system not available. Please restart the app.");
          setIsLoading(false);
          return;
        }
      }

      // Get offerings from RevenueCat
      const offerings = await Purchases.getOfferings();

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

        console.log(
          "[RevenueCat] Loaded offerings:",
          offerings.current.identifier
        );
        console.log(
          "[RevenueCat] Available packages:",
          offerings.current.availablePackages.map((p) => p.identifier)
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
        console.warn("[RevenueCat] No current offering available");
        setOffering(null);
        setPackages([]);
        setMetadata(null);
      }

      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      console.log(
        "[RevenueCat] Customer entitlements:",
        Object.keys(info.entitlements.active)
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to fetch subscription plans";
      console.error("[RevenueCat] Error fetching offerings:", err);
      Sentry.captureException(err, {
        tags: { component: "revenuecat" },
        extra: { operation: "fetchOfferings" },
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
        console.log("[RevenueCat] Starting purchase for:", pkg.identifier);

        const { customerInfo: updatedInfo } =
          await Purchases.purchasePackage(pkg);

        setCustomerInfo(updatedInfo);

        // Check if the purchase was successful by checking entitlements
        const hasActiveEntitlement =
          Object.keys(updatedInfo.entitlements.active).length > 0;

        console.log("[RevenueCat] Purchase completed:", {
          hasActiveEntitlement,
          activeEntitlements: Object.keys(updatedInfo.entitlements.active),
        });

        return hasActiveEntitlement;
      } catch (err) {
        const purchaseError = err as PurchasesError;

        // Handle user cancellation gracefully
        if (
          purchaseError.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
        ) {
          console.log("[RevenueCat] Purchase cancelled by user");
          return false;
        }

        // Handle other errors
        const errorMessage =
          purchaseError.message || "Failed to complete purchase";
        console.error("[RevenueCat] Purchase error:", purchaseError);
        setError(errorMessage);
        return false;
      } finally {
        setIsPurchasing(false);
      }
    },
    []
  );

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    setIsPurchasing(true);
    setError(null);

    try {
      console.log("[RevenueCat] Restoring purchases...");

      const restoredInfo = await Purchases.restorePurchases();
      setCustomerInfo(restoredInfo);

      const hasActiveEntitlement =
        Object.keys(restoredInfo.entitlements.active).length > 0;

      console.log("[RevenueCat] Restore completed:", {
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
      console.error("[RevenueCat] Restore error:", err);
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
      console.log("[RevenueCat] Customer info updated");
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
