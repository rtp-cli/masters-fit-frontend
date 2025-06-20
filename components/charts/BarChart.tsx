import React from "react";
import { colors } from "../../lib/theme";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { BarChart as RNBarChart } from "react-native-chart-kit";

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
  color = colors.brand.primary,
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  // Transform data for react-native-chart-kit
  const chartData = {
    labels: data.map((item) => item.label),
    datasets: [
      {
        data: data.map((item) => item.value),
        color: () => color, // Function that returns color
      },
    ],
  };

  const chartConfig = {
    backgroundColor: colors.background,
    backgroundGradientFrom: colors.background,
    backgroundGradientTo: colors.background,
    decimalPlaces: 0, // optional, defaults to 2dp
    color: (opacity = 1) =>
      color
        .replace(/rgb\(([^)]+)\)/, `rgba($1, ${opacity})`)
        .replace(
          /rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/,
          `rgba($1,$2,$3, ${opacity})`
        ) || `rgba(79, 70, 229, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForBackgroundLines: {
      strokeDasharray: "", // solid background lines with no dashes
      stroke: colors.brand.primary,
      strokeWidth: 1,
    },
  };

  const screenWidth = Dimensions.get("window").width;
  const chartWidth = Math.max(screenWidth - 40, 300); // Ensure minimum width

  return (
    <View style={styles.container}>
      <RNBarChart
        data={chartData}
        width={chartWidth}
        height={height}
        chartConfig={chartConfig}
        style={styles.chart}
        showValuesOnTopOfBars={showValues}
        withHorizontalLabels={true}
        withVerticalLabels={true}
        fromZero={true}
        segments={4}
        yAxisLabel=""
        yAxisSuffix=""
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 10,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataText: {
    textAlign: "center",
    color: colors.text.muted,
    fontSize: 16,
    paddingVertical: 50,
  },
});
