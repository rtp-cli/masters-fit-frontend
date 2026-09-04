import * as Application from "expo-application";
import Constants from "expo-constants";
import { requireOptionalNativeModule } from "expo-modules-core";
import { Text, TouchableOpacity, View } from "react-native";

/**
 * Short OTA update id, or null when this JS is the bundle embedded in the
 * binary, or when expo-updates isn't linked (dev clients, Expo Go).
 *
 * Gated on requireOptionalNativeModule rather than try/catch alone. expo-updates
 * calls requireNativeModule("ExpoUpdates") at MODULE scope, and that reports the
 * failure to React Native's global error handler *before* it throws -- so a bare
 * try/catch keeps this screen alive but still puts a red box in front of it on
 * every dev client without the module. requireOptionalNativeModule returns null
 * instead of throwing, so the unlinked case becomes a plain branch. The
 * try/catch stays for the case where the module exists but misbehaves.
 */
function getOtaUpdateId(): string | null {
  if (!requireOptionalNativeModule("ExpoUpdates")) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Updates = require("expo-updates");
    if (Updates.isEmbeddedLaunch || !Updates.updateId) return null;
    return String(Updates.updateId).split("-")[0];
  } catch {
    return null;
  }
}

interface AppVersionSectionProps {
  tapCount: number;
  onTap: () => void;
}

export default function AppVersionSection({
  tapCount,
  onTap,
}: AppVersionSectionProps) {
  // Get app version from expo constants
  const appVersion = Constants.expoConfig?.version || "1.0.0";
  const appName = Constants.expoConfig?.name || "MastersFit";
  // Native build number (iOS buildNumber / Android versionCode) comes from the
  // installed binary, NOT expoConfig — EAS manages versions remotely
  // (appVersionSource: "remote"), so app.json never has it. Null in Expo Go.
  const buildNumber = Application.nativeBuildVersion;
  // When running an OTA bundle, its id is the only way to tell WHICH JS is
  // live — the version/build above stay the same across every eas update.
  // isEmbeddedLaunch means "the JS baked into the binary" (no OTA applied);
  // updateId is null in dev, so the line simply doesn't render there.
  //
  // Resolved lazily, never as a top-level import: a static
  // `import * as Updates from "expo-updates"` throws during module evaluation
  // in any binary without the ExpoUpdates native module, and this file is
  // reached from calendar-screen → header → settings-modal → settings-view, so
  // that throw took out the Calendar tab too. See getOtaUpdateId above.
  const otaUpdateId = getOtaUpdateId();

  return (
    <View className="items-center pb-8">
      <TouchableOpacity
        onPress={onTap}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
      >
        <Text
          className={`text-xs text-text-muted`}
          style={{
            transform: tapCount > 0 ? [{ scale: 1.05 }] : [{ scale: 1 }],
            fontWeight:
              tapCount === 0
                ? "normal"
                : tapCount === 1
                  ? "100"
                  : tapCount === 2
                    ? "200"
                    : tapCount === 3
                      ? "300"
                      : tapCount === 4
                        ? "400"
                        : "500",
          }}
        >
          {appName} v{appVersion}
          {buildNumber ? ` (${buildNumber})` : ""}
        </Text>
      </TouchableOpacity>
      {/* Same xs size as the version line (the config's floor, MF-008) —
          hierarchy comes from opacity instead. */}
      {otaUpdateId && (
        <Text className="text-xs text-text-muted opacity-60 mt-1">
          update {otaUpdateId}
        </Text>
      )}
    </View>
  );
}
