import { describe, expect,it } from "@jest/globals";

import { DEMO_PRO_EMAIL,isDemoProAccount } from "@/utils/demo-account";

describe("isDemoProAccount [LR-011]", () => {
  it("matches the exact demo account email", () => {
    expect(isDemoProAccount(DEMO_PRO_EMAIL)).toBe(true);
  });

  it("does not match a real user's email", () => {
    expect(isDemoProAccount("rtp@mastersfit.ai")).toBe(false);
  });

  it("does not match on a substring/partial match", () => {
    // Guards against the exact widening this check must never regress to —
    // a real user emailing from an address that merely contains the demo
    // address as a substring must not get free Pro access.
    expect(isDemoProAccount(`prefix-${DEMO_PRO_EMAIL}`)).toBe(false);
    expect(isDemoProAccount(`${DEMO_PRO_EMAIL}-suffix`)).toBe(false);
  });

  it("is case-sensitive — does not match a differently-cased version", () => {
    expect(isDemoProAccount(DEMO_PRO_EMAIL.toUpperCase())).toBe(false);
  });

  it("returns false for null/undefined rather than throwing", () => {
    expect(isDemoProAccount(null)).toBe(false);
    expect(isDemoProAccount(undefined)).toBe(false);
  });
});
