/**
 * Voice Assistant Settings Component
 * UI for configuring voice assistant preferences
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Slider } from "@miblanchard/react-native-slider";
import { useThemeColors } from "@/lib/theme";
import {
  useVoiceAssistantSettings,
  useCuePreferences,
} from "@/contexts/voice-assistant-context";
import {
  CuePreferences,
  voiceAssistantManager,
  VoiceInfo,
} from "@/lib/voice-assistant";

interface VoiceAssistantSettingsProps {
  onClose?: () => void;
}

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingSection({ title, children }: SettingSectionProps) {
  const colors = useThemeColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {title}
      </Text>
      <View
        style={[
          styles.sectionContent,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  isLast?: boolean;
}

function SettingRow({
  label,
  description,
  children,
  isLast = false,
}: SettingRowProps) {
  const colors = useThemeColors();
  return (
    <View
      style={[
        styles.settingRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.settingLabelContainer}>
        <Text style={[styles.settingLabel, { color: colors.text }]}>
          {label}
        </Text>
        {description && (
          <Text
            style={[styles.settingDescription, { color: colors.textMuted }]}
          >
            {description}
          </Text>
        )}
      </View>
      <View style={styles.settingControl}>{children}</View>
    </View>
  );
}

export function VoiceAssistantSettings({
  onClose,
}: VoiceAssistantSettingsProps) {
  const colors = useThemeColors();
  const { settings, updateSettings, resetSettings, isEnabled, toggle } =
    useVoiceAssistantSettings();
  const { preferences, updatePreference } = useCuePreferences();

  // Local state for sliders (to avoid too many updates while dragging)
  const [localVolume, setLocalVolume] = useState(settings.volume);
  const [localSpeechRate, setLocalSpeechRate] = useState(settings.speechRate);

  // Voice selection state
  const [availableVoices, setAvailableVoices] = useState<VoiceInfo[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string | undefined>(
    settings.voice
  );
  const [isVoicePickerVisible, setIsVoicePickerVisible] = useState(false);

  // Load available voices on mount
  useEffect(() => {
    const loadVoices = async () => {
      const voices = voiceAssistantManager.getAvailableVoices();
      // Filter to English voices for better UX, sorted by name
      const englishVoices = voices
        .filter((v) => v.language.startsWith("en"))
        .sort((a, b) => a.name.localeCompare(b.name));
      setAvailableVoices(englishVoices);
    };
    loadVoices();
  }, []);

  // Sync selected voice with settings
  useEffect(() => {
    setSelectedVoice(settings.voice);
  }, [settings.voice]);

  // Handle voice selection
  const handleVoiceSelect = (voiceIdentifier: string) => {
    setSelectedVoice(voiceIdentifier);
    updateSettings({ voice: voiceIdentifier });
    setIsVoicePickerVisible(false);

    // Preview the selected voice
    voiceAssistantManager.speak("Voice selected", {
      voice: voiceIdentifier,
      rate: settings.speechRate,
      volume: settings.volume,
    });
  };

  // Get display name for selected voice
  const getSelectedVoiceName = () => {
    if (!selectedVoice) return "System Default";
    const voice = availableVoices.find((v) => v.identifier === selectedVoice);
    return voice?.name || "System Default";
  };

  // Handle volume change complete
  const handleVolumeComplete = (value: number[]) => {
    const newVolume = value[0];
    setLocalVolume(newVolume);
    updateSettings({ volume: newVolume });
  };

  // Handle speech rate change complete
  const handleSpeechRateComplete = (value: number[]) => {
    const newRate = value[0];
    setLocalSpeechRate(newRate);
    updateSettings({ speechRate: newRate });
  };

  // Cue preference items
  const cuePreferenceItems: {
    key: keyof CuePreferences;
    label: string;
    description: string;
  }[] = [
    {
      key: "workoutStart",
      label: "Workout Start",
      description: "Announce when workout begins",
    },
    {
      key: "blockStart",
      label: "Block Start",
      description: "Announce when entering a new workout block",
    },
    {
      key: "exerciseStart",
      label: "Exercise Start",
      description: "Announce exercise details when starting",
    },
    {
      key: "setCompletion",
      label: "Set Completion",
      description: "Announce when a set is completed",
    },
    {
      key: "restPeriod",
      label: "Rest Period",
      description: "Announce rest period duration",
    },
    {
      key: "restCountdown",
      label: "Rest Countdown",
      description: "Count down during rest periods",
    },
    {
      key: "exerciseComplete",
      label: "Exercise Complete",
      description: "Announce when exercise is finished",
    },
    {
      key: "workoutComplete",
      label: "Workout Complete",
      description: "Announce workout completion summary",
    },
    {
      key: "circuitRound",
      label: "Circuit Rounds",
      description: "Announce circuit round completion",
    },
    {
      key: "nextWorkoutInfo",
      label: "Next Workout Info",
      description: "Announce next workout after completion",
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="volume-high" size={24} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Voice Assistant
          </Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Master Toggle */}
      <SettingSection title="General">
        <SettingRow
          label="Enable Voice Assistant"
          description="Turn voice cues on or off"
          isLast
        >
          <Switch
            value={isEnabled}
            onValueChange={toggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={isEnabled ? colors.background : colors.textMuted}
          />
        </SettingRow>
      </SettingSection>

      {/* Voice Settings */}
      <SettingSection title="Voice Settings">
        <SettingRow
          label={`Volume: ${Math.round(localVolume * 100)}%`}
          description="Adjust voice volume"
        >
          <View style={styles.sliderContainer}>
            <Slider
              value={localVolume}
              onValueChange={(value) => setLocalVolume(value[0])}
              onSlidingComplete={handleVolumeComplete}
              minimumValue={0}
              maximumValue={1}
              step={0.1}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
              containerStyle={styles.slider}
            />
          </View>
        </SettingRow>

        <SettingRow
          label={`Speech Rate: ${localSpeechRate.toFixed(1)}x`}
          description="Adjust speaking speed"
        >
          <View style={styles.sliderContainer}>
            <Slider
              value={localSpeechRate}
              onValueChange={(value) => setLocalSpeechRate(value[0])}
              onSlidingComplete={handleSpeechRateComplete}
              minimumValue={0.5}
              maximumValue={2.0}
              step={0.1}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
              containerStyle={styles.slider}
            />
          </View>
        </SettingRow>

        <SettingRow
          label="Voice"
          description="Select the voice for announcements"
          isLast
        >
          <TouchableOpacity
            style={[
              styles.voiceSelector,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            onPress={() => setIsVoicePickerVisible(true)}
            disabled={availableVoices.length === 0}
          >
            <Text
              style={[styles.voiceSelectorText, { color: colors.text }]}
              numberOfLines={1}
            >
              {getSelectedVoiceName()}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        </SettingRow>
      </SettingSection>

      {/* Voice Picker Modal */}
      <Modal
        visible={isVoicePickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsVoicePickerVisible(false)}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          {/* Modal Header */}
          <View
            style={[styles.modalHeader, { borderBottomColor: colors.border }]}
          >
            <TouchableOpacity onPress={() => setIsVoicePickerVisible(false)}>
              <Text style={[styles.modalCancelText, { color: colors.primary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Select Voice
            </Text>
            <View style={{ width: 50 }} />
          </View>

          {/* Voice List */}
          <FlatList
            data={[
              { identifier: "", name: "System Default", language: "en-US" },
              ...availableVoices,
            ]}
            keyExtractor={(item) => item.identifier || "default"}
            contentContainerStyle={styles.voiceListContent}
            renderItem={({ item }) => {
              const isSelected = item.identifier === (selectedVoice || "");
              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.voiceItem,
                    {
                      backgroundColor: pressed ? colors.card : "transparent",
                      borderBottomColor: colors.border,
                    },
                  ]}
                  onPress={() => handleVoiceSelect(item.identifier)}
                >
                  <View style={styles.voiceItemContent}>
                    <Text style={[styles.voiceName, { color: colors.text }]}>
                      {item.name}
                    </Text>
                    <Text
                      style={[
                        styles.voiceLanguage,
                        { color: colors.textMuted },
                      ]}
                    >
                      {item.language}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={colors.primary}
                    />
                  )}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyVoiceList}>
                <Ionicons
                  name="mic-off-outline"
                  size={48}
                  color={colors.textMuted}
                />
                <Text
                  style={[styles.emptyVoiceText, { color: colors.textMuted }]}
                >
                  No voices available
                </Text>
              </View>
            }
          />

          {/* Test Voice Button */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.testVoiceButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => {
                voiceAssistantManager.speak(
                  "This is a test of the voice assistant.",
                  {
                    voice: selectedVoice,
                    rate: settings.speechRate,
                    volume: settings.volume,
                  }
                );
              }}
            >
              <Ionicons name="play" size={20} color="#fff" />
              <Text style={styles.testVoiceButtonText}>Test Voice</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Cue Preferences */}
      <SettingSection title="Cue Preferences">
        {cuePreferenceItems.map((item, index) => (
          <SettingRow
            key={item.key}
            label={item.label}
            description={item.description}
            isLast={index === cuePreferenceItems.length - 1}
          >
            <Switch
              value={preferences[item.key]}
              onValueChange={(value) => updatePreference(item.key, value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={
                preferences[item.key] ? colors.background : colors.textMuted
              }
              disabled={!isEnabled}
            />
          </SettingRow>
        ))}
      </SettingSection>

      {/* Reset Button */}
      <TouchableOpacity
        style={[styles.resetButton, { borderColor: colors.error }]}
        onPress={resetSettings}
      >
        <Ionicons name="refresh" size={20} color={colors.error} />
        <Text style={[styles.resetButtonText, { color: colors.error }]}>
          Reset to Defaults
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContent: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    minHeight: 60,
  },
  settingLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  settingDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  settingControl: {
    alignItems: "flex-end",
  },
  sliderContainer: {
    width: 120,
  },
  slider: {
    height: 40,
  },
  resetButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginTop: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  // Voice selector styles
  voiceSelector: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    maxWidth: 140,
  },
  voiceSelectorText: {
    fontSize: 14,
    flex: 1,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  modalCancelText: {
    fontSize: 17,
  },
  voiceListContent: {
    paddingBottom: 100,
  },
  voiceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  voiceItemContent: {
    flex: 1,
    marginRight: 12,
  },
  voiceName: {
    fontSize: 16,
    fontWeight: "500",
  },
  voiceLanguage: {
    fontSize: 13,
    marginTop: 2,
  },
  emptyVoiceList: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyVoiceText: {
    fontSize: 16,
  },
  modalFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 34,
    borderTopWidth: 1,
  },
  testVoiceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  testVoiceButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default VoiceAssistantSettings;
