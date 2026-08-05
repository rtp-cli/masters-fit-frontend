import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useThemeColors } from "@/lib/theme";

/**
 * [GQ-04] Dismissible banner shown at the top of the generated week when the
 * plan couldn't fully honor the user's request ("couldn't apply X because Y").
 * Collapsed it reads "We adjusted N of your requests"; tapping expands the list;
 * "Got it" dismisses it for good (persisted per workout so it doesn't reappear
 * when the user revisits the same week).
 *
 * Renders nothing when there are no conflicts or it's already been dismissed —
 * safe to always mount on the calendar.
 */
export interface FeedbackConflict {
  request: string;
  reason: string;
}

const dismissKey = (workoutId: number) =>
  `@feedback_conflicts_dismissed:${workoutId}`;

export default function FeedbackConflictsBanner({
  workoutId,
  conflicts,
}: {
  workoutId: number | undefined;
  conflicts: FeedbackConflict[] | undefined;
}) {
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(false);
  // undefined = still checking storage; true/false = resolved.
  const [dismissed, setDismissed] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let active = true;
    if (workoutId == null) {
      setDismissed(true);
      return;
    }
    AsyncStorage.getItem(dismissKey(workoutId))
      .then((v) => {
        if (active) setDismissed(v === "1");
      })
      .catch(() => {
        // Storage read failure shouldn't hide a real adjustment — show it.
        if (active) setDismissed(false);
      });
    return () => {
      active = false;
    };
  }, [workoutId]);

  const onDismiss = () => {
    setDismissed(true);
    if (workoutId != null) {
      AsyncStorage.setItem(dismissKey(workoutId), "1").catch(() => {
        // Best effort — if it fails to persist, the banner is still hidden this
        // session; it may reappear next visit, which is acceptable.
      });
    }
  };

  if (!conflicts || conflicts.length === 0) return null;
  // Don't flash the banner before we know whether it was dismissed.
  if (dismissed !== false) return null;

  const count = conflicts.length;

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: colors.warning,
        backgroundColor: colors.surface,
        paddingVertical: 12,
        paddingHorizontal: 14,
      }}
    >
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        accessibilityRole="button"
        accessibilityLabel={`We adjusted ${count} of your requests. Tap to ${
          expanded ? "collapse" : "expand"
        }.`}
        style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
      >
        <Ionicons
          name="information-circle-outline"
          size={18}
          color={colors.warning}
        />
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: "600",
            color: colors.text.primary,
          }}
        >
          We adjusted {count} of your {count === 1 ? "requests" : "requests"}
        </Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.text.secondary}
        />
      </Pressable>

      {expanded && (
        <View style={{ marginTop: 10, gap: 8 }}>
          {conflicts.map((c, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 6 }}>
              <Text style={{ color: colors.warning, fontSize: 13 }}>•</Text>
              <Text
                style={{
                  flex: 1,
                  fontSize: 13,
                  lineHeight: 18,
                  color: colors.text.secondary,
                }}
              >
                <Text style={{ fontWeight: "600", color: colors.text.primary }}>
                  {c.request}
                </Text>
                {" — "}
                {c.reason}
              </Text>
            </View>
          ))}
          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            style={{ alignSelf: "flex-start", marginTop: 4 }}
            hitSlop={8}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: colors.brand.primary,
              }}
            >
              Got it
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
