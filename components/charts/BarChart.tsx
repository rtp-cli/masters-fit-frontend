import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: DataPoint[];
  height?: number;
  showValues?: boolean;
  maxValue?: number;
  color?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 200,
  showValues = true,
  maxValue,
  color = "#4f46e5",
}) => {
  // Safely calculate max value with fallbacks
  const dataMaxValue =
    data.length > 0 ? Math.max(...data.map((d) => d.value)) : 0;
  const calculatedMaxValue = maxValue || dataMaxValue;

  // Ensure we have a valid max value to prevent division by zero
  const safeMaxValue = calculatedMaxValue > 0 ? calculatedMaxValue : 1;
  const barMaxHeight = height - 40; // Leave space for labels

  const renderBar = (item: DataPoint, index: number) => {
    // Safely calculate bar height with proper fallbacks
    const rawBarHeight = (item.value / safeMaxValue) * barMaxHeight;
    const barHeight =
      isNaN(rawBarHeight) || !isFinite(rawBarHeight)
        ? 0
        : Math.max(rawBarHeight, 0);
    const barColor = item.color || color;

    return (
      <View key={index} style={styles.barContainer}>
        <View style={styles.barWrapper}>
          {showValues && (
            <Text style={styles.valueText}>
              {typeof item.value === "number"
                ? item.value.toFixed(0)
                : item.value}
            </Text>
          )}
          <View
            style={[
              styles.bar,
              {
                height: barHeight,
                backgroundColor: barColor,
              },
            ]}
          />
        </View>
        <Text style={styles.labelText} numberOfLines={2}>
          {item.label}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { height: height + 30 }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chartContainer}
      >
        {data.map((item, index) => renderBar(item, index))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
  },
  barContainer: {
    alignItems: "center",
    marginHorizontal: 8,
    minWidth: 60,
  },
  barWrapper: {
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
    paddingBottom: 25,
  },
  bar: {
    width: 24,
    borderRadius: 4,
    minHeight: 4,
  },
  valueText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  labelText: {
    fontSize: 11,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
    width: 60,
  },
});
