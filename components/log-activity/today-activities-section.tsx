import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { useThemeColors } from "@/lib/theme";
import { type LoggedActivity } from "@/types/api";

import LoggedActivityRow from "./logged-activity-row";

/**
 * [LR-077] "You logged" — the list plus the door, for the Workout tab.
 *
 * The Workout tab renders TODAY and only today (workout-screen keys everything
 * off getCurrentDate()), so this section is always about today. A backdated
 * activity is reachable from the calendar instead; that is a real limitation of
 * the tab, not of the record.
 *
 * The dashboard card and the calendar inline their own version of this because
 * each has to sit inside a different container idiom — but all three render the
 * same LoggedActivityRow, so a row never looks like two different things.
 */

interface TodayActivitiesSectionProps {
  activities: LoggedActivity[];
  onLogActivity?: () => void;
  onDeleteActivity?: (activity: LoggedActivity) => void;
  deletingId?: number | null;
  /** Centered copy suits the empty rest-day layout; left-aligned suits a list. */
  align?: "left" | "center";
}

export default function TodayActivitiesSection({
  activities,
  onLogActivity,
  onDeleteActivity,
  deletingId,
  align = "left",
}: TodayActivitiesSectionProps) {
  const colors = useThemeColors();

  if (!onLogActivity && activities.length === 0) return null;

  return (
    <View className="w-full">
      {activities.length > 0 && (
        <View className="mb-3">
          <Text
            className={`text-xs font-bold text-text-muted uppercase mb-2 ${
              align === "center" ? "text-center" : ""
            }`}
            style={{ letterSpacing: 0.78 }}
          >
            You logged
          </Text>
          <View className="gap-2">
            {activities.map((activity) => (
              <LoggedActivityRow
                key={activity.id}
                activity={activity}
                onDelete={onDeleteActivity}
                deleting={deletingId === activity.id}
              />
            ))}
          </View>
        </View>
      )}

      {!!onLogActivity && (
        <TouchableOpacity
          onPress={onLogActivity}
          accessibilityRole="button"
          accessibilityLabel="Log an activity you already did, outside your plan"
          className="flex-row items-center rounded-xl border border-neutral-medium-1 bg-neutral-light-2"
          style={{ paddingHorizontal: 18, paddingVertical: 14, minHeight: 44 }}
        >
          <Ionicons
            name="add-circle-outline"
            size={18}
            color={colors.text.secondary}
          />
          <Text className="text-base font-semibold text-text-primary ml-2 flex-1">
            {activities.length > 0
              ? "Log something else"
              : "I did something else"}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.text.muted}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}
