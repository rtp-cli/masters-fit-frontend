/**
 * Where a finished generation should land the user.
 *
 * Pure and dependency-free on purpose. Three call sites derive this — the
 * background-job context's auto-landing, the generation modal's "View Your
 * Workout" button, and the dock chip — and they each used to compute it
 * inline, which is how they could have disagreed about a first plan. Keeping it
 * here also means it can be tested without pulling the context's native
 * dependency tree into a test runner.
 */

export type GenerationJobType =
  | "generation"
  | "regeneration"
  | "daily-regeneration";

/**
 * "day" = single-day regeneration, "week" = full-week rebuild, "first" = the
 * user's very first plan, straight out of onboarding.
 *
 * [LR-071] "first" is separated because that reveal is the one that decides
 * whether somebody ever starts training. On prod, 21 of 21 users get a plan and
 * 9 have ever logged an exercise, and most who never logged hold exactly one
 * refresh token — they saw the plan and never opened the app again.
 */
export type GenerationScope = "day" | "week" | "first";

export const scopeForJobType = (
  type: GenerationJobType | undefined
): GenerationScope => {
  if (type === "daily-regeneration") return "day";
  // "generation" is created in exactly one place — the onboarding controller —
  // so it means "this person just finished setup and has their first plan".
  if (type === "generation") return "first";
  return "week";
};

/**
 * Does this set of plan days contain a session dated today?
 *
 * [LR-071] Decides whether a first-plan reveal can land on the workout tab.
 * That tab renders TODAY's plan day and nothing else, so landing there without
 * one shows the rest-day state -- and 5 of 21 first plans on prod have no
 * session on the day they were generated (the plan follows the user's chosen
 * available days, so onboarding on a Tuesday with Mon/Wed/Fri selected starts
 * tomorrow).
 *
 * Pure so the date comparison -- the part that would silently route someone to
 * an empty screen -- is testable without a simulator. The caller supplies
 * `today` and the normaliser from @/utils, so this cannot drift from the
 * helpers the workout screen itself uses to pick its day.
 */
export const planHasSessionOn = (
  planDays: { date: string | Date }[] | null | undefined,
  today: string,
  normalize: (d: string | Date) => string
): boolean => {
  if (!planDays?.length) return false;
  return planDays.some((day) => normalize(day.date) === today);
};
