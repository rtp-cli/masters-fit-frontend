import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import WorkoutEnvironmentStep from "@/components/onboarding/steps/workout-environment-step";
import { getEquipmentForEnvironment } from "@/components/onboarding/utils/equipment-logic";
import { getEnvironmentLabel } from "@/constants/environment-display";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics-events";
import { useThemeColors } from "@/lib/theme";
import { createLocationAPI, type TrainingLocationSnapshot } from "@/lib/training-locations";
import { type FormData } from "@/types/components";
import {
  type AVAILABLE_EQUIPMENT,
  WORKOUT_ENVIRONMENTS,
} from "@/types/enums/fitness.enums";

const MAX_SECONDARIES = 3;

interface CreatePlaceSheetProps {
  visible: boolean;
  userId: number | undefined;
  /** How many saved secondaries exist — gates the "Save this place" toggle. */
  secondaryCount: number;
  onClose: () => void;
  /** Chosen for today (one-off snapshot, or a freshly-saved place's snapshot). */
  onUse: (snapshot: TrainingLocationSnapshot) => void;
  /** A place was saved — let the parent refresh its list. */
  onSaved?: () => void;
  /**
   * Settings "Add a place" flow (1f): the place is always saved (no one-off),
   * so hide the toggle, require a name, and label the footer "Add place".
   */
  requireSave?: boolean;
}

export default function CreatePlaceSheet({
  visible,
  userId,
  secondaryCount,
  onClose,
  onUse,
  onSaved,
  requireSave = false,
}: CreatePlaceSheetProps) {
  const colors = useThemeColors();

  // Local form state drives the REUSED step-6 controls (no fork). Only the three
  // env/equipment fields matter here, so a Partial is enough; it's asserted to
  // FormData at the component boundary below.
  const [form, setForm] = useState<Partial<FormData>>({
    environment: WORKOUT_ENVIRONMENTS.HOME_GYM,
    equipment: [],
    otherEquipment: "",
  });
  const [saveOn, setSaveOn] = useState(false); // ships OFF (§6)
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const atCap = secondaryCount >= MAX_SECONDARIES;
  // In the Settings "Add a place" flow the place is always saved.
  const savingEffective = requireSave || (saveOn && !atCap);

  const onFieldChange = (field: keyof FormData, value: FormData[keyof FormData]) => {
    // Match onboarding: switching environment reassigns equipment (custom → none,
    // so the user picks deliberately; gym/bodyweight are auto-derived). Without
    // this, switching from a Full Gym place left all 19 items pre-selected.
    if (field === "environment") {
      const env = value as WORKOUT_ENVIRONMENTS;
      setForm((f) => ({
        ...f,
        environment: env,
        equipment: getEquipmentForEnvironment(env),
      }));
      return;
    }
    setForm((f) => ({ ...f, [field]: value }));
  };

  const onToggle = (field: "equipment", value: AVAILABLE_EQUIPMENT) =>
    setForm((f) => {
      const list = (f.equipment ?? []) as AVAILABLE_EQUIPMENT[];
      const next = list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value];
      return { ...f, equipment: next };
    });

  const reset = () => {
    setForm({
      environment: WORKOUT_ENVIRONMENTS.HOME_GYM,
      equipment: [],
      otherEquipment: "",
    });
    setSaveOn(false);
    setName("");
    setBusy(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  // A custom-equipment place is meaningless with nothing selected (it would
  // generate like bodyweight). Full Gym / Bodyweight derive their equipment, so
  // they need no grid interaction.
  const needsEquipment =
    (form.environment ?? WORKOUT_ENVIRONMENTS.HOME_GYM) ===
    WORKOUT_ENVIRONMENTS.HOME_GYM;
  const equipmentMissing = needsEquipment && (form.equipment?.length ?? 0) === 0;
  const nameOk = !savingEffective || name.trim().length > 0;
  const canUse = nameOk && !equipmentMissing;

  const handleUse = async () => {
    if (busy || !canUse) return;
    const environment = form.environment ?? WORKOUT_ENVIRONMENTS.HOME_GYM;
    const equipment = (form.equipment ?? []) as AVAILABLE_EQUIPMENT[];
    setBusy(true);
    try {
      if (savingEffective && userId) {
        const created = await createLocationAPI(userId, {
          name: name.trim(),
          environment,
          equipment,
        });
        trackEvent(AnalyticsEvent.LOCATION_PLACE_SAVED);
        onSaved?.();
        onUse({
          locationId: created.id,
          name: created.name,
          environment: created.environment,
          equipment: created.equipment ?? [],
        });
      } else {
        // A one-off: no row written, just the session snapshot. Name it by its
        // environment so history reads sensibly ("Full Gym", "Bodyweight Only").
        onUse({
          locationId: null,
          name: getEnvironmentLabel(environment),
          environment,
          equipment:
            environment === WORKOUT_ENVIRONMENTS.HOME_GYM ? equipment : [],
        });
      }
      reset();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
    >
      <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-neutral-light-2">
          <TouchableOpacity onPress={close} accessibilityLabel="Back" className="p-1">
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-text-primary flex-1 text-center mr-8">
            {requireSave ? "Add a place" : "Somewhere else"}
          </Text>
        </View>

        <View className="flex-1">
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <Text className="text-base text-text-secondary px-6 pt-4 pb-2">
              What can you use today?
            </Text>

            {/* Save toggle + name field — ABOVE the reused controls so the name
                stays above the fold (§6: naming before the inventory). Hidden in
                the Settings "Add a place" flow, which always saves. */}
            <View className="px-6 pt-2 pb-1">
              {!requireSave && (
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-4">
                    <Text className="text-base font-semibold text-text-primary">
                      Save this place
                    </Text>
                    <Text className="text-sm text-text-muted mt-0.5">
                      {atCap
                        ? "Remove a place in Settings to save another"
                        : "So it's one tap next time"}
                    </Text>
                  </View>
                  <Switch
                    value={saveOn && !atCap}
                    disabled={atCap}
                    onValueChange={setSaveOn}
                    trackColor={{ true: colors.brand.primary }}
                  />
                </View>
              )}
              {(requireSave || (saveOn && !atCap)) && (
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Work gym"
                  placeholderTextColor={colors.text.muted}
                  className={`bg-surface border border-neutral-medium-1 rounded-xl px-4 py-3 text-base text-text-primary ${requireSave ? "" : "mt-3"}`}
                />
              )}
            </View>

            {/* REUSED step-6 environment cards + equipment grid (do not fork). */}
            <WorkoutEnvironmentStep
              formData={form as FormData}
              onFieldChange={onFieldChange}
              onToggle={onToggle as any}
            />
          </ScrollView>

          {/* Pinned footer */}
          <View className="px-6 pt-3 pb-2 border-t border-neutral-light-2 bg-background">
            {equipmentMissing && (
              <Text className="text-sm text-text-muted text-center mb-2">
                Select at least one piece of equipment.
              </Text>
            )}
            <TouchableOpacity
              onPress={handleUse}
              disabled={!canUse || busy}
              className="bg-primary rounded-full items-center justify-center"
              style={{ height: 56, opacity: canUse && !busy ? 1 : 0.5 }}
              accessibilityRole="button"
            >
              <Text className="text-content-on-primary font-semibold text-base">
                {requireSave ? "Add place" : "Use this today"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
