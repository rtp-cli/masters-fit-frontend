import { countPlanDayExercises, selectMissedDays } from "@/utils/missed-days";

// Mirrors formatDateAsString for the two shapes the API sends.
const normalize = (d: string | Date) =>
  typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);

const day = (
  id: number,
  date: string,
  { isComplete = false, exercises = 3 }: { isComplete?: boolean; exercises?: number } = {}
) => ({
  id,
  date,
  isComplete,
  blocks:
    exercises > 0
      ? [{ exercises: Array.from({ length: exercises }, (_, i) => ({ id: i })) }]
      : [],
});

const TODAY = "2026-10-16"; // Friday

describe("selectMissedDays", () => {
  it("offers Wednesday's missed workout when doing it today", () => {
    const plan = [
      day(1, "2026-10-12", { isComplete: true }), // Mon — done
      day(2, "2026-10-14"), // Wed — missed
      day(3, "2026-10-16"), // Fri — today, the target
      day(4, "2026-10-18"), // Sun — still ahead
    ];
    expect(selectMissedDays(plan, TODAY, TODAY, normalize).map((d) => d.id)).toEqual([2]);
  });

  it("skips rest days and placeholders with no exercises", () => {
    const plan = [day(1, "2026-10-13", { exercises: 0 }), day(2, "2026-10-14")];
    expect(selectMissedDays(plan, TODAY, TODAY, normalize).map((d) => d.id)).toEqual([2]);
  });

  it("never offers the target day itself or anything after it", () => {
    // Calendar opened on Wednesday (a past day): only Monday came before it.
    const plan = [day(1, "2026-10-12"), day(2, "2026-10-14"), day(3, "2026-10-15")];
    expect(
      selectMissedDays(plan, "2026-10-14", TODAY, normalize).map((d) => d.id)
    ).toEqual([1]);
  });

  it("doesn't call today or later days missed when the target is in the future", () => {
    const plan = [day(1, "2026-10-14"), day(2, "2026-10-16"), day(3, "2026-10-17")];
    expect(
      selectMissedDays(plan, "2026-10-18", TODAY, normalize).map((d) => d.id)
    ).toEqual([1]);
  });

  it("returns oldest first and handles ISO timestamps", () => {
    const plan = [day(2, "2026-10-14T00:00:00.000Z"), day(1, "2026-10-12T00:00:00.000Z")];
    expect(selectMissedDays(plan, TODAY, TODAY, normalize).map((d) => d.id)).toEqual([1, 2]);
  });

  it("returns nothing when there's no plan or nothing missed", () => {
    expect(selectMissedDays(null, TODAY, TODAY, normalize)).toEqual([]);
    expect(
      selectMissedDays([day(1, "2026-10-14", { isComplete: true })], TODAY, TODAY, normalize)
    ).toEqual([]);
  });
});

describe("countPlanDayExercises", () => {
  it("sums exercises across blocks and tolerates missing arrays", () => {
    expect(
      countPlanDayExercises({
        date: TODAY,
        blocks: [{ exercises: [1, 2] }, { exercises: null }, {}],
      })
    ).toBe(2);
    expect(countPlanDayExercises({ date: TODAY })).toBe(0);
  });
});
