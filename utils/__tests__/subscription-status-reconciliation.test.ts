import { reconcileSubscriptionStatus } from "@/utils/subscription-status-reconciliation";

const localActive = {
  isPro: true,
  isTrial: false,
  isBlocked: false,
  isInGracePeriod: false,
};

describe("reconcileSubscriptionStatus [LR-008]", () => {
  it("falls back to local state when the backend fetch failed (null)", () => {
    expect(reconcileSubscriptionStatus(localActive, null)).toEqual(localActive);
  });

  it("prefers the backend's grace_period even when local SDK still says active", () => {
    const result = reconcileSubscriptionStatus(localActive, {
      status: "grace_period",
      accessLevel: "unlimited",
    });
    expect(result).toEqual({
      isPro: false,
      isTrial: false,
      isBlocked: false,
      isInGracePeriod: true,
    });
  });

  it("prefers the backend's blocked accessLevel over an optimistic local state", () => {
    const result = reconcileSubscriptionStatus(localActive, {
      status: "expired",
      accessLevel: "blocked",
    });
    expect(result.isBlocked).toBe(true);
    expect(result.isPro).toBe(false);
  });

  it("confirms Pro when the backend clearly says active + unlimited", () => {
    const result = reconcileSubscriptionStatus(
      { isPro: false, isTrial: false, isBlocked: false, isInGracePeriod: false },
      { status: "active", accessLevel: "unlimited" }
    );
    expect(result.isPro).toBe(true);
  });

  it("reflects a trial accessLevel from the backend", () => {
    const result = reconcileSubscriptionStatus(localActive, {
      status: "trial",
      accessLevel: "trial",
    });
    expect(result.isTrial).toBe(true);
    expect(result.isPro).toBe(false);
  });
});
