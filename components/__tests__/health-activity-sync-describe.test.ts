import { describe as describeWorkouts } from "../health-activity-sync";

jest.mock("@/contexts/workout-context", () => ({ useWorkout: jest.fn() }));
jest.mock("@/lib/health-activity-import", () => ({
  syncHealthActivities: jest.fn(),
}));

const c = (activityType: string, customType: string | null = null) =>
  ({ activityType, customType }) as any;

describe("consent sentence", () => {
  it("reads one workout naturally", () => {
    expect(describeWorkouts([c("walk")])).toBe("a walk");
  });
  it("pluralizes repeats", () => {
    expect(describeWorkouts([c("walk"), c("walk")])).toBe("2 walks");
  });
  it("joins a mix with 'and'", () => {
    expect(describeWorkouts([c("walk"), c("walk"), c("golf")])).toBe(
      "2 walks and a round of golf"
    );
  });
  it("uses the watch's own name for 'other'", () => {
    expect(describeWorkouts([c("other", "Rowing")])).toBe("a rowing workout");
  });
});
