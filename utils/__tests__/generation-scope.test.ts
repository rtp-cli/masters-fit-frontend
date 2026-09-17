import { scopeForJobType } from "@/utils/generation-scope";

/**
 * [LR-071] The scope decides where a finished generation lands the user, and
 * three call sites derive it (the context's auto-landing, the modal's "View
 * Your Workout" button, the dock chip). They each used to compute it inline,
 * which is how they could have disagreed about a first plan.
 */
describe("scopeForJobType", () => {
  // "generation" is created in exactly one place, the onboarding controller,
  // so it is precisely "this person just finished setup".
  it("treats the onboarding generation as a first plan", () => {
    expect(scopeForJobType("generation")).toBe("first");
  });

  it("treats a weekly rebuild as a week, not a first plan", () => {
    expect(scopeForJobType("regeneration")).toBe("week");
  });

  it("treats a daily regeneration as a single day", () => {
    expect(scopeForJobType("daily-regeneration")).toBe("day");
  });

  // The dock chip passes a possibly-undefined job type while a job is still
  // resolving; it must not crash or claim a first plan.
  it("falls back to week for an unknown or missing type", () => {
    expect(scopeForJobType(undefined)).toBe("week");
  });
});
