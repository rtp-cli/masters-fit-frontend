import React from 'react';
import { View, ViewProps } from 'react-native';

interface SkeletonLoaderProps extends ViewProps {
  width?: number | string;
  height?: number | string;
  variant?: 'text' | 'circular' | 'rectangular';
  animate?: boolean;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 16,
  variant = 'rectangular',
  animate = true,
  style,
  ...props
}) => {
  const getBorderRadius = () => {
    switch (variant) {
      case 'circular':
        return typeof height === 'number' ? height / 2 : 9999;
      case 'text':
        return 4;
      default:
        return 8;
    }
  };

  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: '#E5E5E5',
          borderRadius: getBorderRadius(),
        },
        animate && { opacity: 0.7 },
        style,
      ]}
      className={animate ? 'animate-pulse' : ''}
      {...props}
    />
  );
};