import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";

export interface ExerciseSet {
  roundNumber: number;
  setNumber: number;
  weight: number;
  reps: number;
  restAfter?: number;
}

interface SetTrackerProps {
  targetSets?: number;
  targetReps?: number;
  targetWeight?: number;
  targetRounds?: number;
  sets: ExerciseSet[];
  onSetsChange: (sets: ExerciseSet[]) => void;
  blockType?: string;
}

export default function SetTracker({
  targetSets = 3,
  targetReps = 10,
  targetWeight = 0,
  targetRounds = 1,
  sets,
  onSetsChange,
  blockType = "traditional",
}: SetTrackerProps) {
  const [localSets, setLocalSets] = useState<ExerciseSet[]>(sets);

  // Sync local state with props when exercise changes
  useEffect(() => {
    setLocalSets(sets);
  }, [sets]);

  const updateSet = (index: number, field: keyof ExerciseSet, value: any) => {
    const updatedSets = [...localSets];
    updatedSets[index] = { ...updatedSets[index], [field]: value };
    setLocalSets(updatedSets);
    onSetsChange(updatedSets);
  };

  const addSet = () => {
    const lastSet = localSets[localSets.length - 1];
    
    let newRoundNumber = 1;
    let newSetNumber = 1;
    
    if (lastSet) {
      // Calculate how many sets should be in each round
      const setsPerRound = Math.ceil(targetSets / targetRounds);
      
      // Count sets in the current round
      const currentRoundSets = localSets.filter(
        set => set.roundNumber === lastSet.roundNumber
      ).length;
      
      if (currentRoundSets >= setsPerRound && targetRounds > 1) {
        // Move to next round
        newRoundNumber = lastSet.roundNumber + 1;
        newSetNumber = 1;
      } else {
        // Stay in current round
        newRoundNumber = lastSet.roundNumber;
        newSetNumber = lastSet.setNumber + 1;
      }
    }
    
    const newSet: ExerciseSet = {
      roundNumber: newRoundNumber,
      setNumber: newSetNumber,
      weight: targetWeight || 0,
      reps: targetReps || 0,
    };
    const updatedSets = [...localSets, newSet];
    setLocalSets(updatedSets);
    onSetsChange(updatedSets);
  };

  const removeSet = (index: number) => {
    const updatedSets = localSets.filter((_, i) => i !== index);
    // Renumber sets
    updatedSets.forEach((set, i) => {
      const prevSet = i > 0 ? updatedSets[i - 1] : null;
      if (prevSet && prevSet.roundNumber === set.roundNumber) {
        set.setNumber = prevSet.setNumber + 1;
      } else {
        set.setNumber = 1;
      }
    });
    setLocalSets(updatedSets);
    onSetsChange(updatedSets);
  };

  const getRoundLabel = (roundNumber: number) => {
    if (blockType === "amrap" || blockType === "emom") {
      return `Round ${roundNumber}`;
    }
    return targetRounds > 1 ? `Round ${roundNumber}` : "";
  };

  const groupedSets = localSets.reduce(
    (acc, set) => {
      if (!acc[set.roundNumber]) {
        acc[set.roundNumber] = [];
      }
      acc[set.roundNumber].push(set);
      return acc;
    },
    {} as Record<number, ExerciseSet[]>
  );

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {/* Target Information */}
      <View className="mb-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text
            style={{ color: colors.text.primary }}
            className="text-sm font-semibold"
          >
            Target: {targetSets} sets × {targetReps} reps
          </Text>
          <Text style={{ color: colors.text.muted }} className="text-xs">
            {localSets.length} / {targetSets * targetRounds} sets logged
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          {targetRounds > 1 && (
            <Text style={{ color: colors.text.muted }} className="text-xs">
              {targetRounds} rounds total
            </Text>
          )}
          <View className="flex-row gap-4">
            <Text style={{ color: colors.text.muted }} className="text-xs">
              Target Weight:{" "}
              {targetWeight > 0 ? `${targetWeight} lbs` : "Not specified"}
            </Text>
          </View>
        </View>
        <View
          className="h-0.5 mt-2 mb-3"
          style={{ backgroundColor: colors.neutral.medium[1] }}
        />
      </View>

      {Object.entries(groupedSets).map(([roundNumber, roundSets]) => (
        <View key={roundNumber} className="mb-4">
          {targetRounds > 1 && (
            <Text
              style={{ color: colors.text.secondary }}
              className="text-sm font-semibold mb-2"
            >
              {getRoundLabel(parseInt(roundNumber))}
            </Text>
          )}

          {roundSets.map((set) => {
            const globalIndex = localSets.findIndex(
              (s) =>
                s.roundNumber === set.roundNumber &&
                s.setNumber === set.setNumber
            );

            return (
              <View
                key={`${set.roundNumber}-${set.setNumber}`}
                className="mb-4 p-3 rounded-lg border border-neutral-medium-1 bg-background"
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View
                    className="w-6 h-6 rounded-full bg-opacity-20 items-center justify-center"
                    style={{ backgroundColor: colors.brand.primary + "30" }}
                  >
                    <Text
                      style={{ color: colors.brand.primary }}
                      className="text-xs font-semibold"
                    >
                      {set.setNumber}
                    </Text>
                  </View>
                  <TouchableOpacity
                    className="p-1"
                    onPress={() => removeSet(globalIndex)}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={colors.neutral.medium[3]}
                    />
                  </TouchableOpacity>
                </View>

                {/* Weight Section */}
                <View className="mb-3">
                  <Text
                    style={{ color: colors.text.muted }}
                    className="text-xs mb-2"
                  >
                    Weight (lbs)
                  </Text>
                  <View className="flex-row items-center justify-center gap-2">
                    <TouchableOpacity
                      className="w-8 h-8 rounded-full bg-neutral-light-2 items-center justify-center"
                      onPress={() =>
                        updateSet(
                          globalIndex,
                          "weight",
                          Math.max(0, set.weight - 10)
                        )
                      }
                    >
                      <Text
                        style={{ color: colors.text.primary }}
                        className="text-xs font-semibold"
                      >
                        -10
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="w-8 h-8 rounded-full bg-neutral-light-2 items-center justify-center"
                      onPress={() =>
                        updateSet(
                          globalIndex,
                          "weight",
                          Math.max(0, set.weight - 5)
                        )
                      }
                    >
                      <Text
                        style={{ color: colors.text.primary }}
                        className="text-xs font-semibold"
                      >
                        -5
                      </Text>
                    </TouchableOpacity>

                    <View className="bg-background rounded-full px-4 py-3 border border-neutral-medium-1 min-w-[80px] items-center">
                      <TextInput
                        className="text-lg font-bold text-center"
                        style={{ color: colors.text.primary }}
                        value={set.weight.toString()}
                        onChangeText={(text) =>
                          updateSet(
                            globalIndex,
                            "weight",
                            parseFloat(text) || 0
                          )
                        }
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={colors.text.muted}
                      />
                    </View>

                    <TouchableOpacity
                      className="w-8 h-8 rounded-full items-center justify-center"
                      style={{ backgroundColor: colors.brand.primary }}
                      onPress={() =>
                        updateSet(globalIndex, "weight", set.weight + 5)
                      }
                    >
                      <Text
                        style={{ color: colors.background }}
                        className="text-xs font-semibold"
                      >
                        +5
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="w-8 h-8 rounded-full items-center justify-center"
                      style={{ backgroundColor: colors.brand.primary }}
                      onPress={() =>
                        updateSet(globalIndex, "weight", set.weight + 10)
                      }
                    >
                      <Text
                        style={{ color: colors.background }}
                        className="text-xs font-semibold"
                      >
                        +10
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Reps Section */}
                <View>
                  <Text
                    style={{ color: colors.text.muted }}
                    className="text-xs mb-2"
                  >
                    Reps
                  </Text>
                  <View className="flex-row items-center justify-center gap-3">
                    <TouchableOpacity
                      className="w-8 h-8 rounded-full bg-neutral-light-2 items-center justify-center"
                      onPress={() =>
                        updateSet(
                          globalIndex,
                          "reps",
                          Math.max(0, set.reps - 1)
                        )
                      }
                    >
                      <Ionicons
                        name="remove"
                        size={18}
                        color={colors.text.primary}
                      />
                    </TouchableOpacity>

                    <View className="bg-background rounded-full px-4 py-3 border border-neutral-medium-1 min-w-[80px] items-center">
                      <TextInput
                        className="text-lg font-bold text-center"
                        style={{ color: colors.text.primary }}
                        value={set.reps.toString()}
                        onChangeText={(text) =>
                          updateSet(globalIndex, "reps", parseInt(text) || 0)
                        }
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={colors.text.muted}
                      />
                    </View>

                    <TouchableOpacity
                      className="w-8 h-8 rounded-full items-center justify-center"
                      style={{ backgroundColor: colors.brand.primary }}
                      onPress={() =>
                        updateSet(globalIndex, "reps", set.reps + 1)
                      }
                    >
                      <Ionicons
                        name="add"
                        size={18}
                        color={colors.background}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ))}

      <View className="flex-row justify-center mt-4 px-1">
        <TouchableOpacity
          className="flex-row items-center py-3 px-6 rounded-lg border"
          style={{
            borderColor: colors.brand.primary,
            backgroundColor: colors.brand.primary + "10",
          }}
          onPress={() => addSet()}
        >
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={colors.brand.primary}
          />
          <Text
            style={{ color: colors.brand.primary }}
            className="text-sm font-semibold ml-2"
          >
            Add Set
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
