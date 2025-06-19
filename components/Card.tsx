import React from "react";
import { View, StyleSheet, ViewProps, ViewStyle } from "react-native";

interface CardProps extends ViewProps {
  variant?: "default" | "outlined" | "flat";
  style?: ViewStyle;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({
  variant = "default",
  style,
  children,
  ...rest
}) => {
  return (
    <View style={[styles.card, styles[`${variant}Card`], style]} {...rest}>
      {children}
    </View>
  );
};

// Card content component for consistent padding
export const CardContent: React.FC<{
  style?: ViewStyle;
  children: React.ReactNode;
}> = ({ style, children }) => {
  return <View style={[styles.cardContent, style]}>{children}</View>;
};

// Card header component
export const CardHeader: React.FC<{
  style?: ViewStyle;
  children: React.ReactNode;
}> = ({ style, children }) => {
  return <View style={[styles.cardHeader, style]}>{children}</View>;
};

// Card footer component
export const CardFooter: React.FC<{
  style?: ViewStyle;
  children: React.ReactNode;
}> = ({ style, children }) => {
  return <View style={[styles.cardFooter, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: "hidden",
  },
  defaultCard: {
    backgroundColor: "white",
    shadowColor: "shadow",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  outlinedCard: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "neutral-medium-1",
  },
  flatCard: {
    backgroundColor: "white",
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "neutral-light-4",
  },
  cardFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "neutral-light-4",
  },
});

export default Card;
