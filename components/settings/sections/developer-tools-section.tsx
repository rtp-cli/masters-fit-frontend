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
        backgroundColor: colors.background,
        borderColor: colors.brand.primary,
      }}
    >
      <View className="flex-row items-center p-4 pb-2">
        <Ionicons name="construct" size={18} color={colors.brand.primary} />
        <Text
          className="text-base font-semibold ml-2"
          style={{ color: colors.brand.primary }}
        >
          Developer Tools
        </Text>
        {!__DEV__ && (
          <View
            className="ml-auto px-2 py-0.5 rounded"
            style={{ backgroundColor: colors.brand.primary }}
          >
            <Text
              className="text-xs font-medium"
              style={{ color: colors.contentOnPrimary }}
            >
              DEBUG
            </Text>
          </View>
        )}
      </View>

      {/* Test RevenueCat Paywall */}
      <TouchableOpacity
        className="flex-row items-center justify-between px-4 py-3 border-t"
        style={{ borderColor: colors.brand.primary }}
        onPress={() => {
          if (onShowPaywallTest) {
            onShowPaywallTest();
          }
        }}
      >
        <View className="flex-row items-center flex-1">
          <Ionicons
            name="card-outline"
            size={20}
            color={colors.brand.primary}
          />
          <Text
            className="text-sm ml-3"
            style={{ color: colors.brand.primary }}
          >
            Test RevenueCat Paywall
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.brand.primary}
        />
      </TouchableOpacity>

      {/* Network Logger */}
      <TouchableOpacity
        className="flex-row items-center justify-between px-4 py-3 border-t"
        style={{ borderColor: colors.brand.primary }}
        onPress={() => {
          if (onClose) onClose();
          router.push("/network-logger");
        }}
      >
        <View className="flex-row items-center flex-1">
          <Ionicons name="bug-outline" size={20} color={colors.brand.primary} />
          <Text
            className="text-sm ml-3"
            style={{ color: colors.brand.primary }}
          >
            Network Logger
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.brand.primary}
        />
      </TouchableOpacity>

      {/* AI Provider Selection (if secret activated) */}
      {isSecretActivated && (
        <TouchableOpacity
          className="flex-row items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: colors.brand.primary }}
          onPress={() => {
            if (onClose) onClose();
            router.push("/ai-provider-selection");
          }}
        >
          <View className="flex-row items-center flex-1">
            <Ionicons
              name="hardware-chip-outline"
              size={20}
              color={colors.brand.primary}
            />
            <Text
              className="text-sm ml-3"
              style={{ color: colors.brand.primary }}
            >
              AI Provider Selection
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.brand.primary}
          />
        </TouchableOpacity>
      )}

      {/* Deactivate Debug Mode (only in production) */}
      {!__DEV__ && isDebugModeActivated && (
        <TouchableOpacity
          className="flex-row items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: colors.brand.primary }}
          onPress={onDeactivateDebugMode}
        >
          <View className="flex-row items-center flex-1">
            <Ionicons
              name="close-circle-outline"
              size={20}
              color={colors.brand.primary}
            />
            <Text
              className="text-sm ml-3"
              style={{ color: colors.brand.primary }}
            >
              Deactivate Debug Mode
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}
