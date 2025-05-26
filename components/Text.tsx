import React from 'react';
import { Text as RNText, StyleSheet, TextProps as RNTextProps, TextStyle } from 'react-native';

type TextVariant = 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'h4' 
  | 'title' 
  | 'subtitle' 
  | 'body' 
  | 'bodySmall' 
  | 'label' 
  | 'caption';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: string;
  center?: boolean;
  style?: TextStyle;
  children: React.ReactNode;
}

/**
 * Text component with typography variants
 */
const Text: React.FC<TextProps> = ({
  variant = 'body',
  weight,
  color,
  center = false,
  style,
  children,
  ...rest
}) => {
  return (
    <RNText
      style={[
        styles[variant],
        weight && styles[`weight${weight.charAt(0).toUpperCase() + weight.slice(1)}`],
        color && { color },
        center && styles.center,
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  // Typography variants
  h1: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 40,
    color: '#111827',
  },
  h2: {
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 36,
    color: '#111827',
  },
  h3: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 32,
    color: '#111827',
  },
  h4: {
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 28,
    color: '#111827',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    color: '#4b5563',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1f2937',
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1f2937',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    color: '#6b7280',
  },
  
  // Font weights
  weightNormal: {
    fontWeight: 'normal',
  },
  weightMedium: {
    fontWeight: '500',
  },
  weightSemibold: {
    fontWeight: '600',
  },
  weightBold: {
    fontWeight: 'bold',
  },
  
  // Alignment
  center: {
    textAlign: 'center',
  },
});

export default Text;