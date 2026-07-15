import type { Capability, Entitlements } from "@/types/api";

export type FreeAdjustmentNote = {
  /** True once the relevant free allowance is spent (upsell copy). */
  exhausted: boolean;
  text: string;
};

type NoteParams = {
  /** From useEntitlements; null for paid tiers (no free-allowance note shown). */
  freeAllowances: Entitlements["freeAllowances"];
  selectedType: "week" | "day";
  isRestDay: boolean;
  noActiveWorkoutDay: boolean;
};

/**
 * Contextual free-adjustment note for the Adjust modal (FREE tier only).
 * Returns null when there's nothing to show — paid tiers (no freeAllowances),
 * rest days, and days outside the plan don't spend an adjustment allowance.
 *
 * Extracted from workout-regeneration-modal so the branching (limit === 1
 * singular copy, exhausted upsell, remaining count) is unit-testable — the
 * component just renders the result. Pure per LR-020 (renderHook is unreliable
 * in this RNTL/React-19 setup).
 */
export function computeFreeAdjustmentNote({
  freeAllowances,
  selectedType,
  isRestDay,
  noActiveWorkoutDay,
}: NoteParams): FreeAdjustmentNote | null {
  if (!freeAllowances || isRestDay || noActiveWorkoutDay) return null;

  const a =
    selectedType === "week"
      ? freeAllowances.weekAdjustment
      : freeAllowances.dayAdjustment;
  const scope = selectedType === "week" ? "weekly" : "daily";

  if (a.remaining <= 0) {
    return {
      exhausted: true,
      text: `You've used your free ${scope} ${
        a.limit === 1 ? "adjustment" : "adjustments"
      }. Upgrade to MastersFit+ to keep adjusting.`,
    };
  }
  if (a.limit === 1) {
    return { exhausted: false, text: `Uses your 1 free ${scope} adjustment` };
  }
  return {
    exhausted: false,
    text: `Uses 1 of your ${a.limit} free ${scope} adjustments · ${a.remaining} left`,
  };
}

/**
 * Pure resolver behind useEntitlements' `can()`. Client gating is UX-only, so
 * this FAILS OPEN: when entitlements haven't resolved (null), assume the
 * capability is allowed and let the server enforce via 403 — rather than
 * wrongly locking a paying user out on a transient fetch failure. Once
 * entitlements ARE resolved, absence of a capability means not-granted.
 */
export function resolveCapability(
  entitlements: Entitlements | null,
  capability: Capability,
): boolean {
  return entitlements ? !!entitlements.capabilities[capability] : true;
}
