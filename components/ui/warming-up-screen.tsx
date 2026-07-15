import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef } from "react";
import { Animated, Easing,Image, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { images } from "@/assets";
import { useThemeColors } from "@/lib/theme";

interface WarmingUpScreenProps {
  onComplete?: () => void;
  duration?: number;
}

export default function WarmingUpScreen({
  onComplete,
  duration = 8000,
}: WarmingUpScreenProps) {
  const colors = useThemeColors();
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: 85,
      duration,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    }).start();
  }, [duration]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />

      {/* Header — brand lockup, left-aligned */}
      <View style={{ paddingTop: 14, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Image
            source={images.logoDark}
            style={{ width: 24, height: 22 }}
            resizeMode="contain"
          />
          <Text
            style={{
              fontSize: 17,
              fontWeight: "600",
              letterSpacing: -0.17,
              color: colors.text.primary,
            }}
          >
            MastersFit
          </Text>
        </View>
      </View>

      {/* Body */}
      <View
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 8,
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            letterSpacing: -0.56,
            lineHeight: 32.5,
            color: colors.text.primary,
            marginTop: 6,
          }}
        >
          Warming up
        </Text>
        <Text
          style={{
            fontSize: 15,
            lineHeight: 22.5,
            color: colors.text.muted,
            marginTop: 7,
          }}
        >
          Getting your dashboard ready...
        </Text>

        {/* Progress bar */}
        <View
          style={{
            marginTop: 30,
            height: 5,
            borderRadius: 9999,
            backgroundColor: colors.neutral.light[2],
            overflow: "hidden",
          }}
        >
          <Animated.View
            style={{
              height: "100%",
              borderRadius: 9999,
              backgroundColor: colors.brand.primary,
              width: fillAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
              }),
            }}
          />
        </View>

        {/* Logo mark in black tile */}
        <View style={{ marginTop: 75, alignItems: "center" }}>
          <View
            style={{
              width: 125,
              height: 125,
              borderRadius: 20,
              backgroundColor: colors.brand.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Image
              source={images.logo}
              style={{ width: 80, height: 75 }}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
