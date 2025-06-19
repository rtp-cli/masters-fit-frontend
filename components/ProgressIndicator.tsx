import React from "react";
import { View } from "react-native";
import { colors } from "../lib/theme";

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export default function ProgressIndicator({
  currentStep,
  totalSteps,
  className = "",
}: ProgressIndicatorProps) {
  return (
    <View className={`flex-row ${className}`}>
      {Array.from({ length: totalSteps }, (_, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <View
            key={index}
            className={`
              flex-1 h-2 rounded-sm
               ${index > 0 ? "ml-0.5" : ""}
            `}
            style={{
              backgroundColor: isCompleted
                ? colors.brand.primary
                : isCurrent
                ? colors.brand.dark[1]
                : colors.neutral.medium[1],
            }}
          />
        );
      })}
    </View>
  );
}
