/**
 * [LR-008] use-subscription-status.ts derived grace period only from the
 * local RevenueCat SDK entitlement — it never surfaced isInGracePeriod at
 * all (computed, then silently dropped), and never checked the backend's
 * own GRACE_PERIOD/BILLING_ISSUE state (subscription.service.ts), which can
 * disagree with local SDK state if a webhook landed before the SDK's own
 * customer-info cache refreshed.
 *
 * Kept as a standalone pure function (not inline in the hook) specifically
 * so it's unit-testable without rendering — this project's RNTL setup has a
 * known, currently-unresolved React 19 act() environment issue (see L5/L11
 * in launch_readiness/LOOP_QUEUE.md) that blocks hook-level rendering tests
 * entirely.
 */

export interface LocalSubscriptionSignal {
  isPro: boolean;
  isTrial: boolean;
  isBlocked: boolean;
  isInGracePeriod: boolean;
}

export interface BackendSubscriptionSignal {
  status: string;
  accessLevel: "unlimited" | "trial" | "blocked";
}

/**
 * The backend wins whenever it has a clear, confident answer — it's the
 * source of truth for billing state (webhooks land there, not on-device).
 * Local RevenueCat SDK state is the fallback when the backend fetch fails
 * or returns something ambiguous.
 */
export function reconcileSubscriptionStatus(
  local: LocalSubscriptionSignal,
  backend: BackendSubscriptionSignal | null
): LocalSubscriptionSignal {
  if (!backend) {
    return local;
  }

  if (backend.status === "grace_period") {
    return { isPro: false, isTrial: false, isBlocked: false, isInGracePeriod: true };
  }

  if (backend.accessLevel === "blocked") {
    return { isPro: false, isTrial: false, isBlocked: true, isInGracePeriod: false };
  }

  if (backend.accessLevel === "unlimited" && backend.status === "active") {
    return { isPro: true, isTrial: false, isBlocked: false, isInGracePeriod: false };
  }

  if (backend.accessLevel === "trial") {
    return { isPro: false, isTrial: true, isBlocked: false, isInGracePeriod: false };
  }

  // Anything else (e.g. a status we don't have explicit handling for) —
  // trust local state rather than guess.
  return local;
}
