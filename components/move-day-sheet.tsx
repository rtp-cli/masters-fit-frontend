import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CustomDialog } from "@/components/ui";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics-events";
import { useThemeColors } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import { movePlanDay, type MovePlanDayResult } from "@/lib/workouts";
import type { PlanDayWithBlocks } from "@/types/api/workout.types";
import { formatDate, formatDateAsString, getCurrentDate } from "@/utils";
import { buildMoveDayOptions } from "@/utils/move-day-options";

interface MoveDaySheetProps {
  visible: boolean;
  onClose: () => void;
  /** The workout being moved. */
  planDay: PlanDayWithBlocks | null;
  /** Every day of the active plan — what's on each date. */
  planDays: PlanDayWithBlocks[];
  planStart: string;
  planEnd: string;
  onMoved: (result: MovePlanDayResult) => void;
}

/**
 * "Swap with another day": rearrange the week by hand. Tapping a day trades
 * this workout with whatever is scheduled there, or moves it onto a rest day.
 * No AI and nothing destroyed — swapping back undoes it — so there is no
 * confirmation step.
 */
export default function MoveDaySheet({
  visible,
  onClose,
  planDay,
  planDays,
  planStart,
  planEnd,
  onMoved,
}: MoveDaySheetProps) {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const [movingTo, setMovingTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sourceDate = planDay ? formatDateAsString(planDay.date) : "";
  const options = useMemo(
    () =>
      planDay
        ? buildMoveDayOptions(
            planDays,
            { id: planDay.id, date: sourceDate },
            { today: getCurrentDate(), planStart, planEnd },
            formatDateAsString
          )
        : [],
    [planDay, planDays, sourceDate, planStart, planEnd]
  );

  const handleMove = async (date: string, swapCount: number) => {
    if (!planDay || movingTo) return;
    setMovingTo(date);
    try {
      const result = await movePlanDay(planDay.id, date);
      trackEvent(AnalyticsEvent.WORKOUT_DAY_MOVED, {
        plan_day_id: planDay.id,
        kind: swapCount > 0 ? "swap" : "move_to_rest_day",
        days_moved: Math.round(
          (Date.parse(date) - Date.parse(sourceDate)) / (24 * 60 * 60 * 1000)
        ),
      });
      onMoved(result);
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "Couldn't move this workout. Please try again."
      );
    } finally {
      setMovingTo(null);
    }
  };

  const dayLabel = (date: string, isToday: boolean) =>
    isToday
      ? "Today"
      : formatDate(date, { weekday: "long", month: "short", day: "numeric" });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView
        edges={["top"]}
        className={`flex-1 bg-background ${isDark ? "dark" : ""}`}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-light-2">
          <TouchableOpacity
            onPress={onClose}
            className="size-8 items-center justify-center"
            disabled={!!movingTo}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={20} color={colors.text.muted} />
          </TouchableOpacity>
          <Text className="text-base font-semibold text-text-primary">
            Swap with Another Day
          </Text>
          <View className="w-8" />
        </View>

        <ScrollView className="flex-1" contentContainerClassName="p-5">
          <Text className="text-base text-text-muted mb-6 text-center leading-6">
            Pick a day for{" "}
            <Text className="font-semibold text-text-primary">
              {planDay?.name || "this workout"}
            </Text>
            . Whatever is planned there moves to{" "}
            {dayLabel(sourceDate, sourceDate === getCurrentDate()).replace(
              "Today",
              "today"
            )}
            .
          </Text>

          {options.length === 0 ? (
            <Text className="text-sm text-text-muted text-center">
              There are no other days left in this plan to swap with.
            </Text>
          ) : (
            options.map((option) => {
              const isRest = option.sessions.length === 0;
              const busy = movingTo === option.date;
              return (
                <TouchableOpacity
                  key={option.date}
                  className={`flex-row items-center p-4 mb-3 rounded-xl border border-neutral-light-2 bg-surface ${
                    option.disabled ? "opacity-50" : ""
                  }`}
                  style={{ minHeight: 64 }}
                  onPress={() =>
                    handleMove(option.date, option.sessions.length)
                  }
                  disabled={option.disabled || !!movingTo}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: option.disabled }}
                  accessibilityLabel={`${dayLabel(option.date, option.isToday)}. ${
                    option.disabled
                      ? "Already done, can't swap."
                      : isRest
                        ? "Rest day. Move this workout here."
                        : `Swap with ${option.sessions.map((s) => s.name).join(" and ")}.`
                  }`}
                >
                  <View className="size-9 rounded-full bg-neutral-light-2 items-center justify-center">
                    <Ionicons
                      name={isRest ? "bed-outline" : "swap-vertical"}
                      size={18}
                      color={colors.text.primary}
                    />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-base font-semibold text-text-primary">
                      {dayLabel(option.date, option.isToday)}
                    </Text>
                    <Text className="text-sm text-text-muted" numberOfLines={2}>
                      {option.disabled
                        ? "Already done"
                        : isRest
                          ? "Rest day — move it here"
                          : option.sessions.map((s) => s.name).join(" + ")}
                    </Text>
                  </View>
                  {busy ? (
                    <ActivityIndicator size="small" color={colors.brand.primary} />
                  ) : option.disabled ? null : (
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.text.muted}
                    />
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {error && (
          <CustomDialog
            visible={!!error}
            onClose={() => setError(null)}
            title="Couldn't Move Workout"
            description={error}
            primaryButton={{ text: "OK", onPress: () => setError(null) }}
            icon="alert-circle"
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
