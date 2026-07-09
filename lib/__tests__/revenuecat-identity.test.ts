import { ensureIdentifiedBeforePurchase } from "@/lib/revenuecat-identity";

describe("ensureIdentifiedBeforePurchase [LR-005]", () => {
  it("does nothing when RevenueCat is already identified as the user", async () => {
    const getAppUserID = jest.fn().mockResolvedValue("42");
    const logIn = jest.fn();
    const captureException = jest.fn();

    await ensureIdentifiedBeforePurchase(42, {
      getAppUserID,
      logIn,
      captureException,
    });

    expect(logIn).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
  });

  it("calls logIn with the user id when RevenueCat is still anonymous", async () => {
    const getAppUserID = jest
      .fn()
      .mockResolvedValue("$RCAnonymousID:abc123");
    const logIn = jest.fn().mockResolvedValue({});
    const captureException = jest.fn();

    await ensureIdentifiedBeforePurchase(42, {
      getAppUserID,
      logIn,
      captureException,
    });

    expect(logIn).toHaveBeenCalledWith("42");
    expect(captureException).not.toHaveBeenCalled();
  });

  it("reports to Sentry (but does not throw) when logIn fails while still anonymous", async () => {
    const getAppUserID = jest
      .fn()
      .mockResolvedValue("$RCAnonymousID:abc123");
    const loginError = new Error("network error");
    const logIn = jest.fn().mockRejectedValue(loginError);
    const captureException = jest.fn();

    await expect(
      ensureIdentifiedBeforePurchase(42, {
        getAppUserID,
        logIn,
        captureException,
      }),
    ).resolves.toBeUndefined();

    expect(captureException).toHaveBeenCalledWith(
      loginError,
      expect.objectContaining({ extra: { userId: 42 } }),
    );
  });
});
