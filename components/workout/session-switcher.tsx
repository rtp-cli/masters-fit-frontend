import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { useThemeColors } from "@/lib/theme";

/**
 * [LR-069] Lets a date with more than one session show both.
 *
 * The Workout tab renders a single session, which was fine while a date could
 * only hold one. Once a bonus workout can be added to a day already trained,
 * whichever session the screen does NOT pick becomes unreachable — and on
 * production that hid a completed workout behind a bonus session the user had
 * cancelled. It read as though the training had been deleted.
 *
 * Renders nothing for a single session, so the ordinary day is unchanged.
 *
 * Laid out as a row that shares the width rather than a horizontal scroller.
 * The scroller let a long session name run off the right edge, which reads as
 * a broken layout rather than as "there is more to scroll to" — and a date
 * realistically holds two sessions, occasionally three, which fit.
 */

interface SwitchableSession {
  id: number;
  name?: string | null;
  isComplete?: boolean | null;
}

interface SessionSwitcherProps {
  sessions: SwitchableSession[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export default function SessionSwitcher({
  sessions,
  selectedId,
  onSelect,
}: SessionSwitcherProps) {
  const colors = useThemeColors();

  // One session is the normal case — no chrome for it.
  if (sessions.length < 2) return null;

  return (
    <View className="px-5 pt-3 pb-1">
      <Text className="text-xs text-text-muted mb-2">
        {sessions.length} sessions today
      </Text>
      <View className="flex-row" style={{ gap: 8 }}>
        {sessions.map((session, index) => {
          const selected = session.id === selectedId;
          const done = !!session.isComplete;
          return (
            <TouchableOpacity
              key={session.id}
              onPress={() => onSelect(session.id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${session.name || `Session ${index + 1}`}${
                done ? ", completed" : ""
              }`}
              // flex-1 so the pills divide the width evenly and always fit.
              className={`flex-1 flex-row items-center justify-center px-3 py-2 rounded-full border ${
                selected
                  ? "bg-primary border-primary"
                  : "bg-background border-neutral-medium-1"
              }`}
            >
              {done ? (
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={selected ? colors.contentOnPrimary : colors.text.muted}
                  style={{ marginRight: 5 }}
                />
              ) : null}
              <Text
                className="text-sm font-medium"
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  // No maxWidth: the pill itself is already bounded by flex-1,
                  // so the label truncates to whatever share it gets.
                  flexShrink: 1,
                  color: selected
                    ? colors.contentOnPrimary
                    : colors.text.primary,
                }}
              >
                {session.name || `Session ${index + 1}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
