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
