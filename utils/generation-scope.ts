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
