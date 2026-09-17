import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import CustomSlider from "@/components/ui/slider";
import { useThemeColors } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";

/**
 * [LR-069] "I already trained today and I want to do more."
 *
 * Deliberately NOT the regeneration modal. That sheet carries a full profile
 * editor and a week/day scope switch, and the request this exists to serve was
 * explicitly for something faster:
 *
 *   "I do complete my hour long workout, but then I get home that evening and
 *    have an extra 20 min to do some upper body work. [...] it asks me what
 *    type and duration of workout I want to generate, more impromptu."
 *   — app_feedback id 4, user 109
 *
 * So: two inputs, both optional-feeling, one button.
 *
 * Duration uses CustomSlider, the same control the Adjust flow
 * (profile-override-form) and onboarding use for this question. It started as
 * four chips, which read faster but could only offer four values — somebody
 * with 25 minutes had no way to say so — and introduced a control the app does
 * not otherwise use for duration.
 */

/**
 * Same control and step as the Adjust flow, but capped at 60 rather than its
 * 90: this is a session on TOP of a workout already finished today, and nobody
 * adding a top-up is adding an hour and a half. Well inside the backend's
 * 10-180 clamp on durationOverride.
 */
const DURATION_MIN = 15;
const DURATION_MAX = 60;
const DURATION_STEP = 5;
/** The "I have a spare 20 minutes" case this feature was asked for. */
const DURATION_DEFAULT = 20;

interface AddAnotherWorkoutSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Fired with what the user typed and how long they have. */
  onGenerate: (params: { focus: string; durationMinutes: number }) => void;
  submitting?: boolean;
}

export default function AddAnotherWorkoutSheet({
  visible,
  onClose,
  onGenerate,
  submitting = false,
}: AddAnotherWorkoutSheetProps) {
  const colors = useThemeColors();
  const { isDark } = useTheme();

  const [focus, setFocus] = useState("");
  const [durationMinutes, setDurationMinutes] =
    useState<number>(DURATION_DEFAULT);

  // Reset between openings so yesterday's "upper body" doesn't prefill tonight.
  useEffect(() => {
    if (visible) {
      setFocus("");
      setDurationMinutes(DURATION_DEFAULT);
    }
  }, [visible]);

  const handleGenerate = () => {
    if (submitting) return;
    onGenerate({ focus: focus.trim(), durationMinutes });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className={`flex-1 justify-center items-center ${isDark ? "dark" : ""}`}
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onPress={submitting ? undefined : onClose}
      >
        {/* Stops a tap inside the card closing the sheet. */}
        <Pressable
          className="bg-surface rounded-2xl mx-6 w-[85%] overflow-hidden border border-neutral-medium-1"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <View className="px-6 pt-6 pb-4 items-center">
            <View
              className="size-12 rounded-full items-center justify-center mb-3"
              style={{ backgroundColor: colors.brand.primary + "15" }}
            >
              <Ionicons
                name="add-circle-outline"
                size={22}
                color={colors.brand.primary}
              />
            </View>
            <Text className="text-lg font-semibold text-text-primary mb-1">
              Add another workout
            </Text>
            <Text className="text-sm text-text-muted text-center">
              A second session for today, on top of the one you just finished.
            </Text>
          </View>

          <View className="px-6 pb-2">
            <Text className="text-sm font-medium text-text-primary mb-2">
              What do you want to work on?
            </Text>
            <TextInput
              value={focus}
              onChangeText={setFocus}
              editable={!submitting}
              placeholder="e.g. upper body, something easy on my knees"
              placeholderTextColor={colors.text.muted}
              multiline
              className="bg-background border border-neutral-medium-1 rounded-xl px-4 py-3 text-text-primary text-base"
              style={{ minHeight: 72, textAlignVertical: "top" }}
            />
            {/* Blank is allowed on purpose: "just give me something" is a valid
                answer at 9pm, and forcing a sentence is the friction this
                feature exists to remove. */}
          </View>

          <View className="px-6 pt-4 pb-2">
            <Text className="text-sm font-medium text-text-primary mb-3">
              How long have you got?
            </Text>
            <CustomSlider
              value={durationMinutes}
              minimumValue={DURATION_MIN}
              maximumValue={DURATION_MAX}
              step={DURATION_STEP}
              unit=" min"
              onValueChange={setDurationMinutes}
            />
          </View>

          <View className="px-6 pt-5 pb-6">
            <TouchableOpacity
              onPress={handleGenerate}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Generate this workout"
              className="bg-primary rounded-xl py-4 items-center justify-center"
              style={{ opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? (
                <ActivityIndicator color={colors.contentOnPrimary} />
              ) : (
                <Text
                  className="text-base font-semibold"
                  style={{ color: colors.contentOnPrimary }}
                >
                  Generate workout
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              disabled={submitting}
              accessibilityRole="button"
              className="py-3 items-center"
            >
              <Text className="text-text-muted text-sm">Not now</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
