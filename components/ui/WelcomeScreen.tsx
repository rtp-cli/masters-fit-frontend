import React from "react";
import { View, Text, Image } from "react-native";
import Button from "./Button";

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export default function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  return (
    <View className="flex-1 bg-background px-6">
      <View className="flex-1 justify-center items-center">
        {/* Circular Background with Illustration */}
        <View className="w-80 h-80 bg-brand-light-1 rounded-full justify-center items-center mb-8">
          {/* Phone mockup illustration placeholder */}
          <View className="w-32 h-56 bg-white rounded-2xl border border-neutral-medium-1 justify-center items-center shadow-lg">
            <View className="w-24 h-12 bg-primary rounded-lg mb-4 justify-center items-center">
              <Text className="text-xl font-bold text-secondary">40</Text>
            </View>
            <View className="flex-row space-x-1">
              <View className="w-2 h-2 bg-neutral-medium-2 rounded-full" />
              <View className="w-2 h-2 bg-neutral-medium-2 rounded-full" />
              <View className="w-2 h-2 bg-primary rounded-full" />
              <View className="w-2 h-2 bg-neutral-medium-2 rounded-full" />
            </View>
          </View>

          {/* Character illustrations placeholder */}
          <View className="absolute left-8 top-16 w-16 h-16 bg-brand-medium-1 rounded-full" />
          <View className="absolute right-8 bottom-16 w-16 h-16 bg-brand-medium-2 rounded-full" />
        </View>

        {/* Welcome Text */}
        <View className="items-center mb-8">
          <Text className="text-xl font-bold text-text-primary text-center mb-4">
            Welcome to masterfit!
          </Text>
          <Text className="text-base text-text-secondary text-center leading-6 px-4">
            AI-personalized fitness plans designed specifically for adults 40+
            to help you achieve your fitness goals safely and effectively.
          </Text>
        </View>
      </View>

      {/* Bottom Button */}
      <View className="pb-8">
        <Button
          title="Get Started"
          onPress={onGetStarted}
          variant="primary"
          fullWidth
          className="py-4"
        />
      </View>
    </View>
  );
}
