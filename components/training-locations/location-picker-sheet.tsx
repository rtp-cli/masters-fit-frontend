import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { formatEnumValue } from "@/components/onboarding/utils/formatters";
import { useThemeColors } from "@/lib/theme";
import {
  type TrainingLocation,
  type TrainingLocationSnapshot,
} from "@/lib/training-locations";
import { WORKOUT_ENVIRONMENTS } from "@/types/enums/fitness.enums";

interface LocationPickerSheetProps {
  visible: boolean;
  primary?: TrainingLocation;
  secondaries: TrainingLocation[];
  /** Name currently set for today, to pre-select the right radio. */
  currentName?: string | null;
  onClose: () => void;
  onSelect: (snapshot: TrainingLocationSnapshot) => void;
  /** "Somewhere else" — opens the create-a-place sheet (1c). */
  onSomewhereElse: () => void;
}

// Standing "Bodyweight only" pick — not a stored location; occupies no slot.
const BODYWEIGHT_SNAPSHOT: TrainingLocationSnapshot = {
  locationId: null,
  name: "Bodyweight only",
  environment: WORKOUT_ENVIRONMENTS.BODYWEIGHT_ONLY,
  equipment: [],
};

function toSnapshot(loc: TrainingLocation): TrainingLocationSnapshot {
  return {
    locationId: loc.id,
    name: loc.name,
    environment: loc.environment,
    equipment: loc.equipment ?? [],
  };
}

function equipmentSummary(equipment: string[]): string {
  if (!equipment.length) return "Bodyweight";
  return equipment.map((e) => formatEnumValue(e)).join(", ");
}

export default function LocationPickerSheet({
  visible,
  primary,
  secondaries,
  currentName,
  onClose,
  onSelect,
  onSomewhereElse,
}: LocationPickerSheetProps) {
  const colors = useThemeColors();

  // Build the selectable rows (primary, saved, then the standing bodyweight pick).
  const savedRows: {
    key: string;
    snapshot: TrainingLocationSnapshot;
    summary: string;
  }[] = [];
  if (primary) {
    savedRows.push({
      key: `p-${primary.id}`,
      snapshot: toSnapshot(primary),
      summary: equipmentSummary(primary.equipment ?? []),
    });
  }
  for (const s of secondaries) {
    savedRows.push({
      key: `s-${s.id}`,
      snapshot: toSnapshot(s),
      summary: equipmentSummary(s.equipment ?? []),
    });
  }

  const [selectedKey, setSelectedKey] = useState<string>("");

  // Pre-select the row matching today's current location whenever the sheet opens.
  useEffect(() => {
    if (!visible) return;
    const match = savedRows.find((r) => r.snapshot.name === currentName);
    setSelectedKey(match ? match.key : primary ? `p-${primary.id}` : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const Radio = ({ on }: { on: boolean }) => (
    <View
      className="items-center justify-center mr-3"
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: on ? colors.brand.primary : colors.neutral.medium[2],
      }}
    >
      {on && (
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: colors.brand.primary,
          }}
        />
      )}
    </View>
  );

  const handleDone = () => {
    if (selectedKey === "bw") {
      onSelect(BODYWEIGHT_SNAPSHOT);
      return;
    }
    const row = savedRows.find((r) => r.key === selectedKey);
    if (row) onSelect(row.snapshot);
    else onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(10,10,10,0.35)" }}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View
            className="bg-background rounded-t-3xl pb-8"
            style={{ shadowColor: "#0A0A0A", shadowOpacity: 0.16, shadowRadius: 32, shadowOffset: { width: 0, height: -8 } }}
          >
            {/* Grab handle */}
            <View className="items-center pt-3 pb-1">
              <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: colors.neutral.medium[1] }} />
            </View>

            <View className="px-6 pt-3">
              <Text className="text-xl font-bold text-text-primary">
                Where are you training?
              </Text>
              {/* The load-bearing sentence — stops the user thinking they've
                  rewritten their profile. */}
              <Text className="text-sm text-text-secondary mt-1 leading-5">
                Today only. Your plan stays built around your usual place.
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 380 }} className="mt-2">
              {savedRows.map((row) => (
                <TouchableOpacity
                  key={row.key}
                  onPress={() => setSelectedKey(row.key)}
                  className="flex-row items-center border-t border-neutral-light-2"
                  style={{ paddingHorizontal: 24, paddingVertical: 16 }}
                >
                  <Radio on={selectedKey === row.key} />
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-text-primary">
                      {row.snapshot.name}
                    </Text>
                    <Text className="text-sm text-text-muted mt-0.5" numberOfLines={1}>
                      {row.summary}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Standing "Bodyweight only" — a fallback, below the saved places. */}
              <TouchableOpacity
                onPress={() => setSelectedKey("bw")}
                className="flex-row items-center border-t border-neutral-light-2"
                style={{ paddingHorizontal: 24, paddingVertical: 16 }}
              >
                <Radio on={selectedKey === "bw"} />
                <View className="flex-1">
                  <Text className="text-base font-semibold text-text-primary">
                    Bodyweight only
                  </Text>
                  <Text className="text-sm text-text-muted mt-0.5">
                    Nothing needed · always here
                  </Text>
                </View>
              </TouchableOpacity>

              {/* "Somewhere else" — pushes the create screen (1c). */}
              <TouchableOpacity
                onPress={onSomewhereElse}
                className="flex-row items-center border-t border-neutral-light-2"
                style={{ paddingHorizontal: 24, paddingVertical: 16 }}
              >
                <View style={{ width: 22, marginRight: 12 }} />
                <View className="flex-1">
                  <Text className="text-base font-semibold text-text-primary">
                    Somewhere else
                  </Text>
                  <Text className="text-sm text-text-muted mt-0.5">
                    Pick what&rsquo;s available there
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
              </TouchableOpacity>
            </ScrollView>

            <View className="px-6 pt-4">
              <TouchableOpacity
                onPress={handleDone}
                className="bg-primary rounded-full items-center justify-center"
                style={{ height: 56 }}
                accessibilityRole="button"
              >
                <Text className="text-content-on-primary font-semibold text-base">
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
