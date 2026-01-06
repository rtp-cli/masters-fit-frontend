import { useState } from "react";
import { View, Text, TouchableOpacity, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../lib/theme";
import ComingSoonModal from "../../coming-soon-modal";
import HealthConnectSection from "./health-connect-section";
import LegalSection from "./legal-section";

interface AppSettingsSectionProps {
  debugTapCount: number;
  onDebugTap: () => void;
}

export default function AppSettingsSection({
  debugTapCount,
  onDebugTap,
}: AppSettingsSectionProps) {
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [legalExpanded, setLegalExpanded] = useState(false);
  const [comingSoonModal, setComingSoonModal] = useState<{
    visible: boolean;
    icon: keyof typeof Ionicons.glyphMap;
  }>({
    visible: false,
    icon: "information-circle-outline",
  });

  // Show coming soon modal
  const showComingSoonModal = (icon: keyof typeof Ionicons.glyphMap) => {
    setComingSoonModal({
      visible: true,
      icon,
    });
  };

  // Hide coming soon modal
  const hideComingSoonModal = () => {
    setComingSoonModal({
      ...comingSoonModal,
      visible: false,
    });
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
            value={darkModeEnabled}
            onValueChange={() => showComingSoonModal("moon-outline")}
            trackColor={{
              false: colors.neutral.medium[1],
              true: colors.brand.primary,
            }}
            thumbColor={
              darkModeEnabled ? colors.neutral.white : colors.neutral.light[1]
            }
          />
        </View>

        <LegalSection
          expanded={legalExpanded}
          onToggle={() => setLegalExpanded(!legalExpanded)}
        />
      </View>

      <ComingSoonModal
        visible={comingSoonModal.visible}
        onClose={hideComingSoonModal}
        icon={comingSoonModal.icon}
      />
    </>
  );
}
