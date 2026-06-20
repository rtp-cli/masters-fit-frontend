import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type StreakPopoverProps = {
  visible: boolean;
  count: number;
  onClose: () => void;
};

/**
 * Quiet explainer shown when the streak chip is tapped. Drops from the top
 * of the screen and dismisses on any tap outside the card. Carries the one
 * rule worth knowing: rest days don't break the streak.
 */
export function StreakPopover({ visible, count, onClose }: StreakPopoverProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1" onPress={onClose}>
        <View
          className="absolute right-4 w-64 bg-neutral-white rounded-2xl p-4"
          style={{
            top: insets.top + 52,
            shadowColor: "#000",
            shadowOpacity: 0.18,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
          }}
        >
          <View className="flex-row items-baseline">
            <Text className="text-2xl font-extrabold text-text-primary">
              {count}
            </Text>
            <Text className="text-sm font-semibold text-text-muted ml-1.5">
              workouts in a row
            </Text>
          </View>
          <Text className="text-xs text-text-secondary leading-5 mt-3 pt-3 border-t border-neutral-light-2">
            Counts each scheduled workout you complete.{" "}
            <Text className="font-semibold text-text-primary">
              Rest days won&apos;t break it
            </Text>{" "}
            — only a missed workout will.
          </Text>
        </View>
      </Pressable>
    </Modal>
  );
}
