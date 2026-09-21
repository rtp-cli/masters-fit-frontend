import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { getStepConfig } from "@/components/onboarding/utils/step-config";
import { useThemeColors } from "@/lib/theme";
import { ONBOARDING_STEP } from "@/types/enums";

interface EditableSectionCardProps {
  // Optional: the heading is derived from `step` by default, so the card and the
  // screen it opens cannot drift apart. Pass it only to override that.
  title?: string;
  // ONBOARDING_STEP enum name — deep-links the single-step profile editor.
  step: string;
  // Runs before navigating (e.g. close the settings sheet first).
  onNavigate?: () => void;
  // Optional full route to open instead of the profile-edit step (e.g. the
  // training-locations management screen for "Where you train").
  routeOverride?: string;
  children: React.ReactNode;
}

// §9.2.2: a Settings card that opens its matching onboarding step. Unified on the
// bordered surface card; heading row gains a chevron; whole card is tappable
// (follows the shipped "Excluded exercises" row). The values stay on the card.
export default function EditableSectionCard({
  title,
  step,
  onNavigate,
  routeOverride,
  children,
}: EditableSectionCardProps) {
  const router = useRouter();
  const colors = useThemeColors();

  // The card shows stored state, so it takes editTitle when the step defines one.
  // PERSONAL_INFO is 0, so guard on undefined rather than falsiness.
  const stepEnum = ONBOARDING_STEP[step as keyof typeof ONBOARDING_STEP];
  const cfg = stepEnum !== undefined ? getStepConfig(stepEnum) : undefined;
  const heading = title ?? cfg?.editTitle ?? cfg?.title ?? "";

  return (
    <TouchableOpacity
      className="mx-6 mb-6 bg-surface rounded-xl overflow-hidden border border-neutral-medium-1"
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${heading}`}
      onPress={() => {
        onNavigate?.();
        router.push(routeOverride ?? `/profile-edit?step=${step}`);
      }}
    >
      <View className="flex-row items-center justify-between p-4 pb-2">
        <Text className="text-base font-semibold text-text-primary">
          {heading}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
      </View>
      {children}
    </TouchableOpacity>
  );
}
