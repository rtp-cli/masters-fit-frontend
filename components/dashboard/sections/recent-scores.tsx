import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";

import { useThemeColors } from "@/lib/theme";
import { fetchBlockResultHistory } from "@/lib/workouts";
import { type BlockResultHistoryItem } from "@/types/api/logs.types";
import { getBlockTypeDisplayName } from "@/types/api/workout.types";

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

// "YYYY-MM-DD" -> "Jul 24" without timezone drift
const shortDate = (dateStr: string): string => {
  const [, m, d] = (dateStr || "").split("-").map(Number);
  if (!m || m > 12 || !d) return "";
  return `${MONTHS[m - 1]} ${d}`;
};

/**
 * Recent circuit/WOD results with their scores ("5+12", "12:34", …) and a
 * "Best" chip on the user's best result per scoring type. Personal
 * progress tracking, not competition (product decision, gap-analysis §16.2).
 */
const RecentScoresSection: React.FC = () => {
  const colors = useThemeColors();
  const [results, setResults] = useState<BlockResultHistoryItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchBlockResultHistory(5).then((rows) => {
        if (!cancelled) setResults(rows);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const scored = results.filter((r) => r.score);
  if (scored.length === 0) return null;

  return (
    <View className="px-4 mb-6">
      <View className="px-4">
        <Text className="text-base font-semibold text-text-primary mb-1">
          Recent Scores
        </Text>
        <Text className="text-xs text-text-muted mb-3">
          Circuit and WOD results
        </Text>
      </View>

      <View className="bg-surface rounded-2xl border border-neutral-medium-1">
        {scored.map((result, index) => (
          <View
            key={result.id}
            className={`flex-row items-center p-4 ${
              index < scored.length - 1
                ? "border-b border-neutral-light-2"
                : ""
            }`}
          >
            <View className="size-8 rounded-full bg-brand-light-2 items-center justify-center mr-3">
              <Ionicons
                name="trophy-outline"
                size={16}
                color={colors.text.primary}
              />
            </View>
            <View className="flex-1">
              <Text
                className="font-semibold text-text-primary text-sm"
                numberOfLines={1}
              >
                {result.blockName || getBlockTypeDisplayName(result.blockType || undefined)}
              </Text>
              <Text className="text-xs text-text-muted mt-0.5">
                {getBlockTypeDisplayName(result.blockType || undefined)}
                {result.planDayDate ? ` · ${shortDate(result.planDayDate)}` : ""}
              </Text>
            </View>
            <View className="items-end">
              <Text className="font-bold text-text-primary text-base">
                {result.score}
              </Text>
              {result.isBest && (
                <View className="bg-brand-light-2 rounded-full px-2 py-0.5 mt-1">
                  <Text className="text-[10px] font-semibold text-text-primary">
                    Best
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export default RecentScoresSection;
