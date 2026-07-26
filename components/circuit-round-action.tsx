import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";

import { UNDO_DURATION_MS } from "@/hooks/use-circuit-session";
import { useThemeColors } from "@/lib/theme";
import {
  type CircuitSessionData,
  type UseCircuitSessionReturn,
} from "@/types/api/circuit.types";
import { type WorkoutBlockWithExercises } from "@/types/api/workout.types";
import {
  getRoundCompleteButtonText,
  getRoundUndoButtonText,
  isRoundActionVisible,
} from "@/utils/circuit-utils";

type CircuitActions = UseCircuitSessionReturn["actions"];

interface CircuitRoundActionProps {
  /** Whether the workout is active (started, not completed) */
  isActive: boolean;
  block: WorkoutBlockWithExercises;
  sessionData: CircuitSessionData;
  canUndoRound: boolean;
  circuitActions?: CircuitActions;
}

/**
 * The per-round action for a circuit block — "Complete Round N" / "Complete
 * Interval N" / the EMOM manual finish, plus the timed Undo affordance.
 *
 * Extracted out of CircuitTracker so it can live in the workout screen's FIXED
 * footer instead of inside the tracker's scroll view. On short devices (e.g.
 * Galaxy S22) the button was scrolling below the fold, so users reached for the
 * pinned "Complete Circuit" by mistake. Rendered here, it's always visible.
 *
 * Round notes are persisted to the session via updateRoundNotes (flushed on
 * blur in the tracker), so completing the round from the footer preserves them
 * without this component needing the note text.
 */
export default function CircuitRoundAction({
  isActive,
  block,
  sessionData,
  canUndoRound,
  circuitActions,
}: CircuitRoundActionProps) {
  const colors = useThemeColors();

  const currentRoundData = sessionData.rounds[sessionData.currentRound - 1];
  const isCurrentRoundCompleted = currentRoundData?.isCompleted || false;

  // The Undo button reverts the most recently completed round. On the final
  // round of a bounded block the session doesn't advance currentRound, so read
  // the last completed round directly rather than assuming currentRound - 1.
  const lastCompletedRoundNumber =
    [...sessionData.rounds].reverse().find((r) => r.isCompleted)?.roundNumber ??
    sessionData.currentRound;

  // Undo progress bar animation (1 = empty, 0 = full)
  const undoProgressAnim = useRef(new Animated.Value(1)).current;
  const undoProgressRef = useRef<Animated.CompositeAnimation | null>(null);
  // Width of the Undo button, so the masked (white) label can be sized to the
  // full button and stay centered while the fill clips it.
  const [undoBtnWidth, setUndoBtnWidth] = useState(0);

  useEffect(() => {
    if (canUndoRound) {
      // Start empty, fill to full over UNDO_DURATION_MS
      undoProgressAnim.setValue(1);
      undoProgressRef.current = Animated.timing(undoProgressAnim, {
        toValue: 0,
        duration: UNDO_DURATION_MS,
        useNativeDriver: false,
      });
      // Small delay to avoid flicker on mount
      requestAnimationFrame(() => undoProgressRef.current?.start());
    } else {
      undoProgressRef.current?.stop();
      undoProgressAnim.setValue(1);
    }
  }, [canUndoRound]);

  if (!isActive || !isRoundActionVisible(block, sessionData, canUndoRound)) {
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

  const undoLabel = getRoundUndoButtonText(
    block.blockType || "circuit",
    lastCompletedRoundNumber
  );

  // Undo — the fill animates from full to empty over the undo window; a masked
  // white label reads over the filled portion.
  if (canUndoRound && circuitActions?.undoCompleteRound) {
    return (
      <TouchableOpacity
        className="flex-1 rounded-2xl overflow-hidden"
        style={{ backgroundColor: colors.surface }}
        onPress={() => circuitActions.undoCompleteRound()}
        onLayout={(e) => setUndoBtnWidth(e.nativeEvent.layout.width)}
        accessibilityRole="button"
        accessibilityLabel={undoLabel}
      >
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            backgroundColor: colors.brand.primary,
            width: undoProgressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ["100%", "0%"],
            }),
          }}
        />
        {/* Base label — reads on the uncovered (surface) portion */}
        <View className="py-4 flex-row items-center justify-center">
          <Text
            className="text-base font-semibold"
            style={{ color: colors.text.primary }}
            maxFontSizeMultiplier={1.3}
          >
            {undoLabel}
          </Text>
        </View>
        {/* Masked label — white, clipped to the fill so it reads over the black */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            overflow: "hidden",
            width: undoProgressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ["100%", "0%"],
            }),
          }}
        >
          <View
            className="py-4 flex-row items-center justify-center"
            style={{ width: undoBtnWidth }}
          >
            <Text
              className="text-base font-semibold"
              style={{ color: colors.contentOnPrimary }}
              maxFontSizeMultiplier={1.3}
            >
              {undoLabel}
            </Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  }

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
