import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  Share,
  Switch,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import IconButton from "@/components/icon-button";
import { SkeletonLoader } from "@/components/skeletons/skeleton-loader";
import Text from "@/components/text";
import {
  createShareLink,
  fetchSharePreview,
  type ShareKind,
  type ShareNameStyle,
  type ShareRequestParams,
} from "@/lib/share";
import { type ThemeColorPalette,useThemeColors } from "@/lib/theme";

interface ShareWorkoutSheetProps {
  visible: boolean;
  onClose: () => void;
  planDayId: number;
  kind: ShareKind;
  /** Used to pre-fill the editable share text (§6). */
  workoutName?: string;
  /** completion | calendar — rides the share-created analytics surface. */
  surface?: "completion" | "calendar";
}

// expo-clipboard / expo-file-system / expo-media-library are NATIVE modules.
// Load them lazily and defensively so the sheet still imports (and Share via
// RN's built-in works) on a dev client that predates them — a fresh native
// build lights up Copy link / Save image / image attachment. A top-level import
// would crash the whole screen with "Cannot find native module".
const loadClipboard = () => {
  try {
    return require("expo-clipboard");
  } catch {
    return null;
  }
};
// v19 moved the classic download API to /legacy (cache-dir download).
const loadFileSystem = () => {
  try {
    return require("expo-file-system/legacy");
  } catch {
    return null;
  }
};
const loadMediaLibrary = () => {
  try {
    return require("expo-media-library");
  } catch {
    return null;
  }
};

const NAME_OPTIONS: { style: ShareNameStyle; label: string }[] = [
  { style: "first", label: "First name" },
  { style: "full", label: "Full name" },
  { style: "anonymous", label: "Anonymous" },
];

/**
 * The share sheet (frame 2 of screens/04-share-flow.png). Opening it mints
 * NOTHING (§3.3): the preview is a real render served from a signed token, and
 * a public link is created only when the user taps Share / Copy link / Save
 * image. Flipping a toggle re-fetches the preview; it never accumulates codes.
 */
export default function ShareWorkoutSheet({
  visible,
  onClose,
  planDayId,
  kind,
  workoutName,
}: ShareWorkoutSheetProps) {
  const colors = useThemeColors();
  const successColor =
    (colors as ThemeColorPalette).success ?? colors.brand.primary;
  // Scale the 4:5 preview to the sheet width instead of a fixed 216px, capped so
  // it stays a comfortable card on large phones/tablets.
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.min(Math.round(screenWidth * 0.74), 320);

  const [showWeights, setShowWeights] = useState(false);
  const [showStreak, setShowStreak] = useState(true);
  const [nameStyle, setNameStyle] = useState<ShareNameStyle>("first");

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const params: ShareRequestParams = {
    planDayId,
    kind,
    // planned cards never carry weights (§4.2) — force off regardless of toggle
    showWeights: kind === "planned" ? false : showWeights,
    showStreak,
    nameStyle,
  };

  // Re-fetch the preview whenever the sheet opens or a toggle changes. Nothing
  // is persisted here.
  const refreshPreview = useCallback(async () => {
    setLoadingPreview(true);
    setPreviewFailed(false);
    const url = await fetchSharePreview(params);
    setPreviewUrl(url);
    if (!url) setPreviewFailed(true); // backend unreachable / share routes not up
    setLoadingPreview(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planDayId, kind, showWeights, showStreak, nameStyle]);

  useEffect(() => {
    if (visible) refreshPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, showWeights, showStreak, nameStyle]);

  // Reset toggles each time the sheet opens fresh.
  useEffect(() => {
    if (visible) {
      setShowWeights(false);
      setShowStreak(true);
      setNameStyle("first");
    }
  }, [visible]);

  const prefilledText = () => {
    const name = workoutName || "my workout";
    return kind === "planned"
      ? `${name} if you want it. →`
      : `${name} — done. →`;
  };

  // Download the rendered card to a local file so the native sheet can attach
  // the IMAGE (not just the URL). Returns a file:// uri or null.
  const downloadCard = async (cardUrl: string): Promise<string | null> => {
    const FileSystem = loadFileSystem();
    if (!FileSystem?.cacheDirectory) return null;
    try {
      const target = `${FileSystem.cacheDirectory}mastersfit-share.png`;
      const { uri } = await FileSystem.downloadAsync(cardUrl, target);
      return uri;
    } catch {
      return null;
    }
  };

  const withMintedLink = async (
    fn: (link: { code: string; url: string; cardUrl: string }) => Promise<void>
  ) => {
    if (busy) return;
    setBusy(true);
    try {
      const link = await createShareLink(params);
      if (!link) return;
      await fn(link);
    } finally {
      setBusy(false);
    }
  };

  const onShare = () =>
    withMintedLink(async (link) => {
      const fileUri = await downloadCard(link.cardUrl);
      const message = `${prefilledText()} ${link.url}`;
      // iOS attaches the file image + carries the message; Android uses message
      // (text + link). Feeds that strip images still get the link's OG preview.
      await Share.share(
        Platform.OS === "ios" && fileUri
          ? { url: fileUri, message }
          : { message }
      );
    });

  const onCopyLink = () =>
    withMintedLink(async (link) => {
      const Clipboard = loadClipboard();
      if (Clipboard?.setStringAsync) {
        await Clipboard.setStringAsync(link.url);
      } else {
        // No native clipboard in this binary — fall back to the share sheet.
        await Share.share({ message: link.url });
      }
    });

  const onSaveImage = () =>
    withMintedLink(async (link) => {
      const MediaLibrary = loadMediaLibrary();
      if (!MediaLibrary?.requestPermissionsAsync) {
        Alert.alert("Update the app", "Saving images needs the latest app build.");
        return;
      }
      const fileUri = await downloadCard(link.cardUrl);
      if (!fileUri) return;
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) return;
      await MediaLibrary.saveToLibraryAsync(fileUri);
    });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(10,10,10,0.45)" }}>
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Close share sheet" />
        <View className="bg-background rounded-t-3xl pb-8 overflow-hidden">
          {/* Grabber */}
          <View className="items-center pt-2 pb-1">
            <View className="w-10 h-1 rounded-full bg-neutral-medium-1" />
          </View>

          {/* Header */}
          <View className="flex-row items-center px-5 pb-2">
            <IconButton icon="close" accessibilityLabel="Close" onPress={onClose} />
            <Text className="flex-1 text-center text-base font-semibold text-text-primary mr-11">
              Share workout
            </Text>
          </View>

          {/* Live card preview — the real rendered image from the one renderer
              (§5.3). Never drawn on-device, so a blank here means the renderer
              (the website /w/preview endpoint) isn't reachable in this env. */}
          <View className="px-6 pt-2 pb-4 items-center">
            <View
              className="rounded-xl overflow-hidden bg-surface items-center justify-center"
              style={{ width: cardWidth, aspectRatio: 4 / 5 }}
            >
              {loadingPreview ? (
                <SkeletonLoader width="100%" height="100%" />
              ) : previewFailed || !previewUrl ? (
                <View className="items-center px-5">
                  <Ionicons name="image-outline" size={28} color={colors.text.muted} />
                  <Text className="text-xs text-text-muted text-center mt-2">
                    Preview unavailable — you can still share the link.
                  </Text>
                </View>
              ) : (
                <Image
                  source={{ uri: previewUrl }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="contain"
                  accessibilityLabel="Preview of the workout card"
                  onError={() => setPreviewFailed(true)}
                />
              )}
            </View>
          </View>

          {/* Toggles */}
          {kind !== "planned" ? (
            <View className="flex-row items-center justify-between px-6 py-3 border-t border-neutral-light-2">
              <View className="flex-1 pr-4">
                <Text className="text-base text-text-primary">Show weights</Text>
                <Text className="text-sm text-text-muted mt-0.5">Off by default</Text>
              </View>
              <Switch
                value={showWeights}
                onValueChange={setShowWeights}
                trackColor={{ false: colors.neutral.medium[1], true: successColor }}
                thumbColor={Platform.OS === "android" ? colors.text.primary : undefined}
                ios_backgroundColor={colors.neutral.medium[1]}
                accessibilityLabel="Show weights on the card"
                accessibilityState={{ checked: showWeights }}
              />
            </View>
          ) : null}

          <View className="flex-row items-center justify-between px-6 py-3 border-t border-neutral-light-2">
            <Text className="text-base text-text-primary">Show my streak</Text>
            <Switch
              value={showStreak}
              onValueChange={setShowStreak}
              trackColor={{ false: colors.neutral.medium[1], true: successColor }}
              thumbColor={Platform.OS === "android" ? colors.text.primary : undefined}
              ios_backgroundColor={colors.neutral.medium[1]}
              accessibilityLabel="Show my streak on the card"
              accessibilityState={{ checked: showStreak }}
            />
          </View>

          {/* Name on card */}
          <View className="px-6 py-3 border-y border-neutral-light-2">
            <Text className="text-base text-text-primary mb-2">Name on card</Text>
            <View className="flex-row" style={{ gap: 8 }}>
              {NAME_OPTIONS.map((opt) => {
                const active = nameStyle === opt.style;
                return (
                  <TouchableOpacity
                    key={opt.style}
                    onPress={() => setNameStyle(opt.style)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={opt.label}
                    className={`flex-1 items-center justify-center rounded-xl py-3 border ${
                      active ? "bg-primary border-primary" : "bg-card border-neutral-light-2"
                    }`}
                    style={{ minHeight: 44 }}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        active ? "text-content-on-primary" : "text-text-primary"
                      }`}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Primary + secondary actions */}
          <View className="px-6 pt-5">
            <TouchableOpacity
              onPress={onShare}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Share"
              className="bg-primary rounded-xl py-4 items-center flex-row justify-center"
              style={{ opacity: busy ? 0.6 : 1, minHeight: 44 }}
            >
              <Text className="text-content-on-primary font-semibold text-base">Share…</Text>
            </TouchableOpacity>

            <View className="flex-row mt-3" style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={onCopyLink}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Copy link"
                className="flex-1 items-center justify-center rounded-xl py-3 border border-neutral-medium-1"
                style={{ minHeight: 44 }}
              >
                <Text className="text-base font-semibold text-text-primary">Copy link</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onSaveImage}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Save image"
                className="flex-1 items-center justify-center rounded-xl py-3 border border-neutral-medium-1"
                style={{ minHeight: 44 }}
              >
                <Text className="text-base font-semibold text-text-primary">Save image</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-text-muted text-center mt-4 px-2">
              Anyone with the link can see this workout until you revoke it in Settings.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
