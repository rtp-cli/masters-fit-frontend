import React from "react";
import { Text, View } from "react-native";

import { formatEnumValue } from "@/components/onboarding/utils/formatters";
import CustomDialog from "@/components/ui/custom-dialog";
import { type LocationConflict } from "@/hooks/use-training-locations";

const NUMBER_WORDS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
];

function count(n: number): string {
  return n <= 10 ? NUMBER_WORDS[n] : String(n);
}

function joinNames(items: string[]): string {
  const labels = items.map((e) => formatEnumValue(e).toLowerCase());
  if (labels.length === 0) return "the equipment";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

interface ConflictDialogProps {
  conflict: LocationConflict | null;
  /** The place being switched to (for the body copy). */
  locationName: string;
  rebuilding?: boolean;
  onRebuild: () => void;
  onKeep: () => void;
}

/**
 * The rebuild offer (1d / §7). Fires only on a real conflict — the place lacks
 * equipment today's plan prescribes. Every sentence is fillable from data the
 * app already has: the affected count, the missing equipment, the place's
 * equipment, and the affected exercise names. "Keep it as it is" always exists
 * (Rule 2) — the app never forces a regeneration.
 */
export default function ConflictDialog({
  conflict,
  locationName,
  rebuilding,
  onRebuild,
  onKeep,
}: ConflictDialogProps) {
  if (!conflict) return null;

  const n = conflict.affectedExercises.length;
  const title = `${count(n)} ${n === 1 ? "exercise needs" : "exercises need"} ${joinNames(
    conflict.missing
  )}`;

  const have = conflict.snapshot.equipment;
  const around =
    have.length > 0
      ? `around ${joinNames(have)}`
      : "around bodyweight movements";
  const description = `${locationName} doesn't have ${
    conflict.missing.length === 1 ? "it" : "them"
  }. I can rebuild today ${around}, same muscles and length.`;

  return (
    <CustomDialog
      visible={!!conflict}
      title={title}
      description={description}
      dismissOnBackdropPress={false}
      accessory={
        <View
          className="w-full rounded-xl px-4 py-3 mb-5 bg-neutral-light-2"
        >
          <Text className="text-sm text-text-secondary" style={{ lineHeight: 20 }}>
            {conflict.affectedExercises.join(", ")}
          </Text>
        </View>
      }
      primaryButton={{
        text: rebuilding ? "Rebuilding…" : "Rebuild today's workout",
        onPress: onRebuild,
      }}
      secondaryButton={{
        text: "Keep as is",
        onPress: onKeep,
      }}
    />
  );
}
