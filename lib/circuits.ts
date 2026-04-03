import { apiRequest } from "./api";
import { CircuitRound } from "@/types/api/circuit.types";
import {
  CreateExerciseLogParams,
  WorkoutBlockWithExercises,
} from "@/types/api/workout.types";
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
  block: WorkoutBlockWithExercises
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
    ]);

    logger.businessEvent("Circuit completion logged", {
      roundsCompleted: completedRounds.length,
      exerciseLogs: allLogs.length,
      exercisesMarkedComplete: uniqueExerciseIds.length,
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
