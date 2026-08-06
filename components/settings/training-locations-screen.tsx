import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import WorkoutEnvironmentStep from "@/components/onboarding/steps/workout-environment-step";
import { getEquipmentForEnvironment } from "@/components/onboarding/utils/equipment-logic";
import { formatEnumValue } from "@/components/onboarding/utils/formatters";
import { CreatePlaceSheet } from "@/components/training-locations";
import { getEnvironmentLabel } from "@/constants/environment-display";
import { useAuth } from "@/contexts/auth-context";
import { useTrainingLocations } from "@/hooks/use-training-locations";
import { useThemeColors } from "@/lib/theme";
import {
  deleteLocationAPI,
  makePrimaryLocationAPI,
  type TrainingLocation,
  updateLocationAPI,
} from "@/lib/training-locations";
import { type FormData } from "@/types/components";
import {
  type AVAILABLE_EQUIPMENT,
  WORKOUT_ENVIRONMENTS,
} from "@/types/enums/fitness.enums";

const MAX_SECONDARIES = 3;

function EquipmentChips({ equipment }: { equipment: string[] }) {
  if (!equipment.length) return null;
  return (
    <View className="flex-row flex-wrap mt-1">
      {equipment.map((e) => (
        <View key={e} className="bg-primary rounded-xl px-3 py-1 mr-2 mb-2">
          <Text className="text-xs font-medium text-neutral-light-1">
            {formatEnumValue(e)}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Settings → "Where you train" (1f / §8). Manage places: rename, edit equipment,
 * make one the usual place, remove one to free a slot. NOT the discovery path —
 * that's the today card. Removing a place never alters completed sessions
 * (backend keeps the frozen snapshot).
 */
export default function TrainingLocationsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { user } = useAuth();

  const { primary, secondaries, reloadLocations } = useTrainingLocations({
    userId: user?.id,
    todaysWorkout: null,
    planDayId: undefined,
  });

  const [addVisible, setAddVisible] = useState(false);
  const [detail, setDetail] = useState<TrainingLocation | null>(null);

  const atCap = secondaries.length >= MAX_SECONDARIES;

  const confirmRemove = (loc: TrainingLocation) => {
    Alert.alert("Remove this place?", `"${loc.name}" will be removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteLocationAPI(user!.id, loc.id);
            reloadLocations();
          } catch (e: any) {
            Alert.alert("Couldn't remove", e?.message ?? "Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-neutral-light-2">
        <TouchableOpacity onPress={() => router.back()} className="p-1" accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-text-primary flex-1 text-center mr-8">
          Where you train
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-sm text-text-secondary px-6 pt-4 pb-2 leading-5">
          Your usual place anchors your plan. Keep up to three others for the days
          you&rsquo;re elsewhere.
        </Text>

        {/* Primary */}
        {primary && (
          <View className="mx-6 mb-6 bg-surface rounded-xl border border-neutral-medium-1 overflow-hidden">
            <View className="flex-row items-center justify-between p-4 pb-2">
              <Text className="text-base font-semibold text-text-primary">
                {primary.name}
              </Text>
              <TouchableOpacity onPress={() => setDetail(primary)} accessibilityLabel={`Edit ${primary.name}`}>
                <Text className="text-sm text-text-muted">Edit</Text>
              </TouchableOpacity>
            </View>
            <View className="px-4 py-3 border-t border-neutral-light-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-text-primary">Environment</Text>
                <Text className="text-sm text-text-muted">
                  {getEnvironmentLabel(primary.environment)}
                </Text>
              </View>
              <EquipmentChips equipment={primary.equipment ?? []} />
            </View>
          </View>
        )}

        {/* Other places */}
        <View className="mx-6 mb-6 bg-surface rounded-xl border border-neutral-medium-1 overflow-hidden">
          <View className="flex-row items-center justify-between p-4 pb-2">
            <Text className="text-base font-semibold text-text-primary">
              Other places
            </Text>
            <Text className="text-sm text-text-muted">
              {secondaries.length} of {MAX_SECONDARIES}
            </Text>
          </View>

          {secondaries.map((loc) => (
            <View
              key={loc.id}
              className="flex-row items-center px-4 py-3 border-t border-neutral-light-2"
            >
              <TouchableOpacity
                className="flex-1"
                onPress={() => setDetail(loc)}
                accessibilityLabel={`Edit ${loc.name}`}
              >
                <Text className="text-base text-text-primary">{loc.name}</Text>
                <Text className="text-sm text-text-muted mt-0.5" numberOfLines={1}>
                  {getEnvironmentLabel(loc.environment)}
                  {(loc.equipment?.length ?? 0) > 0
                    ? ` · ${(loc.equipment ?? []).map((e) => formatEnumValue(e)).join(", ").toLowerCase()}`
                    : ""}
                </Text>
              </TouchableOpacity>
              <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
              {/* × on a 44pt target (MF-009), not a swipe. */}
              <TouchableOpacity
                onPress={() => confirmRemove(loc)}
                accessibilityLabel={`Remove ${loc.name}`}
                className="items-center justify-center ml-1"
                style={{ width: 44, height: 44 }}
              >
                <Ionicons name="close" size={20} color={colors.text.muted} />
              </TouchableOpacity>
            </View>
          ))}

          {/* Add a place — greys with a stated reason at three. */}
          <TouchableOpacity
            disabled={atCap}
            onPress={() => setAddVisible(true)}
            className="flex-row items-center px-4 py-3 border-t border-neutral-light-2"
            style={{ opacity: atCap ? 0.5 : 1 }}
            accessibilityLabel="Add a place"
          >
            <Ionicons name="add" size={20} color={colors.brand.primary} />
            <Text className="text-base text-text-primary ml-2">
              {atCap ? "Remove one to add another" : "Add a place"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add a place — always-save create flow */}
      <CreatePlaceSheet
        visible={addVisible}
        userId={user?.id}
        secondaryCount={secondaries.length}
        requireSave
        onClose={() => setAddVisible(false)}
        onUse={() => {
          setAddVisible(false);
          reloadLocations();
        }}
        onSaved={reloadLocations}
      />

      {/* Place detail: rename, edit equipment, make my usual place */}
      <PlaceDetailSheet
        location={detail}
        userId={user?.id}
        onClose={() => setDetail(null)}
        onChanged={() => {
          setDetail(null);
          reloadLocations();
        }}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Place detail — rename + edit equipment (reused step-6 controls) + make primary.
// ---------------------------------------------------------------------------
function PlaceDetailSheet({
  location,
  userId,
  onClose,
  onChanged,
}: {
  location: TrainingLocation | null;
  userId: number | undefined;
  onClose: () => void;
  onChanged: () => void;
}) {
  const colors = useThemeColors();
  const [name, setName] = useState("");
  const [form, setForm] = useState<Partial<FormData>>({});
  const [busy, setBusy] = useState(false);

  // Seed local state whenever a place opens.
  React.useEffect(() => {
    if (location) {
      setName(location.name);
      setForm({
        environment: location.environment,
        equipment: (location.equipment ?? []) as AVAILABLE_EQUIPMENT[],
        otherEquipment: "",
      });
    }
  }, [location]);

  if (!location) return null;

  const onFieldChange = (field: keyof FormData, value: FormData[keyof FormData]) => {
    // Switching environment reassigns equipment (custom → none, so the user picks;
    // gym/bodyweight are auto-derived) — matches onboarding, so editing a Full Gym
    // place and choosing Custom Equipment starts empty rather than all-selected.
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
      return {
        ...f,
        equipment: list.includes(value)
          ? list.filter((v) => v !== value)
          : [...list, value],
      };
    });

  // Custom-equipment places must keep at least one selection (see create flow).
  const equipmentMissing =
    (form.environment ?? WORKOUT_ENVIRONMENTS.HOME_GYM) ===
      WORKOUT_ENVIRONMENTS.HOME_GYM && (form.equipment?.length ?? 0) === 0;
  const canSave = name.trim().length > 0 && !equipmentMissing;

  const save = async () => {
    if (!userId || busy || !canSave) return;
    setBusy(true);
    try {
      await updateLocationAPI(userId, location.id, {
        name: name.trim(),
        environment: form.environment,
        equipment: (form.equipment ?? []) as AVAILABLE_EQUIPMENT[],
      });
      onChanged();
    } catch (e: any) {
      Alert.alert("Couldn't save", e?.message ?? "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const makePrimary = async () => {
    if (!userId || busy) return;
    setBusy(true);
    try {
      await makePrimaryLocationAPI(userId, location.id);
      onChanged();
    } catch (e: any) {
      Alert.alert("Couldn't update", e?.message ?? "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={!!location}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
        <View className="flex-row items-center px-4 py-3 border-b border-neutral-light-2">
          <TouchableOpacity onPress={onClose} className="p-1" accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-text-primary flex-1 text-center mr-8">
            Edit place
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="px-6 pt-4">
            <Text className="text-sm font-semibold text-text-primary mb-2">Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholderTextColor={colors.text.muted}
              className="bg-surface border border-neutral-medium-1 rounded-xl px-4 py-3 text-base text-text-primary"
            />
          </View>

          <WorkoutEnvironmentStep
            formData={form as FormData}
            onFieldChange={onFieldChange}
            onToggle={onToggle as any}
          />

          {!location.isPrimary && (
            <TouchableOpacity
              onPress={makePrimary}
              disabled={busy}
              className="mx-6 mb-4 border border-neutral-medium-2 rounded-xl items-center justify-center"
              style={{ height: 52 }}
              accessibilityLabel="Make my usual place"
            >
              <Text className="text-base font-semibold text-text-primary">
                Make my usual place
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <View className="px-6 pt-3 pb-2 border-t border-neutral-light-2">
          {equipmentMissing && (
            <Text className="text-sm text-text-muted text-center mb-2">
              Select at least one piece of equipment.
            </Text>
          )}
          <TouchableOpacity
            onPress={save}
            disabled={busy || !canSave}
            className="bg-primary rounded-full items-center justify-center"
            style={{ height: 56, opacity: busy || !canSave ? 0.5 : 1 }}
          >
            <Text className="text-content-on-primary font-semibold text-base">Save</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
