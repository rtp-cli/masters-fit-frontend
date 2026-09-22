import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";

import {
  ACTIVITY_EFFORT_LABELS,
  activityIcon,
  activityLabel,
} from "@/constants/activities";
import { useThemeColors } from "@/lib/theme";
import { type LoggedActivity } from "@/types/api";
import { formatWorkoutDuration } from "@/utils";

/**
 * [LR-077] One logged activity, rendered the same way everywhere.
 *
 * Shared by the calendar day, the dashboard's today card and the workout tab,
 * because the LR-069 failure was a date rendering differently depending on
 * which screen you were looking at — and a row that is present on one surface
 * and absent on another is indistinguishable from data loss.
 *
 * It deliberately does not look like a session card. This is a record of
 * something that happened, with nothing to start, nothing to open and no
 * exercises inside it.
 */

interface LoggedActivityRowProps {
  activity: LoggedActivity;
  /** Omitted → no delete affordance (read-only surfaces). */
  onDelete?: (activity: LoggedActivity) => void;
  deleting?: boolean;
}

export default function LoggedActivityRow({
  activity,
  onDelete,
  deleting = false,
}: LoggedActivityRowProps) {
  const colors = useThemeColors();
  const label = activityLabel(activity);

  const confirmDelete = () => {
    // There is no edit in v1, so delete is the only way back from a mis-tap —
    // which makes confirming it worth the extra tap.
    Alert.alert(
      "Remove this activity?",
      `${label} · ${formatWorkoutDuration(activity.durationMinutes)} will be removed from ${
        activity.date
      }.`,
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => onDelete?.(activity),
        },
      ]
    );
  };

  const effortLabel = activity.effort
    ? ACTIVITY_EFFORT_LABELS[activity.effort]
    : null;

  return (
    <View
      className="flex-row items-center bg-surface rounded-xl px-4 py-3 border border-neutral-medium-1"
      style={{ opacity: deleting ? 0.5 : 1 }}
    >
      <View
        className="size-9 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: colors.brand.primary + "15" }}
      >
        <Ionicons
          name={activityIcon(activity.activityType) as any}
          size={18}
          color={colors.brand.primary}
        />
      </View>

      <View className="flex-1">
        <Text
          className="text-sm font-semibold text-text-primary"
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text className="text-xs text-text-muted mt-0.5">
          {formatWorkoutDuration(activity.durationMinutes)}
          {effortLabel ? ` · ${effortLabel}` : ""}
          {/* Says plainly what this row is, so it can never be mistaken for a
              session the app planned — and quietly explains why it is not
              moving the streak. */}
          {" · You logged this"}
        </Text>
        {!!activity.notes && (
          <Text className="text-xs text-text-secondary mt-1" numberOfLines={2}>
            {activity.notes}
          </Text>
        )}
      </View>

      {onDelete && (
        <TouchableOpacity
          onPress={confirmDelete}
          disabled={deleting}
          accessibilityRole="button"
          accessibilityLabel={`Remove this ${label}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="ml-2 p-1"
        >
          <Ionicons
            name="close-outline"
            size={18}
            color={colors.text.muted}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}
