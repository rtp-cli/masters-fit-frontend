/**
 * Client-side paywall copy — mirrors the backend's owner-approved strings
 * (backend/src/constants/paywall-copy.ts) for paywalls the client opens
 * proactively (e.g. a locked analytics card). For server-triggered 403s the
 * client renders the backend-provided paywall.message instead.
 */
export const PAYWALL_TITLE = "Upgrade to MastersFit+";

export const PAYWALL_COPY = {
  GENERIC:
    "Upgrade to MastersFit+ to unlock this feature and keep your training evolving.",
  ANALYTICS:
    "Track your progress over time with strength trends, training volume, and personal records—all with MastersFit+.",
  NEW_PLAN:
    "Create new personalized training plans whenever your goals, schedule, or available equipment change—with MastersFit+.",
  HEALTH:
    "Automatically sync your workouts with Apple Health and Health Connect using MastersFit+.",
  // [LR-087] Opened from the plan-ended screen, where the user was trying to
  // build a PLAN, not adjust one — ADJUSTMENTS_EXHAUSTED ("You've used your free
  // workout adjustments") described the wrong thing at that moment.
  PLAN_ENDED:
    "You've used the free plans that come with MastersFit. With MastersFit+, a fresh plan is built around your goals and schedule every week.",
  ADJUSTMENTS_EXHAUSTED:
    "You've used your free workout adjustments. Upgrade to MastersFit+ to keep your training evolving as your goals, schedule, and recovery change.",
} as const;
