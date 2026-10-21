import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Platform, Switch, Text, View } from "react-native";

import { useWorkoutReminderSetting } from "@/hooks/use-workout-reminder-setting";

import { type ThemeColorPalette,useThemeColors } from "../../../lib/theme";
import {type ColorTheme, type ThemeMode } from "../../../lib/theme-context";
import ThemeDropdown from "../../ui/theme-dropdown";
import HealthConnectSection from "./health-connect-section";
import LegalSection from "./legal-section";

interface AppSettingsSectionProps {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
  onClose?: () => void;
}

export default function AppSettingsSection({
  themeMode,
  setThemeMode,
  colorTheme,
  setColorTheme,
  onClose,
}: AppSettingsSectionProps) {
  const colors = useThemeColors();
  const [legalExpanded, setLegalExpanded] = useState(false);
  const { enabled: workoutReminders, setWorkoutReminders } =
    useWorkoutReminderSetting();
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

        {/* After the appearance pair (Dark Mode + Color Theme), not between
            them. Hidden until the server answers, so it never shows a guess. */}
        {workoutReminders !== null && (
          <View className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-light-2">
            <View className="flex-row items-center flex-1 mr-3">
              <Ionicons
                name="notifications-outline"
                size={20}
                color={colors.text.muted}
              />
              <View className="ml-3 flex-1">
                <Text className="text-sm text-text-primary">
                  Workout Reminders
                </Text>
                <Text className="text-xs text-text-muted mt-0.5">
                  A notification at 8am on days you have a workout
                </Text>
              </View>
            </View>
            <Switch
              value={workoutReminders}
              onValueChange={setWorkoutReminders}
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
        )}

        <LegalSection
          expanded={legalExpanded}
          onToggle={() => setLegalExpanded(!legalExpanded)}
          onBeforeNavigate={onClose}
        />
      </View>
    </>
  );
}
