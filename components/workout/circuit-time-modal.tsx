import React, { useState } from "react";
import { Modal, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useThemeColors } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";

/**
 * Manual time entry for time-scored circuit blocks (for_time).
 * Timers were deliberately removed (T5-3), so the finish time is
 * honor-system: "how long did it take?" Feeds the block-level score
 * ("12:34") persisted via POST /logs/block.
 */
export function CircuitTimeModal({
  visible,
  onSave,
  onSkip,
  onCancel,
}: {
  visible: boolean;
  /** Called with total elapsed seconds. */
  onSave: (totalSeconds: number) => void;
  /** Complete the circuit without a time (score falls back to rounds). */
  onSkip: () => void;
  /** Dismiss without completing the circuit. */
  onCancel: () => void;
}) {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");

  const totalSeconds =
    (parseInt(minutes, 10) || 0) * 60 + (parseInt(seconds, 10) || 0);

  const handleSave = () => {
    onSave(totalSeconds);
    setMinutes("");
    setSeconds("");
  };

  const handleSkip = () => {
    onSkip();
    setMinutes("");
    setSeconds("");
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        className={`flex-1 bg-black/50 justify-center items-center px-6 ${isDark ? "dark" : ""}`}
      >
        <View className="bg-surface rounded-2xl p-6 w-full max-w-sm shadow-xl border border-neutral-medium-1">
          <Text className="text-xl font-bold text-text-primary mb-2 text-center">
            How long did it take?
          </Text>
          <Text className="text-base text-text-secondary text-center mb-6 leading-6">
            Enter your finish time to record a score for this workout.
          </Text>

          <View className="flex-row items-center justify-center gap-2 mb-6">
            <TextInput
              className="bg-neutral-light-2 rounded-xl px-4 py-3 text-2xl font-bold text-text-primary text-center w-20"
              keyboardType="number-pad"
              maxLength={3}
              placeholder="mm"
              placeholderTextColor={colors.text.muted}
              value={minutes}
              onChangeText={setMinutes}
              autoFocus
            />
            <Text className="text-2xl font-bold text-text-primary">:</Text>
            <TextInput
              className="bg-neutral-light-2 rounded-xl px-4 py-3 text-2xl font-bold text-text-primary text-center w-20"
              keyboardType="number-pad"
              maxLength={2}
              placeholder="ss"
              placeholderTextColor={colors.text.muted}
              value={seconds}
              onChangeText={setSeconds}
            />
          </View>

          <View className="flex-row gap-3 mb-3">
            <TouchableOpacity
              className="bg-neutral-light-2 rounded-xl py-3 px-6 flex-1"
              onPress={onCancel}
            >
              <Text className="text-text-primary font-semibold text-center">
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`bg-primary rounded-xl py-3 px-6 flex-1 ${
                totalSeconds > 0 ? "" : "opacity-50"
              }`}
              onPress={handleSave}
              disabled={totalSeconds <= 0}
            >
              <Text className="text-content-on-primary font-semibold text-center">
                Save Time
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity className="py-2" onPress={handleSkip}>
            <Text className="text-text-secondary text-center">
              Complete without a time
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
