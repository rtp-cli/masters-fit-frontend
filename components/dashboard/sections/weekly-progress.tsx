import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

import { colors } from "../../../lib/theme";

type WeeklyProgressItem = {
  dayName: string;
  dateStr: string;
  completionRate: number;
  status: "rest" | "upcoming" | "incomplete" | "partial" | "complete";
  isToday: boolean;
  isFuture: boolean;
  streak: number;
};

type WeeklyProgressSectionProps = {
  weeklyProgressData: WeeklyProgressItem[];
  streak: number;
};

const WeeklyProgressSection: React.FC<WeeklyProgressSectionProps> = ({
  weeklyProgressData,
  streak,
}) => {
  return (
    <View className="px-4 mb-6">
      <View className="flex-row justify-between items-center px-4 mb-4">
        <View>
          <Text className="text-base font-semibold text-text-primary">
            Weekly Progress
          </Text>
          <Text className="text-xs text-text-muted mt-1">
            Your workout completion for this week
          </Text>
        </View>
        {streak > 0 && (
          <View className="flex-row items-center px-3 py-1.5 rounded-full">
            <Ionicons name="flame" size={14} color={colors.brand.secondary} />
            <Text className="text-sm font-bold text-secondary ml-1">
              {streak} day streak
            </Text>
          </View>
        )}
      </View>
      <View className="bg-white rounded-2xl px-4 pt-5">
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
                      ? colors.brand.secondary
                      : colors.neutral.medium[3];
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
                    <Text className="text-xs text-accent font-medium">
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
