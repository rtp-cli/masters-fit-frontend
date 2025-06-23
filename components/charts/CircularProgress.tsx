import React from "react";
import { View, Text } from "react-native";
import { Animated } from "react-native";
import { colors } from "../../lib/theme";

interface CircularProgressProps {
  size: number;
  strokeWidth: number;
  percentage: number;
  color: string;
  backgroundColor?: string;
  children?: React.ReactNode;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  size,
  strokeWidth,
  percentage,
  color,
  backgroundColor = colors.neutral.medium[1],
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (circumference * percentage) / 100;

  return (
    <View
      className="items-center justify-center relative"
      style={{ width: size, height: size }}
    >
      <View className="absolute" style={{ width: size, height: size }}>
        {/* Background circle */}
        <View
          className="absolute bg-transparent"
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: backgroundColor,
          }}
        />
        {/* Progress circle */}
        <View
          className="absolute bg-transparent"
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: color,
            borderTopColor: "transparent",
            borderRightColor: "transparent",
            borderBottomColor: "transparent",
            transform: [{ rotate: "-90deg" }],
          }}
        >
          <View
            className="absolute top-0 left-0"
            style={{
              width: size - strokeWidth * 2,
              height: size - strokeWidth * 2,
              borderRadius: (size - strokeWidth * 2) / 2,
              backgroundColor: colors.neutral.light[1],
            }}
          />
        </View>
      </View>
      {children && (
        <View className="absolute items-center justify-center">{children}</View>
      )}
    </View>
  );
};

// Simple approximation using border and transform
export const SimpleCircularProgress: React.FC<CircularProgressProps> = ({
  size,
  strokeWidth,
  percentage,
  color,
  backgroundColor = colors.neutral.medium[1],
  children,
}) => {
  return (
    <View
      className="items-center justify-center relative"
      style={{ width: size, height: size }}
    >
      {/* Background circle */}
      <View
        className="absolute bg-transparent"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: backgroundColor,
        }}
      />

      {/* Progress indicator using a colored arc approximation */}
      <View
        className="absolute bg-transparent"
        style={{
          width: size * 0.8,
          height: size * 0.8,
          borderRadius: (size * 0.8) / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          borderTopColor: percentage > 12.5 ? color : backgroundColor,
          borderRightColor: percentage > 37.5 ? color : backgroundColor,
          borderBottomColor: percentage > 62.5 ? color : backgroundColor,
          borderLeftColor: percentage > 87.5 ? color : backgroundColor,
          transform: [{ rotate: "-90deg" }],
        }}
      />

      {children && (
        <View className="absolute items-center justify-center">{children}</View>
      )}
    </View>
  );
};
