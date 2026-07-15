import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Modal, Pressable,Text, TouchableOpacity, View } from "react-native";

import { getCurrentUser } from "@/lib/auth";
import { useThemeColors } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import {
  fetchPastCompletedDays,
  fetchPreviousWorkouts,
  isRepeatablePreviousWorkout,
} from "@/lib/workouts";
import type { PreviousWorkout } from "@/types/api/workout.types";

interface WorkoutChoiceModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerateNew: () => void;
  onRepeatPast: () => void;
}

export default function WorkoutChoiceModal({
  visible,
  onClose,
  onGenerateNew,
  onRepeatPast,
}: WorkoutChoiceModalProps) {
  const colors = useThemeColors();
  const { isDark } = useTheme();

  // While we're checking whether any past workouts exist we don't render the
  // dialog — that way, when there are none, we forward straight to "Generate
  // New" without ever flashing the choice dialog.
  const [checking, setChecking] = useState(false);
  const [hasPastWorkouts, setHasPastWorkouts] = useState(false);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    setChecking(true);

    (async () => {
      try {
        const user = await getCurrentUser();
        const [pastDays, previousWorkouts] = await Promise.all([
          fetchPastCompletedDays().catch(() => []),
          user
            ? fetchPreviousWorkouts(user.id).catch(() => [])
            : Promise.resolve<PreviousWorkout[]>([]),
        ]);

        if (cancelled) return;

        // A plan only counts as repeatable if the user actually did some of it.
        const repeatableWeeks = (previousWorkouts ?? []).filter(
          isRepeatablePreviousWorkout
        );
        const hasPast =
          (pastDays?.length ?? 0) > 0 || repeatableWeeks.length > 0;

        if (hasPast) {
          setHasPastWorkouts(true);
        } else {
          // No previous workouts to repeat — skip the dialog entirely.
          setHasPastWorkouts(false);
          onClose();
          onGenerateNew();
        }
      } catch {
        // If the check fails, fall back to showing the dialog.
        if (!cancelled) setHasPastWorkouts(true);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  return (
    <Modal
      visible={visible && !checking && hasPastWorkouts}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className={`flex-1 justify-center items-center ${isDark ? "dark" : ""}`}
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onPress={onClose}
      >
        <Pressable
          className="bg-surface rounded-2xl mx-6 w-[85%] overflow-hidden border border-neutral-medium-1"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <View className="px-6 pt-6 pb-4 items-center">
            <View
              className="size-12 rounded-full items-center justify-center mb-3"
              style={{ backgroundColor: colors.brand.primary + "15" }}
            >
              <Ionicons
                name="fitness-outline"
                size={22}
                color={colors.brand.primary}
              />
            </View>
            <Text className="text-lg font-semibold text-text-primary mb-1">
              New Workout
            </Text>
            <Text className="text-sm text-text-muted text-center">
              Generate a fresh workout or repeat one you've done before
            </Text>
          </View>

          <View className="px-5 pb-5 space-y-3">
            <TouchableOpacity
              className="bg-primary rounded-xl p-4 flex-row items-center"
              onPress={() => {
                onClose();
                onGenerateNew();
              }}
            >
              <View
                className="size-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
              >
                <Ionicons
                  name="sparkles"
                  size={20}
                  color={colors.contentOnPrimary}
                />
              </View>
              <View className="flex-1">
                <Text className="text-content-on-primary font-semibold text-base">
                  Create New Workout
                </Text>
                <Text className="text-content-on-primary/70 text-xs mt-0.5">
                  AI creates a workout based on your preferences
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.contentOnPrimary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              // [Bug fix] Was bg-secondary + text-background, which resolve
              // to the SAME color in every theme (both the polar-opposite-of-
              // primary token) — text/icons here were invisible. Match the
              // established secondary-button pairing (button.tsx): light
              // fill, dark text.
              className="bg-neutral-light-2 rounded-xl p-4 mt-2 flex-row items-center"
              onPress={() => {
                onClose();
                onRepeatPast();
              }}
            >
              <View
                className="size-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: colors.brand.primary + "15" }}
              >
                <Ionicons
                  name="repeat"
                  size={20}
                  color={colors.text.primary}
                />
              </View>
              <View className="flex-1">
                <Text className="text-text-primary font-semibold text-base">
                  Repeat Past Workout
                </Text>
                <Text className="text-text-secondary text-xs mt-0.5">
                  Pick from one of your completed workouts
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.text.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              className="py-3 items-center mt-1"
              onPress={onClose}
            >
              <Text className="text-text-muted font-medium text-sm">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
