import { apiRequest } from "./api";
import { CircuitSessionData, CircuitRound } from "@/types/api/circuit.types";
import {
  CreateExerciseLogParams,
  WorkoutBlockWithExercises,
} from "@/types/api/workout.types";
import { logger } from "./logger";

// Note: Backend does not expose block-level log endpoints. We only log per-round, per-exercise.

/**
 * Create exercise logs for a completed circuit round
 */
export async function createCircuitExerciseLogs(
  workoutId: number,
  roundData: CircuitRound
): Promise<void> {
  try {
    const logPromises = roundData.exercises.map(async (exercise) => {
      if (exercise.actualReps > 0 || exercise.completed) {
        // Create the exercise log entry
        const exerciseLogParams: CreateExerciseLogParams = {
          planDayExerciseId: exercise.planDayExerciseId,
          sets: [
            {
              roundNumber: roundData.roundNumber,
              setNumber: 1, // Circuit exercises are typically one "set" per round
              weight: exercise.weight || 0,
              reps: exercise.actualReps,
            },
          ],
          durationCompleted: exercise.timeSeconds,
          isComplete: exercise.completed,
          timeTaken: roundData.roundTimeSeconds,
          notes: exercise.notes,
        };

        await apiRequest(`/logs/exercise`, {
          method: "POST",
          body: JSON.stringify(exerciseLogParams),
        });

        // Mark exercise as completed in the workout log
        await apiRequest(
          `/logs/workout/${workoutId}/exercise/${exercise.planDayExerciseId}`,
          { method: "POST" }
        );

        return true;
      }
    });

    await Promise.all(logPromises.filter(Boolean));
  } catch (error) {
    logger.error("Error creating circuit exercise logs", {
      error: error instanceof Error ? error.message : "Unknown error",
      workoutId,
      roundNumber: roundData.roundNumber,
    });
    throw error;
  }
}

/**
 * Mark all exercises in a circuit block as complete in the workout log
 */
export async function markBlockExercisesComplete(
  workoutId: number,
  block: WorkoutBlockWithExercises
): Promise<void> {
  const seen = new Set<number>();
  for (const ex of block.exercises) {
    const id = ex.id;
    if (seen.has(id)) continue;
    seen.add(id);
    try {
      await apiRequest(`/logs/workout/${workoutId}/exercise/${id}`, {
        method: "POST",
      });
    } catch (error) {
      logger.error("Error marking circuit exercise complete", {
        error: error instanceof Error ? error.message : "Unknown error",
        workoutId,
        planDayExerciseId: id,
      });
      throw error;
    }
  }
}

/**
 * Log a complete circuit session to the backend (per-round exercise logs only)
 */
export async function logCircuitSession(
  workoutId: number,
  sessionData: CircuitSessionData
): Promise<void> {
  try {
    logger.businessEvent("Logging circuit session", {
      blockId: sessionData.blockId,
      blockType: sessionData.blockType,
      roundsCompleted: sessionData.rounds.filter((r) => r.isCompleted).length,
    });

    // Create exercise logs for each completed round
    const completedRounds = sessionData.rounds.filter((r) => r.isCompleted);
    for (const round of completedRounds) {
      await createCircuitExerciseLogs(workoutId, round);
    }

    logger.businessEvent("Circuit session logged successfully", {
      blockId: sessionData.blockId,
      roundsCompleted: completedRounds.length,
    });
  } catch (error) {
    logger.error("Error logging circuit session", {
      error: error instanceof Error ? error.message : "Unknown error",
      workoutId,
      blockId: sessionData.blockId,
    });
    throw error;
  }
}

/**
 * Log an individual circuit round (for incremental logging)
 */
export async function logCircuitRound(
  workoutId: number,
  blockId: number,
  roundData: CircuitRound
): Promise<void> {
  try {
    await createCircuitExerciseLogs(workoutId, roundData);

    logger.businessEvent("Circuit round logged", {
      blockId,
      roundNumber: roundData.roundNumber,
      totalReps: roundData.exercises.reduce(
        (sum, ex) => sum + ex.actualReps,
        0
      ),
    });
  } catch (error) {
    logger.error("Error logging circuit round", {
      error: error instanceof Error ? error.message : "Unknown error",
      workoutId,
      blockId,
      roundNumber: roundData.roundNumber,
    });
    throw error;
  }
}

/**
 * Get existing circuit logs for a workout block
 */
// Deprecated: backend does not expose block log endpoints

/**
 * Get the latest circuit log for a workout block
 */
// Deprecated: backend does not expose block log endpoints

/**
 * Get exercise logs for a circuit block
 */
// Deprecated: backend does not expose exercise logs by block

/**
 * Resume a circuit session from existing logs
 */
// Deprecated: resume circuit from logs not supported with current backend API

/**
 * Calculate session score for logging
 */
function calculateSessionScore(sessionData: CircuitSessionData): string {
  const completedRounds = sessionData.rounds.filter(
    (r) => r.isCompleted
  ).length;
  const totalReps = sessionData.rounds.reduce(
    (total, round) =>
      total +
      round.exercises.reduce((roundTotal, ex) => roundTotal + ex.actualReps, 0),
    0
  );
  const timeMinutes = sessionData.timer.currentTime / 60;

  switch (sessionData.blockType) {
    case "amrap":
      // AMRAP score: rounds + partial reps
      const avgRepsPerRound =
        completedRounds > 0 ? Math.floor(totalReps / completedRounds) : 0;
      const extraReps = totalReps % avgRepsPerRound || 0;
      return `${completedRounds}${extraReps > 0 ? `+${extraReps}` : ""}`;

    case "for_time":
      // For Time score: completion time
      const minutes = Math.floor(timeMinutes);
      const seconds = Math.round((timeMinutes - minutes) * 60);
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;

    case "emom":
      // EMOM score: rounds completed / total minutes
      const targetMinutes = sessionData.targetRounds || completedRounds;
      return `${completedRounds}/${targetMinutes}`;

    case "tabata":
      // Tabata score: total reps
      return `${totalReps} reps`;

    case "circuit":
    default:
      // Generic circuit score: rounds completed
      return `${completedRounds} rounds`;
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
