import React from "react";
import { View, Text } from "react-native";
import {
  WorkoutBlockWithExercises,
  getBlockTypeDisplayName,
} from "@/types/api/workout.types";

interface CurrentBlockInfoProps {
  block: WorkoutBlockWithExercises;
  isCircuit: boolean;
}

export function CurrentBlockInfo({ block, isCircuit }: CurrentBlockInfoProps) {
  return (
    <View className="bg-brand-light-1 rounded-2xl p-4 mb-6">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <View className="flex-row items-center justify-between px-2 mb-1">
            <Text className="text-sm font-bold text-text-primary mb-1">
              {block.blockName || getBlockTypeDisplayName(block.blockType)}
            </Text>
            <View className="flex-row items-center gap-2">
              <View className="items-end">
                {block.rounds && !isCircuit && (
                  <Text className="text-sm font-semibold text-text-primary">
                    {block.rounds === 1 ? "1 Round" : `${block.rounds} Rounds`}
                  </Text>
                )}
              </View>
            </View>
          </View>
          {block.instructions ? (
            <Text className="text-sm text-text-secondary px-2 leading-5">
              {block.instructions}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}


