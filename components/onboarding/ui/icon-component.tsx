import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { View } from "react-native";

interface IconComponentProps {
  iconName: string;
  iconLibrary?: "ionicons" | "materialcommunity";
  size?: number;
  color: string;
  backgroundColor: string;
  containerSize?: number;
  noMargin?: boolean;
}

export default function IconComponent({
  iconName,
  iconLibrary = "ionicons",
  size = 16,
  color,
  backgroundColor,
  containerSize = 32,
  noMargin = false,
}: IconComponentProps) {
  const IconLibrary =
    iconLibrary === "materialcommunity" ? MaterialCommunityIcons : Ionicons;

  return (
    <View
      className={`${backgroundColor} rounded-xl items-center justify-center ${
        noMargin ? "" : "mr-4"
      }`}
      style={{ width: containerSize, height: containerSize }}
    >
      <IconLibrary name={iconName as any} size={size} color={color} />
    </View>
  );
}
