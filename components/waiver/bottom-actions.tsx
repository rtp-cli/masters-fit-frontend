import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import { useThemeColors } from "@/lib/theme";

interface BottomActionsProps {
  isAgreed: boolean;
  isLoading: boolean;
  onCancel: () => void;
  onContinue: () => void;
}

export default function BottomActions({
  isAgreed,
  isLoading,
  onCancel,
  onContinue,
}: BottomActionsProps) {
  const colors = useThemeColors();
  const enabled = isAgreed && !isLoading;

  return (
    <View style={{ gap: 2 }}>
      {/* Continue — full-width black pill, disabled until agreed */}
      <TouchableOpacity
        onPress={onContinue}
        disabled={!enabled}
        style={{
          height: 56,
          borderRadius: 9999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: enabled ? colors.brand.primary : "#ECECEE",
        }}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.neutral.white} />
        ) : (
          <Text
            style={{
              fontSize: 17,
              fontWeight: "600",
              color: enabled ? colors.neutral.white : "#B5B5BC",
            }}
          >
            Continue
          </Text>
        )}
      </TouchableOpacity>

      {/* Cancel — quiet text button, no fill */}
      <TouchableOpacity
        onPress={onCancel}
        style={{
          height: 48,
          borderRadius: 9999,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: colors.text.muted,
          }}
        >
          Cancel
        </Text>
      </TouchableOpacity>
    </View>
  );
}
