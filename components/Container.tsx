import React from 'react';
import { View, StyleSheet, ScrollView, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ContainerProps {
  scrollable?: boolean;
  padded?: boolean;
  safeArea?: boolean;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
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
  edges = ['top'],
  style,
  contentContainerStyle,
  children,
}) => {
  const containerStyle = [
    styles.container,
    padded && styles.padded,
    style,
  ];

  // If safeArea is enabled, use SafeAreaView as the base component
  if (safeArea) {
    if (scrollable) {
      return (
        <SafeAreaView edges={edges} style={containerStyle}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              padded && styles.scrollContentPadded,
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
      <SafeAreaView edges={edges} style={containerStyle}>
        {children}
      </SafeAreaView>
    );
  }

  // If safeArea is disabled, use regular View or ScrollView
  if (scrollable) {
    return (
      <View style={containerStyle}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            padded && styles.scrollContentPadded,
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return <View style={containerStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'neutral-light-3',
  },
  padded: {
    paddingHorizontal: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContentPadded: {
    paddingBottom: 40,
  },
});

export default Container;