import { PAYWALL_COPY, PAYWALL_TITLE } from "@/lib/paywall-copy";

describe("paywall copy", () => {
  const entries = Object.entries(PAYWALL_COPY);

  it("uses the canonical upgrade title", () => {
    expect(PAYWALL_TITLE).toBe("Upgrade to MastersFit+");
  });

  it.each(entries)("%s is a non-empty string", (_key, value) => {
    expect(typeof value).toBe("string");
    expect(value.trim().length).toBeGreaterThan(0);
  });

  // Regression guard for the copy pass that removed overpromising language.
  it.each(entries)("%s never overpromises with 'unlimited'", (_key, value) => {
    expect(value.toLowerCase()).not.toMatch(/unlimited/);
  });

  it.each(entries)("%s names the product 'MastersFit+'", (_key, value) => {
    expect(value).toContain("MastersFit+");
  });
});
