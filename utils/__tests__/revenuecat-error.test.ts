import { isRevenueCatOfflineError } from "../revenuecat-error";

describe("isRevenueCatOfflineError", () => {
  it("matches RevenueCat's network error codes", () => {
    expect(isRevenueCatOfflineError({ code: "10", message: "x" })).toBe(true);
    expect(isRevenueCatOfflineError({ code: "35", message: "x" })).toBe(true);
  });

  it("matches iOS's offline message when no code is attached", () => {
    expect(
      isRevenueCatOfflineError(
        new Error(
          "Error performing request because the internet connection appears to be offline.",
        ),
      ),
    ).toBe(true);
  });

  it("ignores other RevenueCat errors so they still reach Sentry", () => {
    expect(isRevenueCatOfflineError({ code: "1", message: "cancelled" })).toBe(false);
    expect(isRevenueCatOfflineError(new Error("configure was not called"))).toBe(false);
    expect(isRevenueCatOfflineError(null)).toBe(false);
  });
});
