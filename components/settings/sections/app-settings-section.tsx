import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  Platform,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeColors } from "../../../lib/theme";
import {
  ThemeMode,
  ColorTheme,
  COLOR_THEMES,
  useTheme,
} from "../../../lib/theme-context";
import ThemeDropdown from "../../ui/theme-dropdown";
import HealthConnectSection from "./health-connect-section";
import LegalSection from "./legal-section";
import { useVoiceAssistantSettings } from "@/contexts/voice-assistant-context";
import VoiceAssistantSettings from "../voice-assistant-settings";

interface AppSettingsSectionProps {
  debugTapCount: number;
  onDebugTap: () => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
}

export default function AppSettingsSection({
  debugTapCount,
  onDebugTap,
  themeMode,
  setThemeMode,
  colorTheme,
  setColorTheme,
}: AppSettingsSectionProps) {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const [legalExpanded, setLegalExpanded] = useState(false);
  const [voiceSettingsVisible, setVoiceSettingsVisible] = useState(false);
  const { isEnabled: voiceEnabled, toggle: toggleVoice } =
    useVoiceAssistantSettings();

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
              true: colors.brand.primary,
            }}
            thumbColor={
              Platform.OS === "android"
                ? colors.text.primary
                : isDarkMode
                  ? colors.neutral.white
                  : colors.neutral.light[1]
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

        {/* Voice Assistant Setting */}
        <TouchableOpacity
          className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-light-2"
          onPress={() => setVoiceSettingsVisible(true)}
          activeOpacity={0.7}
        >
          <View className="flex-row items-center flex-1">
            <Ionicons
              name="volume-high-outline"
              size={20}
              color={colors.text.muted}
            />
            <View className="ml-3 flex-1">
              <Text className="text-sm text-text-primary">Voice Assistant</Text>
              <Text className="text-xs text-text-muted">
                {voiceEnabled ? "Enabled" : "Disabled"} • Tap to configure
              </Text>
            </View>
          </View>
          <View className="flex-row items-center">
            <View
              className="w-2 h-2 rounded-full mr-2"
              style={{
                backgroundColor: voiceEnabled
                  ? colors.brand.primary
                  : colors.neutral.medium[1],
              }}
            />
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.text.muted}
            />
          </View>
        </TouchableOpacity>

        <LegalSection
          expanded={legalExpanded}
          onToggle={() => setLegalExpanded(!legalExpanded)}
        />
      </View>

      {/* Voice Assistant Settings Modal */}
      <Modal
        visible={voiceSettingsVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        statusBarTranslucent
      >
        <SafeAreaView
          className={`flex-1 bg-background ${isDark ? "dark" : ""}`}
        >
          <View className="flex-row items-center justify-between p-4 border-b border-neutral-light-2">
            <View className="w-6" />
            <Text className="text-xl font-bold text-text-primary">
              Voice Assistant
            </Text>
            <TouchableOpacity
              onPress={() => setVoiceSettingsVisible(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          <VoiceAssistantSettings
            onClose={() => setVoiceSettingsVisible(false)}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}
