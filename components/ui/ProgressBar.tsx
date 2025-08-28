import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '@/lib/theme';

interface ProgressBarProps {
  progress: number;
  hasError?: boolean;
  size?: 'small' | 'medium' | 'large';
  showPercentage?: boolean;
  className?: string;
}

export default function ProgressBar({ 
  progress, 
  hasError = false, 
  size = 'medium',
  showPercentage = true,
  className = ''
}: ProgressBarProps) {
  const getProgressBarColor = () => {
    if (hasError) return "#ef4444"; // red-500
    return colors.brand.primary;
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return { height: 'h-2', width: 'w-full', textSize: 'text-xs' };
      case 'medium': 
        return { height: 'h-4', width: 'w-full', textSize: 'text-sm' };
      case 'large':
        return { height: 'h-6', width: 'w-80', textSize: 'text-base' };
      default:
        return { height: 'h-4', width: 'w-full', textSize: 'text-sm' };
    }
  };

  const sizeConfig = getSizeConfig();

  return (
    <View className={className}>
      <View className={`bg-neutral-light-2 ${sizeConfig.height} rounded-full overflow-hidden shadow-md ${sizeConfig.width}`}>
        <View
          className={`${sizeConfig.height} rounded-full transition-all duration-300 ease-out`}
          style={{
            width: `${Math.max(0, Math.min(100, progress))}%`,
            backgroundColor: getProgressBarColor(),
            shadowColor: getProgressBarColor(),
            shadowOpacity: 0.3,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
          }}
        />
      </View>
      
      {showPercentage && (
        <Text className={`${sizeConfig.textSize} text-text-primary text-center mt-2 font-semibold`}>
          {Math.round(Math.max(0, Math.min(100, progress)))}%
        </Text>
      )}
    </View>
  );
}