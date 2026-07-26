// Shared MastersFit+ benefit copy.
//
// Single source of truth for the paywall (payment-wall-modal) and the
// subscription-details modal so the two can't drift apart (they had).
//
// Each bullet maps to a real free-vs-Plus difference in the backend
// entitlement model (backend `constants/access-policy.ts`) and mirrors the
// owner-approved reason copy in backend `constants/paywall-copy.ts`:
//   1. Unlimited adjustments  -> FREE is capped (1 week / 3 day lifetime); PLUS removes the cap.
//   2. New training plans      -> Capability.GENERATE_NEW_PROGRAM (PLUS-only).
//   3. Progress analytics      -> Capability.VIEW_PROGRESS_ANALYTICS (PLUS-only).
//   4. Health sync             -> Capability.SYNC_HEALTH (PLUS-only).
// Do NOT list capabilities FREE also has (e.g. an AI-generated initial plan) —
// they aren't upgrade reasons and read as misleading.
export const MASTERSFIT_PLUS_BENEFITS = [
  "Flexible plan adjustments — reshape any week or day as your training needs change",
  "New training plans whenever your goals, schedule, or equipment change",
  "Progress analytics — strength trends, training volume, and personal records",
  "Auto-sync your workouts to Apple Health and Health Connect",
] as const;
