import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { TouchableOpacity } from "react-native";

import Text from "@/components/text";
import { type ShareKind } from "@/lib/share";
import { useThemeColors } from "@/lib/theme";

import ShareWorkoutSheet from "./share-workout-sheet";

interface ShareWorkoutButtonProps {
  planDayId: number;
  kind: ShareKind;
  workoutName?: string;
  /** completion = centred at the end of the summary scroll; calendar = left-
   *  aligned under the compact header's metadata row. */
  variant: "completion" | "calendar";
}

/**
 * A self-contained share affordance: it holds the sheet's open/closed state so
 * an entry point only needs `<ShareWorkoutButton planDayId={..} kind="completed"
 * variant="completion" />`.
 *
 * A quiet, icon-plus-label text button — no fill, no border, no chip (MF-006
 * reserves solid ink for the one primary action per screen, and sharing isn't
 * it). The 44×44 target comes from `hitSlop`, not padding, so the label stays
 * flush with the content it sits under. Only the alignment differs by variant.
 */
export default function ShareWorkoutButton({
  planDayId,
  kind,
  workoutName,
  variant,
}: ShareWorkoutButtonProps) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const surface = variant === "completion" ? "completion" : "calendar";

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Share workout"
        hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
        className={`flex-row items-center ${
          variant === "completion" ? "self-center mt-6" : "self-start mt-2.5"
        }`}
        style={{ gap: 6 }}
      >
        <Ionicons name="share-outline" size={16} color={colors.text.primary} />
        <Text className="text-text-primary font-semibold text-sm">
          Share workout
        </Text>
      </TouchableOpacity>

      <ShareWorkoutSheet
        visible={open}
        onClose={() => setOpen(false)}
        planDayId={planDayId}
        kind={kind}
        workoutName={workoutName}
        surface={surface}
      />
    </>
  );
}
