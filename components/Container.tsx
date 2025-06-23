import React from "react";
import { View, ScrollView, StyleProp, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ContainerProps {
  scrollable?: boolean;
  padded?: boolean;
  safeArea?: boolean;
  edges?: ("top" | "right" | "bottom" | "left")[];
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Container component for page layouts
 * Provides a consistent container with options for safe area, scrolling, etc.
 */
const Container: React.FC<ContainerProps> = ({
  scrollable = false,
  padded = true,
  safeArea = true,
  edges = ["top"],
  style,
  contentContainerStyle,
  children,
}) => {
  // Base classes
  const baseClasses = "flex-1 bg-white";
  const paddedClasses = "px-5";

  // Style for scroll content padding
  const scrollContentPaddedStyle = { paddingBottom: 40 };

  const containerClassName = [baseClasses, padded && paddedClasses]
    .filter(Boolean)
    .join(" ");

  // If safeArea is enabled, use SafeAreaView as the base component
  if (safeArea) {
    if (scrollable) {
      return (
        <SafeAreaView
          edges={edges}
          className={containerClassName}
          style={style}
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={[
              padded && scrollContentPaddedStyle,
              contentContainerStyle,
            ]}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView edges={edges} className={containerClassName} style={style}>
        {children}
      </SafeAreaView>
    );
  }

  // If safeArea is disabled, use regular View or ScrollView
  if (scrollable) {
    return (
      <View className={containerClassName} style={style}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={[
            padded && scrollContentPaddedStyle,
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View className={containerClassName} style={style}>
      {children}
    </View>
  );
};

export default Container;
