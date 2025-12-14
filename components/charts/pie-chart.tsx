import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";

import { colors } from "../../lib/theme";

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
      <View className="items-center py-3" style={{ height: size }}>
        <Text className="text-center text-text-muted text-xs py-5">
          No data available
        </Text>
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

    // Special handling for single data point (full circle)
    if (data.length === 1 || percentage >= 99.9) {
      if (donut && calculatedInnerRadius > 0) {
        // Full donut circle
        return (
          <G key={`slice-${index}`}>
            <Circle
              cx={center}
              cy={center}
              r={radius}
              fill={color}
              stroke={colors.background}
              strokeWidth="1"
            />
            <Circle
              cx={center}
              cy={center}
              r={calculatedInnerRadius}
              fill={colors.background}
            />
          </G>
        );
      } else {
        // Full pie circle
        return (
          <Circle
            key={`slice-${index}`}
            cx={center}
            cy={center}
            r={radius}
            fill={color}
            stroke={colors.background}
            strokeWidth="1"
          />
        );
      }
    }

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
    <View className="items-center py-3">
      {/* Chart and Legend Container */}
      <View className="items-center w-full">
        {/* Pie/Donut Chart */}
        <View className="items-center justify-center mb-4">
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <G>{slices}</G>
          </Svg>
        </View>

        {/* Legend */}
        {showLabels && (
          <View className="flex-row justify-around w-full px-2">
            {data.map((item, index) => {
              const percentage = total > 0 ? (item.value / total) * 100 : 0;

              return (
                <View key={index} className="items-center flex-1 px-1">
                  <View
                    className="size-2.5 rounded-full mb-1"
                    style={{ backgroundColor: item.color }}
                  />
                  <Text className="text-xs text-text-muted font-medium text-center mb-0.5">
                    {item.label}
                  </Text>
                  {showPercentages && (
                    <Text className="text-xs text-text-primary font-semibold text-center">
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
