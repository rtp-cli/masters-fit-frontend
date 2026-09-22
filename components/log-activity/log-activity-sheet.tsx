import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import CustomSlider from "@/components/ui/slider";
import {
  ACTIVITY_DISPLAY,
  ACTIVITY_PICKER_ORDER,
} from "@/constants/activities";
import { useThemeColors } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import {
  type CreateLoggedActivityInput,
  LOGGED_ACTIVITY_EFFORTS,
  type LoggedActivityEffort,
  type LoggedActivityType,
} from "@/types/api";
import { formatDateAsString, getCurrentDate } from "@/utils";

/**
 * [LR-077] "I already did something — record it."
 *
 * Deliberately NOT the generation sheet. AddAnotherWorkoutSheet asks what to
 * PRESCRIBE; this asks what HAPPENED, and nothing it collects is ever sent to
 * generation. The origin was the owner finishing a workout, taking a sauna, and
 * finding the app had no way to say he had done anything it had not planned.
 *
 * It exists for the activation cliff, not for completeness: every other attempt
 * makes the prescribed plan easier to obey, and for someone who has already
 * failed their plan twice the first thing they ever log may have to be their
 * own idea. So the form is as short as it can be — a tap for the type, a slider
 * already on 30, and a button. Effort, a note and the date are all skippable.
 */

const DURATION_MIN = 5;
const DURATION_MAX = 240;
const DURATION_STEP = 5;
/** A walk or a class — the modal case, so nobody has to move the slider. */
const DURATION_DEFAULT = 30;

const CUSTOM_TYPE_MAX = 60;
const NOTES_MAX = 500;

interface LogActivitySheetProps {
  visible: boolean;
  onClose: () => void;
  /**
   * The date being logged against. The calendar passes its selected day, the
   * dashboard passes today — so in both entry points the date is already right
   * and the picker below is only there for "I forgot to log Saturday".
   */
  initialDate?: string;
  onSubmit: (input: CreateLoggedActivityInput) => Promise<void> | void;
  submitting?: boolean;
}

export default function LogActivitySheet({
  visible,
  onClose,
  initialDate,
  onSubmit,
  submitting = false,
}: LogActivitySheetProps) {
  const colors = useThemeColors();
  const { isDark } = useTheme();

  const [activityType, setActivityType] = useState<LoggedActivityType | null>(
    null
  );
  const [customType, setCustomType] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(DURATION_DEFAULT);
  const [effort, setEffort] = useState<LoggedActivityEffort | null>(null);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(initialDate ?? getCurrentDate());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tracked so the backdrop drops the keyboard instead of closing the sheet and
  // discarding what the user typed — same rule as AddAnotherWorkoutSheet.
  const [keyboardUp, setKeyboardUp] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardUp(true)
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardUp(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Reset between openings so last night's walk doesn't prefill this morning's.
  useEffect(() => {
    if (visible) {
      setActivityType(null);
      setCustomType("");
      setDurationMinutes(DURATION_DEFAULT);
      setEffort(null);
      setNotes("");
      setDate(initialDate ?? getCurrentDate());
      setShowDatePicker(false);
      setError(null);
    }
  }, [visible, initialDate]);

  const today = getCurrentDate();
  const needsCustomLabel = activityType === "other";
  const canSubmit =
    !!activityType &&
    (!needsCustomLabel || customType.trim().length > 0) &&
    durationMinutes > 0 &&
    !submitting;

  const dateLabel = useMemo(() => {
    if (date === today) return "Today";
    // Compare as dates only; the strings are already local YYYY-MM-DD.
    const [y, m, d] = date.split("-").map(Number);
    const asDate = new Date(y, (m ?? 1) - 1, d ?? 1);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (formatDateAsString(yesterday) === date) return "Yesterday";
    return asDate.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, [date, today]);

  const handleSubmit = async () => {
    if (!canSubmit || !activityType) return;
    setError(null);
    try {
      await onSubmit({
        date,
        activityType,
        customType: needsCustomLabel ? customType.trim() : null,
        durationMinutes,
        effort,
        notes: notes.trim() ? notes.trim() : null,
      });
    } catch (e) {
      // Keep the sheet open and everything the user entered — a failed save
      // must not also cost them the typing.
      setError(
        e instanceof Error && e.message
          ? e.message
          : "Couldn't save that. Try again."
      );
    }
  };

  const pickerDate = useMemo(() => {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1);
  }, [date]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <Pressable
          className={`flex-1 justify-center items-center ${isDark ? "dark" : ""}`}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onPress={
            submitting ? undefined : keyboardUp ? Keyboard.dismiss : onClose
          }
        >
          <Pressable
            onPress={Keyboard.dismiss}
            accessible={false}
            className="bg-surface rounded-2xl mx-6 w-[85%] max-h-[85%] overflow-hidden border border-neutral-medium-1"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View className="px-6 pt-6 pb-4 items-center">
                <View
                  className="size-12 rounded-full items-center justify-center mb-3"
                  style={{ backgroundColor: colors.brand.primary + "15" }}
                >
                  <Ionicons
                    name="checkmark-done-outline"
                    size={22}
                    color={colors.brand.primary}
                  />
                </View>
                <Text className="text-lg font-semibold text-text-primary mb-1">
                  Log an activity
                </Text>
                <Text className="text-sm text-text-muted text-center">
                  Something you already did, that wasn&apos;t part of your plan.
                </Text>
              </View>

              {/* What */}
              <View className="px-6 pb-2">
                <Text className="text-sm font-medium text-text-primary mb-3">
                  What did you do?
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {ACTIVITY_PICKER_ORDER.map((type) => {
                    const selected = activityType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setActivityType(type)}
                        disabled={submitting}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={ACTIVITY_DISPLAY[type].label}
                        className={`flex-row items-center rounded-full px-3 py-2 border ${
                          selected
                            ? "bg-primary border-primary"
                            : "bg-background border-neutral-medium-1"
                        }`}
                      >
                        <Ionicons
                          name={ACTIVITY_DISPLAY[type].icon as any}
                          size={15}
                          color={
                            selected
                              ? colors.contentOnPrimary
                              : colors.text.secondary
                          }
                        />
                        <Text
                          className="text-sm ml-1.5"
                          style={{
                            color: selected
                              ? colors.contentOnPrimary
                              : colors.text.primary,
                          }}
                        >
                          {ACTIVITY_DISPLAY[type].label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* The free-text escape hatch, shown only where it applies. */}
                {needsCustomLabel && (
                  <View className="mt-3">
                    <TextInput
                      value={customType}
                      onChangeText={setCustomType}
                      editable={!submitting}
                      placeholder="What was it? e.g. Pickleball"
                      placeholderTextColor={colors.text.muted}
                      maxLength={CUSTOM_TYPE_MAX}
                      returnKeyType="done"
                      className="bg-background border border-neutral-medium-1 rounded-xl px-4 py-3 text-text-primary text-base"
                    />
                  </View>
                )}
              </View>

              {/* How long */}
              <View className="px-6 pt-4 pb-2">
                <Text className="text-sm font-medium text-text-primary mb-3">
                  How long?
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

              {/* When — usually already correct from the entry point. */}
              <View className="px-6 pt-4 pb-2">
                <Text className="text-sm font-medium text-text-primary mb-2">
                  When?
                </Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityLabel={`Change the date. Currently ${dateLabel}`}
                  className="flex-row items-center justify-between bg-background border border-neutral-medium-1 rounded-xl px-4 py-3"
                >
                  <Text className="text-text-primary text-base">
                    {dateLabel}
                  </Text>
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Effort — genuinely optional, and unset by default. */}
              <View className="px-6 pt-4 pb-2">
                <Text className="text-sm font-medium text-text-primary mb-1">
                  How did it feel?
                </Text>
                <Text className="text-xs text-text-muted mb-3">Optional</Text>
                <View className="flex-row gap-2">
                  {LOGGED_ACTIVITY_EFFORTS.map((value) => {
                    const selected = effort === value;
                    return (
                      <TouchableOpacity
                        key={value}
                        // Tapping the selected chip clears it — otherwise an
                        // accidental tap can never be undone without closing
                        // the sheet and starting over.
                        onPress={() => setEffort(selected ? null : value)}
                        disabled={submitting}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        className={`flex-1 rounded-xl py-3 items-center border ${
                          selected
                            ? "bg-primary border-primary"
                            : "bg-background border-neutral-medium-1"
                        }`}
                      >
                        <Text
                          className="text-sm"
                          style={{
                            color: selected
                              ? colors.contentOnPrimary
                              : colors.text.primary,
                          }}
                        >
                          {value === "easy"
                            ? "Easy"
                            : value === "moderate"
                              ? "Moderate"
                              : "Hard"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Note */}
              <View className="px-6 pt-4 pb-2">
                <Text className="text-sm font-medium text-text-primary mb-1">
                  Anything to remember?
                </Text>
                <Text className="text-xs text-text-muted mb-2">Optional</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  editable={!submitting}
                  placeholder="e.g. felt good, knee was fine"
                  placeholderTextColor={colors.text.muted}
                  maxLength={NOTES_MAX}
                  multiline
                  returnKeyType="done"
                  blurOnSubmit
                  className="bg-background border border-neutral-medium-1 rounded-xl px-4 py-3 text-text-primary text-base"
                  style={{ minHeight: 64, textAlignVertical: "top" }}
                />
              </View>

              {error && (
                <View className="px-6 pt-3">
                  <Text className="text-sm text-danger">{error}</Text>
                </View>
              )}

              <View className="px-6 pt-5 pb-6">
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={!canSubmit}
                  accessibilityRole="button"
                  accessibilityLabel="Save this activity"
                  className="bg-primary rounded-xl py-4 items-center justify-center"
                  style={{ opacity: canSubmit ? 1 : 0.5 }}
                >
                  {submitting ? (
                    <ActivityIndicator color={colors.contentOnPrimary} />
                  ) : (
                    <Text
                      className="text-base font-semibold"
                      style={{ color: colors.contentOnPrimary }}
                    >
                      Save activity
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
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>

      {/* Date picker. Same split the search screen uses: iOS gets a spinner in
          its own modal (the inline one is unusable inside a card), Android gets
          the native dialog. maximumDate is today — you cannot log something you
          have not done yet, and the server rejects it too. */}
      {showDatePicker &&
        (Platform.OS === "ios" ? (
          <Modal transparent animationType="slide">
            <View className="flex-1 justify-end bg-black/50">
              <View className={`bg-surface ${isDark ? "dark" : ""}`}>
                <View className="flex-row justify-end px-6 py-3 border-b border-neutral-medium-1">
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                    accessibilityRole="button"
                  >
                    <Text className="text-primary text-base font-medium">
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={pickerDate}
                  onChange={(_event, picked) => {
                    if (picked) setDate(formatDateAsString(picked));
                  }}
                  mode="date"
                  display="spinner"
                  maximumDate={new Date()}
                  textColor={colors.text.primary}
                  locale="en"
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={pickerDate}
            onChange={(event, picked) => {
              setShowDatePicker(false);
              if (event.type === "set" && picked) {
                setDate(formatDateAsString(picked));
              }
            }}
            mode="date"
            display="default"
            maximumDate={new Date()}
          />
        ))}
    </Modal>
  );
}
