import { type CircuitExerciseLog, type CircuitRound } from "@/types/api/circuit.types";
import { computeCircuitResult } from "@/utils/circuit-utils";

// Builds one exercise log. `completed` is the "user actually logged this"
// signal — it is only ever true when the user edits reps, never on the reps
// the app prefills to the target when it auto-creates the next round.
const ex = (
  actualReps: number,
  completed: boolean,
  extra: Partial<CircuitExerciseLog> = {}
): CircuitExerciseLog => ({
  exerciseId: 1,
  planDayExerciseId: 1,
  targetReps: actualReps,
  actualReps,
  completed,
  ...extra,
});

// A finished round: one-tap "Complete Round" leaves the per-exercise
// `completed` flags false but records the prescribed reps.
const completedRound = (roundNumber: number, reps: number[]): CircuitRound => ({
  roundNumber,
  isCompleted: true,
  exercises: reps.map((r) => ex(r, false)),
});

// The phantom round the app pushes after a round is completed: prefilled to
// target reps, but never performed (isCompleted false, nothing `completed`).
const phantomRound = (roundNumber: number, reps: number[]): CircuitRound => ({
  roundNumber,
  isCompleted: false,
  exercises: reps.map((r) => ex(r, false)),
});

// A genuine partial round: user logged some reps (completed: true) then ended
// the circuit before finishing the round.
const partialRound = (
  roundNumber: number,
  logged: number[]
): CircuitRound => ({
  roundNumber,
  isCompleted: false,
  exercises: logged.map((r) => ex(r, r > 0)),
});

describe("computeCircuitResult — AMRAP", () => {
  // Linley's bug: 5 clean rounds (2 exercises totalling 24 reps each) then
  // "Complete Circuit". The auto-created 6th round must not become "+24".
  it("scores a clean N-round AMRAP without a phantom partial", () => {
    const rounds = [
      completedRound(1, [8, 16]),
      completedRound(2, [8, 16]),
      completedRound(3, [8, 16]),
      completedRound(4, [8, 16]),
      completedRound(5, [8, 16]),
      phantomRound(6, [8, 16]), // prefilled to target, never performed
    ];
    const result = computeCircuitResult("amrap", rounds);
    expect(result.score).toBe("5");
    expect(result.roundsCompleted).toBe(5);
    // totalReps must exclude the phantom round's 24 prefilled reps.
    expect(result.totalReps).toBe(5 * 24);
  });

  it("keeps a genuine partial round in the score", () => {
    const rounds = [
      completedRound(1, [8, 16]),
      completedRound(2, [8, 16]),
      completedRound(3, [8, 16]),
      completedRound(4, [8, 16]),
      completedRound(5, [8, 16]),
      partialRound(6, [8, 4]), // user logged 12 reps into round 6
    ];
    const result = computeCircuitResult("amrap", rounds);
    expect(result.score).toBe("5+12");
    expect(result.totalReps).toBe(5 * 24 + 12);
  });

  it("scores a single completed round as just the round count", () => {
    const rounds = [completedRound(1, [8, 16]), phantomRound(2, [8, 16])];
    expect(computeCircuitResult("amrap", rounds).score).toBe("1");
  });
});
