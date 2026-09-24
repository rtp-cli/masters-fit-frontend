import { ownExerciseNameFor } from "../add-own-exercise-row";

describe("ownExerciseNameFor", () => {
  it("offers the typed name, tidied", () => {
    expect(ownExerciseNameFor("  sled push   w/ sled pull ", [])).toBe(
      "sled push w/ sled pull"
    );
  });

  it("stays hidden until there's something to name", () => {
    expect(ownExerciseNameFor("", [])).toBeNull();
    expect(ownExerciseNameFor(" a ", [])).toBeNull();
    expect(ownExerciseNameFor("!!", [])).toBeNull();
  });

  it("hides when a result already has that name, ignoring case and punctuation", () => {
    expect(ownExerciseNameFor("sled-push", [{ name: "Sled Push" }])).toBeNull();
  });

  it("still offers it next to near-misses", () => {
    expect(
      ownExerciseNameFor("sled push w/ sled pull", [{ name: "Sled Push" }])
    ).toBe("sled push w/ sled pull");
  });

  it("refuses a name longer than the backend accepts", () => {
    expect(ownExerciseNameFor("x".repeat(81), [])).toBeNull();
    expect(ownExerciseNameFor("x".repeat(80), [])).toBe("x".repeat(80));
  });
});
