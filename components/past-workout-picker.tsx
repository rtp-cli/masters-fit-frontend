import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/theme";
import { fetchPastCompletedDays, repeatPastDay } from "@/lib/workouts";
import WorkoutBlock from "@/components/workout-block";
import { CustomDialog } from "@/components/ui";
import {
  PlanDayWithBlocks,
  WorkoutBlockWithExercises,
} from "@/types/api/workout.types";
import {
  calculatePlanDayDuration,
  formatWorkoutDuration,
} from "@/utils";

interface PastWorkoutPickerProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PastWorkoutPicker({
  visible,
  onClose,
  onSuccess,
}: PastWorkoutPickerProps) {
  const colors = useThemeColors();
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [pastDays, setPastDays] = useState<PlanDayWithBlocks[]>([]);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    description: string;
    primaryButton: { text: string; onPress: () => void };
    icon?: string;
  } | null>(null);

  useEffect(() => {
    if (visible) {
      loadPastDays();
    }
  }, [visible]);

  const loadPastDays = async () => {
    try {
      setLoading(true);
      const days = await fetchPastCompletedDays();
      setPastDays(days);
    } catch (error) {
      console.error("Error loading past days:", error);
      setDialogConfig({
        title: "Error",
        description: "Failed to load past workouts. Please try again.",
        primaryButton: { text: "OK", onPress: () => setDialogVisible(false) },
        icon: "alert-circle",
      });
      setDialogVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDay = async (planDayId: number) => {
    try {
      setCopying(true);
      const result = await repeatPastDay(planDayId);

      if (result?.success) {
        onClose();
        onSuccess();
      } else {
        throw new Error("Failed to copy workout");
      }
    } catch (error) {
      console.error("Error copying past workout:", error);
      setDialogConfig({
        title: "Error",
        description: "Failed to copy this workout. Please try again.",
        primaryButton: { text: "OK", onPress: () => setDialogVisible(false) },
        icon: "alert-circle",
      });
      setDialogVisible(true);
    } finally {
      setCopying(false);
    }
  };

  const getTotalExerciseCount = (blocks: WorkoutBlockWithExercises[]) => {
    return blocks.reduce(
      (total, block) => total + (block.exercises?.length || 0),
      0
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const renderPastDay = ({ item }: { item: PlanDayWithBlocks }) => (
    <View className="bg-card rounded-2xl p-4 mb-3 border border-neutral-light-2">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1">
          <Text className="text-base font-bold text-text-primary">
            {item.description || item.name || "Workout"}
          </Text>
          <View className="flex-row items-center mt-1">
            <Text className="text-xs text-text-muted">
              {formatDate(item.date as unknown as string)}
            </Text>
            <Text className="text-xs text-text-muted mx-2">•</Text>
            <Text className="text-xs text-text-muted">
              {getTotalExerciseCount(item.blocks || [])} exercises
            </Text>
            {item.blocks && item.blocks.length > 0 && (
              <>
                <Text className="text-xs text-text-muted mx-2">•</Text>
                <Text className="text-xs text-text-muted">
                  {formatWorkoutDuration(calculatePlanDayDuration(item))}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>

      <View className="space-y-2 mb-3">
        {(item.blocks || [])
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((block, blockIndex) => (
            <WorkoutBlock
              key={block.id}
              block={block}
              blockIndex={blockIndex}
              isExpanded={false}
              showDetails={true}
              variant="compact"
            />
          ))}
      </View>

      <TouchableOpacity
        className={`bg-primary rounded-xl py-3 items-center ${copying ? "opacity-50" : ""}`}
        onPress={() => handleSelectDay(item.id)}
        disabled={copying}
      >
        {copying ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text className="text-content-on-primary font-semibold text-sm">
            Use This Workout
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-background">
        <View className="flex-row items-center justify-between px-4 pt-4 pb-3 border-b border-neutral-light-2">
          <TouchableOpacity onPress={onClose} className="p-2">
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-text-primary">
            Past Workouts
          </Text>
          <View className="w-10" />
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.brand.primary} />
            <Text className="text-text-muted mt-3">Loading past workouts...</Text>
          </View>
        ) : pastDays.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons
              name="fitness-outline"
              size={48}
              color={colors.text.muted}
            />
            <Text className="text-base font-semibold text-text-primary mt-4 mb-2">
              No Completed Workouts
            </Text>
            <Text className="text-sm text-text-muted text-center leading-5">
              Complete a workout first, then you can repeat it here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={pastDays}
            renderItem={renderPastDay}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {dialogConfig && (
        <CustomDialog
          visible={dialogVisible}
          onClose={() => setDialogVisible(false)}
          title={dialogConfig.title}
          description={dialogConfig.description}
          primaryButton={dialogConfig.primaryButton}
          icon={dialogConfig.icon as any}
        />
      )}
    </Modal>
  );
}
