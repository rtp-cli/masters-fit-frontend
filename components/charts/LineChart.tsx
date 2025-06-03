import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export interface LineChartData {
  label: string;
  value: number;
  date?: string;
}

interface LineChartProps {
  data: LineChartData[];
  height?: number;
  color?: string;
  showValues?: boolean;
  showLabels?: boolean;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  height = 200,
  color = "#4f46e5",
  showValues = true,
  showLabels = true,
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map((item) => item.value));
  const minValue = Math.min(...data.map((item) => item.value));
  // Handle single data point case - create a small range for visualization
  const valueRange =
    data.length === 1 ? maxValue * 0.2 || 1 : maxValue - minValue || 1;
  const chartHeight = height - 60; // Leave space for labels

  return (
    <View style={[styles.container, { height: height + 30 }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chartContainer}
      >
        {data.map((item, index) => {
          // Calculate point height relative to min/max values
          let pointHeight;
          if (data.length === 1) {
            // For single data point, position it in the middle-upper area
            pointHeight = chartHeight * 0.7;
          } else {
            pointHeight = ((item.value - minValue) / valueRange) * chartHeight;
          }
          const pointY = chartHeight - pointHeight;

          return (
            <View key={index} style={styles.pointContainer}>
              <View style={styles.pointWrapper}>
                {showValues && (
                  <Text style={styles.valueText}>
                    {item.value.toLocaleString()}
                  </Text>
                )}

                {/* Vertical line to represent the point */}
                <View style={styles.verticalLine}>
                  <View
                    style={[
                      styles.point,
                      {
                        backgroundColor: color,
                        marginTop: pointY,
                      },
                    ]}
                  />
                </View>

                {/* Connect to next point with a line (if not last point) */}
                {index < data.length - 1 && (
                  <View
                    style={[styles.connectionLine, { backgroundColor: color }]}
                  />
                )}
              </View>

              {showLabels && (
                <Text style={styles.labelText} numberOfLines={1}>
                  {item.label}
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Y-axis reference */}
      <View style={styles.yAxisContainer}>
        <Text style={styles.yAxisText}>{maxValue.toLocaleString()}</Text>
        {data.length > 1 && (
          <Text style={styles.yAxisText}>{minValue.toLocaleString()}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderRadius: 8,
  },
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 15,
  },
  pointContainer: {
    alignItems: "center",
    marginHorizontal: 15,
    minWidth: 60,
  },
  pointWrapper: {
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
    paddingBottom: 25,
    position: "relative",
  },
  verticalLine: {
    height: "100%",
    width: 2,
    backgroundColor: "#e5e7eb",
    position: "relative",
    justifyContent: "flex-end",
  },
  point: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: "absolute",
    left: -3,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  connectionLine: {
    position: "absolute",
    height: 2,
    width: 30,
    left: 8,
    top: "50%",
  },
  valueText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
    position: "absolute",
    top: -20,
  },
  labelText: {
    fontSize: 11,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
    width: 60,
  },
  noDataText: {
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 16,
    paddingVertical: 50,
  },
  yAxisContainer: {
    position: "absolute",
    left: 5,
    top: 10,
    height: "100%",
    justifyContent: "space-between",
    paddingVertical: 20,
  },
  yAxisText: {
    fontSize: 10,
    color: "#6b7280",
    textAlign: "left",
  },
});
