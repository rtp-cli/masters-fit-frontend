import React from "react";
import { View, TouchableOpacity, Image } from "react-native";
import Text from "./Text";
import Card from "./Card";
import {
  formatMuscleGroups,
  formatDifficulty,
  formatEquipment,
} from "../utils";
import { colors } from "../lib/theme";

interface Exercise {
  id: number;
  name: string;
  description: string;
  muscleGroups: string[];
  equipment: string[];
  difficulty: string;
  imageUrl?: string;
  instructions?: string;
}

interface ExerciseCardProps {
  exercise: Exercise;
  onPress?: (exercise: Exercise) => void;
  selected?: boolean;
  expanded?: boolean;
  onAddToWorkout?: (exercise: Exercise) => void;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  onPress,
  selected = false,
  expanded = false,
  onAddToWorkout,
}) => {
  const handlePress = () => {
    if (onPress) {
      onPress(exercise);
    }
  };

  const handleAddToWorkout = () => {
    if (onAddToWorkout) {
      onAddToWorkout(exercise);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      className={`mb-3 ${selected ? "shadow-card-hover" : ""}`}
    >
      <Card variant={selected ? "outlined" : "default"}>
        <View className="p-4">
          <View className="flex-row justify-between">
            <View className="flex-1 mr-3">
              <Text variant="title">{exercise.name}</Text>
              <Text variant="bodySmall" color={colors.text.muted}>
                {formatMuscleGroups(exercise.muscleGroups)} •{" "}
                {formatDifficulty(exercise.difficulty)}
              </Text>
            </View>

            {exercise.imageUrl && (
              <View
                className="rounded-lg overflow-hidden bg-neutral-light-1"
                style={{
                  width: 60,
                  height: 60,
                }}
              >
                <Image
                  source={{ uri: exercise.imageUrl }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
            )}
          </View>

          {expanded && (
            <View className="mt-3 pt-3 border-t border-neutral-light-2">
              <Text
                variant="bodySmall"
                color={colors.text.secondary}
                className="mb-3 leading-5"
              >
                {exercise.description}
              </Text>

              {exercise.instructions && (
                <View className="mb-3">
                  <Text variant="subtitle" className="mb-1.5">
                    Instructions
                  </Text>
                  <Text variant="bodySmall" color={colors.text.secondary}>
                    {exercise.instructions}
                  </Text>
                </View>
              )}

              <View className="mb-3">
                <Text variant="subtitle" className="mb-1.5">
                  Equipment
                </Text>
                <View className="flex-row flex-wrap">
                  {exercise.equipment.map((item, index) => (
                    <View
                      key={index}
                      className="px-2.5 py-1 rounded-xl mr-2 mb-2 bg-neutral-light-1"
                    >
                      <Text variant="caption">{formatEquipment(item)}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                className="py-2.5 px-4 rounded-md items-center mt-2 bg-primary"
                onPress={handleAddToWorkout}
              >
                <Text
                  variant="bodySmall"
                  color={colors.background}
                  weight="semibold"
                >
                  Add to Workout
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
};

export default ExerciseCard;
