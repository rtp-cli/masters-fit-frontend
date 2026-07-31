import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeColors } from "@/lib/theme";

import Text from "./text";

interface ActionRow {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}

interface ExerciseActionSheetProps {
  visible: boolean;
  exerciseName: string;
  /** e.g. "Main set · 3 × 8". Omitted line if empty. */
  contextLine?: string;
  onReplace: () => void;
  onRemoveToday: () => void;
  onNeverPrescribe: () => void;
  onClose: () => void;
}

/**
 * 1a — the three-door action sheet that opens when a user taps an exercise row
 * in Edit exercises. Replaces both the old tap-straight-to-Replace and the row
 * trash `Alert.alert`. Ordering is reversible → permanent (also frequency
 * order); do not reorder. Each door states its own scope in its subtitle, and
 * "Never prescribe this again" is deliberately NOT styled destructive — it's
 * reversible from Settings, and red makes people who genuinely can't do a
 * movement hesitate to say so.
 */
export default function ExerciseActionSheet({
  visible,
  exerciseName,
  contextLine,
  onReplace,
  onRemoveToday,
  onNeverPrescribe,
  onClose,
}: ExerciseActionSheetProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const rows: ActionRow[] = [
    {
      icon: "swap-horizontal",
      title: "Replace with something else",
      subtitle: "Today only. We'll suggest a match.",
      onPress: onReplace,
    },
    {
      icon: "trash-outline",
      title: "Remove from today",
      subtitle: "Just this workout. It can come back.",
      onPress: onRemoveToday,
    },
    {
      icon: "ban-outline",
      title: "Never prescribe this again",
      subtitle: "Removes it from future plans. Undo in Settings.",
      onPress: onNeverPrescribe,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(10,10,10,0.35)" }}
      >
        {/* Tap the scrim to dismiss */}
        <Pressable
          className="flex-1"
          onPress={onClose}
          accessibilityLabel="Dismiss"
        />
        <View
          className="bg-surface rounded-t-3xl px-5 pt-4"
          style={{ paddingBottom: insets.bottom + 20 }}
        >
          {/* Grab handle */}
          <View className="items-center mb-4">
            <View className="w-9 h-1 rounded-full bg-neutral-light-2" />
          </View>

          {/* Exercise name + context */}
          <Text
            className="text-lg font-bold text-text-primary"
            style={{ letterSpacing: -0.2 }}
          >
            {exerciseName}
          </Text>
          {contextLine ? (
            <Text className="text-sm text-text-muted mt-1 mb-4">
              {contextLine}
            </Text>
          ) : (
            <View className="mb-4" />
          )}

          {/* Three doors */}
          {rows.map((row, i) => (
            <TouchableOpacity
              key={row.title}
              onPress={row.onPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={row.title}
              className={`flex-row items-center py-3.5 ${
                i > 0 ? "border-t border-neutral-light-2" : ""
              }`}
              style={{ minHeight: 56 }}
            >
              <Ionicons
                name={row.icon}
                size={24}
                color={colors.text.primary}
                style={{ marginRight: 14 }}
              />
              <View className="flex-1">
                <Text className="text-base font-semibold text-text-primary">
                  {row.title}
                </Text>
                <Text className="text-xs text-text-muted mt-0.5">
                  {row.subtitle}
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Cancel */}
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            className="mt-4 rounded-2xl border items-center justify-center"
            style={{ minHeight: 52, borderColor: colors.neutral.medium[1] }}
          >
            <Text className="text-base font-semibold text-text-primary">
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
