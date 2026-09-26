import type { AllowanceStatus, Capability, Entitlements } from "@/types/api";
import {
  canBuildNextPlan,
  computeFreeAdjustmentNote,
  resolveCapability,
} from "@/utils/entitlements";

const allowance = (limit: number, remaining: number): AllowanceStatus => ({
  limit,
  used: limit - remaining,
  remaining,
});

// FREE default allowances: 1 initial plan, 1 week adjustment, 3 day adjustments.
const freeAllowances = (
  week: AllowanceStatus,
  day: AllowanceStatus,
): Entitlements["freeAllowances"] => ({
  initialPlan: allowance(1, 0),
  weekAdjustment: week,
  dayAdjustment: day,
});

const base = {
  selectedType: "day" as "day" | "week",
  isRestDay: false,
  noActiveWorkoutDay: false,
};

describe("computeFreeAdjustmentNote", () => {
  it("returns null for paid tiers (no freeAllowances)", () => {
    expect(
      computeFreeAdjustmentNote({ ...base, freeAllowances: null }),
    ).toBeNull();
  });

  it("returns null on a rest day", () => {
    expect(
      computeFreeAdjustmentNote({
        ...base,
        isRestDay: true,
        freeAllowances: freeAllowances(allowance(1, 1), allowance(3, 3)),
      }),
    ).toBeNull();
  });

  it("returns null for a day outside the plan", () => {
    expect(
      computeFreeAdjustmentNote({
        ...base,
        noActiveWorkoutDay: true,
        freeAllowances: freeAllowances(allowance(1, 1), allowance(3, 3)),
      }),
    ).toBeNull();
  });

  it("shows the remaining count for a multi-use daily allowance", () => {
    expect(
      computeFreeAdjustmentNote({
        ...base,
        selectedType: "day",
        freeAllowances: freeAllowances(allowance(1, 1), allowance(3, 2)),
      }),
    ).toEqual({
      exhausted: false,
      text: "Uses 1 of your 3 free daily adjustments · 2 left",
    });
  });

  it("uses singular copy for a single-use weekly allowance", () => {
    expect(
      computeFreeAdjustmentNote({
        ...base,
        selectedType: "week",
        freeAllowances: freeAllowances(allowance(1, 1), allowance(3, 3)),
      }),
    ).toEqual({
      exhausted: false,
      text: "Uses your 1 free weekly adjustment",
    });
  });

  it("marks the daily allowance exhausted with plural upsell copy", () => {
    expect(
      computeFreeAdjustmentNote({
        ...base,
        selectedType: "day",
        freeAllowances: freeAllowances(allowance(1, 1), allowance(3, 0)),
      }),
    ).toEqual({
      exhausted: true,
      text: "You've used your free daily adjustments. Upgrade to MastersFit+ to keep adjusting.",
    });
  });

  it("marks the weekly allowance exhausted with singular upsell copy", () => {
    expect(
      computeFreeAdjustmentNote({
        ...base,
        selectedType: "week",
        freeAllowances: freeAllowances(allowance(1, 0), allowance(3, 3)),
      }),
    ).toEqual({
      exhausted: true,
      text: "You've used your free weekly adjustment. Upgrade to MastersFit+ to keep adjusting.",
    });
  });

  it("treats negative remaining as exhausted (defensive)", () => {
    const note = computeFreeAdjustmentNote({
      ...base,
      selectedType: "day",
      freeAllowances: freeAllowances(allowance(1, 1), allowance(3, -1)),
    });
    expect(note?.exhausted).toBe(true);
  });
});

const ALL_CAPS: Capability[] = [
  "GENERATE_INITIAL_PLAN",
  "GENERATE_NEW_PROGRAM",
  "ADJUST_WEEK",
  "ADJUST_DAY",
  "VIEW_PROGRESS_ANALYTICS",
  "SYNC_HEALTH",
];

const entitlements = (
  caps: Partial<Record<Capability, boolean>>,
): Entitlements => ({
  tier: "FREE",
  capabilities: ALL_CAPS.reduce(
    (acc, c) => ({ ...acc, [c]: caps[c] ?? false }),
    {} as Record<Capability, boolean>,
  ),
  freeAllowances: null,
});

describe("resolveCapability (useEntitlements can())", () => {
  it("FAILS OPEN when entitlements are unresolved (null)", () => {
    // Client gating is UX-only; the server still enforces via 403, so an
    // unresolved fetch must not lock a paying user out.
    for (const cap of ALL_CAPS) {
      expect(resolveCapability(null, cap)).toBe(true);
    }
  });

  it("returns true for a granted capability", () => {
    expect(
      resolveCapability(
        entitlements({ VIEW_PROGRESS_ANALYTICS: true }),
        "VIEW_PROGRESS_ANALYTICS",
      ),
    ).toBe(true);
  });

  it("returns false for a denied capability", () => {
    expect(
      resolveCapability(
        entitlements({ VIEW_PROGRESS_ANALYTICS: false }),
        "VIEW_PROGRESS_ANALYTICS",
      ),
    ).toBe(false);
  });

  it("fails closed for a capability absent from a resolved map", () => {
    expect(resolveCapability(entitlements({}), "SYNC_HEALTH")).toBe(false);
  });
});

describe("canBuildNextPlan [LR-087]", () => {
  // Uses the file's top-level allowance(limit, remaining).
  const free = (weekRemaining: number): Entitlements["freeAllowances"] => ({
    initialPlan: allowance(1, 0),
    weekAdjustment: allowance(1, weekRemaining),
    dayAdjustment: allowance(3, 3),
  });

  it("fails open for paid and comped tiers (no free allowances apply)", () => {
    expect(canBuildNextPlan(null)).toBe(true);
  });

  it("lets a free user build while their week allowance remains", () => {
    expect(canBuildNextPlan(free(1))).toBe(true);
  });

  it("says no once the one lifetime week allowance is spent", () => {
    // The Clay case: INITIAL_PLAN 1/1 and WEEK_ADJUSTMENT 1/1 — walled out.
    expect(canBuildNextPlan(free(0))).toBe(false);
  });

  it("keys on the WEEK allowance only — spare day adjustments can't build a plan", () => {
    // Building a plan after the last one ends goes through /regenerate-async,
    // which spends WEEK_ADJUSTMENT. Day adjustments left over don't help.
    const f = free(0)!;
    expect(f.dayAdjustment.remaining).toBe(3);
    expect(canBuildNextPlan(f)).toBe(false);
  });
});
