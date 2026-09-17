import * as Haptics from "expo-haptics";
import React from "react";
import { Text, TouchableOpacity } from "react-native";

import { useThemeColors } from "@/lib/theme";
import {
  type CircuitSessionData,
  type UseCircuitSessionReturn,
} from "@/types/api/circuit.types";
import { type WorkoutBlockWithExercises } from "@/types/api/workout.types";
import {
  getRoundCompleteButtonText,
  isRoundActionVisible,
} from "@/utils/circuit-utils";

type CircuitActions = UseCircuitSessionReturn["actions"];

interface CircuitRoundActionProps {
  /** Whether the workout is active (started, not completed) */
  isActive: boolean;
  block: WorkoutBlockWithExercises;
  sessionData: CircuitSessionData;
  circuitActions?: CircuitActions;
}

/**
 * The per-round action for a circuit block — "Complete Round N" / "Complete
 * Interval N" / the EMOM manual finish.
 *
 * Extracted out of CircuitTracker so it can live in the workout screen's FIXED
 * footer instead of inside the tracker's scroll view. On short devices (e.g.
 * Galaxy S22) the button was scrolling below the fold, so users reached for the
 * pinned "Complete Circuit" by mistake. Rendered here, it's always visible.
 *
 * This component used to own the round Undo too, returning it INSTEAD of
 * "Complete Round N" — which locked the user out of the next round for the
 * whole undo window even though the session had already advanced. The undo now
 * drains in the "Complete Circuit" row (UndoDrainStrip, SPEC §6), so this
 * component renders only the round-complete / EMOM-finish button and the
 * primary slot is never blocked.
 *
 * Round notes are persisted to the session via updateRoundNotes (flushed on
 * blur in the tracker), so completing the round from the footer preserves them
 * without this component needing the note text.
 */
export default function CircuitRoundAction({
  isActive,
  block,
  sessionData,
  circuitActions,
}: CircuitRoundActionProps) {
  const colors = useThemeColors();

  const currentRoundData = sessionData.rounds[sessionData.currentRound - 1];
  const isCurrentRoundCompleted = currentRoundData?.isCompleted || false;

  if (!isActive || !isRoundActionVisible(block, sessionData)) {
    return null;
  }

  const handleCompleteRound = async () => {
    if (isCurrentRoundCompleted) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await circuitActions?.completeRound();
    } catch (error) {
      console.error("Error completing round:", error);
    }
  };

  const handleCompleteCircuit = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      if (!isCurrentRoundCompleted) await circuitActions?.completeRound();
      await circuitActions?.completeCircuit();
    } catch (error) {
      console.error("Error completing circuit:", error);
    }
  };

  // EMOM manual finish — label reuses the for_time text logic (preserved from
  // the original tracker implementation; EMOM minutes are advanced manually
  // since timers were removed in T5-3).
  if (block.blockType === "emom") {
    const emomLabel =
      getRoundCompleteButtonText(
        "for_time",
        sessionData.currentRound,
        sessionData.targetRounds
      ) || "";
    return renderCompleteButton(emomLabel, handleCompleteRound);
  }

  const label = getRoundCompleteButtonText(
    block.blockType || "circuit",
    sessionData.currentRound,
    sessionData.targetRounds
  );
  if (!label) return null;

  // AMRAP always advances rounds; a bounded circuit past its target rounds also
  // just records the round. Otherwise, hitting the target round finishes the
  // circuit. (Preserved verbatim from the original tracker branch logic.)
  const onPress =
    block.blockType === "amrap"
      ? handleCompleteRound
      : sessionData.targetRounds &&
          sessionData.currentRound > sessionData.targetRounds &&
          block.blockType === "circuit"
        ? handleCompleteRound
        : !sessionData.targetRounds ||
            sessionData.currentRound >= sessionData.targetRounds
          ? handleCompleteCircuit
          : handleCompleteRound;

  return renderCompleteButton(label, onPress);

  function renderCompleteButton(text: string, onPressHandler: () => void) {
    return (
      <TouchableOpacity
        className="flex-1 py-4 rounded-2xl items-center justify-center bg-primary"
        onPress={onPressHandler}
        accessibilityRole="button"
        accessibilityLabel={text}
      >
        <Text
          className="text-base font-semibold"
          style={{ color: colors.contentOnPrimary }}
          maxFontSizeMultiplier={1.3}
        >
          {text}
        </Text>
      </TouchableOpacity>
    );
  }
}
