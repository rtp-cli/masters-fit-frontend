import React from "react";
import { Text, View } from "react-native";

import { LineChart } from "@/components/charts/line-chart";
import { TimeRangeSegmentedControl } from "@/components/segmented-control";
import { TIME_RANGE_FILTER } from "@/constants/global.enum";
import { formatTimeRangeLabel } from "@/utils";

import { useThemeColors } from "../../../lib/theme";

type StrengthProgressItem = {
  date: string;
  avgWeight: number;
  maxWeight: number;
  label: string;
};

type StrengthProgressSectionProps = {
  data: StrengthProgressItem[];
  filter: TIME_RANGE_FILTER;
  onChangeFilter: (filter: TIME_RANGE_FILTER) => void;
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Compact x-axis label ("Mar 31") derived from the raw "YYYY-MM-DD" date,
// parsed manually to avoid timezone drift. The full "March 31, 2026" labels
// are too wide and collide when several are shown across the chart width.
const shortLabel = (dateStr: string, fallback: string): string => {
  const [, m, d] = (dateStr || "").split("-").map(Number);
  if (!m || m > 12 || !d) return fallback;
  return `${MONTHS[m - 1]} ${d}`;
};

// Whole-day index for a "YYYY-MM-DD" string (UTC, no timezone drift).
const dayIndex = (dateStr: string): number => {
  const [y, m, d] = (dateStr || "").split("-").map(Number);
  if (!y || !m || !d) return NaN;
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

// A 3-day split mixes light upper-body days with heavy full-body days, so the
// raw per-session line zigzags hard by day type. Plotting a trailing 7-day
// rolling average of session weights smooths that out and reveals the actual
// upward trend, while the stat tiles below keep the raw latest/best figures.
const ROLLING_WINDOW_DAYS = 7;
const rollingWeeklyAvg = (items: StrengthProgressItem[]): number[] =>
  items.map((item) => {
    const end = dayIndex(item.date);
    const start = end - (ROLLING_WINDOW_DAYS - 1);
    const window = items.filter((o) => {
      const t = dayIndex(o.date);
      return !isNaN(t) && t >= start && t <= end;
    });
    const vals = window.length ? window : [item];
    const mean = vals.reduce((s, v) => s + v.avgWeight, 0) / vals.length;
    return Math.round(mean * 10) / 10;
  });

const StrengthProgressSection: React.FC<StrengthProgressSectionProps> = ({
  data,
  filter,
  onChangeFilter,
}) => {
  const colors = useThemeColors();
  if (!data || data.length === 0) return null;

  const smoothedValues = rollingWeeklyAvg(data);

  const latestAvg =
    data.length > 0 ? Math.round(data[data.length - 1]?.avgWeight || 0) : 0;
  const bestSet =
    data.length > 0 ? Math.max(...data.map((d) => d.maxWeight)) : 0;
  const growth = (() => {
    if (data.length < 2) return 0;
    const first = data[0].avgWeight;
    const last = data[data.length - 1].avgWeight;
    return first > 0 ? ((last - first) / first) * 100 : 0;
  })();

  return (
    <View className="px-4 mb-6">
      <View className="px-4">
        <Text className="text-base font-semibold text-text-primary mb-1">
          Strength Progress
        </Text>
        <Text className="text-xs text-text-muted mb-3">
          Weekly average weight ({formatTimeRangeLabel(filter)})
        </Text>
      </View>

      <View className="items-center mb-4">
        <TimeRangeSegmentedControl value={filter} onChange={onChangeFilter} />
      </View>

      <View className="bg-surface rounded-2xl p-4 border border-neutral-medium-1">
        <View className="mb-4">
          <LineChart
            data={data.map((item, index) => {
              let displayLabel = "";
              const totalPoints = data.length;
              const compact = shortLabel(item.date, item.label);
              if (totalPoints <= 3) {
                displayLabel = compact;
              } else if (totalPoints <= 7) {
                if (
                  index === 0 ||
                  index === Math.floor(totalPoints / 2) ||
                  index === totalPoints - 1
                ) {
                  displayLabel = compact;
                }
              } else {
                if (
                  index === 0 ||
                  index === Math.floor(totalPoints / 4) ||
                  index === Math.floor(totalPoints / 2) ||
                  index === Math.floor((3 * totalPoints) / 4) ||
                  index === totalPoints - 1
                ) {
                  displayLabel = compact;
                }
              }
              return {
                label: displayLabel,
                value: smoothedValues[index],
                date: item.date,
              };
            })}
            height={200}
            color={colors.brand.dark[1]}
            showValues={true}
            showLabels={true}
          />
        </View>

        <View className="flex-row justify-around pt-4 border-t border-neutral-light-2">
          <View className="items-center">
            <Text className="text-base font-bold text-text-primary">
              {latestAvg} lbs
            </Text>
            <Text className="text-xs text-text-muted">Latest Avg</Text>
          </View>
          <View className="items-center">
            <Text className="text-base font-bold text-text-primary">
              {bestSet} lbs
            </Text>
            <Text className="text-xs text-text-muted">Best Set</Text>
          </View>
          <View className="items-center">
            <Text className="text-base font-bold text-text-primary">{`${growth > 0 ? "+" : ""}${Math.round(growth)}%`}</Text>
            <Text className="text-xs text-text-muted">Growth</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default StrengthProgressSection;
