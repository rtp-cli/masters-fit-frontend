import React from "react";
import { View } from "react-native";

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
              ${
                isCompleted
                  ? "bg-primary"
                  : isCurrent
                  ? "bg-brand-dark-1"
                  : "bg-neutral-medium-1"
              }
            `}
          />
        );
      })}
    </View>
  );
}
