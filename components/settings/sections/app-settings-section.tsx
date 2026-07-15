import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Platform,Switch, Text, TouchableOpacity, View } from "react-native";

import { usePlayfulMessages } from "@/hooks/use-playful-messages";

import { type ThemeColorPalette,useThemeColors } from "../../../lib/theme";
import {type ColorTheme, type ThemeMode } from "../../../lib/theme-context";
import ThemeDropdown from "../../ui/theme-dropdown";
import HealthConnectSection from "./health-connect-section";
import LegalSection from "./legal-section";

interface AppSettingsSectionProps {
  debugTapCount: number;
  onDebugTap: () => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
  onClose?: () => void;
}

export default function AppSettingsSection({
  debugTapCount,
  onDebugTap,
  themeMode,
  setThemeMode,
  colorTheme,
  setColorTheme,
  onClose,
}: AppSettingsSectionProps) {
  const colors = useThemeColors();
  const [legalExpanded, setLegalExpanded] = useState(false);
  const { playfulEnabled, setPlayfulEnabled } = usePlayfulMessages();
  // [Bug fix] iOS silently ignores Switch's thumbColor prop on this RN/iOS
  // version -- the knob is always the native white default, confirmed via
  // pixel sampling (uniform white regardless of the color passed). That
  // means the ON-state track can never be pure white/black (brand.primary),
  // since a same-color knob-on-track becomes invisible. The reserved
  // success accent is never pure white/black in any theme, so it's a safe
  // ON-track color that still reads as "active" (same accent used for
  // completion elsewhere this pass).
  const switchOnTrackColor =
    (colors as ThemeColorPalette).success ?? colors.brand.primary;

  const isDarkMode = themeMode === "dark";

  const handleDarkModeToggle = (value: boolean) => {
    setThemeMode(value ? "dark" : "light");
  };

  return (
    <>
      <View className="mx-6 mb-6   rounded-xl overflow-hidden">
        <TouchableOpacity
          onPress={onDebugTap}
          activeOpacity={0.7}
          hitSlop={{ top: 5, bottom: 5, left: 10, right: 10 }}
        >
          <Text
            className="text-base font-semibold text-text-primary p-4 pb-2"
            style={{
              opacity: debugTapCount > 0 ? 0.7 + debugTapCount * 0.03 : 1,
            }}
          >
            App Settings{debugTapCount >= 7 ? ` (${10 - debugTapCount})` : ""}
          </Text>
        </TouchableOpacity>

        <HealthConnectSection />

        <View className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-light-2">
          <View className="flex-row items-center flex-1">
            <Ionicons name="moon-outline" size={20} color={colors.text.muted} />
            <Text className="text-sm text-text-primary ml-3">Dark Mode</Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={handleDarkModeToggle}
            trackColor={{
              false: colors.neutral.medium[1],
              true: switchOnTrackColor,
            }}
            thumbColor={
              Platform.OS === "android" ? colors.text.primary : undefined
            }
            ios_backgroundColor={colors.neutral.medium[1]}
          />
        </View>

        <View className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-light-2">
          <View className="flex-row items-center flex-1">
            <Ionicons
              name="color-palette-outline"
              size={20}
              color={colors.text.muted}
            />
            <Text className="text-sm text-text-primary ml-3">Color Theme</Text>
          </View>
          <ThemeDropdown value={colorTheme} onChange={setColorTheme} />
        </View>

        <View className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-light-2">
          <View className="flex-row items-center flex-1">
            <Ionicons
              name="happy-outline"
              size={20}
              color={colors.text.muted}
            />
            <Text className="text-sm text-text-primary ml-3">
              Playful messages
            </Text>
          </View>
          <Switch
            value={playfulEnabled}
            onValueChange={setPlayfulEnabled}
            trackColor={{
              false: colors.neutral.medium[1],
              true: switchOnTrackColor,
            }}
            // [Bug fix] Same issue as the Dark Mode switch above -- see its
            // comment.
            thumbColor={
              Platform.OS === "android" ? colors.text.primary : undefined
            }
            ios_backgroundColor={colors.neutral.medium[1]}
          />
        </View>

        <LegalSection
          expanded={legalExpanded}
          onToggle={() => setLegalExpanded(!legalExpanded)}
          onBeforeNavigate={onClose}
        />
      </View>
    </>
  );
}
