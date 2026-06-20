import React from "react";
import { Text, View } from "react-native";

import { useThemeColors } from "../../../lib/theme";

type WeeklyProgressItem = {
  dayName: string;
  dateStr: string;
  completionRate: number;
  status: "rest" | "upcoming" | "incomplete" | "partial" | "complete";
  isToday: boolean;
  isFuture: boolean;
};

type WeeklyProgressSectionProps = {
  weeklyProgressData: WeeklyProgressItem[];
};

const WeeklyProgressSection: React.FC<WeeklyProgressSectionProps> = ({
  weeklyProgressData,
}) => {
  const colors = useThemeColors();
  return (
    <View className="px-4 mb-6">
      <View className="px-4 mb-4">
        <Text className="text-base font-semibold text-text-primary">
          Weekly Progress
        </Text>
        <Text className="text-xs text-text-muted mt-1">
          Your workout completion for this week
        </Text>
      </View>
      <View className="bg-surface rounded-2xl px-4 pt-5">
        <View className="mb-4">
          <View className="flex-row justify-between items-end mb-4 h-30">
            {weeklyProgressData.map((day, index) => {
              const FULL_HEIGHT = 100;
              const BASE_HEIGHT = 20;
              const height =
                day.status === "rest"
                  ? FULL_HEIGHT
                  : day.status === "upcoming" || day.status === "incomplete"
                    ? BASE_HEIGHT
                    : Math.max(
                        (day.completionRate / 100) * FULL_HEIGHT,
                        BASE_HEIGHT
                      );
              const backgroundColor =
                day.status === "complete"
                  ? colors.brand.primary
                  : day.status === "partial"
                    ? colors.brand.medium[2]
                    : day.status === "rest"
                      ? colors.neutral.medium[1]
                      : colors.neutral.medium[2];
              return (
                <View key={index} className="items-center flex-1 mx-1">
                  <View className="flex-1 justify-end mb-2">
                    <View
                      className="w-8 rounded-lg"
                      style={{ height, backgroundColor }}
                    />
                  </View>
                  <Text
                    className={`text-xs font-medium mb-1 ${day.isToday ? "text-primary" : "text-text-primary"}`}
                  >
                    {day.dayName}
                  </Text>
                  {day.status === "rest" ? (
                    <Text className="text-xs text-primary font-medium">
                      Rest
                    </Text>
                  ) : day.status === "upcoming" ? (
                    <Text className="text-xs text-text-muted">-</Text>
                  ) : day.completionRate > 0 ? (
                    <Text className="text-xs text-brand-primary font-medium">
                      {Math.round(day.completionRate)}%
                    </Text>
                  ) : (
                    <Text className="text-xs text-text-muted">0%</Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
};

export default WeeklyProgressSection;
