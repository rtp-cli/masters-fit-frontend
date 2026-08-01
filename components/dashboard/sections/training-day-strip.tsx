import React from "react";
import { Text, View } from "react-native";

import { useThemeColors } from "@/lib/theme";
import { type PlanDayWithBlocks } from "@/types/api";
import { getDayOfWeek } from "@/utils";

/**
 * A plan cycle is NOT a Mon–Sun calendar week — it's the set of the user's
 * scheduled training days, anchored to their registration date. So the strip
 * renders one segment per training day (a plan day that has blocks; rest days
 * have none and are omitted), in plan order. A 4-day plan gets 4 segments.
 *
 * Two visual states only: `done` (a completed training day) and everything
 * else (`upcoming`). The first upcoming day is the "next up" one and gets a
 * heavier, inked label — but it's still an outline pill, not a third style.
 */
export interface TrainingDaySegment {
  /** Abbreviated weekday under the pill, e.g. "Wed". */
  weekday: string;
  done: boolean;
  /** The first not-yet-done training day. Drives the emphasized label. */
  isNext: boolean;
}

export interface PlanCycle {
  segments: TrainingDaySegment[];
  doneCount: number;
  totalCount: number;
  /** The next incomplete training day, for the "Up next" row. Null if the
   *  whole cycle is done. */
  upNext: {
    /** Full weekday, e.g. "Sunday". */
    weekday: string;
    name: string;
    exerciseCount: number;
    durationMinutes: number;
  } | null;
}

/**
 * Training days = plan days that actually have blocks (rest days have none),
 * in plan order. The single source of truth for "the days of a plan cycle" —
 * both this strip and the dashboard's Weekly Progress row derive from it, so
 * the dashboard holds one definition of a cycle, not two. */
export function getTrainingDays(
  planDays: PlanDayWithBlocks[]
): PlanDayWithBlocks[] {
  return planDays.filter((day) => (day.blocks?.length ?? 0) > 0);
}

/**
 * Derive the cycle from the active plan's days. Segment count and the
 * "N of your M training days" sentence come from the same array, so they can
 * never disagree whatever weekday the cycle starts on.
 */
export function derivePlanCycle(planDays: PlanDayWithBlocks[]): PlanCycle {
  const days = getTrainingDays(planDays);
  const nextIndex = days.findIndex((day) => !day.isComplete);

  const segments: TrainingDaySegment[] = days.map((day, i) => ({
    weekday: getDayOfWeek(day.date).slice(0, 3),
    done: !!day.isComplete,
    isNext: i === nextIndex,
  }));

  const nextDay = nextIndex >= 0 ? days[nextIndex] : null;
  const upNext = nextDay
    ? {
        weekday: getDayOfWeek(nextDay.date),
        name: nextDay.name,
        exerciseCount: nextDay.blocks.reduce(
          (total, block) => total + (block.exercises?.length ?? 0),
          0
        ),
        durationMinutes: nextDay.blocks.reduce(
          (total, block) => total + (block.blockDurationMinutes ?? 0),
          0
        ),
      }
    : null;

  return {
    segments,
    doneCount: days.filter((day) => day.isComplete).length,
    totalCount: days.length,
    upNext,
  };
}

/**
 * The training-day progress strip: a 6px pill per training day, weekday
 * beneath. `box-sizing: border-box` (RN's default) keeps the outlined "next"
 * pill exactly 6px tall so it lines up with the solid done pills.
 */
export function TrainingDayStrip({ segments }: { segments: TrainingDaySegment[] }) {
  const colors = useThemeColors();

  return (
    <View className="flex-row mt-md" style={{ gap: 8 }}>
      {segments.map((segment, i) => (
        <View key={i} className="flex-1 items-stretch">
          <View
            style={{
              height: 6,
              borderRadius: 9999,
              backgroundColor: segment.done
                ? colors.brand.primary
                : colors.surface,
              borderWidth: segment.done ? 0 : 1.5,
              borderColor: colors.brand.primary,
            }}
          />
          <Text
            className={
              segment.isNext
                ? "text-xs font-bold text-text-primary text-center"
                : "text-xs font-semibold text-text-muted text-center"
            }
            style={{ marginTop: 7 }}
          >
            {segment.weekday}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default TrainingDayStrip;
