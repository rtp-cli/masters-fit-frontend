import React from "react";
import { View, Text, StyleSheet } from "react-native";

export interface PieChartData {
  label: string;
  value: number;
  color: string;
  count?: number;
}

interface PieChartProps {
  data: PieChartData[];
  size?: number;
  showLabels?: boolean;
  showPercentages?: boolean;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  size = 120,
  showLabels = true,
  showPercentages = true,
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height: size }]}>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = size / 2 - 10;
  const center = size / 2;

  // Create pie slices using View components
  let currentAngle = 0;
  const slices = data.map((item, index) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const sliceAngle = (item.value / total) * 360;

    const startAngle = currentAngle;
    currentAngle += sliceAngle;

    // For simplicity, we'll use stacked horizontal bars instead of actual pie slices
    // This is more feasible with React Native View components
    return {
      ...item,
      percentage: Math.round(percentage * 10) / 10,
      angle: sliceAngle,
    };
  });

  return (
    <View style={styles.container}>
      {/* Circular representation using stacked bars */}
      <View style={[styles.pieContainer, { width: size, height: size }]}>
        {slices.map((slice, index) => (
          <View key={index} style={styles.sliceContainer}>
            <View
              style={[
                styles.slice,
                {
                  backgroundColor: slice.color,
                  height: 8,
                  width: `${slice.percentage}%`,
                  marginVertical: 2,
                },
              ]}
            />
            {showLabels && (
              <Text style={styles.sliceLabel}>
                {slice.label} {showPercentages && `${slice.percentage}%`}
              </Text>
            )}
          </View>
        ))}
      </View>

      {/* Legend */}
      {showLabels && (
        <View style={styles.legend}>
          {slices.map((slice, index) => (
            <View key={index} style={styles.legendItem}>
              <View
                style={[styles.legendColor, { backgroundColor: slice.color }]}
              />
              <Text style={styles.legendText}>{slice.label}</Text>
              <Text style={styles.legendValue}>{slice.percentage}%</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 10,
  },
  pieContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  sliceContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 4,
  },
  slice: {
    borderRadius: 4,
  },
  sliceLabel: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 2,
  },
  legend: {
    width: "100%",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
    fontSize: 12,
    color: "#374151",
  },
  legendValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  noDataText: {
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 14,
    paddingVertical: 30,
  },
});
