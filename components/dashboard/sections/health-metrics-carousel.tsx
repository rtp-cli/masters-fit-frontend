import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import PagerView from "react-native-pager-view";

import { colors } from "../../../lib/theme";

type HealthMetricsCarouselProps = {
  stepsCount: number | null;
  nutritionCaloriesConsumed: number | null;
  caloriesBurned: number | null;
  maxHeartRate: number | null;
  healthReady: boolean;
  healthLoading: boolean;
  onConnect: () => void;
};

type HealthMetricCardProps = {
  title: string;
  value: string | number | null;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  unit?: string;
};

const HealthMetricCard: React.FC<HealthMetricCardProps> = ({
  title,
  value,
  iconName,
  iconColor,
  unit,
}) => (
  <View className="flex-1 flex-row items-center justify-around bg-white rounded-2xl gap-8 mx-2 my-1">
    <View className="flex-row items-center justify-center">
      <Ionicons name={iconName} size={32} color={iconColor} />
      <Text className="text-lg font-semibold text-text-primary mt-2">
        {title}
      </Text>
    </View>
    <Text className="text-2xl font-bold text-text-secondary mt-1">
      {value !== null ? `${value} ${unit || ""}` : "N/A"}
    </Text>
  </View>
);

const HealthMetricsCarousel: React.FC<HealthMetricsCarouselProps> = ({
  stepsCount,
  nutritionCaloriesConsumed,
  caloriesBurned,
  maxHeartRate,
  healthReady,
  healthLoading,
  onConnect,
}) => {
  const allMetrics: (HealthMetricCardProps & { key: string })[] = [
    {
      key: "steps",
      title: "Steps",
      value: stepsCount,
      iconName: "walk",
      iconColor: colors.brand.primary,
    },
    {
      key: "calories-consumed",
      title: "Calories Consumed",
      value: nutritionCaloriesConsumed,
      iconName: "fast-food",
      iconColor: colors.brand.primary,
      unit: "kcal",
    },
    {
      key: "calories-burned",
      title: "Calories Burned",
      value: caloriesBurned,
      iconName: "flame",
      iconColor: colors.brand.dark[1],
      unit: "kcal",
    },
    {
      key: "heart-rate",
      title: "Max Heart Rate",
      value: maxHeartRate,
      iconName: "heart",
      iconColor: colors.danger,
      unit: "bpm",
    },
  ];

  const visibleMetrics = allMetrics.filter((metric) => metric.value !== null);

  return (
    <View className="px-2 mb-4 relative">
      <GestureHandlerRootView>
        {visibleMetrics.length > 0 ? (
          <PagerView style={{ height: 100 }} initialPage={0}>
            {visibleMetrics.map((metric) => (
              <View key={metric.key}>
                <HealthMetricCard
                  title={metric.title}
                  value={metric.value}
                  iconName={metric.iconName}
                  iconColor={metric.iconColor}
                  unit={metric.unit}
                />
              </View>
            ))}
          </PagerView>
        ) : (
          <View
            style={{ height: 100 }}
            className="items-center justify-center bg-white rounded-2xl mx-2"
          >
            <Text className="text-text-muted">No health data available</Text>
          </View>
        )}
        {!healthReady && (
          <TouchableOpacity
            className="absolute right-3 top-3 bg-secondary rounded-xl px-4 py-2 items-center"
            onPress={onConnect}
            disabled={healthLoading}
          >
            {healthLoading ? (
              <ActivityIndicator size="small" color={colors.neutral.light[1]} />
            ) : (
              <Text className="text-white font-semibold text-sm">
                Connect Health
              </Text>
            )}
          </TouchableOpacity>
        )}
      </GestureHandlerRootView>
    </View>
  );
};

export default HealthMetricsCarousel;
