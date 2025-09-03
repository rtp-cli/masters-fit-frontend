import { useState, useCallback, useEffect } from "react";
import {
  CircuitSessionData,
  CircuitRound,
  CircuitExerciseLog,
  CircuitTimerState,
  CircuitMetrics,
  UseCircuitSessionReturn,
  CircuitSessionConfig,
} from "@/types/api/circuit.types";
import {
  WorkoutBlockWithExercises,
  WorkoutBlockWithExercise,
} from "@/types/api/workout.types";
import { calculateCircuitScore } from "@/utils/circuitUtils";
import { logger } from "@/lib/logger";

export function useCircuitSession(
  config: CircuitSessionConfig
): UseCircuitSessionReturn {
  const { block, autoStartTimer = false, allowPartialRounds = true } = config;

  const [sessionData, setSessionData] = useState<CircuitSessionData>(() =>
    initializeSession(block)
  );
  const [isLoading, setIsLoading] = useState(false);

  // Initialize session data
  function initializeSession(
    block: WorkoutBlockWithExercises
  ): CircuitSessionData {
    const initialTimer: CircuitTimerState = {
      currentTime: 0,
      isActive: autoStartTimer,
      isPaused: false,
      startTime: autoStartTimer ? new Date() : undefined,
      totalPausedTime: 0,
    };

    // Create first round
    const firstRound = createRound(1, block.exercises);

    // Calculate target rounds based on block type
    const getTargetRounds = () => {
      if (block.blockType === "emom" && block.timeCapMinutes) {
        return block.timeCapMinutes;
      } else if (block.blockType === "tabata") {
        return 8; // Tabata always has 8 intervals
      }
      return block.rounds;
    };

    return {
      blockId: block.id,
      blockType: block.blockType || "circuit",
      blockName: block.blockName,
      rounds: [firstRound],
      currentRound: 1,
      targetRounds: getTargetRounds(),
      timeCapMinutes: block.timeCapMinutes,
      timer: initialTimer,
      isCompleted: false,
      startedAt: autoStartTimer ? new Date() : undefined,
    };
  }

  // Re-initialize the session whenever the active block changes
  // This ensures circuit exercises render when switching from a dummy block to a real block
  useEffect(() => {
    setSessionData(initializeSession(block));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id]);

  // Create a new round with all exercises
  function createRound(
    roundNumber: number,
    exercises: WorkoutBlockWithExercise[]
  ): CircuitRound {
    return {
      roundNumber,
      exercises: exercises.map(
        (exercise): CircuitExerciseLog => ({
          exerciseId: exercise.exerciseId || exercise.id,
          planDayExerciseId: exercise.id,
          targetReps: exercise.reps || 0,
          actualReps: exercise.reps || 0,
          weight: exercise.weight,
          completed: false,
          notes: "",
        })
      ),
      isCompleted: false,
      notes: "",
    };
  }

  // Calculate current metrics
  const calculateMetrics = useCallback(
    (data: CircuitSessionData): CircuitMetrics => {
      const completedRounds = data.rounds.filter((r) => r.isCompleted).length;
      const totalReps = data.rounds.reduce(
        (total, round) =>
          total +
          round.exercises.reduce(
            (roundTotal, ex) => roundTotal + ex.actualReps,
            0
          ),
        0
      );
      const totalTimeMinutes = data.timer.currentTime / 60;

      const roundBreakdown = data.rounds
        .filter((r) => r.isCompleted)
        .map((round) => ({
          roundNumber: round.roundNumber,
          totalReps: round.exercises.reduce(
            (sum, ex) => sum + ex.actualReps,
            0
          ),
          timeSeconds: round.roundTimeSeconds || 0,
          completedExercises: round.exercises.filter((ex) => ex.completed)
            .length,
        }));

      const score = calculateCircuitScore(data.blockType, {
        roundsCompleted: completedRounds,
        totalReps,
        timeMinutes: totalTimeMinutes,
        targetRounds: data.targetRounds,
      });

      return {
        roundsCompleted: completedRounds,
        totalReps,
        totalTimeMinutes,
        averageRoundTime:
          roundBreakdown.length > 0
            ? roundBreakdown.reduce((sum, r) => sum + r.timeSeconds, 0) /
              roundBreakdown.length
            : undefined,
        score,
        roundBreakdown,
      };
    },
    []
  );

  // Get current round data
  const getCurrentRoundData = useCallback((): CircuitRound | null => {
    return sessionData.rounds[sessionData.currentRound - 1] || null;
  }, [sessionData.rounds, sessionData.currentRound]);

  // Start session
  const startSession = useCallback(() => {
    setSessionData((prev) => ({
      ...prev,
      timer: {
        ...prev.timer,
        isActive: true,
        startTime: new Date(),
      },
      startedAt: prev.startedAt || new Date(),
    }));

    logger.businessEvent("Circuit session started", {
      blockId: sessionData.blockId,
      blockType: sessionData.blockType,
      targetRounds: sessionData.targetRounds,
    });
  }, [sessionData.blockId, sessionData.blockType, sessionData.targetRounds]);

  // Update exercise reps in current round
  const updateExerciseReps = useCallback((exerciseId: number, reps: number) => {
    setSessionData((prev) => {
      const updatedRounds = [...prev.rounds];
      const currentRoundIndex = prev.currentRound - 1;

      if (updatedRounds[currentRoundIndex]) {
        const exerciseIndex = updatedRounds[
          currentRoundIndex
        ].exercises.findIndex((ex) => ex.exerciseId === exerciseId);

        if (exerciseIndex !== -1) {
          updatedRounds[currentRoundIndex].exercises[exerciseIndex] = {
            ...updatedRounds[currentRoundIndex].exercises[exerciseIndex],
            actualReps: Math.max(0, reps),
            completed: reps > 0,
          };
        }
      }

      return {
        ...prev,
        rounds: updatedRounds,
      };
    });
  }, []);

  // Update exercise weight in current round
  const updateExerciseWeight = useCallback(
    (exerciseId: number, weight: number) => {
      setSessionData((prev) => {
        const updatedRounds = [...prev.rounds];
        const currentRoundIndex = prev.currentRound - 1;

        if (updatedRounds[currentRoundIndex]) {
          const exerciseIndex = updatedRounds[
            currentRoundIndex
          ].exercises.findIndex((ex) => ex.exerciseId === exerciseId);

          if (exerciseIndex !== -1) {
            updatedRounds[currentRoundIndex].exercises[exerciseIndex] = {
              ...updatedRounds[currentRoundIndex].exercises[exerciseIndex],
              weight: Math.max(0, weight),
            };
          }
        }

        return {
          ...prev,
          rounds: updatedRounds,
        };
      });
    },
    []
  );

  // Complete current round
  const completeRound = useCallback(
    async (notes?: string): Promise<void> => {
      setIsLoading(true);

      try {
        const currentRoundData = getCurrentRoundData();
        if (!currentRoundData || currentRoundData.isCompleted) {
          return;
        }

        // Validate round completion
        const hasProgress =
          allowPartialRounds ||
          currentRoundData.exercises.some((ex) => ex.actualReps > 0);

        if (!hasProgress) {
          throw new Error("Complete at least one exercise to finish the round");
        }

        setSessionData((prev) => {
          const updatedRounds = [...prev.rounds];
          const currentRoundIndex = prev.currentRound - 1;

          if (updatedRounds[currentRoundIndex]) {
            updatedRounds[currentRoundIndex] = {
              ...updatedRounds[currentRoundIndex],
              isCompleted: true,
              completedAt: new Date(),
              roundTimeSeconds: prev.timer.currentTime,
              notes: notes || updatedRounds[currentRoundIndex].notes,
            };
          }

          // Determine if we should advance to next round
          const shouldAdvanceRound =
            !prev.targetRounds || prev.currentRound < prev.targetRounds;

          let newCurrentRound = prev.currentRound;

          // Handle different block types for round advancement
          if (prev.blockType === "amrap") {
            // AMRAP: Always create a new round with fresh exercises for continuous rounds
            newCurrentRound = prev.currentRound + 1;
            const freshExercises = block.exercises.map(
              (exercise): CircuitExerciseLog => ({
                exerciseId: exercise.exerciseId || exercise.id,
                planDayExerciseId: exercise.id,
                targetReps: exercise.reps || 0,
                actualReps: exercise.reps || 0,
                weight: exercise.weight,
                completed: false,
                notes: "",
              })
            );

            const nextRound = {
              roundNumber: newCurrentRound,
              exercises: freshExercises,
              isCompleted: false,
              notes: "",
            };

            updatedRounds.push(nextRound);
          } else if (prev.blockType === "tabata") {
            // Tabata: Create a new interval with fresh exercises for next 20s work period
            newCurrentRound = prev.currentRound + 1;
            const freshExercises = block.exercises.map(
              (exercise): CircuitExerciseLog => ({
                exerciseId: exercise.exerciseId || exercise.id,
                planDayExerciseId: exercise.id,
                targetReps: exercise.reps || 0,
                actualReps: exercise.reps || 0,
                weight: exercise.weight,
                completed: false,
                notes: "",
              })
            );

            const nextInterval = {
              roundNumber: newCurrentRound,
              exercises: freshExercises,
              isCompleted: false,
              notes: "",
            };

            updatedRounds.push(nextInterval);
          } else if (prev.blockType === "emom") {
            // For EMOM, reset the current round exercises for next minute
            const currentRoundIndex = prev.currentRound - 1;
            if (updatedRounds[currentRoundIndex]) {
              // Reset exercises for next minute while keeping the completed round data
              const resetExercises = block.exercises.map(
                (exercise): CircuitExerciseLog => ({
                  exerciseId: exercise.exerciseId || exercise.id,
                  planDayExerciseId: exercise.id,
                  targetReps: exercise.reps || 0,
                  actualReps: exercise.reps || 0,
                  weight: exercise.weight,
                  completed: false,
                  notes: "",
                })
              );

              // Create a new round for the next minute with fresh exercises
              const nextMinuteRound = {
                roundNumber: prev.currentRound + 1,
                exercises: resetExercises,
                isCompleted: false,
                notes: "",
              };

              updatedRounds.push(nextMinuteRound);
              newCurrentRound = prev.currentRound + 1;
            }
          } else if (shouldAdvanceRound) {
            // Advance to next round for remaining circuit types (including for_time)
            newCurrentRound = prev.currentRound + 1;

            // Create next round if it doesn't exist
            if (!updatedRounds[newCurrentRound - 1]) {
              updatedRounds.push(createRound(newCurrentRound, block.exercises));
            }
          }

          const updatedData: CircuitSessionData = {
            ...prev,
            rounds: updatedRounds,
            currentRound: newCurrentRound,
          };

          return updatedData;
        });

        logger.businessEvent("Circuit round completed", {
          blockId: sessionData.blockId,
          roundNumber: sessionData.currentRound,
          totalReps: currentRoundData.exercises.reduce(
            (sum, ex) => sum + ex.actualReps,
            0
          ),
        });
      } catch (error) {
        logger.error("Error completing circuit round", {
          error: error instanceof Error ? error.message : "Unknown error",
          blockId: sessionData.blockId,
          roundNumber: sessionData.currentRound,
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [
      getCurrentRoundData,
      allowPartialRounds,
      block.exercises,
      sessionData.blockId,
      sessionData.currentRound,
    ]
  );

  // Skip current round
  const skipRound = useCallback(
    (reason?: string) => {
      setSessionData((prev) => {
        const updatedRounds = [...prev.rounds];
        const currentRoundIndex = prev.currentRound - 1;

        if (
          updatedRounds[currentRoundIndex] &&
          !updatedRounds[currentRoundIndex].isCompleted
        ) {
          updatedRounds[currentRoundIndex] = {
            ...updatedRounds[currentRoundIndex],
            isSkipped: true,
            notes: reason || updatedRounds[currentRoundIndex].notes,
          };

          // Advance to next round
          const nextRound = prev.currentRound + 1;
          const shouldCreateNextRound =
            !prev.targetRounds || nextRound <= prev.targetRounds;

          if (shouldCreateNextRound && !updatedRounds[nextRound - 1]) {
            updatedRounds.push(createRound(nextRound, block.exercises));
          }

          return {
            ...prev,
            rounds: updatedRounds,
            currentRound: shouldCreateNextRound ? nextRound : prev.currentRound,
          };
        }

        return prev;
      });

      logger.businessEvent("Circuit round skipped", {
        blockId: sessionData.blockId,
        roundNumber: sessionData.currentRound,
        reason: reason || "No reason provided",
      });
    },
    [block.exercises, sessionData.blockId, sessionData.currentRound]
  );

  // Complete entire circuit
  const completeCircuit = useCallback(
    async (notes?: string): Promise<void> => {
      setIsLoading(true);

      try {
        setSessionData((prev) => ({
          ...prev,
          isCompleted: true,
          completedAt: new Date(),
          notes: notes || prev.notes,
          timer: {
            ...prev.timer,
            isActive: false,
            isPaused: false,
          },
        }));

        const metrics = calculateMetrics(sessionData);

        logger.businessEvent("Circuit session completed", {
          blockId: sessionData.blockId,
          blockType: sessionData.blockType,
          roundsCompleted: metrics.roundsCompleted,
          totalReps: metrics.totalReps,
          totalTimeMinutes: metrics.totalTimeMinutes,
          score: metrics.score,
        });
      } catch (error) {
        logger.error("Error completing circuit", {
          error: error instanceof Error ? error.message : "Unknown error",
          blockId: sessionData.blockId,
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [calculateMetrics, sessionData]
  );

  // Toggle timer (pause/resume)
  const toggleTimer = useCallback(() => {
    setSessionData((prev) => {
      const newIsPaused = !prev.timer.isPaused;
      const now = new Date();

      let newState: CircuitTimerState = {
        ...prev.timer,
        isPaused: newIsPaused,
      };

      if (newIsPaused) {
        // Pausing
        newState.pausedAt = now;
      } else {
        // Resuming
        if (prev.timer.pausedAt) {
          const pauseDuration = Math.floor(
            (now.getTime() - prev.timer.pausedAt.getTime()) / 1000
          );
          newState.totalPausedTime = prev.timer.totalPausedTime + pauseDuration;
          newState.pausedAt = undefined;
        }
      }

      return {
        ...prev,
        timer: newState,
      };
    });
  }, []);

  // Reset session
  const resetSession = useCallback(() => {
    const newSessionData = initializeSession(block);
    setSessionData(newSessionData);

    logger.businessEvent("Circuit session reset", {
      blockId: block.id,
    });
  }, [block]);

  // Update timer state
  const updateTimerState = useCallback((newTimerState: CircuitTimerState) => {
    setSessionData((prev) => ({
      ...prev,
      timer: newTimerState,
    }));
  }, []);

  // Calculate real-time metrics
  const metrics = calculateMetrics(sessionData);
  const currentRoundData = getCurrentRoundData();

  // Validation flags
  const canCompleteRound = Boolean(
    currentRoundData &&
      !currentRoundData.isCompleted &&
      (allowPartialRounds ||
        currentRoundData.exercises.some((ex) => ex.actualReps > 0))
  );

  const canCompleteCircuit = Boolean(
    sessionData.rounds.some((round) => round.isCompleted) ||
      currentRoundData?.exercises.some((ex) => ex.actualReps > 0)
  );

  // Auto-complete circuit on time cap or round completion
  useEffect(() => {
    if (sessionData.isCompleted) return;

    const { blockType, timeCapMinutes, targetRounds, timer } = sessionData;

    // Auto-complete on time cap (AMRAP)
    if (
      blockType === "amrap" &&
      timeCapMinutes &&
      timer.currentTime >= timeCapMinutes * 60
    ) {
      completeCircuit("Time cap reached");
      return;
    }

    // Auto-complete on target rounds (For Time)
    if (blockType === "for_time" && targetRounds) {
      const completedRounds = sessionData.rounds.filter(
        (r) => r.isCompleted
      ).length;
      if (completedRounds >= targetRounds) {
        completeCircuit("Target rounds completed");
        return;
      }
    }

    // Auto-complete EMOM on target minutes
    if (blockType === "emom" && targetRounds) {
      const completedMinutes = sessionData.rounds.filter(
        (r) => r.isCompleted
      ).length;
      if (completedMinutes >= targetRounds) {
        completeCircuit("Target minutes completed");
        return;
      }
    }

    // Auto-complete Tabata (8 intervals)
    if (blockType === "tabata") {
      const completedIntervals = sessionData.rounds.filter(
        (r) => r.isCompleted
      ).length;

      // Check both timer intervals and completed rounds
      if (
        (timer.currentInterval && timer.currentInterval > 8) ||
        completedIntervals >= 8
      ) {
        completeCircuit("Tabata protocol completed");
        return;
      }
    }
  }, [sessionData, completeCircuit]);

  return {
    sessionData,
    currentRoundData,
    metrics,
    actions: {
      startSession,
      updateExerciseReps,
      updateExerciseWeight,
      completeRound,
      skipRound,
      completeCircuit,
      toggleTimer,
      resetSession,
    },
    isLoading,
    canCompleteRound,
    canCompleteCircuit,
    updateTimerState, // Expose for timer component
  };
}
