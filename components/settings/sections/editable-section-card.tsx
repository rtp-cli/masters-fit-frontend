import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { useThemeColors } from "@/lib/theme";

interface EditableSectionCardProps {
  title: string;
  // ONBOARDING_STEP enum name — deep-links the single-step profile editor.
  step: string;
  // Runs before navigating (e.g. close the settings sheet first).
  onNavigate?: () => void;
  children: React.ReactNode;
}

// §9.2.2: a Settings card that opens its matching onboarding step. Unified on the
// bordered surface card; heading row gains a chevron; whole card is tappable
// (follows the shipped "Excluded exercises" row). The values stay on the card.
export default function EditableSectionCard({
  title,
  step,
  onNavigate,
  children,
}: EditableSectionCardProps) {
  const router = useRouter();
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      className="mx-6 mb-6 bg-surface rounded-xl overflow-hidden border border-neutral-medium-1"
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${title}`}
      onPress={() => {
        onNavigate?.();
        router.push(`/profile-edit?step=${step}`);
      }}
    >
      <View className="flex-row items-center justify-between p-4 pb-2">
        <Text className="text-base font-semibold text-text-primary">
          {title}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
      </View>
      {children}
    </TouchableOpacity>
  );
}
