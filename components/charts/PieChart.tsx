import React from "react";
import { colors } from "../../lib/theme";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Path, G } from "react-native-svg";

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
  donut?: boolean;
  innerRadius?: number;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  size = 120,
  showLabels = true,
  showPercentages = true,
  donut = false,
  innerRadius,
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height: size }]}>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  const radius = size / 2 - 10;
  const center = size / 2;
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Calculate inner radius for donut effect
  const calculatedInnerRadius = donut
    ? innerRadius !== undefined
      ? innerRadius
      : radius * 0.5
    : 0;

  // Create pie slices
  const createPieSlice = (
    percentage: number,
    startPercentage: number,
    color: string,
    index: number
  ) => {
    if (percentage === 0) return null;

    const angle = (percentage / 100) * 360;
    const startAngle = (startPercentage / 100) * 360 - 90;
    const endAngle = startAngle + angle;

    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startAngleRad);
    const y1 = center + radius * Math.sin(startAngleRad);
    const x2 = center + radius * Math.cos(endAngleRad);
    const y2 = center + radius * Math.sin(endAngleRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    if (donut && calculatedInnerRadius > 0) {
      // Donut chart path
      const x1Inner = center + calculatedInnerRadius * Math.cos(startAngleRad);
      const y1Inner = center + calculatedInnerRadius * Math.sin(startAngleRad);
      const x2Inner = center + calculatedInnerRadius * Math.cos(endAngleRad);
      const y2Inner = center + calculatedInnerRadius * Math.sin(endAngleRad);

      const pathData = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        `L ${x2Inner} ${y2Inner}`,
        `A ${calculatedInnerRadius} ${calculatedInnerRadius} 0 ${largeArcFlag} 0 ${x1Inner} ${y1Inner}`,
        "Z",
      ].join(" ");

      return (
        <Path
          key={`slice-${index}`}
          d={pathData}
          fill={color}
          stroke={colors.background}
          strokeWidth="1"
        />
      );
    } else {
      // Regular pie chart path
      const pathData = [
        `M ${center} ${center}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        `L ${center} ${center}`,
        "Z",
      ].join(" ");

      return (
        <Path
          key={`slice-${index}`}
          d={pathData}
          fill={color}
          stroke={colors.background}
          strokeWidth="1"
        />
      );
    }
  };

  // Calculate percentages and create slices
  let cumulativePercentage = 0;
  const slices = data
    .map((item, index) => {
      const percentage = (item.value / total) * 100;
      const slice = createPieSlice(
        percentage,
        cumulativePercentage,
        item.color,
        index
      );
      cumulativePercentage += percentage;
      return slice;
    })
    .filter(Boolean);

  return (
    <View style={styles.container}>
      {/* Chart and Legend Container */}
      <View style={styles.chartWrapper}>
        {/* Pie/Donut Chart */}
        <View style={styles.chartContainer}>
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <G>{slices}</G>
          </Svg>
        </View>

        {/* Legend */}
        {showLabels && (
          <View style={styles.legend}>
            {data.map((item, index) => {
              const percentage = total > 0 ? (item.value / total) * 100 : 0;

              return (
                <View key={index} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendColor,
                      { backgroundColor: item.color },
                    ]}
                  />
                  <Text style={styles.legendText}>{item.label}</Text>
                  {showPercentages && (
                    <Text style={styles.legendPercentage}>
                      {percentage.toFixed(1)}%
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 12,
  },
  chartWrapper: {
    alignItems: "center",
    width: "100%",
  },
  chartContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 8,
  },
  legendItem: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 4,
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
  },
  legendText: {
    fontSize: 11,
    color: colors.text.muted,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 2,
  },
  legendPercentage: {
    fontSize: 12,
    color: colors.text.primary,
    fontWeight: "600",
    textAlign: "center",
  },
  noDataText: {
    textAlign: "center",
    color: colors.text.muted,
    fontSize: 12,
    paddingVertical: 20,
  },
});
