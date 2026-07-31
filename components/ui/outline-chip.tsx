import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { type ThemeColorPalette, useThemeColors } from "@/lib/theme";

interface OutlineChipProps {
  label: string;
}

/**
 * A data chip: outline, muted text, no fill. This is the MF-006 correction —
 * muscle groups, equipment, and counts are DATA, so they read as outline pills;
 * solid ink is reserved for the single primary action on a screen. Use this
 * instead of the old `rounded-full bg-primary` ink pill for anything
 * informational.
 */
export function OutlineChip({ label }: OutlineChipProps) {
  return (
    <View className="rounded-full border border-neutral-medium-1 px-3 py-1.5 mr-2 mb-2">
      <Text className="text-xs font-semibold text-text-secondary">{label}</Text>
    </View>
  );
}

interface MuscleCoverageChipProps {
  label: string;
  /** Does the replacement train this muscle the original trained? */
  covered: boolean;
}

/**
 * The 1e trust component: a chip for one of the ORIGINAL's muscle groups,
 * marked covered or not by the replacement. Covered = solid green border +
 * check; not covered = DASHED grey border + minus. The dashed chip is how the
 * app admits what a swap loses — never hide a gap.
 */
export function MuscleCoverageChip({ label, covered }: MuscleCoverageChipProps) {
  const colors = useThemeColors();
  // `success` is the one reserved green; alternate themes without it fall back
  // to ink (same guard as profile-section / adaptive-set-tracker).
  const green = (colors as ThemeColorPalette).success ?? colors.brand.primary;
  const grey = colors.text.muted;

  return (
    <View
      className="flex-row items-center rounded-full px-3 py-1.5 mr-2 mb-2"
      style={{
        borderWidth: 1,
        borderStyle: covered ? "solid" : "dashed",
        borderColor: covered ? green : "#9E9E9E",
      }}
    >
      <Ionicons
        name={covered ? "checkmark" : "remove"}
        size={13}
        color={covered ? green : grey}
        style={{ marginRight: 4 }}
      />
      <Text
        className="text-xs font-semibold"
        style={{ color: covered ? green : grey }}
      >
        {label}
      </Text>
    </View>
  );
}
