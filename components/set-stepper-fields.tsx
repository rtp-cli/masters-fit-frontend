import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { HIT_SLOP_6 } from "@/constants";
import { useThemeColors } from "@/lib/theme";

interface SetStepperFieldsProps {
  weight: number;
  reps: number;
  showWeight: boolean;
  onChange: (patch: { weight?: number; reps?: number }) => void;
}

/**
 * The one number-entry control for a logged set — the `-5 / value / +5` weight
 * row and the `− / value / +` reps row. Lifted verbatim out of
 * adaptive-set-tracker.tsx's expanded editor (SPEC §5) so mid-workout logging
 * and after-the-fact log correction use the exact same control and can't drift.
 */
export default function SetStepperFields({
  weight,
  reps,
  showWeight,
  onChange,
}: SetStepperFieldsProps) {
  const colors = useThemeColors();

  return (
    <>
      {/* Weight Input */}
      {showWeight && (
        <View className="mb-3">
          <Text className="text-xs mb-2 text-text-muted">Weight (lbs)</Text>
          <View className="flex-row items-center justify-center gap-2">
            <TouchableOpacity
              className="size-8 rounded-full bg-neutral-light-2 items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Decrease weight 5 pounds"
              hitSlop={HIT_SLOP_6}
              onPress={() => onChange({ weight: Math.max(0, weight - 5) })}
            >
              <Text className="text-xs font-semibold text-text-primary">
                -5
              </Text>
            </TouchableOpacity>

            <View className="bg-background rounded-full px-4 py-3 border border-neutral-medium-1 min-w-[80px] items-center">
              <TextInput
                className="text-lg font-bold text-center text-text-primary"
                value={weight.toString()}
                onChangeText={(text) =>
                  onChange({ weight: parseFloat(text) || 0 })
                }
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.text.muted}
              />
            </View>

            <TouchableOpacity
              className="size-8 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.brand.primary }}
              accessibilityRole="button"
              accessibilityLabel="Increase weight 5 pounds"
              hitSlop={HIT_SLOP_6}
              onPress={() => onChange({ weight: weight + 5 })}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: colors.contentOnPrimary }}
              >
                +5
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Reps Input */}
      <View>
        <Text className="text-xs mb-2 text-text-muted">Reps</Text>
        <View className="flex-row items-center justify-center gap-3">
          <TouchableOpacity
            className="size-8 rounded-full bg-neutral-light-2 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Decrease reps"
            hitSlop={HIT_SLOP_6}
            onPress={() => onChange({ reps: Math.max(0, reps - 1) })}
          >
            <Ionicons name="remove" size={18} color={colors.text.primary} />
          </TouchableOpacity>

          <View className="bg-background rounded-full px-4 py-3 border border-neutral-medium-1 min-w-[80px] items-center">
            <TextInput
              className="text-lg font-bold text-center text-text-primary"
              value={reps.toString()}
              onChangeText={(text) => onChange({ reps: parseInt(text) || 0 })}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.text.muted}
            />
          </View>

          <TouchableOpacity
            className="size-8 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.brand.primary }}
            accessibilityRole="button"
            accessibilityLabel="Increase reps"
            hitSlop={HIT_SLOP_6}
            onPress={() => onChange({ reps: reps + 1 })}
          >
            <Ionicons name="add" size={18} color={colors.brand.secondary} />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}
