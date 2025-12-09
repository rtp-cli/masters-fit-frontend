import React from "react";
import { View, ViewProps, ViewStyle } from "react-native";

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
  // Base classes
  const baseClasses = "rounded-md overflow-hidden";

  // Variant classes
  const variantClasses = {
    default: "bg-white",
    outlined: "bg-white border border-neutral-light-2",
    flat: "bg-white",
  };

  const cardClassName = [baseClasses, variantClasses[variant]]
    .filter(Boolean)
    .join(" ");

  return (
    <View className={cardClassName} style={style} {...rest}>
      {children}
    </View>
  );
};

// Card content component for consistent padding
export const CardContent: React.FC<{
  style?: ViewStyle;
  children: React.ReactNode;
}> = ({ style, children }) => {
  return (
    <View className="p-4" style={style}>
      {children}
    </View>
  );
};

// Card header component
export const CardHeader: React.FC<{
  style?: ViewStyle;
  children: React.ReactNode;
}> = ({ style, children }) => {
  return (
    <View
      className="flex-row items-center justify-between p-4 border-b border-neutral-light-1"
      style={style}
    >
      {children}
    </View>
  );
};

// Card footer component
export const CardFooter: React.FC<{
  style?: ViewStyle;
  children: React.ReactNode;
}> = ({ style, children }) => {
  return (
    <View className="p-4 border-t border-neutral-light-1" style={style}>
      {children}
    </View>
  );
};

export default Card;
