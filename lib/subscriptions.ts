import {
  type SubscriptionStatusResponse,
  type UserSubscriptionStatus,
} from "@/types/api";

import { apiRequest } from "./api";

export type { UserSubscriptionStatus } from "@/types/api";

/**
 * Fetch the authenticated user's subscription status directly from the
 * backend, rather than trusting local RevenueCat SDK state — the backend is
 * the source of truth once RevenueCat's webhook has landed.
 */
export async function getSubscriptionStatus(): Promise<UserSubscriptionStatus | null> {
  try {
    const response = await apiRequest<SubscriptionStatusResponse>(
      "/subscriptions/status",
    );
    return response.subscription;
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return null;
  }
}
