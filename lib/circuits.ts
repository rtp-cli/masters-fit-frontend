import { type CircuitRound } from "@/types/api/circuit.types";
import {
  type CreateExerciseLogParams,
  type WorkoutBlockWithExercises,
} from "@/types/api/workout.types";
import { computeCircuitResult } from "@/utils/circuit-utils";

import { apiRequest } from "./api";
import { logger } from "./logger";

/**
 * Collect exercise log data from a circuit round (pure data, no API calls).
 * If the round is marked complete, log ALL exercises (including duration-based
 * cardio exercises that may have actualReps=0).
 * For incomplete rounds, only log exercises that have some recorded data.
 */
function collectRoundExerciseLogs(
  roundData: CircuitRound
): CreateExerciseLogParams[] {
  return roundData.exercises
    .filter(
      (exercise) =>
        roundData.isCompleted ||
        exercise.actualReps > 0 ||
        exercise.completed
    )
    .map((exercise) => ({
      planDayExerciseId: exercise.planDayExerciseId,
      roundNumber: roundData.roundNumber,
      sets: [
        {
          roundNumber: roundData.roundNumber,
          setNumber: 1,
          weight: exercise.weight || 0,
          reps: exercise.actualReps,
          // Prescribed distance rides into the set log (honor-system —
          // decision §16.1c); Health import can overwrite later
          distanceM: exercise.distanceM || undefined,
        },
      ],
      durationCompleted: exercise.timeSeconds,
      isComplete: true,
      timeTaken: roundData.roundTimeSeconds,
      notes: exercise.notes,
    }));
}

/**
 * Log all circuit rounds + mark exercises complete in minimal API calls.
 * Uses batch endpoint for exercise logs (1 call) + parallel mark-complete (N exercises).
 */
export async function logCircuitCompletion(
  workoutId: number,
  rounds: CircuitRound[],
  block: WorkoutBlockWithExercises,
  options?: {
    /** Manually entered elapsed time (T5-3 removed timers; for_time asks). */
    actualTimeSeconds?: number;
    /** Prescribed intervals/rounds — feeds the EMOM "R/T" score. */
    targetRounds?: number;
  }
): Promise<void> {
  try {
    // Collect all rounds that have any user interaction:
    // completed rounds, rounds with reps logged, or rounds with weight changes
    const completedRounds = rounds.filter((r) => {
      if (r.isCompleted) return true;
      const hasActivity = r.exercises?.some(
        (ex) => (ex.actualReps || 0) > 0 || ex.completed || (ex.weight || 0) > 0
      );
      return hasActivity;
    });

    const allLogs = completedRounds.flatMap((round) =>
      collectRoundExerciseLogs(round)
    );

    // Mark all unique exercises and the block as complete
    const uniqueExerciseIds = [
      ...new Set(block.exercises.map((ex) => ex.id)),
    ];

    // Block-level result: rounds + score ("5+12", "12:34", …). Without this
    // the AMRAP/For-Time score is unrecoverable after the session ends.
    const result = computeCircuitResult(block.blockType || "circuit", rounds, {
      targetRounds: options?.targetRounds,
      actualTimeSeconds: options?.actualTimeSeconds,
    });
    const actualTimeMinutes = result.actualTimeSeconds
      ? Math.round(result.actualTimeSeconds / 60)
      : block.blockType === "amrap"
        ? block.timeCapMinutes
        : undefined;

    await Promise.all([
      // 1 batch call for all exercise logs
      allLogs.length > 0
        ? apiRequest(`/logs/exercise/batch`, {
            method: "POST",
            body: JSON.stringify({ logs: allLogs }),
          })
        : Promise.resolve(),
      // 1 call to mark all exercises + block complete (no race condition)
      apiRequest(`/logs/workout/${workoutId}/exercises/complete`, {
        method: "POST",
        body: JSON.stringify({
          planDayExerciseIds: uniqueExerciseIds,
          workoutBlockId: block.id,
        }),
      }),
      // 1 call to persist the block-level result
      apiRequest(`/logs/block`, {
        method: "POST",
        body: JSON.stringify({
          workoutBlockId: block.id,
          roundsCompleted: result.roundsCompleted,
          totalReps: result.totalReps,
          score: result.score,
          timeCapMinutes: block.timeCapMinutes ?? undefined,
          actualTimeMinutes: actualTimeMinutes ?? undefined,
          totalDuration: result.actualTimeSeconds,
          isComplete: true,
        }),
      }),
    ]);

    logger.businessEvent("Circuit completion logged", {
      roundsCompleted: completedRounds.length,
      exerciseLogs: allLogs.length,
      exercisesMarkedComplete: uniqueExerciseIds.length,
      score: result.score,
    });
  } catch (error) {
    logger.error("Error logging circuit completion", {
      error: error instanceof Error ? error.message : "Unknown error",
      workoutId,
    });
    throw error;
  }
}

/**
 * Skip a circuit exercise within a round
 */
export async function skipCircuitExercise(
  workoutId: number,
  planDayExerciseId: number,
  reason?: string
): Promise<void> {
  try {
    await apiRequest(
      `/logs/workout/${workoutId}/exercise/${planDayExerciseId}/skip`,
      { method: "POST" }
    );

    logger.businessEvent("Circuit exercise skipped", {
      workoutId,
      planDayExerciseId,
      reason: reason || "No reason provided",
    });
  } catch (error) {
    logger.error("Error skipping circuit exercise", {
      error: error instanceof Error ? error.message : "Unknown error",
      workoutId,
      planDayExerciseId,
    });
    throw error;
  }
}

/**
 * Skip an entire circuit block
 */
export async function skipCircuitBlock(
  workoutId: number,
  workoutBlockId: number,
  reason?: string
): Promise<void> {
  try {
    await apiRequest(
      `/logs/workout/${workoutId}/block/${workoutBlockId}/skip`,
      { method: "POST" }
    );

    logger.businessEvent("Circuit block skipped", {
      workoutId,
      workoutBlockId,
      reason: reason || "No reason provided",
    });
  } catch (error) {
    logger.error("Error skipping circuit block", {
      error: error instanceof Error ? error.message : "Unknown error",
      workoutId,
      workoutBlockId,
    });
    throw error;
  }
}
