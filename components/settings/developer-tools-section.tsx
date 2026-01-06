import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

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

  if (!isDebugModeActivated && !__DEV__) {
    return null;
  }

  return (
    <View className="mx-6 mb-6 bg-amber-50 rounded-xl overflow-hidden border border-amber-200">
      <View className="flex-row items-center p-4 pb-2">
        <Ionicons name="construct" size={18} color="#D97706" />
        <Text className="text-base font-semibold text-amber-700 ml-2">
          Developer Tools
        </Text>
        {!__DEV__ && (
          <View className="ml-auto bg-amber-200 px-2 py-0.5 rounded">
            <Text className="text-xs text-amber-800 font-medium">DEBUG</Text>
          </View>
        )}
      </View>

      {/* Test RevenueCat Paywall */}
      <TouchableOpacity
        className="flex-row items-center justify-between px-4 py-3 border-t border-amber-200"
        onPress={() => {
          if (onShowPaywallTest) {
            onShowPaywallTest();
          }
        }}
      >
        <View className="flex-row items-center flex-1">
          <Ionicons name="card-outline" size={20} color="#D97706" />
          <Text className="text-sm text-amber-800 ml-3">
            Test RevenueCat Paywall
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#D97706" />
      </TouchableOpacity>

      {/* Network Logger */}
      <TouchableOpacity
        className="flex-row items-center justify-between px-4 py-3 border-t border-amber-200"
        onPress={() => {
          if (onClose) onClose();
          router.push("/network-logger");
        }}
      >
        <View className="flex-row items-center flex-1">
          <Ionicons name="bug-outline" size={20} color="#D97706" />
          <Text className="text-sm text-amber-800 ml-3">Network Logger</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#D97706" />
      </TouchableOpacity>

      {/* AI Provider Selection (if secret activated) */}
      {isSecretActivated && (
        <TouchableOpacity
          className="flex-row items-center justify-between px-4 py-3 border-t border-amber-200"
          onPress={() => {
            if (onClose) onClose();
            router.push("/ai-provider-selection");
          }}
        >
          <View className="flex-row items-center flex-1">
            <Ionicons name="hardware-chip-outline" size={20} color="#D97706" />
            <Text className="text-sm text-amber-800 ml-3">
              AI Provider Selection
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#D97706" />
        </TouchableOpacity>
      )}

      {/* Deactivate Debug Mode (only in production) */}
      {!__DEV__ && isDebugModeActivated && (
        <TouchableOpacity
          className="flex-row items-center justify-between px-4 py-3 border-t border-amber-200"
          onPress={onDeactivateDebugMode}
        >
          <View className="flex-row items-center flex-1">
            <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
            <Text className="text-sm text-red-600 ml-3">
              Deactivate Debug Mode
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}
