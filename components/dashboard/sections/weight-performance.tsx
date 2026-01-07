import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { PieChart } from "@/components/charts/pie-chart";
import { useThemeColors } from "../../../lib/theme";
import { WeightAccuracyMetrics } from "@/types/api";
import { TIME_RANGE_FILTER } from "@/constants/global.enum";

type WeightPerformanceSectionProps = {
  filteredWeightAccuracy: WeightAccuracyMetrics | null;
  weightPerformanceFilter: TIME_RANGE_FILTER;
  onChangeFilter: (filter: TIME_RANGE_FILTER) => void;
};

const WeightPerformanceSection: React.FC<WeightPerformanceSectionProps> = ({
  filteredWeightAccuracy,
  weightPerformanceFilter,
  onChangeFilter,
}) => {
  const colors = useThemeColors();
  if (!filteredWeightAccuracy) return null;

  const hasData =
    filteredWeightAccuracy.hasExerciseData &&
    filteredWeightAccuracy.totalSets > 0;

  return (
    <View className="px-4 mb-6">
      <View className="px-4">
        <Text className="text-base font-semibold text-text-primary mb-1">
          Weight Performance
        </Text>
        <Text className="text-xs text-text-muted mb-3">
          How you're progressing with your planned weights (
          {weightPerformanceFilter === TIME_RANGE_FILTER.THREE_MONTHS
            ? "Last 3 months"
            : weightPerformanceFilter === TIME_RANGE_FILTER.ONE_MONTH
              ? "Last 1 month"
              : "Last 1 week"}
          )
        </Text>
      </View>

      <View className="items-center mb-4">
        <View className="flex-row bg-neutral-light-2 rounded-lg p-1">
          {Object.values(TIME_RANGE_FILTER).map((filter) => (
            <TouchableOpacity
              key={filter}
              className={`px-3 py-1 rounded-md ${
                weightPerformanceFilter === filter
                  ? "bg-primary"
                  : "bg-transparent"
              }`}
              onPress={() => onChangeFilter(filter as any)}
            >
              <Text
                className={`text-xs font-medium ${
                  weightPerformanceFilter === filter
                    ? "text-text-primary"
                    : "text-text-muted"
                }`}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View className="bg-white rounded-2xl p-5">
        {hasData ? (
          <>
            <View className="items-center mb-6">
              <PieChart
                data={
                  filteredWeightAccuracy.chartData &&
                  filteredWeightAccuracy.chartData.length > 0
                    ? filteredWeightAccuracy.chartData
                    : [
                        {
                          label: "As Planned",
                          value: 35,
                          color: colors.brand.medium[1],
                          count: 35,
                        },
                        {
                          label: "Progressed",
                          value: 40,
                          color: colors.brand.primary,
                          count: 40,
                        },
                        {
                          label: "Adapted",
                          value: 25,
                          color: colors.brand.dark[1],
                          count: 25,
                        },
                      ]
                }
                size={160}
              />
            </View>
            <View className="flex-row justify-around pt-4 border-t border-neutral-light-2">
              <View className="items-center">
                <Text className="text-lg font-bold text-brand-medium-1">
                  {filteredWeightAccuracy.exactMatches || 0}
                </Text>
                <Text className="text-xs text-text-muted text-center">
                  As Planned
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-lg font-bold text-primary">
                  {filteredWeightAccuracy.higherWeight || 0}
                </Text>
                <Text className="text-xs text-text-muted text-center">
                  Progressed
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-lg font-bold text-brand-dark-1">
                  {filteredWeightAccuracy.lowerWeight || 0}
                </Text>
                <Text className="text-xs text-text-muted text-center">
                  Adapted
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-lg font-bold text-text-primary">
                  {filteredWeightAccuracy.totalSets || 0}
                </Text>
                <Text className="text-xs text-text-muted text-center">
                  Total Sets
                </Text>
              </View>
            </View>
          </>
        ) : (
          <View className="items-center py-8">
            <Text className="text-sm text-text-muted text-center mb-2">
              No weight data available for {weightPerformanceFilter}
            </Text>
            <TouchableOpacity
              onPress={() => onChangeFilter("3M" as any)}
              className="mt-2"
            >
              <Text className="text-sm text-primary font-medium">
                View all data ({TIME_RANGE_FILTER.THREE_MONTHS})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export default WeightPerformanceSection;
