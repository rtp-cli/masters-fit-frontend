import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import {
  fetchPastCompletedDays,
  repeatPastDay,
  fetchPreviousWorkouts,
  repeatPreviousWeekWorkout,
  invalidateActiveWorkoutCache,
} from "@/lib/workouts";
import { getCurrentUser } from "@/lib/auth";
import { formatDateAsString } from "@/utils";
import WorkoutBlock from "@/components/workout-block";
import { CustomDialog } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useAppDataContext } from "@/contexts/app-data-context";
import { useRouter } from "expo-router";
import type { DialogButton } from "@/components/ui";
import type {
  PlanDayWithBlocks,
  WorkoutBlockWithExercises,
} from "@/types/api/workout.types";
import type { PreviousWorkout } from "@/types/api/workout.types";
import {
  calculatePlanDayDuration,
  formatWorkoutDuration,
  formatDate,
} from "@/utils";

interface WorkoutRepeatPickerProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  singleDayOnly?: boolean;
}

export default function WorkoutRepeatPicker({
  visible,
  onClose,
  onSuccess,
  singleDayOnly = false,
}: WorkoutRepeatPickerProps) {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const router = useRouter();
  const {
    setIsPreloadingData,
    setIsGeneratingWorkout,
    setNeedsFullAppRefresh,
  } = useAuth();
  const {
    refresh: { reset, refreshAll },
  } = useAppDataContext();

  const [selectedType, setSelectedType] = useState<"day" | "week">("day");

  // Day tab state
  const [pastDays, setPastDays] = useState<PlanDayWithBlocks[]>([]);
  const [selectedDay, setSelectedDay] = useState<PlanDayWithBlocks | null>(null);
  const [expandedDayCards, setExpandedDayCards] = useState<Record<number, boolean>>({});
  const [loadingDays, setLoadingDays] = useState(false);
  const [copying, setCopying] = useState(false);

  // Week tab state
  const [previousWorkouts, setPreviousWorkouts] = useState<PreviousWorkout[]>(
    []
  );
  const [selectedWorkout, setSelectedWorkout] =
    useState<PreviousWorkout | null>(null);
  const [loadingWeeks, setLoadingWeeks] = useState(false);
  const [repeating, setRepeating] = useState(false);
  const [expandedWorkouts, setExpandedWorkouts] = useState<
    Record<number, boolean>
  >({});
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  // Dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    description: string;
    primaryButton: DialogButton;
    secondaryButton?: DialogButton;
    icon?: keyof typeof Ionicons.glyphMap;
  } | null>(null);

  useEffect(() => {
    if (visible) {
      setSelectedType("day");
      setSelectedDay(null);
      setExpandedDayCards({});
      setSelectedWorkout(null);
      setExpandedWorkouts({});
      setExpandedDays({});
      loadDayData();
      loadWeekData();
    }
  }, [visible]);

  // --- Data loading ---

  const loadDayData = async () => {
    try {
      setLoadingDays(true);
      const days = await fetchPastCompletedDays();
      setPastDays(days);
    } catch (error) {
      console.error("Error loading past days:", error);
    } finally {
      setLoadingDays(false);
    }
  };

  const loadWeekData = async () => {
    try {
      setLoadingWeeks(true);
      const user = await getCurrentUser();
      if (!user) return;
      const workouts = await fetchPreviousWorkouts(user.id);
      setPreviousWorkouts(workouts || []);
    } catch (error) {
      console.error("Error loading previous workouts:", error);
    } finally {
      setLoadingWeeks(false);
    }
  };

  // --- Day tab handlers ---

  const handleRepeatDay = async () => {
    if (!selectedDay) return;
    try {
      setCopying(true);

      const result = await repeatPastDay(selectedDay.id);
      if (result?.success) {
        onClose();
        setIsGeneratingWorkout(true, "repeat");
        invalidateActiveWorkoutCache();
        setNeedsFullAppRefresh(true);
        setIsPreloadingData(true);
        reset();
        refreshAll();
        router.replace("/(tabs)/dashboard");
      } else {
        throw new Error("Failed to copy workout");
      }
    } catch (error) {
      console.error("Error copying past workout:", error);
      showError("Failed to copy this workout. Please try again.");
    } finally {
      setCopying(false);
    }
  };

  const toggleDayCardExpanded = (dayId: number) => {
    setExpandedDayCards((prev) => ({
      ...prev,
      [dayId]: !prev[dayId],
    }));
  };

  // --- Week tab handlers ---

  const handleRepeatWeek = async () => {
    if (!selectedWorkout) return;
    try {
      setRepeating(true);

      const user = await getCurrentUser();
      if (!user) {
        showError("User not found. Please log in again.");
        return;
      }

      const today = new Date();
      const newStartDate = formatDateAsString(today);
      const result = await repeatPreviousWeekWorkout(
        user.id,
        selectedWorkout.id,
        newStartDate
      );

      if (result?.success) {
        onClose();
        setIsGeneratingWorkout(true, "repeat");
        invalidateActiveWorkoutCache();
        setNeedsFullAppRefresh(true);
        setIsPreloadingData(true);
        reset();
        refreshAll();
        router.replace("/(tabs)/dashboard");
      } else {
        throw new Error("Failed to repeat workout");
      }
    } catch (error) {
      console.error("Error repeating workout:", error);
      showError(
        "Failed to repeat the workout. Please try again or generate a new workout."
      );
    } finally {
      setRepeating(false);
    }
  };

  const showError = (message: string) => {
    setDialogConfig({
      title: "Error",
      description: message,
      primaryButton: { text: "OK", onPress: () => setDialogVisible(false) },
      icon: "alert-circle",
    });
    setDialogVisible(true);
  };

  // --- Shared helpers ---

  const getTotalExerciseCount = (blocks: WorkoutBlockWithExercises[]) =>
    blocks.reduce((total, block) => total + (block.exercises?.length || 0), 0);

  const formatDayDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatWeekDates = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startStr = formatDate(start, { month: "long", day: "numeric" });
    const endStr = formatDate(end, { day: "numeric", year: "numeric" });
    return `${startStr} - ${endStr}`;
  };

  const toggleExpanded = (workoutId: number) => {
    setExpandedWorkouts((prev) => ({
      ...prev,
      [workoutId]: !prev[workoutId],
    }));
  };

  const toggleDayExpanded = (dayId: string) => {
    setExpandedDays((prev) => {
      const newState: Record<string, boolean> = {};
      if (!prev[dayId]) newState[dayId] = true;
      return newState;
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

  // --- Day tab rendering ---

  const renderDayItem = ({ item }: { item: PlanDayWithBlocks }) => {
    const isSelected = selectedDay?.id === item.id;
    const isExpanded = expandedDayCards[item.id] || false;
    const blockCount = item.blocks?.length || 0;
    const exerciseCount = getTotalExerciseCount(item.blocks || []);

    return (
      <View className="mb-3">
        <TouchableOpacity
          className={`p-4 rounded-2xl border ${
            isSelected
              ? "bg-primary/10 border-primary"
              : "bg-surface border-neutral-light-2"
          }`}
          onPress={() => setSelectedDay(item)}
          disabled={copying}
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-base font-semibold text-text-primary mb-1">
                {item.name || item.description || "Workout"}
              </Text>
              <Text className="text-sm text-text-muted mb-2">
                {formatDayDate(item.date as unknown as string)}
                {item.blocks && item.blocks.length > 0 &&
                  ` • ${formatWorkoutDuration(calculatePlanDayDuration(item))}`}
              </Text>
              {item.description && item.description !== item.name && (
                <Text className="text-sm text-text-secondary mb-2 leading-5">
                  {item.description}
                </Text>
              )}
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
                  color={colors.contentOnPrimary}
                />
              )}
            </View>
          </View>
          <View className="flex-row items-center justify-between mt-2">
            <View className="flex-row items-center">
              <View className="flex-row items-center mr-4">
                <Ionicons
                  name="fitness-outline"
                  size={14}
                  color={colors.text.muted}
                />
                <Text className="text-xs text-text-muted ml-1">
                  {exerciseCount} exercises
                </Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons
                  name="layers-outline"
                  size={14}
                  color={colors.text.muted}
                />
                <Text className="text-xs text-text-muted ml-1">
                  {blockCount} {blockCount === 1 ? "block" : "blocks"}
                </Text>
              </View>
            </View>
            {blockCount > 0 && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  toggleDayCardExpanded(item.id);
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
            )}
          </View>
        </TouchableOpacity>

        {isExpanded && item.blocks && (
          <View className="mt-2 mx-2 p-1 rounded-lg">
            <View className="bg-surface border-l-4 border-l-neutral-medium-1">
              {item.blocks
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((block, index) => (
                  <View
                    key={block.id}
                    className={`p-4 border-b border-neutral-light-2 ${
                      index === (item.blocks?.length || 0) - 1
                        ? "border-b-0"
                        : ""
                    }`}
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <View className="flex-row items-center mb-1">
                          <View className="w-6 h-6 rounded-full bg-surface-elevated items-center justify-center mr-3">
                            <Text className="text-xs font-bold text-text-primary">
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
                        <View className="ml-9">
                          <Text className="text-text-muted text-sm">
                            {getBlockTypeDisplayName(block.blockType)} •{" "}
                            {block.exercises?.length || 0} exercises
                          </Text>
                          {/* Exercise details */}
                          {block.exercises && block.exercises.length > 0 && (
                            <View className="mt-2">
                              {block.exercises.map((ex: any, exIndex: number) => {
                                const parts = [];
                                if (ex.sets) parts.push(`${ex.sets}×${ex.reps || 0}`);
                                if (ex.weight) parts.push(`${ex.weight} lbs`);
                                if (ex.duration) parts.push(`${ex.duration}s`);
                                const detail = parts.length > 0 ? ` — ${parts.join(", ")}` : "";
                                return (
                                  <Text
                                    key={ex.id || exIndex}
                                    className="text-text-muted text-xs leading-5"
                                  >
                                    • {ex.exercise?.name || `Exercise ${exIndex + 1}`}{detail}
                                  </Text>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  // --- Week tab rendering ---

  const renderWeekCard = (workout: PreviousWorkout) => {
    const isSelected = selectedWorkout?.id === workout.id;
    const isExpanded = expandedWorkouts[workout.id] || false;

    return (
      <View key={workout.id} className="mb-3">
        <TouchableOpacity
          className={`p-4 rounded-2xl border ${
            isSelected
              ? "bg-primary/10 border-primary"
              : "bg-surface border-neutral-light-2"
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
                  color={colors.contentOnPrimary}
                />
              )}
            </View>
          </View>
          <View className="flex-row items-center justify-between mt-2">
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
        </TouchableOpacity>

        {isExpanded && workout.planDays && (
          <View className="mt-3 mx-1">
            {workout.planDays.map((day) => (
              <View key={day.id} className="mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-text-primary">
                      {day.name}
                    </Text>
                    <View className="flex-row items-center mt-0.5">
                      <Text className="text-xs text-text-muted">
                        {formatDayDate(day.date)}
                      </Text>
                      <Text className="text-xs text-text-muted mx-2">•</Text>
                      <Text className="text-xs text-text-muted">
                        {day.totalExercises} exercises
                      </Text>
                    </View>
                  </View>
                  {day.isComplete && (
                    <View className="flex-row items-center">
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color={colors.brand.primary}
                      />
                      <Text className="text-xs text-brand-primary ml-1 font-medium">
                        Done
                      </Text>
                    </View>
                  )}
                </View>
                <View className="space-y-2">
                  {(day.blocks || [])
                    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                    .map((block: any, blockIndex: number) => (
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
              </View>
            ))}
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

  const isLoading = selectedType === "day" ? loadingDays : loadingWeeks;
  const isEmpty =
    selectedType === "day"
      ? pastDays.length === 0
      : previousWorkouts.length === 0;
  const isBusy = copying || repeating;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView
        edges={["top"]}
        className={`flex-1 bg-background ${isDark ? "dark" : ""}`}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-light-2">
          <TouchableOpacity
            onPress={onClose}
            className="w-8 h-8 items-center justify-center"
            disabled={isBusy}
          >
            <Ionicons name="close" size={20} color={colors.text.muted} />
          </TouchableOpacity>
          <Text className="text-base font-semibold text-text-primary">
            Repeat a Past Workout
          </Text>
          <View className="w-8" />
        </View>

        {/* Content */}
        <View className="flex-1 px-5 py-5">
          <Text className="text-base text-text-muted mb-6 text-center leading-6">
            Choose a previous workout to repeat:
          </Text>

          {/* Day/Week Pill Toggle — matches regen modal styling */}
          {!singleDayOnly && (
          <View className="flex-row bg-neutral-light-2 rounded-md p-1 mb-6">
            <TouchableOpacity
              className={`flex-1 py-3 px-2 rounded-sm items-center ${
                selectedType === "day" ? "bg-primary" : "bg-transparent"
              }`}
              style={
                selectedType === "day"
                  ? {
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                      elevation: 2,
                    }
                  : undefined
              }
              onPress={() => setSelectedType("day")}
            >
              <Text
                className={`font-medium text-sm ${
                  selectedType === "day"
                    ? "text-content-on-primary"
                    : "text-text-muted"
                }`}
              >
                Single Day
              </Text>
              <Text
                className={`text-xs mt-1 text-center ${
                  selectedType === "day"
                    ? "text-content-on-primary"
                    : "text-text-muted"
                }`}
              >
                Repeat one day
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-3 px-2 rounded-sm items-center ${
                selectedType === "week" ? "bg-primary" : "bg-transparent"
              }`}
              style={
                selectedType === "week"
                  ? {
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                      elevation: 2,
                    }
                  : undefined
              }
              onPress={() => setSelectedType("week")}
            >
              <Text
                className={`font-medium text-sm ${
                  selectedType === "week"
                    ? "text-content-on-primary"
                    : "text-text-muted"
                }`}
              >
                Full Week
              </Text>
              <Text
                className={`text-xs mt-1 text-center ${
                  selectedType === "week"
                    ? "text-content-on-primary"
                    : "text-text-muted"
                }`}
              >
                Repeat entire plan
              </Text>
            </TouchableOpacity>
          </View>
          )}

          {isLoading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color={colors.brand.primary} />
              <Text className="mt-4 text-sm text-text-muted">
                Loading previous workouts...
              </Text>
            </View>
          ) : isEmpty ? (
            <View className="flex-1 justify-center items-center">
              <Ionicons
                name={
                  selectedType === "day"
                    ? "fitness-outline"
                    : "calendar-outline"
                }
                size={64}
                color={colors.text.muted}
              />
              <Text className="text-lg font-semibold text-text-primary mt-4 mb-2">
                {selectedType === "day"
                  ? "No Completed Workouts"
                  : "No Previous Plans"}
              </Text>
              <Text className="text-sm text-text-muted text-center leading-6">
                {selectedType === "day"
                  ? "Complete a workout first, then you can repeat it here."
                  : "You don't have any previous workout plans to repeat."}
              </Text>
            </View>
          ) : selectedType === "day" ? (
            <FlatList
              data={pastDays}
              renderItem={renderDayItem}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <ScrollView
              className="flex-1"
              showsVerticalScrollIndicator={false}
            >
              {completedWorkouts.length > 0 &&
                completedWorkouts.map(renderWeekCard)}
              {completedWorkouts.length > 0 &&
                inProgressWorkouts.length > 0 && <View className="mb-4" />}
              {inProgressWorkouts.length > 0 &&
                inProgressWorkouts.map(renderWeekCard)}
            </ScrollView>
          )}
        </View>

        {/* Action Button — both tabs */}
        {!isLoading && !isEmpty && (
          <View className="px-5 pb-10 mb-5">
            <TouchableOpacity
              className={`py-4 rounded-2xl items-center flex-row justify-center ${
                (selectedType === "day" ? selectedDay : selectedWorkout) && !isBusy
                  ? "bg-primary"
                  : "bg-neutral-light-2"
              }`}
              onPress={selectedType === "day" ? handleRepeatDay : handleRepeatWeek}
              disabled={!(selectedType === "day" ? selectedDay : selectedWorkout) || isBusy}
            >
              {isBusy ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color={colors.text.primary}
                  />
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
                      (selectedType === "day" ? selectedDay : selectedWorkout)
                        ? colors.contentOnPrimary
                        : colors.text.muted
                    }
                  />
                  <Text
                    className={`font-semibold text-sm ml-2 ${
                      (selectedType === "day" ? selectedDay : selectedWorkout)
                        ? "text-content-on-primary"
                        : "text-text-muted"
                    }`}
                  >
                    {selectedType === "day"
                      ? "Repeat Selected Workout"
                      : "Repeat Selected Plan"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      {dialogConfig && (
        <CustomDialog
          visible={dialogVisible}
          onClose={() => setDialogVisible(false)}
          title={dialogConfig.title}
          description={dialogConfig.description}
          primaryButton={dialogConfig.primaryButton}
          secondaryButton={dialogConfig.secondaryButton}
          icon={dialogConfig.icon}
        />
      )}
    </Modal>
  );
}
