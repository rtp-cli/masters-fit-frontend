import { planHasSessionOn, scopeForJobType } from "@/utils/generation-scope";

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

/**
 * [LR-071] This predicate decides whether a first-plan reveal lands on the
 * workout tab. Getting it wrong routes a brand-new user to an empty rest-day
 * screen at the exact moment that decides whether they ever train -- which is
 * worse than the week grid that shipped before. Hence the coverage.
 *
 * `normalize` stands in for formatDateAsString from @/utils, which the workout
 * screen itself uses to pick its day.
 */
describe("planHasSessionOn", () => {
  const normalize = (d: string | Date) =>
    typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);

  it("finds a session dated today", () => {
    const days = [{ date: "2026-09-17" }, { date: "2026-09-19" }];
    expect(planHasSessionOn(days, "2026-09-17", normalize)).toBe(true);
  });

  // The 5-of-21 case: plan starts tomorrow because today isn't an available day.
  it("returns false when the plan starts later", () => {
    const days = [{ date: "2026-09-18" }, { date: "2026-09-20" }];
    expect(planHasSessionOn(days, "2026-09-17", normalize)).toBe(false);
  });

  it("returns false for an empty or missing plan rather than throwing", () => {
    expect(planHasSessionOn([], "2026-09-17", normalize)).toBe(false);
    expect(planHasSessionOn(null, "2026-09-17", normalize)).toBe(false);
    expect(planHasSessionOn(undefined, "2026-09-17", normalize)).toBe(false);
  });

  // Dates arrive from the API as full timestamps; comparing them raw against a
  // YYYY-MM-DD "today" would never match, and every user would silently get the
  // week-grid fallback.
  it("normalises a timestamp before comparing", () => {
    const days = [{ date: "2026-09-17T14:30:00.000Z" }];
    expect(planHasSessionOn(days, "2026-09-17", normalize)).toBe(true);
  });

  it("does not match a different day", () => {
    const days = [{ date: "2026-09-16" }];
    expect(planHasSessionOn(days, "2026-09-17", normalize)).toBe(false);
  });
});
