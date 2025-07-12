import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar as RNCalendar, DateData } from "react-native-calendars";
import { useRouter } from "expo-router";
import {
  fetchActiveWorkout,
  regenerateWorkoutPlan,
  regenerateDailyWorkout,
  notifyWorkoutUpdated,
} from "@lib/workouts";
import {
  WorkoutWithDetails,
  PlanDayWithBlocks,
  flattenBlocksToExercises,
} from "../types";
import { getCurrentUser } from "@lib/auth";
import { Ionicons } from "@expo/vector-icons";
import WorkoutRegenerationModal from "@components/WorkoutRegenerationModal";
import WorkoutBlock from "@components/WorkoutBlock";
import {
  calculateWorkoutDuration,
  calculatePlanDayDuration,
  formatWorkoutDuration,
  formatExerciseDuration,
  formatDateAsString,
} from "../../utils";
import { colors } from "../../lib/theme";

export default function CalendarScreen() {
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(
    formatDateAsString(new Date())
  );
  const [currentMonth, setCurrentMonth] = useState(
    formatDateAsString(new Date())
  );
  const [loading, setLoading] = useState(true);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutWithDetails | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [showRegenerationModal, setShowRegenerationModal] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [selectedPlanDay, setSelectedPlanDay] =
    useState<PlanDayWithBlocks | null>(null);
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>(
    {}
  );

  useEffect(() => {
    fetchWorkoutPlan();
  }, []);

  const fetchWorkoutPlan = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await getCurrentUser();
      if (!user) {
        setError("User not found");
        return;
      }
      const response = await fetchActiveWorkout();
      if (response) {
        setWorkoutPlan(response.workout);

        // Set current month to today's date if no workout plan, or to the first workout day
        if (
          response.workout?.planDays &&
          response.workout.planDays.length > 0
        ) {
          const firstWorkoutDate = formatDateAsString(
            response.workout.planDays[0].date
          );
          setCurrentMonth(firstWorkoutDate);
        } else {
          setCurrentMonth(formatDateAsString(new Date()));
        }
      }
    } catch (err) {
      setError("Failed to load workout plan");
      console.error("Error fetching workout plan:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async (
    data: any, // Using any to avoid type conflicts for now
    selectedType?: "week" | "day"
  ) => {
    try {
      setRegenerating(true);
      const user = await getCurrentUser();
      if (!user) {
        setError("User not found");
        return;
      }

      const regenerateType = selectedType || "week";

      if (regenerateType === "day") {
        const currentPlanDayResult = getPlanDayForDate(selectedDate);
        const dayToRegenerate = selectedPlanDay || currentPlanDayResult?.day;

        if (!dayToRegenerate) {
          setError("No workout found for the selected day");
          return;
        }

        const response = await regenerateDailyWorkout(
          user.id,
          dayToRegenerate.id,
          data.customFeedback || "User requested regeneration"
        );
        if (response) {
          setWorkoutPlan((prev) => {
            if (!prev) return prev;
            const updatedPlanDays = prev.planDays.map((day) =>
              day.id === dayToRegenerate.id ? response.planDay : day
            );
            return {
              ...prev,
              planDays: updatedPlanDays,
            };
          });
          // Refresh to ensure consistency
          await fetchWorkoutPlan();
          // Notify other components that workout data has been updated
          notifyWorkoutUpdated();
        }
      } else {
        // Transform data to match backend API expectations
        const apiData = {
          customFeedback: data.customFeedback,
          profileData: data.profileData
            ? {
                ...data.profileData,
                environment: data.profileData.environment
                  ? [data.profileData.environment]
                  : undefined,
                workoutStyles: data.profileData.preferredStyles,
              }
            : undefined,
        };

        const response = await regenerateWorkoutPlan(user.id, apiData);
        if (response) {
          setWorkoutPlan(response.workout);
          // Refresh the workout data to ensure consistency across all components
          await fetchWorkoutPlan();
          // Notify other components that workout data has been updated
          notifyWorkoutUpdated();
        }
      }
    } catch (err) {
      setError("Failed to regenerate workout");
      console.error("Error regenerating workout:", err);
    } finally {
      setRegenerating(false);
      setShowRegenerationModal(false);
    }
  };

  const handleOpenRegeneration = (planDay?: PlanDayWithBlocks) => {
    setSelectedPlanDay(planDay || null);
    setShowRegenerationModal(true);
  };

  const getPlanDayForDate = (
    date: string
  ): { day: PlanDayWithBlocks; index: number } | null => {
    if (!workoutPlan?.planDays) return null;

    for (let i = 0; i < workoutPlan.planDays.length; i++) {
      const planDay = workoutPlan.planDays[i];
      const planDate = formatDateAsString(planDay.date);
      if (planDate === date) {
        return { day: planDay, index: i };
      }
    }
    return null;
  };

  const getMarkedDates = () => {
    const markedDates: any = {};
    const today = formatDateAsString(new Date());

    if (workoutPlan?.planDays) {
      workoutPlan.planDays.forEach((planDay) => {
        const dateStr = formatDateAsString(planDay.date);
        const hasBlocks = planDay.blocks && planDay.blocks.length > 0;
        if (hasBlocks) {
          markedDates[dateStr] = {
            dots: [{ color: colors.brand.primary }],
            selectedColor: colors.brand.secondary,
            selected: dateStr === selectedDate,
          };
        }
      });
    }

    // Mark today
    if (!markedDates[today]) {
      markedDates[today] = {};
    }
    markedDates[today] = {
      ...markedDates[today],
      today: true,
    };

    // Ensure selected date is marked
    if (!markedDates[selectedDate]) {
      markedDates[selectedDate] = {};
    }
    markedDates[selectedDate] = {
      ...markedDates[selectedDate],
      selected: true,
      selectedColor: colors.brand.secondary,
    };

    return markedDates;
  };

  const handleDateSelect = (day: DateData) => {
    setSelectedDate(day.dateString);
    setCurrentMonth(day.dateString);

    // Reset expanded blocks when selecting a new date
    // This ensures blocks start expanded for the new date
    setExpandedBlocks({});
  };

  const isToday = () => {
    const today = formatDateAsString(new Date());
    return selectedDate === today;
  };

  const toggleBlockExpansion = (blockId: number) => {
    setExpandedBlocks((prev) => ({
      ...prev,
      [blockId]: prev[blockId] === false ? undefined : false, // Toggle between undefined (expanded) and false (collapsed)
    }));
  };

  const getTotalExerciseCount = (blocks: any[]) => {
    return blocks.reduce((total, block) => {
      return total + (block.exercises?.length || 0);
    }, 0);
  };

  const calculateTotalWorkoutDuration = (planDay: any) => {
    // Use the new utility function that prioritizes blockDurationMinutes
    return calculatePlanDayDuration(planDay);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color={colors.brand.primary} />
        <Text className="mt-md text-sm font-medium text-text-primary">
          Loading workout plan...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-background px-5">
        <Text className="text-sm text-red-500 mb-md text-center">{error}</Text>
        <TouchableOpacity
          className="bg-secondary py-3 px-6 rounded-xl"
          onPress={fetchWorkoutPlan}
        >
          <Text className="text-background font-semibold text-sm">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const selectedPlanDayResult = getPlanDayForDate(selectedDate);
  const currentSelectedPlanDay = selectedPlanDayResult
    ? selectedPlanDayResult.day
    : null;
  const selectedPlanDayIndex = selectedPlanDayResult
    ? selectedPlanDayResult.index
    : null;

  const formatDate = (dateString: string) => {
    // Use safe parsing for YYYY-MM-DD format strings
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split("-").map(Number);
      const date = new Date(year, month - 1, day); // month is 0-indexed
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    }

    // Fallback for other date formats
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <View className="flex-1 pt-4 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="pt-6">
          {workoutPlan?.name && (
            <View className="flex justify-center items-center px-4">
              <Text className="text-xl font-bold text-text-primary mb-4">
                {workoutPlan?.name}
              </Text>
            </View>
          )}
        </View>
        {/* Calendar */}
        <View className="bg-background mx-lg my-md rounded-xl overflow-hidden">
          <RNCalendar
            current={currentMonth}
            onDayPress={handleDateSelect}
            onMonthChange={(month: any) => {
              // Update the current month when user manually navigates
              if (month && month.dateString) {
                setCurrentMonth(month.dateString);
              }
            }}
            markedDates={getMarkedDates()}
            markingType="multi-dot"
            minDate={
              workoutPlan?.startDate
                ? formatDateAsString(workoutPlan.startDate)
                : formatDateAsString(new Date())
            }
            maxDate={
              workoutPlan?.startDate
                ? (() => {
                    // Use safe date parsing and add 6 days
                    const startDate = new Date(workoutPlan.startDate);
                    const maxDate = new Date(
                      startDate.getTime() + 6 * 24 * 60 * 60 * 1000
                    );
                    return formatDateAsString(maxDate);
                  })()
                : (() => {
                    const futureDate = new Date(
                      Date.now() + 30 * 24 * 60 * 60 * 1000
                    );
                    return formatDateAsString(futureDate);
                  })()
            }
            disableAllTouchEventsForDisabledDays={true}
            theme={{
              calendarBackground: colors.background,
              textSectionTitleColor: colors.text.muted,
              selectedDayBackgroundColor: colors.brand.secondary,
              selectedDayTextColor: colors.neutral.white,
              todayTextColor: colors.brand.primary,
              dayTextColor: colors.text.primary,
              textDisabledColor: colors.neutral.medium[2],
              arrowColor: colors.text.primary,
              monthTextColor: colors.text.primary,
              indicatorColor: colors.brand.primary,
              textDayFontFamily: "System",
              textMonthFontFamily: "System",
              textDayHeaderFontFamily: "System",
              textDayFontWeight: "500",
              textMonthFontWeight: "600",
              textDayHeaderFontWeight: "500",
              textDayFontSize: 14,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 12,
            }}
          />
        </View>

        {/* Regenerate Button */}
        <View className="px-lg my-lg">
          <TouchableOpacity
            className="bg-primary py-md rounded-xl items-center flex-row justify-center"
            onPress={() => handleOpenRegeneration()}
            disabled={regenerating}
          >
            <Ionicons
              name="settings-outline"
              size={18}
              color={colors.neutral.light[1]}
            />
            <Text className="text-neutral-light-1 font-semibold text-md ml-sm">
              Edit your workout plan
            </Text>
          </TouchableOpacity>
        </View>

        {/* Selected Date Workout */}
        {selectedDate && (
          <View className="px-lg">
            {!currentSelectedPlanDay ? (
              <View>
                <Text className="text-base font-bold text-text-primary mb-md">
                  {formatDate(selectedDate)}
                </Text>
                <View className="bg-brand-light-2 p-6 rounded-xl items-center">
                  <Text className="text-base font-bold text-text-primary mb-xs">
                    Rest Day
                  </Text>
                  <Text className="text-sm text-text-muted text-center leading-5">
                    Take this time to recover and prepare for your next workout!
                  </Text>
                </View>
              </View>
            ) : (
              <View className="mb-lg">
                {/* Workout Header */}
                <View className="mb-md">
                  <View className="flex-row items-center justify-between mb-1">
                    <View className="flex-1">
                      <Text className="text-base font-bold text-text-primary">
                        {currentSelectedPlanDay.description ||
                          formatDate(selectedDate)}
                      </Text>
                      <View className="flex-row items-center mt-xs">
                        <Text className="text-xs text-text-muted">
                          {getTotalExerciseCount(
                            currentSelectedPlanDay.blocks || []
                          )}{" "}
                          exercises
                        </Text>
                        <Text className="text-xs text-text-muted mx-2">•</Text>
                        <Text className="text-xs text-text-muted">
                          {formatWorkoutDuration(
                            calculateTotalWorkoutDuration(
                              currentSelectedPlanDay
                            )
                          )}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center space-x-sm">
                      {isToday() && (
                        <TouchableOpacity
                          className="bg-secondary py-2 px-4 rounded-xl"
                          onPress={() => {
                            router.push("/(tabs)/workout");
                          }}
                        >
                          <Text className="text-background font-semibold text-sm">
                            Start
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  {currentSelectedPlanDay.instructions && (
                    <Text className="text-sm text-text-muted leading-5">
                      {currentSelectedPlanDay.instructions}
                    </Text>
                  )}
                </View>

                {/* Workout Blocks */}
                <View className="space-y-sm">
                  {currentSelectedPlanDay.blocks &&
                  currentSelectedPlanDay.blocks.length > 0 ? (
                    currentSelectedPlanDay.blocks.map((block, blockIndex) => (
                      <WorkoutBlock
                        key={block.id}
                        block={block}
                        blockIndex={blockIndex}
                        isExpanded={expandedBlocks[block.id] !== false} // undefined = expanded, false = collapsed
                        onToggleExpanded={() => toggleBlockExpansion(block.id)}
                        showDetails={true}
                        variant="calendar"
                      />
                    ))
                  ) : (
                    <View className="bg-neutral-light-2 p-6 rounded-xl items-center">
                      <Text className="text-base font-bold text-text-primary mb-xs">
                        No Workout Planned
                      </Text>
                      <Text className="text-sm text-text-muted text-center leading-5">
                        This day doesn't have any workout blocks scheduled.
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Workout Regeneration Modal */}
      <WorkoutRegenerationModal
        visible={showRegenerationModal}
        onClose={() => {
          setShowRegenerationModal(false);
          setSelectedPlanDay(null);
        }}
        onRegenerate={handleRegenerate}
        loading={regenerating}
        regenerationType="day"
      />
    </View>
  );
}
