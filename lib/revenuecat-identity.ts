export const RC_ANONYMOUS_ID_PREFIX = "$RCAnonymousID:";

interface EnsureIdentifiedDeps {
  getAppUserID: () => Promise<string>;
  logIn: (userId: string) => Promise<unknown>;
  captureException: (error: unknown, context?: Record<string, unknown>) => void;
}

/**
 * [LR-005] Purchases.logIn(userId) normally runs at auth time
 * (auth-context.tsx), but if that call failed or hadn't resolved yet,
 * RevenueCat is still on an anonymous app_user_id. A purchase made under
 * that ID produces a webhook the backend can't map to a user
 * (subscription.controller.ts's resolveUserId throws on
 * $RCAnonymousID:...), leaving recovery dependent on a later TRANSFER
 * event. Call this as a last-chance guard right before a purchase fires.
 */
export async function ensureIdentifiedBeforePurchase(
  userId: number,
  deps: EnsureIdentifiedDeps,
): Promise<void> {
  const currentAppUserId = await deps.getAppUserID();
  if (!currentAppUserId.startsWith(RC_ANONYMOUS_ID_PREFIX)) {
    return;
  }

  try {
    await deps.logIn(userId.toString());
  } catch (identifyErr) {
    deps.captureException(identifyErr, {
      tags: { component: "revenuecat", operation: "purchasePackage:logIn" },
      extra: { userId },
    });
  }
}
