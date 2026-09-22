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
  /** "I didn't do this round" — drops this (exercise, round) from the working
   *  copy. Lives INSIDE the expanded editor: demotion destroys a log, so
   *  causing it should cost a deliberate expand. */
  onDemote: (roundNumber: number) => void;
  /** Undo a demotion. Always reachable from the collapsed row — recovery must
   *  never require expanding something that is no longer there. */
  onRestore: (roundNumber: number) => void;
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
  onDemote,
  onRestore,
}: CircuitRoundEditorProps) {
  const colors = useThemeColors();
  const showWeight = shouldShowWeightInput(exercise);

  // Rounds the user demoted are gone from `logs` but still in `persisted`, and
  // they must keep a row so Undo stays reachable. Union both, ascending.
  const rounds = [
    ...new Set([
      ...logs.map((l) => l.roundNumber),
      ...persisted.map((l) => l.roundNumber),
    ]),
  ].sort((a, b) => a - b);

  return (
    <View className="gap-2">
      {rounds.map((round) => {
        const log = logs.find((l) => l.roundNumber === round);

        if (!log) {
          // Demoted. White, not a grey fill: #757575 on #F4F4F4 is 4.19:1 and
          // fails, so the row keeps the surface background and darker copy.
          return (
            <View
              key={`${exercise.id}:${round}:demoted`}
              className="bg-surface rounded-lg flex-row items-center px-4 py-3.5 min-h-[56px]"
              style={{
                borderColor: colors.neutral.medium[2],
                borderWidth: 1,
              }}
            >
              <Text className="text-sm font-bold text-text-secondary w-[72px]">
                Round {round}
              </Text>
              <Text className="text-sm text-text-secondary flex-1">
                Didn&apos;t do this round
              </Text>
              <TouchableOpacity
                className="py-2 px-1"
                hitSlop={HIT_SLOP_6}
                onPress={() => onRestore(round)}
                accessibilityRole="button"
                accessibilityLabel={`Undo — put round ${round} of ${exercise.exercise.name} back`}
              >
                <Text className="text-sm font-bold text-text-primary">
                  Undo
                </Text>
              </TouchableOpacity>
            </View>
          );
        }

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

                {/* Both destructive-ish actions live here, not on the
                    collapsed row: a stray tap in a list must not be able to
                    delete a round's data. */}
                <View className="flex-row items-center justify-between mt-4">
                  <TouchableOpacity
                    className="flex-row items-center py-3 px-1"
                    hitSlop={HIT_SLOP_6}
                    onPress={() => onDemote(round)}
                    accessibilityRole="button"
                    accessibilityLabel={`I didn't do round ${round} of ${exercise.exercise.name}`}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={14}
                      color={colors.text.muted}
                    />
                    <Text
                      className="text-xs ml-1.5"
                      style={{ color: colors.text.muted }}
                    >
                      Didn&apos;t do this
                    </Text>
                  </TouchableOpacity>
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
