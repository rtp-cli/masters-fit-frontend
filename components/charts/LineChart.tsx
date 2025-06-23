import React from "react";
import { colors } from "../../lib/theme";
import { View, Text, Dimensions } from "react-native";
import { LineChart as RNLineChart } from "react-native-chart-kit";

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
  color = colors.brand.primary,
  showValues = true,
  showLabels = true,
}) => {
  if (!data || data.length === 0) {
    return (
      <View
        className="items-center bg-background rounded-lg"
        style={{ height }}
      >
        <Text className="text-center text-text-muted text-base py-12">
          No data available
        </Text>
      </View>
    );
  }

  // Transform data for react-native-chart-kit
  const values = data.map((item) => item.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  // Calculate a reasonable baseline (10% below min value, but not below 0)
  const baseline = Math.max(0, Math.floor(minValue * 0.9));

  const chartData = {
    labels: data.map((item) => item.label),
    datasets: [
      {
        data: data.map((item) => item.value),
        color: () => color, // Function that returns color
        strokeWidth: 3, // optional
      },
      // Add invisible baseline dataset for better scaling
      {
        data: data.map(() => baseline),
        color: () => "transparent",
        strokeWidth: 0,
        withDots: false,
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
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: color,
    },
    propsForBackgroundLines: {
      strokeDasharray: "", // solid background lines with no dashes
      stroke: colors.brand.primary,
      strokeWidth: 1,
    },
    formatYLabel: (value: string) => {
      const num = parseFloat(value);
      return num >= 1000 ? `${(num / 1000).toFixed(1)}k` : num.toString();
    },
  };

  // Handle single data point case by duplicating it
  if (data.length === 1) {
    chartData.labels = [data[0].label, data[0].label];
    chartData.datasets[0].data = [data[0].value, data[0].value];
  }

  const screenWidth = Dimensions.get("window").width;
  const chartWidth = Math.max(screenWidth - 40, 300); // Ensure minimum width

  return (
    <View className="items-center bg-background rounded-lg">
      <RNLineChart
        data={chartData}
        width={chartWidth}
        height={height}
        chartConfig={chartConfig}
        bezier
        style={{
          marginVertical: 8,
          borderRadius: 16,
        }}
        withHorizontalLabels={true}
        withVerticalLabels={showLabels}
        withDots={true}
        withShadow={false}
        withScrollableDot={false}
        fromZero={false}
        segments={4}
        yAxisInterval={1}
      />
    </View>
  );
};
