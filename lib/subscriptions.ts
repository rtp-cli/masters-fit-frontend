import {
  type Entitlements,
  type SubscriptionStatusResponse,
  type UserSubscriptionStatus,
} from "@/types/api";

import { apiRequest } from "./api";

export type { Entitlements,UserSubscriptionStatus } from "@/types/api";

/**
 * Fetch the full /subscriptions/status response (subscription + entitlements).
 * Backend is the source of truth once RevenueCat's webhook has landed.
 */
export async function getSubscriptionStatusResponse(): Promise<SubscriptionStatusResponse | null> {
  try {
    return await apiRequest<SubscriptionStatusResponse>(
      "/subscriptions/status",
    );
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return null;
  }
}

/** Subscription block only (legacy callers). */
export async function getSubscriptionStatus(): Promise<UserSubscriptionStatus | null> {
  return (await getSubscriptionStatusResponse())?.subscription ?? null;
}

/**
 * Server-authoritative entitlements (tier, capabilities, free allowances) — the
 * gating source of truth for the P2 model. null if unavailable (offline, or a
 * backend that predates the entitlements field).
 */
export async function getEntitlements(): Promise<Entitlements | null> {
  return (await getSubscriptionStatusResponse())?.entitlements ?? null;
}

/**
 * Actively reconcile our backend with RevenueCat right after a purchase
 * (POST /subscriptions/sync). The backend calls RevenueCat's REST API to
 * confirm the live entitlement and flips the DB to ACTIVE immediately — it does
 * NOT wait for the async RevenueCat webhook, which never reaches a localhost
 * backend in dev and lags in prod. This is what closes the post-purchase race
 * (otherwise a just-paid user stays FREE and the server keeps 403-ing them).
 * Returns the freshly-resolved status (same shape as /status), or null on error.
 */
export async function syncSubscription(): Promise<SubscriptionStatusResponse | null> {
  try {
    return await apiRequest<SubscriptionStatusResponse>(
      "/subscriptions/sync",
      { method: "POST" },
    );
  } catch (error) {
    console.error("Error syncing subscription:", error);
    return null;
  }
}
