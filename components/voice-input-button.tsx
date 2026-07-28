import { Ionicons } from "@expo/vector-icons";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "@jamsch/expo-speech-recognition";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";

import { AnalyticsEvent, trackEvent } from "@/lib/analytics-events";
import { useThemeColors } from "@/lib/theme";

interface VoiceInputButtonProps {
  /** Where the control lives — carried on the voice_input_used event. */
  surface: "adjust" | "feedback";
  /** Final transcript when the user stops recording. Callers append; never replace. */
  onTranscript: (text: string) => void;
  disabled?: boolean;
  /** Optional: fires true when recording starts, false when it ends. Lets a
   *  host swap its own copy (e.g. a "Listening…" prompt). Purely additive —
   *  existing callers that omit it are unaffected. */
  onRecordingChange?: (recording: boolean) => void;
}

const METER_BARS = 7;

/**
 * Shared dictation control (Adjust modal notes + feedback card). Idle: a
 * 44×44 mic button. Recording: stop control + level meter + elapsed time.
 * Emits the combined final transcript once, when recognition ends — the
 * caller appends it to its own text state and the user can edit before
 * submitting. The meter is decorative: this library version exposes no
 * volume events.
 */
export default function VoiceInputButton({
  surface,
  onTranscript,
  disabled = false,
  onRecordingChange,
}: VoiceInputButtonProps) {
  const colors = useThemeColors();
  const [recording, setRecording] = useState(false);

  // Notify the host on every recording-state edge (start/stop/error/abort).
  useEffect(() => {
    onRecordingChange?.(recording);
    // Intentionally keyed only on `recording`; the callback is a stable-enough
    // host handler and re-notifying on its identity change would be noise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [meterHeights, setMeterHeights] = useState<number[]>(
    Array(METER_BARS).fill(6)
  );

  // Final transcript segments accumulated across result events; emitted on end.
  const segmentsRef = useRef<string[]>([]);
  const startedAtRef = useRef<number>(0);

  useSpeechRecognitionEvent("result", (event) => {
    if (event.isFinal && event.results[0]?.transcript) {
      segmentsRef.current.push(event.results[0].transcript.trim());
    }
  });

  useSpeechRecognitionEvent("end", () => {
    setRecording(false);
    const transcript = segmentsRef.current.join(" ").trim();
    segmentsRef.current = [];
    if (transcript) {
      onTranscript(transcript);
      trackEvent(AnalyticsEvent.VOICE_INPUT_USED, {
        surface,
        duration_ms: Date.now() - startedAtRef.current,
      });
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    setRecording(false);
    segmentsRef.current = [];
    // "no-speech" is just silence; "aborted" is a deliberate cancel (ours or
    // the OS's) — neither is a failure the user needs an alert for.
    if (event.error === "no-speech" || event.error === "aborted") return;
    // Recognizer-level failures (Siri/Dictation disabled, assets missing,
    // "Failed to initialize recognizer") mean the device can't do speech
    // recognition at all — notably the iOS Simulator, which has no dictation
    // stack. Say that instead of leaking the raw OS error.
    const serviceUnavailable =
      event.error === "service-not-allowed" ||
      event.error === "language-not-supported" ||
      (event.message || "").includes("initialize recognizer");
    Alert.alert(
      "Voice input unavailable",
      serviceUnavailable
        ? "Speech recognition isn't available on this device. Check that Siri & Dictation are enabled in Settings. (It also doesn't work on the iOS Simulator — use a physical device.)"
        : event.message || event.error
    );
  });

  // Elapsed clock + decorative meter while recording.
  useEffect(() => {
    if (!recording) {
      setElapsedSeconds(0);
      setMeterHeights(Array(METER_BARS).fill(6));
      return;
    }
    const clock = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    const meter = setInterval(
      () =>
        setMeterHeights(
          Array.from({ length: METER_BARS }, () => 4 + Math.random() * 14)
        ),
      150
    );
    return () => {
      clearInterval(clock);
      clearInterval(meter);
    };
  }, [recording]);

  // Don't leave the recognizer running if the host screen unmounts
  // mid-recording. Read through a ref so this cleanup runs ONLY on unmount —
  // keying it on `recording` made it abort() after every normal stop, which
  // the library surfaces as an "aborted" error.
  const recordingRef = useRef(false);
  recordingRef.current = recording;
  useEffect(() => {
    return () => {
      if (recordingRef.current) ExpoSpeechRecognitionModule.abort();
    };
  }, []);

  const startRecording = async () => {
    try {
      const permission =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Microphone access needed",
          "Allow microphone and speech recognition access in Settings to dictate notes."
        );
        return;
      }
      segmentsRef.current = [];
      startedAtRef.current = Date.now();
      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        continuous: true,
      });
      setRecording(true);
    } catch {
      // Native module absent (Expo Go / stale dev client) — needs a rebuild.
      Alert.alert(
        "Voice input unavailable",
        "This build doesn't include speech recognition yet. Type your note instead."
      );
    }
  };

  const stopRecording = () => {
    ExpoSpeechRecognitionModule.stop();
  };

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = String(elapsedSeconds % 60).padStart(2, "0");

  if (recording) {
    return (
      <View className="flex-row items-center bg-surface border border-neutral-medium-1 rounded-md px-2 py-1">
        <TouchableOpacity
          className="size-9 bg-danger rounded-md items-center justify-center"
          onPress={stopRecording}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Stop dictation"
        >
          <Ionicons name="stop" size={16} color={colors.neutral.white} />
        </TouchableOpacity>
        <View
          className="flex-row items-end mx-3"
          style={{ height: 20 }}
          accessibilityElementsHidden
        >
          {meterHeights.map((h, i) => (
            <View
              key={i}
              className="bg-text-muted rounded-full"
              style={{ width: 2.5, height: h, marginHorizontal: 1.5 }}
            />
          ))}
        </View>
        <Text
          className="text-sm text-text-primary font-medium"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {minutes}:{seconds}
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      className="size-11 bg-surface border border-neutral-medium-1 rounded-md items-center justify-center"
      onPress={startRecording}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Dictate a note"
    >
      <Ionicons name="mic-outline" size={20} color={colors.text.primary} />
    </TouchableOpacity>
  );
}
