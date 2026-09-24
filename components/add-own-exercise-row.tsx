import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import { createCustomExercise } from "@/lib/exercises";
import { useThemeColors } from "@/lib/theme";
import { type SearchExercise } from "@/types/api/search.types";

/** Mirrors the backend's CUSTOM_EXERCISE_NAME_MAX. */
const MAX_NAME_LENGTH = 80;

/** Case/punctuation/space-insensitive, so "Sled Push" hides the row for "sled-push". */
const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * The name the row would save, or null when it shouldn't show: nothing worth
 * naming yet, too long, or a result already has that name (then the row
 * would only duplicate what's on screen).
 */
export function ownExerciseNameFor(
  query: string,
  results: Pick<SearchExercise, "name">[]
): string | null {
  const name = query.trim().replace(/\s+/g, " ");
  const wanted = normalize(name);
  if (wanted.length < 2 || name.length > MAX_NAME_LENGTH) return null;
  if (results.some((r) => normalize(r.name) === wanted)) return null;
  return name;
}

interface AddOwnExerciseRowProps {
  /** What the user typed into edit-search. */
  query: string;
  /** The current results, so the row hides when the name already exists. */
  results: SearchExercise[];
  /** Called with the saved exercise; the caller selects it like a search hit. */
  onCreated: (exercise: SearchExercise) => void;
}

/**
 * The way out when edit-search has nothing for what someone actually does —
 * "sled push w/ sled pull", "2 blocks around the neighborhood". One tap saves
 * the typed text as the user's own exercise and hands it back selected, so the
 * existing Replace / Add flow (and its sets/reps/time inputs) takes over with
 * no new form. Only they ever see it; the plan generator never does.
 */
export function AddOwnExerciseRow({
  query,
  results,
  onCreated,
}: AddOwnExerciseRowProps) {
  const colors = useThemeColors();
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const name = ownExerciseNameFor(query, results);
  if (!name) return null;

  const handlePress = async () => {
    setSaving(true);
    setFailed(false);
    try {
      onCreated(await createCustomExercise(name));
    } catch (error) {
      console.error("Error creating custom exercise:", error);
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <TouchableOpacity
      className="mb-3 p-4 rounded-xl border border-dashed border-brand-primary bg-surface"
      onPress={handlePress}
      disabled={saving}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Add ${name} as your own exercise`}
    >
      <View className="flex-row items-center">
        <View className="size-9 rounded-full items-center justify-center bg-neutral-light-2 mr-3">
          {saving ? (
            <ActivityIndicator size="small" color={colors.brand.primary} />
          ) : (
            <Ionicons name="add" size={20} color={colors.brand.primary} />
          )}
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-text-primary">
            Add &ldquo;{name}&rdquo;
          </Text>
          <Text className="text-sm text-text-muted mt-0.5">
            {failed
              ? "Couldn't save that. Tap to try again."
              : "Not in our library? Save it as your own. Only you'll see it."}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
