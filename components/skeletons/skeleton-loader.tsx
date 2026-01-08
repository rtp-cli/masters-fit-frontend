import React, { useEffect, useRef } from "react";
import { Animated, type DimensionValue, type ViewProps } from "react-native";
import { useThemeColors } from "@/lib/theme";

interface SkeletonLoaderProps extends ViewProps {
  width?: DimensionValue;
  height?: DimensionValue;
  variant?: "text" | "circular" | "rectangular";
  animate?: boolean;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = "100%",
  height = 16,
  variant = "rectangular",
  animate = true,
  style,
  ...props
}) => {
  const colors = useThemeColors();
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (animate) {
      const pulse = () => {
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start(() => pulse());
      };
      pulse();
    }
  }, [animate, pulseAnim]);

  const getBorderRadius = () => {
    switch (variant) {
      case "circular":
        return typeof height === "number" ? height / 2 : 9999;
      case "text":
        return 4;
      default:
        return 8;
    }
  };

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: colors.neutral.medium[1],
          borderRadius: getBorderRadius(),
          opacity: animate ? pulseAnim : 1,
        },
        style,
      ]}
      {...props}
    />
  );
};
