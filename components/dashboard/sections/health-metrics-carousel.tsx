import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import { colors } from "../../../lib/theme";

type HealthMetricsProps = {
  stepsCount: number | null;
  nutritionCaloriesConsumed: number | null;
  caloriesBurned: number | null;
  maxHeartRate: number | null;
  healthReady: boolean;
  healthLoading: boolean;
  onConnect: () => void;
};

type HealthMetricItemProps = {
  value: number | null;
  iconName: keyof typeof Ionicons.glyphMap;
  unit?: string;
};

const HealthMetricItem: React.FC<HealthMetricItemProps> = ({
  value,
  iconName,
  unit,
}) => (
  <View className="items-center">
    <View
      className="size-11 rounded-full items-center justify-center"
      style={{ backgroundColor: colors.brand.light[1] }}
    >
      <Ionicons name={iconName} size={20} color={colors.brand.dark[2]} />
    </View>
    <Text className="text-sm font-semibold text-text-primary mt-1.5">
      {value}
      {unit ? ` ${unit}` : ""}
    </Text>
  </View>
);

const HealthMetricsCarousel: React.FC<HealthMetricsProps> = ({
  stepsCount,
  nutritionCaloriesConsumed,
  caloriesBurned,
  maxHeartRate,
  healthReady,
  healthLoading,
  onConnect,
}) => {
  const allMetrics: (HealthMetricItemProps & { key: string })[] = [
    {
      key: "steps",
      value: stepsCount,
      iconName: "footsteps",
      unit: "steps",
    },
    {
      key: "heart-rate",
      value: maxHeartRate,
      iconName: "heart",
      unit: "bpm",
    },
    {
      key: "calories-consumed",
      value: nutritionCaloriesConsumed,
      iconName: "restaurant",
      unit: "kcal",
    },
    {
      key: "calories-burned",
      value: caloriesBurned,
      iconName: "flame",
      unit: "kcal",
    },
  ];

  const visibleMetrics = allMetrics.filter((metric) => metric.value !== null);

  if (!healthReady) {
    return (
      <View className="px-4 mb-8">
        <TouchableOpacity
          className="bg-secondary rounded-xl py-3 px-4 flex-row items-center justify-center"
          onPress={onConnect}
          disabled={healthLoading}
        >
          {healthLoading ? (
            <ActivityIndicator size="small" color={colors.neutral.white} />
          ) : (
            <>
              <Ionicons name="fitness" size={18} color={colors.neutral.white} />
              <Text className="text-white font-semibold text-sm ml-2">
                Connect Health
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  if (visibleMetrics.length === 0) {
    return null;
  }

  return (
    <View className="px-4 mb-8">
      <View className="flex-row justify-around items-center">
        {visibleMetrics.map((metric) => (
          <HealthMetricItem
            key={metric.key}
            value={metric.value}
            iconName={metric.iconName}
            unit={metric.unit}
          />
        ))}
      </View>
    </View>
  );
};

export default HealthMetricsCarousel;
