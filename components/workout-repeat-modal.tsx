import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  fetchPreviousWorkouts,
  repeatPreviousWeekWorkout,
} from "@lib/workouts";
import { getCurrentUser } from "@lib/auth";
import { colors } from "@lib/theme";
import { formatDate, formatDateAsString } from "@utils/index";
import type { PreviousWorkout } from "@/types/api/workout.types";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "expo-router";

interface WorkoutRepeatModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WorkoutRepeatModal({
  visible,
  onClose,
  onSuccess,
}: WorkoutRepeatModalProps) {
  const [previousWorkouts, setPreviousWorkouts] = useState<PreviousWorkout[]>(
    []
  );
  const [selectedWorkout, setSelectedWorkout] =
    useState<PreviousWorkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [repeating, setRepeating] = useState(false);
  const [expandedWorkouts, setExpandedWorkouts] = useState<
    Record<number, boolean>
  >({});
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const { setIsPreloadingData, setIsGeneratingWorkout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (visible) {
      loadPreviousWorkouts();
      setSelectedWorkout(null);
      setExpandedWorkouts({});
      setExpandedDays({});
    }
  }, [visible]);

  const loadPreviousWorkouts = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert("Error", "User not found. Please log in again.");
        return;
      }

      const workouts = await fetchPreviousWorkouts(user.id);
      setPreviousWorkouts(workouts || []);
    } catch (error) {
      console.error("Error loading previous workouts:", error);
      Alert.alert(
        "Error",
        "Failed to load previous workouts. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRepeatWorkout = async () => {
    if (!selectedWorkout) return;

    try {
      setRepeating(true);
      setIsGeneratingWorkout(true, "repeat");
      onClose(); // Close modal immediately to show global generating screen

      const user = await getCurrentUser();
      if (!user) {
        setIsGeneratingWorkout(false);
        Alert.alert("Error", "User not found. Please log in again.");
        return;
      }

      // Start the workout today regardless of the day of the week
      const today = new Date();
      const newStartDate = formatDateAsString(today);

      const result = await repeatPreviousWeekWorkout(
        user.id,
        selectedWorkout.id,
        newStartDate
      );

      if (result?.success) {
        // Trigger app reload to show warming up screen
        setIsPreloadingData(true);

        // Navigate to dashboard to trigger the warming up flow
        router.replace("/(tabs)/dashboard");
      } else {
        throw new Error("Failed to repeat workout");
      }
    } catch (error) {
      console.error("Error repeating workout:", error);
      setIsGeneratingWorkout(false);
      Alert.alert(
        "Error",
        "Failed to repeat the workout. Please try again or generate a new workout."
      );
    } finally {
      setRepeating(false);
    }
  };

  const toggleExpanded = (workoutId: number) => {
    setExpandedWorkouts((prev) => ({
      ...prev,
      [workoutId]: !prev[workoutId],
    }));
  };

  const toggleDayExpanded = (dayId: string) => {
    setExpandedDays((prev) => {
      // Close all other days and open only the selected one
      const newExpandedDays: Record<string, boolean> = {};
      if (!prev[dayId]) {
        newExpandedDays[dayId] = true;
      }
      return newExpandedDays;
    });
  };

  const formatWeekDates = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startStr = formatDate(start, { month: "long", day: "numeric" });
    const endStr = formatDate(end, { day: "numeric", year: "numeric" });
    return `${startStr} - ${endStr}`;
  };

  const formatDayDate = (dateString: string) => {
    const date = new Date(dateString);
    return formatDate(date, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getBlockIcon = (blockType?: string) => {
    const icons: Record<string, string> = {
      traditional: "barbell-outline",
      amrap: "timer-outline",
      emom: "stopwatch-outline",
      for_time: "flash-outline",
      circuit: "refresh-circle-outline",
      tabata: "pulse-outline",
      warmup: "sunny-outline",
      cooldown: "moon-outline",
      superset: "layers-outline",
      flow: "water-outline",
    };

    return icons[blockType || ""] || "fitness-outline";
  };

  const getBlockTypeDisplayName = (blockType?: string) => {
    const names: Record<string, string> = {
      traditional: "Traditional",
      amrap: "AMRAP",
      emom: "EMOM",
      for_time: "For Time",
      circuit: "Circuit",
      tabata: "Tabata",
      warmup: "Warm-up",
      cooldown: "Cool-down",
      superset: "Superset",
      flow: "Flow",
    };

    return names[blockType || ""] || "Workout";
  };

  const renderWorkoutCard = (workout: PreviousWorkout) => {
    const isSelected = selectedWorkout?.id === workout.id;
    const isExpanded = expandedWorkouts[workout.id] || false;

    return (
      <View key={workout.id} className="mb-3">
        <TouchableOpacity
          className={`p-4 rounded-2xl border ${
            isSelected
              ? "bg-primary/10 border-primary"
              : "bg-white border-neutral-light-2"
          }`}
          onPress={() => setSelectedWorkout(workout)}
          disabled={repeating}
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-base font-semibold text-text-primary mb-1">
                {workout.name}
              </Text>
              <Text className="text-sm text-text-muted mb-2">
                {formatWeekDates(workout.startDate, workout.endDate)} •{" "}
                {workout.duration}
              </Text>
              {workout.description && (
                <Text className="text-sm text-text-secondary mb-2 leading-5">
                  {workout.description}
                </Text>
              )}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="flex-row items-center mr-4">
                    <Ionicons
                      name="fitness-outline"
                      size={14}
                      color={colors.text.muted}
                    />
                    <Text className="text-xs text-text-muted ml-1">
                      {workout.totalWorkouts} workouts
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons
                      name={
                        workout.completionRate === 100
                          ? "checkmark-circle"
                          : "time-outline"
                      }
                      size={14}
                      color={
                        workout.completionRate === 100
                          ? colors.brand.primary
                          : colors.text.muted
                      }
                    />
                    <Text
                      className={`text-xs ml-1 ${
                        workout.completionRate === 100
                          ? "text-brand-primary font-medium"
                          : "text-text-muted"
                      }`}
                    >
                      {workout.completionRate}% completed
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleExpanded(workout.id);
                  }}
                  className="flex-row items-center"
                >
                  <Text className="text-text-primary text-sm mr-2">
                    {isExpanded ? "Hide Details" : "Show Details"}
                  </Text>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={colors.text.muted}
                  />
                </TouchableOpacity>
              </View>
            </View>
            <View
              className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                isSelected
                  ? "border-primary bg-primary"
                  : "border-neutral-medium-1"
              }`}
            >
              {isSelected && (
                <Ionicons
                  name="checkmark"
                  size={14}
                  color={colors.text.secondary}
                />
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Expandable workout details */}
        {isExpanded && workout.planDays && (
          <View className="mt-2 mx-2 p-1 rounded-lg">
            {workout.planDays.map((day) => {
              const dayKey = `${workout.id}-${day.id}`;
              const isDayExpanded = expandedDays[dayKey] || false;

              return (
                <View key={day.id} className="mb-4 p-2">
                  {/* Day Header - Calendar Style */}
                  <View className="p-4 bg-brand-light-2 rounded-lg">
                    <View className="flex-row items-center justify-between mb-1">
                      <View className="flex-1">
                        <Text className="text-base font-bold text-text-primary mb-1">
                          {day.name}
                        </Text>
                        <Text className="text-sm text-text-muted">
                          {formatDayDate(day.date)}
                        </Text>
                        <View className="flex-row items-center mt-xs">
                          <Text className="text-xs text-text-muted">
                            {day.totalExercises} exercises
                          </Text>
                          <Text className="text-xs text-text-muted mx-2">
                            •
                          </Text>
                          <Text className="text-xs text-text-muted">
                            {day.blocks.length} blocks
                          </Text>
                          {day.isComplete && (
                            <>
                              <Text className="text-xs text-text-muted mx-2">
                                •
                              </Text>
                              <View className="flex-row items-center">
                                <Ionicons
                                  name="checkmark-circle"
                                  size={12}
                                  color={colors.brand.primary}
                                />
                                <Text className="text-xs text-brand-primary ml-1 font-medium">
                                  Completed
                                </Text>
                              </View>
                            </>
                          )}
                        </View>
                      </View>
                    </View>
                    {day.description && (
                      <Text className="text-sm text-text-muted leading-5">
                        {day.description}
                      </Text>
                    )}

                    {/* Day Expansion Button - Bottom Right */}
                    <View className="flex-row justify-end mt-2">
                      <TouchableOpacity
                        onPress={() => toggleDayExpanded(dayKey)}
                        className="flex-row items-center"
                      >
                        <Text className="text-text-primary text-sm mr-2">
                          {isDayExpanded ? "Hide Details" : "Show Details"}
                        </Text>
                        <Ionicons
                          name={isDayExpanded ? "chevron-up" : "chevron-down"}
                          size={16}
                          color={colors.text.muted}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Day details - expanded */}
                  {isDayExpanded && (
                    <View className="bg-white border-l-4 border-l-gray-200">
                      {day.blocks.length > 0 && (
                        <>
                          {day.blocks.map((block, index) => (
                            <View
                              key={block.id}
                              className={`p-4 border-b border-gray-100 ${
                                index === day.blocks.length - 1
                                  ? "border-b-0"
                                  : ""
                              }`}
                            >
                              <View className="flex-row items-start justify-between">
                                <View className="flex-1">
                                  <View className="flex-row items-center mb-1">
                                    <View className="w-6 h-6 rounded-full bg-gray-100 items-center justify-center mr-3">
                                      <Text className="text-xs font-bold text-gray-600">
                                        {index + 1}
                                      </Text>
                                    </View>
                                    <Text className="font-semibold text-text-primary flex-1 text-base">
                                      {block.blockName ||
                                        `${getBlockTypeDisplayName(
                                          block.blockType
                                        )} Block`}
                                    </Text>
                                  </View>

                                  {/* Block Details */}
                                  <View className="ml-9">
                                    <Text className="text-text-muted text-sm">
                                      {getBlockTypeDisplayName(block.blockType)}{" "}
                                      • {block.exerciseCount} exercises
                                    </Text>

                                    {/* Block Type Info */}
                                    <View className="flex-row items-center mt-1">
                                      <Ionicons
                                        name={
                                          getBlockIcon(block.blockType) as any
                                        }
                                        size={12}
                                        color={colors.text.muted}
                                      />
                                      <Text className="text-text-muted ml-1 text-sm">
                                        {getBlockTypeDisplayName(
                                          block.blockType
                                        )}{" "}
                                        workout block
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                              </View>
                            </View>
                          ))}
                        </>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const completedWorkouts = previousWorkouts.filter(
    (w) => w.completionRate === 100
  );
  const inProgressWorkouts = previousWorkouts.filter(
    (w) => w.completionRate < 100
  );

  // Global generating screen will handle workout generation display

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-light-2">
          <TouchableOpacity
            onPress={onClose}
            className="w-8 h-8 items-center justify-center"
            disabled={repeating}
          >
            <Ionicons name="close" size={20} color={colors.text.muted} />
          </TouchableOpacity>
          <Text className="text-base font-semibold text-text-primary">
            Repeat a Previous Workout Plan
          </Text>
          <View className="w-8" />
        </View>

        {/* Content */}
        <View className="flex-1 px-5 py-5">
          <Text className="text-base text-text-muted mb-6 text-center leading-6">
            Choose a previous workout to repeat:
          </Text>

          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color={colors.brand.primary} />
              <Text className="mt-4 text-sm text-text-muted">
                Loading previous workouts...
              </Text>
            </View>
          ) : previousWorkouts.length === 0 ? (
            <View className="flex-1 justify-center items-center">
              <Ionicons
                name="calendar-outline"
                size={64}
                color={colors.text.muted}
              />
              <Text className="text-lg font-semibold text-text-primary mt-4 mb-2">
                No Previous Workouts
              </Text>
              <Text className="text-sm text-text-muted text-center leading-6">
                You don't have any previous workouts to repeat. Generate your
                first workout plan to get started!
              </Text>
            </View>
          ) : (
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              {completedWorkouts.length > 0 && (
                <>{completedWorkouts.map(renderWorkoutCard)}</>
              )}

              {completedWorkouts.length > 0 &&
                inProgressWorkouts.length > 0 && <View className="mb-4" />}

              {inProgressWorkouts.length > 0 && (
                <>{inProgressWorkouts.map(renderWorkoutCard)}</>
              )}
            </ScrollView>
          )}
        </View>

        {/* Action Button */}
        {!loading && previousWorkouts.length > 0 && (
          <View className="px-5 pb-10 mb-5">
            <TouchableOpacity
              className={`py-4 rounded-2xl items-center flex-row justify-center ${
                selectedWorkout && !repeating
                  ? "bg-primary"
                  : "bg-neutral-light-2"
              }`}
              onPress={handleRepeatWorkout}
              disabled={!selectedWorkout || repeating}
            >
              {repeating ? (
                <>
                  <ActivityIndicator size="small" color={colors.text.primary} />
                  <Text className="text-text-primary font-semibold text-sm ml-2">
                    Creating Workout...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name="repeat"
                    size={18}
                    color={
                      selectedWorkout ? colors.text.primary : colors.text.muted
                    }
                  />
                  <Text
                    className={`font-semibold text-sm ml-2 ${
                      selectedWorkout ? "text-text-primary" : "text-text-muted"
                    }`}
                  >
                    Repeat Selected Workout
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}
