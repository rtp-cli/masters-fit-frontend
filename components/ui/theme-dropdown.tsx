import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/theme";
import { COLOR_THEMES } from "@/lib/theme-context";
import type { ColorTheme } from "@/lib/theme-context";

interface ThemeDropdownProps {
  value: ColorTheme;
  onChange: (theme: ColorTheme) => void;
}

export default function ThemeDropdown({ value, onChange }: ThemeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const colors = useThemeColors();

  const selectedTheme = COLOR_THEMES.find((t) => t.id === value);

  return (
    <>
      {/* Compact Dropdown Button */}
      <TouchableOpacity
        className="flex-row items-center px-3 py-2 rounded-lg"
        style={{
          backgroundColor: colors.neutral.light[2],
          borderWidth: 1,
          borderColor: colors.neutral.medium[1],
        }}
        onPress={() => setIsOpen(true)}
      >
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: selectedTheme?.primaryColor,
            marginRight: 8,
          }}
        />
        <Text className="text-sm font-medium text-text-primary mr-2">
          {selectedTheme?.name}
        </Text>
        <Ionicons
          name="chevron-down-outline"
          size={16}
          color={colors.text.secondary}
        />
      </TouchableOpacity>

      {/* Modal Picker */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-center items-center"
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View
            className="bg-surface rounded-2xl mx-6 w-80 max-w-[90%]"
            onStartShouldSetResponder={() => true}
          >
            {/* Header */}
            <View className="p-4 border-b border-neutral-light-2">
              <Text className="text-lg font-bold text-text-primary text-center">
                Select Theme
              </Text>
            </View>

            {/* Options */}
            <View className="p-2">
              {COLOR_THEMES.map((theme) => {
                const isSelected = theme.id === value;
                return (
                  <TouchableOpacity
                    key={theme.id}
                    className={`flex-row items-center justify-between p-4 rounded-xl ${
                      isSelected ? "bg-primary/10" : ""
                    }`}
                    onPress={() => {
                      onChange(theme.id);
                      setIsOpen(false);
                    }}
                  >
                    <View className="flex-row items-center flex-1">
                      <View
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 8,
                          backgroundColor: theme.primaryColor,
                          marginRight: 12,
                        }}
                      />
                      <Text
                        className={`text-base font-medium ${
                          isSelected ? "text-primary" : "text-text-primary"
                        }`}
                      >
                        {theme.name}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={colors.brand.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
