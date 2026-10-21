import {
  addDaysToDateString,
  buildMoveDayOptions,
} from "@/utils/move-day-options";

const normalize = (d: string | Date) =>
  typeof d === "string" ? d : d.toISOString().slice(0, 10);

// Plan Mon 10/19 – Sun 10/25; today = Wed 10/21.
const plan = [
  { id: 1, date: "2026-10-19", name: "Strength A", isComplete: true },
  { id: 2, date: "2026-10-21", name: "Strength B", isComplete: false },
  { id: 3, date: "2026-10-23", name: "Yoga", isComplete: false },
  { id: 4, date: "2026-10-24", name: "Run", isComplete: true },
  { id: 5, date: "2026-10-24", name: "Bonus", isComplete: false },
];

describe("addDaysToDateString", () => {
  it("crosses month and year boundaries without timezone drift", () => {
    expect(addDaysToDateString("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDaysToDateString("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToDateString("2026-03-08", 1)).toBe("2026-03-09"); // US DST start
  });
});

describe("buildMoveDayOptions", () => {
  it("offers today through plan end, minus the source's own date", () => {
    const options = buildMoveDayOptions(
      plan,
      { id: 3, date: "2026-10-23" },
      { today: "2026-10-21", planStart: "2026-10-19", planEnd: "2026-10-25" },
      normalize
    );
    expect(options.map((o) => o.date)).toEqual([
      "2026-10-21",
      "2026-10-22",
      "2026-10-24",
      "2026-10-25",
    ]);
  });

  it("labels today, lists what's scheduled, and treats empty days as rest", () => {
    const [today, rest] = buildMoveDayOptions(
      plan,
      { id: 3, date: "2026-10-23" },
      { today: "2026-10-21", planStart: "2026-10-19", planEnd: "2026-10-25" },
      normalize
    );
    expect(today).toEqual({
      date: "2026-10-21",
      sessions: [{ id: 2, name: "Strength B" }],
      disabled: false,
      isToday: true,
    });
    expect(rest.sessions).toEqual([]);
    expect(rest.disabled).toBe(false);
  });

  it("disables a day holding a completed session", () => {
    const options = buildMoveDayOptions(
      plan,
      { id: 2, date: "2026-10-21" },
      { today: "2026-10-21", planStart: "2026-10-19", planEnd: "2026-10-25" },
      normalize
    );
    const sat = options.find((o) => o.date === "2026-10-24")!;
    expect(sat.disabled).toBe(true);
    expect(sat.sessions.map((s) => s.name)).toEqual(["Run", "Bonus"]);
  });

  it("never offers dates before the plan starts", () => {
    const options = buildMoveDayOptions(
      plan,
      { id: 3, date: "2026-10-23" },
      { today: "2026-10-17", planStart: "2026-10-19", planEnd: "2026-10-20" },
      normalize
    );
    expect(options.map((o) => o.date)).toEqual(["2026-10-19", "2026-10-20"]);
  });
});
