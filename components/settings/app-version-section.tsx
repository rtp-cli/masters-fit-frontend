import Constants from "expo-constants";
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
        </Text>
      </TouchableOpacity>
    </View>
  );
}
