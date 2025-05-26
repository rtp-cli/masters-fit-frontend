import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacityProps,
  ViewStyle,
  TextStyle 
} from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  disabled,
  leftIcon,
  rightIcon,
  children,
  ...rest
}) => {
  // Determine styles based on variant, size, and other props
  const buttonStyles = [
    styles.button,
    styles[`${variant}Button`],
    styles[`${size}Button`],
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    (disabled || loading) && styles[`${variant}Disabled`],
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'primary' ? '#ffffff' : '#4f46e5'} 
        />
      ) : (
        <>
          {leftIcon && <React.Fragment>{leftIcon}</React.Fragment>}
          <Text style={textStyles}>{children}</Text>
          {rightIcon && <React.Fragment>{rightIcon}</React.Fragment>}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  
  // Variant styles
  primaryButton: {
    backgroundColor: '#4f46e5',
  },
  secondaryButton: {
    backgroundColor: '#e5e7eb',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4f46e5',
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  destructiveButton: {
    backgroundColor: '#ef4444',
  },
  
  // Variant text styles
  primaryText: {
    color: '#ffffff',
  },
  secondaryText: {
    color: '#1f2937',
  },
  outlineText: {
    color: '#4f46e5',
  },
  ghostText: {
    color: '#4f46e5',
  },
  destructiveText: {
    color: '#ffffff',
  },
  
  // Variant disabled styles
  primaryDisabled: {
    backgroundColor: '#4f46e5',
  },
  secondaryDisabled: {
    backgroundColor: '#e5e7eb',
  },
  outlineDisabled: {
    borderColor: '#9ca3af',
  },
  ghostDisabled: {},
  destructiveDisabled: {
    backgroundColor: '#ef4444',
  },
  
  // Size styles
  smButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mdButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  lgButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  
  // Size text styles
  smText: {
    fontSize: 14,
  },
  mdText: {
    fontSize: 16,
  },
  lgText: {
    fontSize: 18,
  },
});

export default Button;