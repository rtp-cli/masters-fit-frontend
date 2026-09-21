import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useThemeColors } from "@/lib/theme";

/**
 * Dismissible advisories shown at the top of the generated week. Two of them,
 * on purpose:
 *
 * - [GQ-04]  FeedbackConflictsBanner — "We adjusted N of your requests".
 *            Parts of the request the plan could NOT honor.
 * - [GQ-04b] CoachingCautionsBanner — "One thing to watch".
 *            Parts it DID honor exactly, that carry a training risk.
 *
 * They used to be one channel, and the model reached for the conflicts field to
 * say "built exactly what you asked, but be careful" (prod workout 927,
 * 2026-09-21) — so the heading announced an adjustment that never happened.
 * Separate backend fields, separate headings, each true to its payload.
 *
 * Both render nothing when empty or already dismissed, so they're safe to mount
 * unconditionally on the calendar.
 */

export interface FeedbackConflict {
  request: string;
  reason: string;
}

export interface CoachingCaution {
  what: string;
  why: string;
}

/** One row: a bolded lead-in, an em dash, then the explanation. */
interface AdvisoryItem {
  lead: string;
  body: string;
}

/**
 * Shared shell. Tapping the header expands the list; "Got it" dismisses it for
 * good, persisted per workout so it doesn't reappear on revisit.
 */
function PlanAdvisoryBanner({
  workoutId,
  items,
  heading,
  icon,
  storagePrefix,
}: {
  workoutId: number | undefined;
  items: AdvisoryItem[];
  heading: string;
  icon: keyof typeof Ionicons.glyphMap;
  storagePrefix: string;
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
    AsyncStorage.getItem(`${storagePrefix}${workoutId}`)
      .then((v) => {
        if (active) setDismissed(v === "1");
      })
      .catch(() => {
        // Storage read failure shouldn't hide a real advisory — show it.
        if (active) setDismissed(false);
      });
    return () => {
      active = false;
    };
  }, [workoutId, storagePrefix]);

  const onDismiss = () => {
    setDismissed(true);
    if (workoutId != null) {
      AsyncStorage.setItem(`${storagePrefix}${workoutId}`, "1").catch(() => {
        // Best effort — if it fails to persist, the banner is still hidden this
        // session; it may reappear next visit, which is acceptable.
      });
    }
  };

  if (!items || items.length === 0) return null;
  // Don't flash the banner before we know whether it was dismissed.
  if (dismissed !== false) return null;

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
        accessibilityLabel={`${heading}. Tap to ${
          expanded ? "collapse" : "expand"
        }.`}
        style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
      >
        <Ionicons name={icon} size={18} color={colors.warning} />
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: "600",
            color: colors.text.primary,
          }}
        >
          {heading}
        </Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.text.secondary}
        />
      </Pressable>

      {expanded && (
        <View style={{ marginTop: 10, gap: 8 }}>
          {items.map((item, i) => (
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
                  {item.lead}
                </Text>
                {" — "}
                {item.body}
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

/** [GQ-04] What the plan could NOT honor. */
export function FeedbackConflictsBanner({
  workoutId,
  conflicts,
}: {
  workoutId: number | undefined;
  conflicts: FeedbackConflict[] | undefined;
}) {
  const count = conflicts?.length ?? 0;
  return (
    <PlanAdvisoryBanner
      workoutId={workoutId}
      items={(conflicts ?? []).map((c) => ({
        lead: c.request,
        body: c.reason,
      }))}
      heading={`We adjusted ${count} of your ${
        count === 1 ? "request" : "requests"
      }`}
      icon="information-circle-outline"
      // Unchanged key — anyone who already dismissed this stays dismissed.
      storagePrefix="@feedback_conflicts_dismissed:"
    />
  );
}

/** [GQ-04b] What it DID honor, but that's worth watching. */
export function CoachingCautionsBanner({
  workoutId,
  cautions,
}: {
  workoutId: number | undefined;
  cautions: CoachingCaution[] | undefined;
}) {
  const count = cautions?.length ?? 0;
  return (
    <PlanAdvisoryBanner
      workoutId={workoutId}
      items={(cautions ?? []).map((c) => ({ lead: c.what, body: c.why }))}
      heading={count === 1 ? "One thing to watch" : `${count} things to watch`}
      // "eye" rather than the conflicts "i": same warning accent, but the icon
      // tells the two apart at a glance when both happen to be showing.
      icon="eye-outline"
      storagePrefix="@coaching_cautions_dismissed:"
    />
  );
}
