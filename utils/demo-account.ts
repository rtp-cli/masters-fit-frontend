/**
 * [LR-011] The demo account always reads as Pro (in any build, including
 * release) so demo/marketing screens show the app in a Pro state without a
 * real RevenueCat entitlement — see use-subscription-status.ts. Deliberately
 * scoped to exactly this one company-owned email via strict equality, not a
 * pattern/substring match: widening this (e.g. to `.includes()` or a
 * case-insensitive check) would grant free Pro access to any matching real
 * user. Extracted into its own function specifically so that invariant has
 * a test — the hook itself can't be rendered under this project's current
 * RNTL/React 19 setup (see launch_readiness/LOOP_QUEUE.md L5/L11).
 */
export const DEMO_PRO_EMAIL = "rtp+demo@mastersfit.ai";

export function isDemoProAccount(email: string | null | undefined): boolean {
  return email === DEMO_PRO_EMAIL;
}
