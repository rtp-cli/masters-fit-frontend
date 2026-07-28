import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import VoiceInputButton from "@/components/voice-input-button";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics-events";
import {
  type AppFeedbackCategory,
  type AppFeedbackNoteSource,
  buildDiagnostics,
  type FeedbackDiagnostics,
  formatDiagnosticsSummary,
  generateClientId,
  markPraiseForStoreReview,
  submitAppFeedback,
} from "@/lib/app-feedback";
import { type ThemeColorPalette, useThemeColors } from "@/lib/theme";
import { fetchActiveWorkout } from "@/lib/workouts";

const DRAFT_KEY = "@app_feedback_draft";

const CATEGORIES: {
  value: AppFeedbackCategory;
  label: string;
  placeholder: string;
}[] = [
  {
    value: "bug",
    label: "Report a bug",
    placeholder: "What happened? What were you doing just before?",
  },
  { value: "idea", label: "Share an idea", placeholder: "What would you like to see?" },
  { value: "praise", label: "Say thanks", placeholder: "What's working well?" },
  { value: "other", label: "Something else", placeholder: "Tell us more…" },
];

const HEADLINES: Record<AppFeedbackCategory, string> = {
  bug: "Got it — that's logged as a bug.",
  idea: "Thank you — we'll consider this as we plan what's next.",
  praise: "Thank you — that means a lot.",
  other: "Got it — a person reads every one of these.",
};

export default function FeedbackScreen() {
  const colors = useThemeColors();
  const successColor =
    (colors as ThemeColorPalette).success ?? colors.brand.primary;
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();

  const [category, setCategory] = useState<AppFeedbackCategory | null>(null);
  const [message, setMessage] = useState("");
  const [diagnosticsOn, setDiagnosticsOn] = useState(true);
  const [focused, setFocused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  // A rate-limit failure — retrying won't help until the window passes, so the
  // button shouldn't invite an instant "Try again".
  const [rateLimited, setRateLimited] = useState(false);
  const [sent, setSent] = useState<{
    category: AppFeedbackCategory;
    message: string;
  } | null>(null);

  // Stable per-draft idempotency key — the retry after a flaky send reuses it
  // so the server can't file the same report twice.
  const clientIdRef = useRef<string>(generateClientId());
  const noteSourceRef = useRef<AppFeedbackNoteSource>("text");
  const activePlanIdRef = useRef<number | null>(null);
  const draftLoadedRef = useRef(false);

  // Diagnostics values for the summary line — resolved once, refreshed after
  // the active plan id loads.
  const [diagnostics, setDiagnostics] = useState<FeedbackDiagnostics>(() =>
    buildDiagnostics({ activePlanId: null, lastRoute: from ?? null })
  );

  // Open: restore any draft, resolve the active plan id, track the event.
  useEffect(() => {
    trackEvent(AnalyticsEvent.APP_FEEDBACK_OPENED);
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (raw) {
          const draft = JSON.parse(raw);
          if (draft.clientId) clientIdRef.current = draft.clientId;
          if (typeof draft.message === "string") setMessage(draft.message);
          if (draft.category) setCategory(draft.category);
          if (typeof draft.diagnosticsOn === "boolean")
            setDiagnosticsOn(draft.diagnosticsOn);
        }
      } catch {
        // A missing/corrupt draft is not worth surfacing — start fresh.
      } finally {
        draftLoadedRef.current = true;
      }

      try {
        const workout = await fetchActiveWorkout();
        activePlanIdRef.current = workout?.id ?? null;
        setDiagnostics(
          buildDiagnostics({
            activePlanId: workout?.id ?? null,
            lastRoute: from ?? null,
          })
        );
      } catch {
        // Diagnostics is best-effort; leave activePlanId null on failure.
      }
    })();
    // Mount-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the draft on change (only after the initial load, so we never
  // overwrite a restored draft with the empty initial state).
  useEffect(() => {
    if (!draftLoadedRef.current || sent) return;
    if (!message.trim() && !category) {
      AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
      return;
    }
    AsyncStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        clientId: clientIdRef.current,
        category,
        message,
        diagnosticsOn,
      })
    ).catch(() => {});
  }, [category, message, diagnosticsOn, sent]);

  const canSend = message.trim().length > 0 && !sending;
  const placeholder = category
    ? CATEGORIES.find((c) => c.value === category)!.placeholder
    : "Tell us more…";

  const handleSend = async () => {
    if (!canSend) return;
    const effectiveCategory: AppFeedbackCategory = category ?? "other";
    const trimmed = message.trim();
    setSending(true);
    setSendError(null);
    setRateLimited(false);
    try {
      const diag = diagnosticsOn
        ? buildDiagnostics({
            activePlanId: activePlanIdRef.current,
            lastRoute: from ?? null,
          })
        : null;
      await submitAppFeedback({
        clientId: clientIdRef.current,
        category: effectiveCategory,
        message: trimmed,
        noteSource: noteSourceRef.current,
        diagnostics: diag,
      });
      trackEvent(AnalyticsEvent.APP_FEEDBACK_SENT, {
        category: effectiveCategory,
        note_source: noteSourceRef.current,
        length: trimmed.length,
        diagnostics_included: diagnosticsOn,
      });
      if (effectiveCategory === "praise") {
        void markPraiseForStoreReview();
      }
      await AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
      setSent({ category: effectiveCategory, message: trimmed });
    } catch (error) {
      // Keep every word; surface the reason inline (never a draft-dropping
      // dialog). A 429 is a rate limit, not a connection problem — say so, and
      // don't imply an instant retry will work.
      const status = (error as { status?: number })?.status;
      setRateLimited(status === 429);
      setSendError(
        status === 429
          ? "You've sent a lot of feedback in a short time. Please try again in a little while."
          : "Couldn't send. Check your connection and try again."
      );
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (message.trim().length > 0) {
      Alert.alert(
        "Discard this feedback?",
        "Your message hasn't been sent yet.",
        [
          { text: "Keep writing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              trackEvent(AnalyticsEvent.APP_FEEDBACK_ABANDONED);
              AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
              router.back();
            },
          },
        ]
      );
      return;
    }
    router.back();
  };

  // ── Sent state — no back control; Done is the only way out ──
  if (sent) {
    const support =
      sent.category === "bug"
        ? "It reached the team with your app version and device. If we need more detail to reproduce it, we'll email you."
        : sent.category === "praise"
          ? "Knowing which parts are working tells us what not to break."
          : sent.category === "idea"
            ? "Every idea is read by a person and weighed against what's next."
            : "A person reads every one of these.";

    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
        <View className="flex-row items-center justify-center px-4 py-3 border-b border-neutral-light-2">
          <Text className="text-lg font-bold text-text-primary">Feedback</Text>
        </View>

        <View className="flex-1 px-6 pt-10 items-center">
          <View
            className="rounded-full items-center justify-center mb-6"
            style={{
              width: 72,
              height: 72,
              backgroundColor: successColor + "1A",
            }}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={36}
              color={successColor}
            />
          </View>
          <Text className="text-xl font-bold text-text-primary text-center">
            {HEADLINES[sent.category]}
          </Text>
          <Text className="text-sm text-text-muted text-center mt-2 leading-5">
            {support}
          </Text>

          <View className="w-full bg-surface rounded-xl p-4 mt-6">
            <Text className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
              You sent
            </Text>
            <Text className="text-sm text-text-primary leading-5">
              {sent.message}
            </Text>
          </View>
        </View>

        <View className="px-6 pb-2">
          <TouchableOpacity
            className="w-full rounded-xl bg-primary items-center justify-center"
            style={{ paddingVertical: 16 }}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text className="text-base font-semibold text-content-on-primary">
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Form ──
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-neutral-light-2">
        <TouchableOpacity
          className="size-11 items-center justify-center"
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-bold text-text-primary">
          Feedback
        </Text>
        <View className="size-11" />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 24, gap: 20 }}
        >
          {/* Heading */}
          <View>
            <Text
              className="text-xl font-bold text-text-primary"
              style={{ letterSpacing: -0.3 }}
            >
              What's on your mind?
            </Text>
            <Text className="text-sm text-text-muted mt-1">
              A bug, an idea, or just a note of thanks.
            </Text>
          </View>

          {/* Category chips — 2×2 grid */}
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {CATEGORIES.map((c) => {
              const isSelected = category === c.value;
              return (
                <TouchableOpacity
                  key={c.value}
                  onPress={() => setCategory(c.value)}
                  accessibilityRole="button"
                  accessibilityLabel={c.label}
                  accessibilityState={{ selected: isSelected }}
                  className={`rounded-xl items-center justify-center ${
                    isSelected
                      ? "bg-primary"
                      : "bg-surface border border-neutral-medium-1"
                  }`}
                  style={{
                    // Two columns with an 8px gap inside 24px side padding.
                    width: "48%",
                    minHeight: 44,
                    padding: 12,
                  }}
                >
                  <Text
                    className={`text-sm text-center ${
                      isSelected
                        ? "text-content-on-primary font-semibold"
                        : "text-text-secondary font-medium"
                    }`}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Note */}
          <TextInput
            value={message}
            onChangeText={(t) => {
              noteSourceRef.current = "text";
              setMessage(t);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            placeholderTextColor={colors.text.muted}
            multiline
            textAlignVertical="top"
            accessibilityLabel="Your message"
            className={`rounded-xl text-sm text-text-primary ${
              focused
                ? "bg-background border border-brand-primary"
                : "bg-surface border border-neutral-medium-1"
            }`}
            style={{ height: 132, padding: 14 }}
          />

          {/* Voice input */}
          <View className="flex-row items-center">
            <Text className="flex-1 text-sm text-text-muted mr-3">
              {isRecording
                ? "Listening… tap stop when you're done."
                : "Prefer to talk? Tap the mic and just say it."}
            </Text>
            <VoiceInputButton
              surface="feedback"
              onRecordingChange={setIsRecording}
              onTranscript={(text) => {
                noteSourceRef.current = "voice";
                setMessage((prev) => (prev.trim() ? `${prev.trimEnd()} ${text}` : text));
              }}
            />
          </View>

          {/* Diagnostics — revealed once the user engages (matches screens
              01 vs 03: absent on the blank screen, present once there's
              something to send). */}
          {(category || message.trim().length > 0) && (
          <TouchableOpacity
            className="flex-row items-start"
            onPress={() => setDiagnosticsOn((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: diagnosticsOn }}
            accessibilityLabel="Include app and device info"
          >
            <View
              className={`items-center justify-center ${
                diagnosticsOn ? "bg-primary" : "border border-neutral-medium-2"
              }`}
              style={{ width: 22, height: 22, borderRadius: 8 }}
            >
              {diagnosticsOn && (
                <Ionicons
                  name="checkmark"
                  size={14}
                  color={colors.contentOnPrimary}
                />
              )}
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-sm text-text-primary">
                Include app and device info
              </Text>
              <Text className="text-xs text-text-muted mt-0.5">
                {formatDiagnosticsSummary(diagnostics)}
              </Text>
            </View>
          </TouchableOpacity>
          )}

          {/* Inline send error — never a dialog that could drop the draft */}
          {sendError && (
            <View className="flex-row items-center">
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={colors.danger}
              />
              <Text className="text-sm text-danger ml-2 flex-1">
                {sendError}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Send */}
        <View className="px-6 py-2">
          <TouchableOpacity
            disabled={!canSend}
            onPress={handleSend}
            accessibilityRole="button"
            accessibilityLabel={sendError && !rateLimited ? "Try again" : "Send"}
            className="w-full rounded-xl items-center justify-center"
            style={{
              paddingVertical: 16,
              backgroundColor: canSend
                ? colors.brand.primary
                : colors.neutral.medium[1],
            }}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.contentOnPrimary} />
            ) : (
              <Text
                className="text-base font-semibold"
                style={{ color: canSend ? colors.contentOnPrimary : "#9E9E9E" }}
              >
                {sendError && !rateLimited ? "Try again" : "Send"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
