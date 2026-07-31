import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/auth-context";
import {
  type ExcludedExercise,
  type ExclusionReason,
  getExclusionsAPI,
  removeExclusionAPI,
} from "@/lib/exclusions";
import { type ThemeColorPalette, useThemeColors } from "@/lib/theme";
import { formatEnumValue } from "@/utils";

// Reason → section header label. Order is the display order of the groups.
const REASON_LABELS: { reason: ExclusionReason; label: string }[] = [
  { reason: "hurts", label: "Hurts" },
  { reason: "no_equipment", label: "No equipment" },
  { reason: "too_hard", label: "Too hard" },
  { reason: "dislike", label: "Don't like it" },
];

// Below this many exclusions sharing a muscle group we don't nag.
const OVER_EXCLUSION_THRESHOLD = 3;

function formatExcludedDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

/**
 * Settings → Excluded exercises (1g). Grouped by reason — that's how people
 * remember these decisions, and it makes the pain group scannable after physio.
 * The amber banner warns and names a consequence but never blocks, and appears
 * only here (interrupting mid-exclusion is exactly the wrong moment).
 */
export default function ExcludedExercisesScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { user } = useAuth();
  const amber = (colors as ThemeColorPalette).warning ?? colors.text.primary;

  const [exclusions, setExclusions] = useState<ExcludedExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const list = await getExclusionsAPI(user.id);
    setExclusions(list);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const allowBack = async (exerciseId: number) => {
    if (!user) return;
    setRemovingId(exerciseId);
    const ok = await removeExclusionAPI(user.id, exerciseId);
    if (ok) {
      setExclusions((prev) => prev.filter((e) => e.exerciseId !== exerciseId));
    }
    setRemovingId(null);
  };

  // Over-exclusion signal: the muscle group carried by the most excluded
  // exercises, if it clears the threshold. Honest use of the data we have (no
  // movement-pattern taxonomy exists), and it never blocks.
  const overExcludedMuscle = (() => {
    const counts = new Map<string, number>();
    for (const e of exclusions) {
      for (const mg of e.muscleGroups ?? []) {
        counts.set(mg, (counts.get(mg) ?? 0) + 1);
      }
    }
    let top: { muscle: string; count: number } | null = null;
    for (const [muscle, count] of counts) {
      if (!top || count > top.count) top = { muscle, count };
    }
    return top && top.count >= OVER_EXCLUSION_THRESHOLD ? top.muscle : null;
  })();

  const Header = (
    <View className="flex-row items-center px-4 py-3 border-b border-neutral-light-2">
      <TouchableOpacity
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Back"
        className="size-8 items-center justify-center"
      >
        <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <Text className="flex-1 text-center text-lg font-semibold text-text-primary mr-8">
        Excluded exercises
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-background">
        {Header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      {Header}
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
      >
        {exclusions.length === 0 ? (
          <View className="items-center pt-16 px-4">
            <Ionicons
              name="checkmark-circle-outline"
              size={44}
              color={colors.text.muted}
            />
            <Text className="text-base text-text-secondary text-center mt-4">
              You haven't excluded any exercises. If one never suits you, choose
              "Never prescribe this again" when editing a workout.
            </Text>
          </View>
        ) : (
          <>
            <Text className="text-[15px] text-text-secondary mb-4">
              {exclusions.length}{" "}
              {exclusions.length === 1 ? "exercise" : "exercises"} we won't put
              in your plans. Allow one back any time.
            </Text>

            {overExcludedMuscle && (
              <View
                className="rounded-2xl px-4 py-3.5 mb-5 flex-row"
                style={{ borderWidth: 1, borderColor: amber }}
              >
                <Ionicons
                  name="warning-outline"
                  size={20}
                  color={amber}
                  style={{ marginRight: 10, marginTop: 1 }}
                />
                <Text className="flex-1 text-sm text-text-secondary leading-5">
                  You've excluded several{" "}
                  {formatEnumValue(overExcludedMuscle).toLowerCase()} exercises.
                  Your {formatEnumValue(overExcludedMuscle).toLowerCase()} work
                  may be thinner than it should be — allowing one back would
                  help.
                </Text>
              </View>
            )}

            {REASON_LABELS.map(({ reason, label }) => {
              const rows = exclusions.filter((e) => e.reason === reason);
              if (rows.length === 0) return null;
              return (
                <View key={reason} className="mb-2">
                  <Text className="text-xs font-bold text-text-muted tracking-wide uppercase mt-4 mb-1">
                    {label} — {rows.length}
                  </Text>
                  {rows.map((row) => (
                    <View
                      key={row.exerciseId}
                      className="flex-row items-center justify-between py-3 border-b border-neutral-light-2"
                    >
                      <View className="flex-1 pr-3">
                        <Text className="text-base font-semibold text-text-primary">
                          {row.name}
                        </Text>
                        <Text className="text-xs text-text-muted mt-0.5">
                          Excluded {formatExcludedDate(row.createdAt)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => allowBack(row.exerciseId)}
                        disabled={removingId === row.exerciseId}
                        accessibilityRole="button"
                        accessibilityLabel={`Allow ${row.name} back`}
                        className="rounded-2xl items-center justify-center px-5"
                        style={{
                          minHeight: 44,
                          borderWidth: 1,
                          borderColor: colors.neutral.medium[1],
                        }}
                      >
                        {removingId === row.exerciseId ? (
                          <ActivityIndicator
                            size="small"
                            color={colors.text.primary}
                          />
                        ) : (
                          <Text className="text-sm font-semibold text-text-primary">
                            Allow
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
