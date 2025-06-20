import React from 'react';
import { colors } from "../lib/theme";
import { View, StyleSheet, ViewProps, ViewStyle } from 'react-native';

interface CardProps extends ViewProps {
  variant?: 'default' | 'outlined' | 'flat';
  style?: ViewStyle;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({
  variant = 'default',
  style,
  children,
  ...rest
}) => {
  return (
    <View
      style={[styles.card, styles[`${variant}Card`], style]}
      {...rest}
    >
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
    overflow: 'hidden',
  },
  defaultCard: {
    backgroundColor: colors.background,
    shadowColor: colors.neutral.dark[1],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  outlinedCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.neutral.light[2],
  },
  flatCard: {
    backgroundColor: colors.background,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.light[1],
  },
  cardFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.light[1],
  },
});

export default Card;