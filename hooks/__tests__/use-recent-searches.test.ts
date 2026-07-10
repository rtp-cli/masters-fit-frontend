// [MF-019] Tests the pure list-management logic directly rather than
// through the hook -- renderHook from @testing-library/react-native
// doesn't work in this project's RNTL/React-19 setup (see LR-020's notes),
// so the hook itself is left thin, untested wiring over this function.
import { addToList } from "@/hooks/use-recent-searches";

describe("addToList [MF-019]", () => {
  it("adds a new value to the front", () => {
    expect(addToList([], "squat")).toEqual(["squat"]);
    expect(addToList(["squat"], "lunge")).toEqual(["lunge", "squat"]);
  });

  it("moves a repeated value back to the front instead of duplicating it", () => {
    expect(addToList(["squat", "lunge"], "squat")).toEqual([
      "squat",
      "lunge",
    ]);
  });

  it("caps the list at 5 items, dropping the oldest", () => {
    const result = ["a", "b", "c", "d", "e", "f"].reduce(addToList, []);
    expect(result).toEqual(["f", "e", "d", "c", "b"]);
  });
});
