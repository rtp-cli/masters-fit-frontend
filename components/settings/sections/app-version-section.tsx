import * as Application from "expo-application";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { Text, TouchableOpacity, View } from "react-native";

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
  const otaUpdateId =
    !Updates.isEmbeddedLaunch && Updates.updateId
      ? Updates.updateId.split("-")[0]
      : null;

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
