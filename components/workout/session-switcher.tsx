import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
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
              className={`flex-row items-center px-3 py-2 rounded-full border ${
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
                style={{
                  maxWidth: 180,
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
      </ScrollView>
    </View>
  );
}
