import React from "react";
import { View, Text } from "react-native";

interface StepHeaderProps {
  currentStep: number;
  totalSteps: number;
  title: string;
  description: string;
  className?: string;
}

export default function StepHeader({
  currentStep,
  totalSteps,
  title,
  description,
  className = "",
}: StepHeaderProps) {
  return (
    <View className={`pb-6 ${className}`}>
      {/* Step Indicator */}
      <View className="flex-row items-center justify-center mb-6">
        {Array.from({ length: totalSteps }, (_, index) => (
          <View key={index} className="flex-row items-center">
            <View
              className={`w-3 h-3 rounded-full ${
                index <= currentStep ? "bg-primary" : "bg-neutral-medium-1"
              }`}
            />
            {index < totalSteps - 1 && (
              <View
                className={`w-8 h-0.5 mx-2 ${
                  index < currentStep ? "bg-primary" : "bg-neutral-medium-1"
                }`}
              />
            )}
          </View>
        ))}
      </View>

      {/* Step Info */}
      <View className="items-center mb-4">
        <Text className="text-sm text-text-muted mb-2">
          Step {currentStep + 1} of {totalSteps}
        </Text>
        <Text className="text-2xl font-bold text-text-primary text-center mb-2">
          {title}
        </Text>
        <Text className="text-base text-text-secondary text-center leading-6 px-4">
          {description}
        </Text>
      </View>
    </View>
  );
}
