import { Text, View } from "react-native";

import { useThemeColors } from "@/lib/theme";

interface MainContentProps {
  isUpdate: boolean;
}

export default function MainContent({ isUpdate }: MainContentProps) {
  const colors = useThemeColors();

  return (
    <View style={{ paddingHorizontal: 24 }}>
      {/* Title */}
      <Text
        style={{
          fontSize: 28,
          fontWeight: "700",
          letterSpacing: -0.56,
          lineHeight: 32.5,
          color: colors.text.primary,
          textAlign: "center",
        }}
      >
        {isUpdate ? "Updated legal agreement" : "Before you begin"}
      </Text>

      {/* Subtitle */}
      <Text
        style={{
          fontSize: 15,
          lineHeight: 24,
          color: colors.text.muted,
          textAlign: "center",
          maxWidth: 280,
          alignSelf: "center",
          marginTop: 6,
        }}
      >
        {isUpdate
          ? "Our terms have been updated. Please review and accept the new version"
          : "Please review and accept to continue"}
      </Text>

      {/* Waiver card */}
      <View
        style={{
          width: "100%",
          backgroundColor: colors.surface,
          borderRadius: 18,
          padding: 16,
          marginTop: 12,
        }}
      >
        <Text
          style={{
            fontSize: 15,
            lineHeight: 22.5,
            color: colors.text.secondary,
            marginBottom: 8,
          }}
        >
          MastersFit offers AI-powered fitness guidance, not medical advice. If
          you have any health concerns, check with your doctor before starting.
        </Text>
        <Text
          style={{
            fontSize: 15,
            lineHeight: 22.5,
            color: colors.text.secondary,
            marginBottom: 8,
          }}
        >
          Our workouts are AI-powered, but AI isn't perfect — listen to your
          body and use your judgment.
        </Text>
        <Text
          style={{
            fontSize: 15,
            lineHeight: 22.5,
            color: colors.text.secondary,
            marginBottom: 8,
          }}
        >
          By using MastersFit, you agree to exercise at your own risk.
          MastersFit LLC isn't liable for injuries or health issues that may
          occur.
        </Text>
        <Text
          style={{
            fontSize: 15,
            lineHeight: 22.5,
            color: colors.text.primary,
            fontWeight: "700",
          }}
        >
          Individual results will vary — consistency and listening to your body
          matter most.
        </Text>
      </View>
    </View>
  );
}
