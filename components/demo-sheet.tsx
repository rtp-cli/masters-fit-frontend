import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

import IconButton from "@/components/icon-button";
import { type DemoSurface, trackVideoEngagement } from "@/lib/analytics";
import {
  checkYouTubeVideo,
  processExerciseLink,
} from "@/lib/exercise-video";
import { useThemeColors } from "@/lib/theme";

import Text from "./text";

export interface DemoSheetEntry {
  exerciseId: number;
  exerciseName: string;
  link: string;
  /** Form cue / description shown under the player. */
  description?: string | null;
}

interface DemoSheetProps {
  visible: boolean;
  /** The demos in the tapped exercise's block; prev/next steps through them. */
  entries: DemoSheetEntry[];
  /** Which entry to open on. */
  initialIndex: number;
  /** Where the sheet was opened from — rides the demo-open analytics event. */
  surface?: DemoSurface;
  onClose: () => void;
}

/**
 * The one place a demo video plays. Every Demo/Demos chip opens this sheet;
 * the video autoplays muted (deliberate tap, but gyms and quiet rooms argue
 * against surprise sound) with a prominent tap-for-sound control. The sheet
 * overlays the caller, so dismissing it lands the user exactly where they
 * were — no remount, no scroll jump.
 */
export default function DemoSheet({
  visible,
  entries,
  initialIndex,
  surface,
  onClose,
}: DemoSheetProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();

  const [index, setIndex] = useState(initialIndex);
  const [channel, setChannel] = useState<string | undefined>(undefined);
  const [unavailable, setUnavailable] = useState(false);
  const [muted, setMuted] = useState(true);
  const webViewRef = useRef<WebView>(null);

  // Re-anchor to the tapped exercise each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setIndex(initialIndex);
      setMuted(true);
    }
  }, [visible, initialIndex]);

  const entry = entries[index];
  const videoId = useMemo(
    () => (entry ? processExerciseLink(entry.link).videoId : undefined),
    [entry],
  );

  // Per-video state resets when stepping prev/next.
  useEffect(() => {
    setUnavailable(false);
    setChannel(undefined);
    setMuted(true);
    if (!visible || !entry || !videoId) return;

    trackVideoEngagement({
      exercise_id: entry.exerciseId,
      exercise_name: entry.exerciseName,
      video_url: entry.link,
      surface,
    }).catch(() => {});

    let cancelled = false;
    checkYouTubeVideo(videoId).then((result) => {
      if (cancelled) return;
      if (result.status === "dead") setUnavailable(true);
      else setChannel(result.channel);
    });
    return () => {
      cancelled = true;
    };
    // entry/videoId change together; visible re-runs for reopen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, videoId]);

  if (!entry) return null;

  const playerHeight = Math.round((width * 9) / 16);
  const prev = index > 0 ? entries[index - 1] : undefined;
  const next = index < entries.length - 1 ? entries[index + 1] : undefined;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(10,10,10,0.45)" }}
      >
        {/* Tap outside the sheet to dismiss */}
        <Pressable
          className="flex-1"
          onPress={onClose}
          accessibilityLabel="Close demo"
        />
        <View className="bg-background rounded-t-3xl pb-8 overflow-hidden">
          {/* Grabber */}
          <View className="items-center pt-2 pb-1">
            <View className="w-10 h-1 rounded-full bg-neutral-medium-1" />
          </View>

          {/* Header row */}
          <View className="flex-row items-center px-5 pb-3">
            <View className="flex-1 mr-3">
              <Text
                className="text-lg font-bold text-text-primary"
                numberOfLines={1}
              >
                {entry.exerciseName}
              </Text>
              <Text className="text-xs text-text-muted mt-1" numberOfLines={1}>
                {unavailable
                  ? "Demo unavailable"
                  : `Demo${channel ? ` · ${channel}` : ""}`}
              </Text>
            </View>
            <IconButton
              icon="close"
              accessibilityLabel="Close demo"
              onPress={onClose}
            />
          </View>

          {/* Player, full-bleed 16:9 — or the unavailable panel. Never empty. */}
          {unavailable || !videoId ? (
            <View
              className="bg-brand-light-1 items-center justify-center"
              style={{ height: 160 }}
            >
              <Ionicons
                name="videocam-off-outline"
                size={30}
                color={colors.text.muted}
              />
              <Text className="text-sm text-text-muted mt-2">
                This demo is not available right now
              </Text>
            </View>
          ) : (
            <View style={{ height: playerHeight }} className="bg-black">
              {/* Muted autoplay via an embed iframe in a wrapper page —
                  YouTube's officially supported path. Loading the embed URL
                  as the top document fails (error 153: no referrer), and the
                  iframe-API playVideo() route is ignored by the embed player
                  in this WebView — which is exactly why the old inline player
                  always needed a second tap on YouTube's own play button. */}
              <WebView
                key={videoId}
                ref={webViewRef}
                originWhitelist={["*"]}
                source={{
                  baseUrl: "https://mastersfit.ai",
                  html: `<!DOCTYPE html><html><head>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>html,body{margin:0;padding:0;background:#000;height:100%;overflow:hidden}iframe{position:absolute;inset:0;width:100%;height:100%;border:0}</style>
                    </head><body>
                    <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&rel=0&enablejsapi=1"
                      allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
                    </body></html>`,
                }}
                style={{ backgroundColor: "#000" }}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                allowsFullscreenVideo
                onError={() => setUnavailable(true)}
                // Keep the sheet on the demo: block top-frame navigations away
                // from the wrapper (e.g. the "Watch on YouTube" overlay link).
                onShouldStartLoadWithRequest={(request) =>
                  !request.isTopFrame ||
                  request.url.startsWith("https://mastersfit.ai") ||
                  request.url.startsWith("about:")
                }
              />
              {muted ? (
                <TouchableOpacity
                  onPress={() => {
                    // The video element lives in the cross-origin embed
                    // iframe, so unmute goes through YouTube's widget-API
                    // postMessage protocol (enablejsapi=1 on the embed URL).
                    webViewRef.current?.injectJavaScript(
                      `(function(){var f=document.querySelector('iframe');if(f&&f.contentWindow){` +
                        `f.contentWindow.postMessage(JSON.stringify({event:'command',func:'unMute',args:[]}),'*');` +
                        `f.contentWindow.postMessage(JSON.stringify({event:'command',func:'playVideo',args:[]}),'*');}})();true;`,
                    );
                    setMuted(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Unmute demo video"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  className="absolute top-3 left-3 flex-row items-center rounded-full px-4 py-2.5"
                  style={{ backgroundColor: "rgba(10,10,10,0.75)" }}
                >
                  <Ionicons name="volume-mute" size={16} color="#FFFFFF" />
                  <Text
                    className="text-sm font-semibold"
                    color="#FFFFFF"
                    style={{ marginLeft: 6 }}
                  >
                    Tap for sound
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          {/* Form cue / description */}
          {entry.description ? (
            <Text className="text-sm text-text-secondary leading-5 px-5 pt-4">
              {entry.description}
            </Text>
          ) : null}

          {/* Close button in the unavailable state — the sheet must always
              offer an obvious way out even with no player to interact with. */}
          {unavailable || !videoId ? (
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="mx-5 mt-4 py-3 rounded-xl border border-neutral-medium-1 items-center"
            >
              <Text className="text-base font-semibold text-text-primary">
                Close
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* Prev / next through the block's other demos */}
          {prev || next ? (
            <View className="flex-row items-center justify-between px-5 pt-4">
              {prev ? (
                <TouchableOpacity
                  onPress={() => setIndex(index - 1)}
                  accessibilityRole="button"
                  accessibilityLabel={`Previous demo: ${prev.exerciseName}`}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  className="flex-row items-center flex-1 mr-2"
                >
                  <Ionicons
                    name="chevron-back"
                    size={16}
                    color={colors.text.muted}
                  />
                  <Text
                    className="text-sm text-text-muted ml-1"
                    numberOfLines={1}
                  >
                    {prev.exerciseName}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View className="flex-1 mr-2" />
              )}
              {next ? (
                <TouchableOpacity
                  onPress={() => setIndex(index + 1)}
                  accessibilityRole="button"
                  accessibilityLabel={`Next demo: ${next.exerciseName}`}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  className="flex-row items-center justify-end flex-1 ml-2"
                >
                  <Text
                    className="text-sm text-text-muted mr-1"
                    numberOfLines={1}
                  >
                    {next.exerciseName}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.text.muted}
                  />
                </TouchableOpacity>
              ) : (
                <View className="flex-1 ml-2" />
              )}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
