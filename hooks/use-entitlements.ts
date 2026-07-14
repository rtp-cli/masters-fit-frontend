import { useCallback, useEffect, useState } from "react";
import Purchases, { type CustomerInfo } from "react-native-purchases";

import { useAuth } from "@/contexts/auth-context";
import { getEntitlements, type Entitlements } from "@/lib/subscriptions";
import type { Capability } from "@/types/api";

/**
 * Server-authoritative entitlements for UI gating (P2). Reads
 * GET /subscriptions/status -> entitlements (tier, capabilities, free
 * allowances) and refreshes on RevenueCat CustomerInfo changes (so it updates
 * right after a purchase). This is intentionally separate from
 * useSubscriptionStatus (which drives the legacy isPro banner/settings UI) to
 * avoid disturbing that surface while we migrate gating over.
 *
 * Client gating is UX-only — the server still enforces via 403. So when
 * entitlements can't be resolved (offline, or a backend predating the field),
 * `can()` FAILS OPEN (returns true) and lets the server be the gate, rather
 * than wrongly locking a paying user out on a transient fetch failure.
 */
export function useEntitlements() {
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      setEntitlements(await getEntitlements());
    } finally {
      setIsLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    refetch();
    const listener = (_info: CustomerInfo) => {
      refetch();
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [refetch]);

  const can = useCallback(
    (capability: Capability): boolean =>
      entitlements ? !!entitlements.capabilities[capability] : true,
    [entitlements]
  );

  return {
    entitlements,
    tier: entitlements?.tier ?? null,
    capabilities: entitlements?.capabilities ?? null,
    freeAllowances: entitlements?.freeAllowances ?? null,
    can,
    isLoading,
    refetch,
  };
}
