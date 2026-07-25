import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { AnalyticsEvent, trackEvent } from "@/lib/analytics-events";
import {
  type FeedbackEffort,
  type FeedbackEndedEarlyReason,
  type FeedbackNoteSource,
  type FeedbackTimeFit,
  savePlanDayFeedback,
} from "@/lib/feedback";
import { type ThemeColorPalette, useThemeColors } from "@/lib/theme";
import {
  type FeedbackCadenceState,
  type FeedbackPromptVariant,
  registerAnswer,
  registerSummaryView,
} from "@/utils/feedback-cadence";

import VoiceInputButton from "./voice-input-button";

const CADENCE_KEY = "@workout_feedback_cadence";

const EFFORT_OPTIONS: { value: FeedbackEffort; label: string }[] = [
  { value: "too_easy", label: "Too easy" },
  { value: "just_right", label: "Just right" },
  { value: "too_hard", label: "Too hard" },
];

const TIME_OPTIONS: { value: FeedbackTimeFit; label: string }[] = [
  { value: "finished_early", label: "Finished early" },
  { value: "about_right", label: "About right" },
  { value: "ran_out", label: "Ran out of time" },
];

const ENDED_EARLY_OPTIONS: {
  value: FeedbackEndedEarlyReason;
  label: string;
}[] = [
  { value: "ran_out_of_time", label: "Ran out of time" },
  { value: "too_hard", label: "Too hard" },
  { value: "something_hurt", label: "Something hurt" },
  { value: "lost_interest", label: "Lost interest" },
  // Deliberate: separates a phone call from real churn intent.
  { value: "interrupted", label: "Just got interrupted" },
];

const OPTION_LABELS: Record<string, string> = Object.fromEntries(
  [...EFFORT_OPTIONS, ...TIME_OPTIONS, ...ENDED_EARLY_OPTIONS].map((o) => [
    o.value,
    o.label,
  ])
);

/**
 * Confirmation copy must close the loop: reference what the user said and
 * what will change. Never a generic "Thanks for your feedback!".
 */
export function buildFeedbackConfirmation(
  effort: FeedbackEffort | null,
  timeFit: FeedbackTimeFit | null,
  prescribedMinutes?: number | null
): string {
  const minutes = prescribedMinutes
    ? `your ${prescribedMinutes} minutes`
    : "your session time";
  const intensity =
    effort === "too_hard"
      ? "dial back the intensity"
      : effort === "too_easy"
        ? "turn up the intensity"
        : null;
  const volume =
    timeFit === "ran_out"
      ? `trim the volume so sessions fit ${minutes}`
      : timeFit === "finished_early"
        ? `add a bit more so sessions fill ${minutes}`
        : null;

  const changes = [intensity, volume].filter(Boolean);
  if (changes.length === 0) {
    return "Got it — next week's sessions will stay on this track.";
  }
  return `Got it — we'll ${changes.join(" and ")} in your next sessions.`;
}

function endedEarlyConfirmation(reason: FeedbackEndedEarlyReason): string {
  switch (reason) {
    case "ran_out_of_time":
      return "Got it — we'll trim the volume so sessions fit your time.";
    case "too_hard":
      return "Got it — we'll dial back the intensity next time.";
    case "something_hurt":
      return "Got it — we'll work around that in your next sessions.";
    case "lost_interest":
      return "Got it — we'll mix up the style of your next sessions.";
    case "interrupted":
      return "No problem — life happens. Nothing changes.";
  }
}

interface WorkoutFeedbackCardProps {
  planDayId: number;
  workoutId: number;
  wasEndedEarly: boolean;
  durationSeconds: number;
  prescribedMinutes?: number | null;
  /** Ended-early only: hidden after "Skip for now" (link lives in the summary). */
  skipped?: boolean;
  /** Fired on the first saved answer — the summary hides "Skip for now". */
  onAnswered?: () => void;
}

/**
 * Post-workout feedback card, mounted inline in the workout summary between
 * the header and the block breakdown. Never a modal, no dismiss, no submit —
 * ignoring it costs zero taps and every tap saves immediately. Effort and
 * time stay two separate questions (intensity vs. volume levers).
 */
export default function WorkoutFeedbackCard({
  planDayId,
  workoutId,
  wasEndedEarly,
  durationSeconds,
  prescribedMinutes,
  skipped = false,
  onAnswered,
}: WorkoutFeedbackCardProps) {
  const colors = useThemeColors();
  // Reserved completion accent (MF-004/005); falls back for themes without it.
  const successColor =
    (colors as ThemeColorPalette).success ?? colors.brand.primary;
  const [variant, setVariant] = useState<FeedbackPromptVariant | null>(null);
  const [effort, setEffort] = useState<FeedbackEffort | null>(null);
  const [timeFit, setTimeFit] = useState<FeedbackTimeFit | null>(null);
  const [endedEarlyReason, setEndedEarlyReason] =
    useState<FeedbackEndedEarlyReason | null>(null);
  const [changingEffort, setChangingEffort] = useState(false);
  const [changingTime, setChangingTime] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const noteSourceRef = useRef<FeedbackNoteSource>("text");
  const cadenceRef = useRef<FeedbackCadenceState | null>(null);

  // Resolve which variant to show, advance the cadence counters, persist.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let stored: FeedbackCadenceState | null = null;
      try {
        const raw = await AsyncStorage.getItem(CADENCE_KEY);
        stored = raw ? JSON.parse(raw) : null;
      } catch {
        stored = null;
      }
      const today = new Date();
      const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const { state, variant: resolved, reason } = registerSummaryView(stored, {
        workoutId,
        planDayId,
        wasEndedEarly,
        todayISO,
        durationSeconds,
        prescribedMinutes,
      });
      if (cancelled) return;
      cadenceRef.current = state;
      AsyncStorage.setItem(CADENCE_KEY, JSON.stringify(state)).catch(() => {});
      setVariant(resolved);
      if (resolved !== "hidden") {
        trackEvent(AnalyticsEvent.WORKOUT_FEEDBACK_SHOWN, {
          variant: resolved,
          reason,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [planDayId, workoutId, wasEndedEarly, durationSeconds, prescribedMinutes]);

  const recordAnswer = () => {
    cadenceRef.current = registerAnswer(cadenceRef.current, {
      workoutId,
      planDayId,
    });
    AsyncStorage.setItem(CADENCE_KEY, JSON.stringify(cadenceRef.current)).catch(
      () => {}
    );
    onAnswered?.();
  };

  const trackAnswered = (
    nextEffort: FeedbackEffort | null,
    nextTimeFit: FeedbackTimeFit | null,
    hasNote: boolean,
    noteSource?: FeedbackNoteSource
  ) => {
    trackEvent(AnalyticsEvent.WORKOUT_FEEDBACK_ANSWERED, {
      effort: nextEffort ?? undefined,
      time_fit: nextTimeFit ?? undefined,
      has_note: hasNote,
      note_source: hasNote ? noteSource : undefined,
    });
  };

  const answerEffort = (value: FeedbackEffort) => {
    setEffort(value);
    setChangingEffort(false);
    void savePlanDayFeedback({ planDayId, effort: value });
    trackAnswered(value, timeFit, note.trim().length > 0, noteSourceRef.current);
    recordAnswer();
  };

  const answerTime = (value: FeedbackTimeFit) => {
    setTimeFit(value);
    setChangingTime(false);
    void savePlanDayFeedback({ planDayId, timeFit: value });
    trackAnswered(effort, value, note.trim().length > 0, noteSourceRef.current);
    recordAnswer();
  };

  const answerEndedEarly = (value: FeedbackEndedEarlyReason) => {
    setEndedEarlyReason(value);
    void savePlanDayFeedback({ planDayId, endedEarlyReason: value });
    trackEvent(AnalyticsEvent.WORKOUT_ENDED_EARLY_REASON, { reason: value });
    recordAnswer();
  };

  const saveNote = (text: string, source: FeedbackNoteSource) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    noteSourceRef.current = source;
    void savePlanDayFeedback({ planDayId, note: trimmed, noteSource: source });
    trackAnswered(effort, timeFit, true, source);
  };

  if (!variant || variant === "hidden" || skipped) return null;

  // ── Ended early: one question, five stacked options, asked every time ──
  if (wasEndedEarly) {
    return (
      <View className="mx-4 mb-4 bg-card rounded-xl p-4">
        {endedEarlyReason ? (
          <View className="flex-row items-start">
            <Ionicons name="checkmark" size={18} color={successColor} />
            <Text className="text-sm font-semibold text-text-primary ml-2 flex-1">
              {endedEarlyConfirmation(endedEarlyReason)}
            </Text>
          </View>
        ) : (
          <>
            <Text className="text-lg font-bold text-text-primary">
              What happened?
            </Text>
            <Text className="text-sm text-text-muted mt-1 mb-3">
              One tap — it helps us build something you'll finish.
            </Text>
            {ENDED_EARLY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                className="bg-surface border border-neutral-medium-1 rounded-xl px-4 py-3 mb-2"
                style={{ minHeight: 44, justifyContent: "center" }}
                onPress={() => answerEndedEarly(option.value)}
                accessibilityRole="button"
                accessibilityLabel={option.label}
              >
                <Text className="text-sm font-medium text-text-secondary">
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </View>
    );
  }

  // ── Collapsed: a quiet ~48px row; tapping expands in place ──
  if (variant === "collapsed" && !effort && !timeFit) {
    return (
      <TouchableOpacity
        className="mx-4 mb-4 flex-row items-center justify-between bg-surface border border-neutral-medium-1 rounded-xl px-4"
        style={{ minHeight: 48 }}
        onPress={() => setVariant("expanded")}
        accessibilityRole="button"
        accessibilityLabel="How did that go? Expand to answer"
      >
        <Text className="text-sm font-medium text-text-primary">
          How did that go?
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.text.muted} />
      </TouchableOpacity>
    );
  }

  const bothAnswered = effort !== null && timeFit !== null;
  const anyAnswered = effort !== null || timeFit !== null;

  const renderChips = <T extends string>(
    options: { value: T; label: string }[],
    selected: T | null,
    onSelect: (value: T) => void
  ) => (
    <View className="flex-row" style={{ gap: 8 }}>
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <TouchableOpacity
            key={option.value}
            className={`flex-1 rounded-xl px-2 py-3 items-center justify-center ${
              isSelected
                ? "bg-primary"
                : "bg-surface border border-neutral-medium-1"
            }`}
            style={{ minHeight: 44 }}
            onPress={() => onSelect(option.value)}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: isSelected }}
          >
            <Text
              className={`text-sm text-center ${
                isSelected
                  ? "text-content-on-primary font-semibold"
                  : "text-text-secondary font-medium"
              }`}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // Answered question → collapsed line with a Change affordance. hitSlop, not
  // padding — padding would inflate the row and defeat the collapse.
  const renderAnsweredRow = (
    label: string,
    value: string,
    onChange: () => void
  ) => (
    <View className="flex-row items-center py-1.5">
      <Ionicons name="checkmark" size={16} color={successColor} />
      <Text className="text-sm text-text-muted ml-2">
        {label} ·{" "}
        <Text className="font-semibold text-text-primary">
          {OPTION_LABELS[value] || value}
        </Text>
      </Text>
      <View className="flex-1" />
      <TouchableOpacity
        onPress={onChange}
        hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={`Change ${label.toLowerCase()} answer`}
      >
        <Text className="text-sm font-medium text-text-muted">Change</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="mx-4 mb-4 bg-card rounded-xl p-4">
      <Text className="text-lg font-bold text-text-primary">
        How did that go?
      </Text>
      {!anyAnswered && (
        <Text className="text-sm text-text-muted mt-1">
          Two taps. It shapes your next workout.
        </Text>
      )}

      {/* Effort */}
      {effort && !changingEffort ? (
        <View className="mt-2">
          {renderAnsweredRow("Effort", effort, () => setChangingEffort(true))}
        </View>
      ) : (
        <View className="mt-3">
          <Text className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
            Effort
          </Text>
          {renderChips(EFFORT_OPTIONS, effort, answerEffort)}
        </View>
      )}

      {/* Time */}
      {timeFit && !changingTime ? (
        renderAnsweredRow("Time", timeFit, () => setChangingTime(true))
      ) : (
        <View className="mt-3">
          <Text className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
            Time
          </Text>
          {renderChips(TIME_OPTIONS, timeFit, answerTime)}
        </View>
      )}

      {/* Confirmation — closes the loop once both are answered */}
      {bothAnswered && (
        <View className="flex-row items-start bg-surface border border-neutral-medium-1 rounded-xl px-3.5 py-3 mt-3">
          <Ionicons name="checkmark" size={16} color={successColor} />
          <Text className="text-sm font-semibold text-text-primary ml-2 flex-1">
            {buildFeedbackConfirmation(effort, timeFit, prescribedMinutes)}
          </Text>
        </View>
      )}

      {/* Note affordance appears only after the first answer — up front it
          makes a two-tap ask look like a writing assignment. */}
      {anyAnswered &&
        (noteOpen ? (
          <View className="mt-3">
            <TextInput
              className="bg-surface border border-neutral-medium-1 rounded-xl text-sm text-text-primary p-3"
              style={{ minHeight: 72, textAlignVertical: "top" }}
              placeholder="Anything else about this workout?"
              placeholderTextColor={colors.text.muted}
              value={note}
              onChangeText={setNote}
              onEndEditing={() => saveNote(note, "text")}
              multiline
            />
          </View>
        ) : (
          <View className="flex-row items-center mt-3">
            <Text className="text-sm font-medium text-text-primary flex-1">
              Add a note
            </Text>
            <VoiceInputButton
              surface="feedback"
              onTranscript={(text) => {
                const next = note.trim() ? `${note.trimEnd()} ${text}` : text;
                setNote(next);
                setNoteOpen(true);
                saveNote(next, "voice");
              }}
            />
            <TouchableOpacity
              className="size-11 bg-surface border border-neutral-medium-1 rounded-md items-center justify-center ml-2"
              onPress={() => setNoteOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Type a note"
            >
              <Ionicons
                name="keypad-outline"
                size={18}
                color={colors.text.primary}
              />
            </TouchableOpacity>
          </View>
        ))}
    </View>
  );
}
