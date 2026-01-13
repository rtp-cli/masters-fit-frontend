import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { PieChart } from "@/components/charts/pie-chart";
import { getThemedDonutColors, TIME_RANGE_FILTER } from "@/constants";
import { WorkoutTypeMetrics } from "@/types/api";
import { useTheme } from "@/lib/theme-context";

type WorkoutTypeDistributionSectionProps = {
  metrics: WorkoutTypeMetrics | null;
  filter: TIME_RANGE_FILTER;
  onChangeFilter: (filter: TIME_RANGE_FILTER) => void;
};

const WorkoutTypeDistributionSection: React.FC<
  WorkoutTypeDistributionSectionProps
> = ({ metrics, filter, onChangeFilter }) => {
  const { isDark, colorTheme } = useTheme();
  const donutColors = getThemedDonutColors(colorTheme, isDark);

  if (
    !metrics ||
    !metrics.hasData ||
    metrics.totalSets === 0 ||
    metrics.distribution.length === 0
  )
    return null;

  const chartData = (() => {
    const topTypes = metrics.distribution.slice(0, 5);
    const otherTypes = metrics.distribution.slice(5);
    const base = topTypes.map((item, index) => ({
      label: item.label,
      value: item.percentage,
      color: donutColors[index],
      count: item.totalSets,
    }));
    if (otherTypes.length > 0) {
      const otherPercentage = otherTypes.reduce(
        (sum, item) => sum + item.percentage,
        0
      );
      const otherCount = otherTypes.reduce(
        (sum, item) => sum + item.totalSets,
        0
      );
      base.push({
        label: "Other",
        value: Math.round(otherPercentage * 10) / 10,
        color: donutColors[5],
        count: otherCount,
      });
    }
    return base;
  })();

  const legendData = (() => {
    const topTypes = metrics.distribution.slice(0, 5);
    const otherTypes = metrics.distribution.slice(5);
    const base = topTypes.map((item, index) => ({
      ...item,
      color: donutColors[index],
    }));
    if (otherTypes.length > 0) {
      const otherPercentage = otherTypes.reduce(
        (sum, item) => sum + item.percentage,
        0
      );
      base.push({
        tag: "other",
        label: "Other",
        percentage: Math.round(otherPercentage * 10) / 10,
        color: donutColors[5],
        totalSets: otherTypes.reduce((sum, item) => sum + item.totalSets, 0),
        totalReps: otherTypes.reduce((sum, item) => sum + item.totalReps, 0),
        exerciseCount: otherTypes.reduce(
          (sum, item) => sum + item.exerciseCount,
          0
        ),
        completedWorkouts: otherTypes.reduce(
          (sum, item) => sum + item.completedWorkouts,
          0
        ),
      });
    }
    return base;
  })();

  return (
    <View className="px-4 mb-6">
      <View className="px-4">
        <Text className="text-base font-semibold text-text-primary mb-1">
          General Fitness Progress
        </Text>
        <Text className="text-xs text-text-muted mb-3">
          Types of exercises you've been completing (
          {filter === TIME_RANGE_FILTER.THREE_MONTHS
            ? "Last 3 months"
            : filter === TIME_RANGE_FILTER.ONE_MONTH
              ? "Last 1 month"
              : "Last 1 week"}
          )
        </Text>
      </View>

      <View className="items-center mb-4">
        <View className="flex-row bg-neutral-light-2 rounded-lg p-1">
          {Object.values(TIME_RANGE_FILTER).map((f) => (
            <TouchableOpacity
              key={f}
              className={`px-3 py-1 rounded-md ${
                filter === f ? "bg-primary" : "bg-transparent"
              }`}
              onPress={() => onChangeFilter(f as any)}
            >
              <Text
                className={`text-xs font-medium ${
                  filter === f ? "text-content-on-primary" : "text-text-muted"
                }`}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View className="bg-surface rounded-2xl p-5">
        <View className="items-center mb-4">
          <PieChart
            data={chartData}
            size={140}
            donut={true}
            innerRadius={35}
            showLabels={false}
          />
        </View>
        <View className="mb-4">
          <Text className="text-sm font-semibold text-text-primary mb-3 text-center">
            Exercise Types
          </Text>
          <View className="flex-row flex-wrap justify-center">
            {legendData.map((item, index) => (
              <View key={index} className="flex-row items-center mx-2 mb-2">
                <View
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: (item as any).color }}
                />
                <Text className="text-xs text-text-primary font-medium">
                  {item.label}
                </Text>
                <Text className="text-xs text-text-muted ml-1">
                  {item.percentage}%
                </Text>
              </View>
            ))}
          </View>
          {metrics.distribution.length > 5 && (
            <Text className="text-xs text-text-muted text-center mt-2">
              "Other" includes {metrics.distribution.length - 5} additional
              exercise types
            </Text>
          )}
        </View>

        <View className="items-center mb-6">
          <Text className="text-lg font-bold text-text-primary">
            {metrics.dominantType || "N/A"}
          </Text>
          <Text className="text-sm text-text-muted">Most Common Type</Text>
        </View>

        <View className="flex-row justify-around pt-4 border-t border-neutral-light-2">
          <View className="items-center">
            <Text className="text-lg font-bold text-text-primary">
              {metrics.totalExercises || 0}
            </Text>
            <Text className="text-xs text-text-muted text-center">
              Exercises
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold text-text-primary">
              {metrics.distribution.length || 0}
            </Text>
            <Text className="text-xs text-text-muted text-center">Types</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold text-text-primary">
              {metrics.distribution.length > 0
                ? Math.round(
                    metrics.distribution.reduce(
                      (sum, item) => sum + item.completedWorkouts,
                      0
                    ) / metrics.distribution.length
                  )
                : 0}
            </Text>
            <Text className="text-xs text-text-muted text-center">
              Avg Workouts
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default WorkoutTypeDistributionSection;
