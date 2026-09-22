import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

import SetStepperFields from "@/components/set-stepper-fields";
import { HIT_SLOP_6 } from "@/constants";
import { useThemeColors } from "@/lib/theme";
import type { ExerciseLog } from "@/types/api/logs.types";
import type { WorkoutBlockWithExercise } from "@/types/api/workout.types";
import { shouldShowWeightInput } from "@/utils/exercise-helpers";

interface CircuitRoundEditorProps {
  exercise: WorkoutBlockWithExercise;
  /** This exercise's working logs — one per round, ascending. */
  logs: ExerciseLog[];
  /** The persisted logs for the same exercise, for "Edited" and Reset. */
  persisted: ExerciseLog[];
  /** Which round is open in THIS exercise, or null. Rounds in other
   *  exercises stay independent so two movements can be compared. */
  expandedRound: number | null;
  onToggleRound: (roundNumber: number | null) => void;
  onPatch: (
    roundNumber: number,
    patch: { weight?: number; reps?: number }
  ) => void;
  onReset: (roundNumber: number) => void;
}

/** The single set a circuit round carries. Rounds are logged one set per
 *  (planDayExerciseId, roundNumber) pair, so the round IS the set. */
const roundSet = (log?: ExerciseLog) => (log?.sets || [])[0];

/** Values-not-status summary for a collapsed row — "15 reps × 35 lb". The
 *  whole reason collapsing is a gain rather than a loss is that the numbers
 *  stay on screen, so this must never render a status word. */
const roundSummary = (log: ExerciseLog, showWeight: boolean): string => {
  const set = roundSet(log);
  const reps = set?.reps ?? 0;
  const weight = Number(set?.weight) || 0;
  const repText = `${reps} rep${reps === 1 ? "" : "s"}`;
  // Weight is omitted at 0 rather than shown as a dead "× 0 lb", matching the
  // strength summary's setValueLine. The EDITOR still offers a weight stepper
  // on every exercise — shouldShowWeightInput is always true by an earlier
  // product decision — so a bodyweight movement done loaded can still be
  // corrected; it just isn't advertised in the collapsed row.
  return showWeight && weight > 0 ? `${repText} × ${weight} lb` : repText;
};

const isRoundEdited = (working: ExerciseLog, persisted?: ExerciseLog) => {
  const a = roundSet(working);
  const b = roundSet(persisted);
  if (!b) return true;
  return (
    (a?.reps ?? 0) !== (b.reps ?? 0) ||
    (Number(a?.weight) || 0) !== (Number(b.weight) || 0)
  );
};

/**
 * One circuit exercise's round list inside the log editor. Every round is
 * collapsed on entry; tapping one opens it and closes whichever round was
 * open *in this exercise*.
 *
 * The unit of correction is (exercise, round), not (exercise, set) — a round
 * is the circuit analogue of a strength set in the data model, and it is
 * already half the key `POST /logs/exercise` rewrites.
 */
export default function CircuitRoundEditor({
  exercise,
  logs,
  persisted,
  expandedRound,
  onToggleRound,
  onPatch,
  onReset,
}: CircuitRoundEditorProps) {
  const colors = useThemeColors();
  const showWeight = shouldShowWeightInput(exercise);

  return (
    <View className="gap-2">
      {logs.map((log) => {
        const round = log.roundNumber;
        const expanded = expandedRound === round;
        const original = persisted.find((p) => p.roundNumber === round);
        const edited = isRoundEdited(log, original);
        const set = roundSet(log);

        const editedPill = edited ? (
          <View className="bg-neutral-light-2 rounded-full px-2 py-0.5 ml-2">
            <Text className="text-sm font-semibold text-text-secondary">
              Edited
            </Text>
          </View>
        ) : null;

        return (
          <View
            key={`${exercise.id}:${round}`}
            className="bg-surface rounded-lg"
            style={{
              borderColor: expanded
                ? colors.brand.primary
                : colors.neutral.medium[1],
              borderWidth: expanded ? 1.5 : 1,
            }}
          >
            {expanded ? (
              <View className="p-4">
                <TouchableOpacity
                  className="flex-row items-center"
                  onPress={() => onToggleRound(null)}
                  accessibilityRole="button"
                  accessibilityLabel={`Round ${round}. Tap to collapse.`}
                >
                  <Text className="text-sm font-bold text-text-primary">
                    Round {round}
                  </Text>
                  {editedPill}
                  <View className="flex-1" />
                  <Ionicons
                    name="chevron-up"
                    size={14}
                    color={colors.text.muted}
                  />
                </TouchableOpacity>

                <View className="mt-4">
                  <SetStepperFields
                    weight={Number(set?.weight) || 0}
                    reps={set?.reps ?? 0}
                    showWeight={showWeight}
                    onChange={(patch) => onPatch(round, patch)}
                  />
                </View>

                {/* Reset restores only this round. "Didn't do this round" is
                    C2 — demotion deletes a log, so it stays out of C1. */}
                <View className="flex-row items-center justify-end mt-4">
                  <TouchableOpacity
                    className="flex-row items-center py-3 px-1"
                    hitSlop={HIT_SLOP_6}
                    disabled={!edited}
                    onPress={() => onReset(round)}
                    accessibilityRole="button"
                    accessibilityLabel={`Reset round ${round} to the values you logged`}
                  >
                    <Ionicons
                      name="refresh"
                      size={14}
                      color={edited ? colors.text.muted : colors.neutral.medium[1]}
                    />
                    <Text
                      className="text-xs ml-1.5"
                      style={{
                        color: edited
                          ? colors.text.muted
                          : colors.neutral.medium[1],
                      }}
                    >
                      Reset to logged
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                className="flex-row items-center px-4 py-3.5 min-h-[56px]"
                onPress={() => onToggleRound(round)}
                accessibilityRole="button"
                accessibilityLabel={`Round ${round}: ${roundSummary(
                  log,
                  showWeight
                )}. Tap to edit.`}
              >
                <Text className="text-sm font-bold text-text-primary w-[72px]">
                  Round {round}
                </Text>
                <Text className="text-base font-semibold text-text-primary flex-1">
                  {roundSummary(log, showWeight)}
                </Text>
                {editedPill}
                <Ionicons
                  name="chevron-down"
                  size={14}
                  color={colors.text.muted}
                  style={{ marginLeft: 8 }}
                />
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
}
