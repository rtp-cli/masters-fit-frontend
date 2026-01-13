import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { useThemeColors } from "@/lib/theme";

interface DeveloperToolsSectionProps {
  isDebugModeActivated: boolean;
  isSecretActivated: boolean;
  onDeactivateDebugMode: () => void;
  onShowPaywallTest?: () => void;
  onClose?: () => void;
}

export default function DeveloperToolsSection({
  isDebugModeActivated,
  isSecretActivated,
  onDeactivateDebugMode,
  onShowPaywallTest,
  onClose,
}: DeveloperToolsSectionProps) {
  const router = useRouter();
  const colors = useThemeColors();

  if (!isDebugModeActivated && !__DEV__) {
    return null;
  }

  return (
    <View
      className="mx-6 mb-6 rounded-xl overflow-hidden border"
      style={{
        backgroundColor: colors.brand.light[1],
        borderColor: colors.brand.medium[1],
      }}
    >
      <View className="flex-row items-center p-4 pb-2">
        <Ionicons name="construct" size={18} color={colors.warning} />
        <Text
          className="text-base font-semibold ml-2"
          style={{ color: colors.text.secondary }}
        >
          Developer Tools
        </Text>
        {!__DEV__ && (
          <View
            className="ml-auto px-2 py-0.5 rounded"
            style={{ backgroundColor: colors.brand.medium[1] }}
          >
            <Text
              className="text-xs font-medium"
              style={{ color: colors.text.primary }}
            >
              DEBUG
            </Text>
          </View>
        )}
      </View>

      {/* Test RevenueCat Paywall */}
      <TouchableOpacity
        className="flex-row items-center justify-between px-4 py-3 border-t"
        style={{ borderColor: colors.brand.medium[1] }}
        onPress={() => {
          if (onShowPaywallTest) {
            onShowPaywallTest();
          }
        }}
      >
        <View className="flex-row items-center flex-1">
          <Ionicons name="card-outline" size={20} color={colors.warning} />
          <Text
            className="text-sm ml-3"
            style={{ color: colors.text.secondary }}
          >
            Test RevenueCat Paywall
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.warning} />
      </TouchableOpacity>

      {/* Network Logger */}
      <TouchableOpacity
        className="flex-row items-center justify-between px-4 py-3 border-t"
        style={{ borderColor: colors.brand.medium[1] }}
        onPress={() => {
          if (onClose) onClose();
          router.push("/network-logger");
        }}
      >
        <View className="flex-row items-center flex-1">
          <Ionicons name="bug-outline" size={20} color={colors.warning} />
          <Text
            className="text-sm ml-3"
            style={{ color: colors.text.secondary }}
          >
            Network Logger
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.warning} />
      </TouchableOpacity>

      {/* AI Provider Selection (if secret activated) */}
      {isSecretActivated && (
        <TouchableOpacity
          className="flex-row items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: colors.brand.medium[1] }}
          onPress={() => {
            if (onClose) onClose();
            router.push("/ai-provider-selection");
          }}
        >
          <View className="flex-row items-center flex-1">
            <Ionicons
              name="hardware-chip-outline"
              size={20}
              color={colors.warning}
            />
            <Text
              className="text-sm ml-3"
              style={{ color: colors.text.secondary }}
            >
              AI Provider Selection
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.warning} />
        </TouchableOpacity>
      )}

      {/* Deactivate Debug Mode (only in production) */}
      {!__DEV__ && isDebugModeActivated && (
        <TouchableOpacity
          className="flex-row items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: colors.brand.medium[1] }}
          onPress={onDeactivateDebugMode}
        >
          <View className="flex-row items-center flex-1">
            <Ionicons
              name="close-circle-outline"
              size={20}
              color={colors.danger}
            />
            <Text className="text-sm ml-3" style={{ color: colors.danger }}>
              Deactivate Debug Mode
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}
