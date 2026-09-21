import { type CircuitExerciseLog, type CircuitRound } from "@/types/api/circuit.types";
import {
  computeCircuitResult,
  isRoundActionVisible,
} from "@/utils/circuit-utils";

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

// ── isRoundActionVisible ───────────────────────────────────────────────────
// Its contract is that it "mirrors the render conditions in CircuitRoundAction
// so the two never disagree", and SPEC §6 changed what governs it. The round
// Undo used to force this true so the Undo could occupy the primary slot —
// which blocked the NEXT round for the whole undo window, worst on tabata,
// EMOM and AMRAP where the pace is highest. The Undo now drains in the
// "Complete Circuit" row, so the primary slot follows the round label alone
// and canUndoRound is no longer an input.

const block = (blockType: string) =>
  ({ blockType }) as unknown as Parameters<typeof isRoundActionVisible>[0];

const session = (
  currentRound: number,
  completedThrough: number,
  targetRounds?: number
) => ({
  currentRound,
  targetRounds,
  isCompleted: false,
  rounds: Array.from(
    { length: Math.max(currentRound, completedThrough) },
    (_, i) =>
      i < completedThrough
        ? completedRound(i + 1, [10])
        : phantomRound(i + 1, [10])
  ),
});

describe("isRoundActionVisible", () => {
  it("shows the next round the instant the session advances", () => {
    // Round 2 done, session advanced to round 3 of 5: the primary slot must be
    // live immediately — this is the lockout SPEC §6 exists to remove.
    expect(isRoundActionVisible(block("circuit"), session(3, 2, 5))).toBe(true);
  });

  it("hides once the final round of a bounded block is completed", () => {
    // currentRound does NOT advance here, so the current round is the completed
    // one and the footer falls back to a filled "Complete Circuit" (§6.1) — the
    // drain still gets its own row, gated separately.
    expect(isRoundActionVisible(block("circuit"), session(5, 5, 5))).toBe(
      false
    );
  });

  it("hides on tabata interval 8 (null label)", () => {
    expect(isRoundActionVisible(block("tabata"), session(8, 7))).toBe(false);
  });

  it("keeps EMOM's manual finish while its round is open", () => {
    // getRoundCompleteButtonText returns null for EMOM always; the block-type
    // branch is what keeps its manual finish on screen.
    expect(isRoundActionVisible(block("emom"), session(3, 2, 10))).toBe(true);
  });

  it("hides once the circuit itself is logged", () => {
    expect(
      isRoundActionVisible(block("circuit"), {
        ...session(3, 2, 5),
        isCompleted: true,
      })
    ).toBe(false);
  });

  it("lets AMRAP keep going past any target", () => {
    expect(isRoundActionVisible(block("amrap"), session(9, 8, 5))).toBe(true);
  });
});
