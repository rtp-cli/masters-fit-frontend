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
import { WorkoutWithDetails, PlanDayWithExercises } from "../types";
import { getCurrentUser } from "@lib/auth";
import { Ionicons } from "@expo/vector-icons";
import WorkoutRegenerationModal from "@components/WorkoutRegenerationModal";
import { calculateWorkoutDuration, formatExerciseDuration } from "../../utils";
import { colors } from "../../lib/theme";

export default function CalendarScreen() {
  const router = useRouter();

  // Helper function to format Date to YYYY-MM-DD string without timezone issues
  const formatDateToString = (date: Date | string): string => {
    // Handle both Date objects and ISO date strings
    if (!date) {
      console.warn(
        "formatDateToString received null/undefined date, using current date"
      );
      const today = new Date();
      return (
        today.getFullYear() +
        "-" +
        String(today.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(today.getDate()).padStart(2, "0")
      );
    }

    // If it's already a YYYY-MM-DD string, return it directly
    if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }

    // For other string formats or Date objects, parse safely
    let dateObj: Date;
    if (typeof date === "string") {
      // Try to parse safely first
      if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
        const [year, month, day] = date.split("-").map(Number);
        dateObj = new Date(year, month - 1, day); // month is 0-indexed
      } else {
        dateObj = new Date(date); // fallback for other formats
      }
    } else {
      dateObj = date;
    }

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn(
        "formatDateToString received invalid date:",
        date,
        "using current date"
      );
      const today = new Date();
      return (
        today.getFullYear() +
        "-" +
        String(today.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(today.getDate()).padStart(2, "0")
      );
    }

    return (
      dateObj.getFullYear() +
      "-" +
      String(dateObj.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(dateObj.getDate()).padStart(2, "0")
    );
  };

  const [selectedDate, setSelectedDate] = useState(
    formatDateToString(new Date())
  );
  const [loading, setLoading] = useState(true);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutWithDetails | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [showRegenerationModal, setShowRegenerationModal] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [selectedPlanDay, setSelectedPlanDay] =
    useState<PlanDayWithExercises | null>(null);

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

      setShowRegenerationModal(false);
      setSelectedPlanDay(null);
    } catch (err) {
      const regenerateType = selectedType || "week";
      setError(`Failed to regenerate ${regenerateType} workout`);
      console.error("Error regenerating workout:", err);
    } finally {
      setRegenerating(false);
    }
  };

  const handleOpenRegeneration = (planDay?: PlanDayWithExercises) => {
    setSelectedPlanDay(planDay || null);
    setShowRegenerationModal(true);
  };

  // Get the plan day and its index for the selected date
  const getPlanDayForDate = (
    date: string
  ): { day: PlanDayWithExercises; index: number } | null => {
    if (!workoutPlan) return null;
    // Use direct date string comparison to avoid timezone issues
    const normalizedDate = date; // date is already in YYYY-MM-DD format from calendar
    const index = workoutPlan.planDays.findIndex((day) => {
      // Handle both string and Date objects from API
      const planDate = day.date
        ? typeof day.date === "string"
          ? day.date
          : formatDateToString(day.date)
        : null;
      return planDate === normalizedDate;
    });
    if (index === -1) return null;
    return { day: workoutPlan.planDays[index], index };
  };

  // Prepare marked dates for the calendar
  const getMarkedDates = () => {
    if (!workoutPlan) return {};

    const markedDates: any = {};
    const today = new Date();
    const todayStr = formatDateToString(today);
    const normalizedSelectedDate = selectedDate; // Already in YYYY-MM-DD format

    workoutPlan.planDays.forEach((day) => {
      // Handle both string and Date objects from API
      if (day.date) {
        const dateStr =
          typeof day.date === "string"
            ? day.date
            : formatDateToString(day.date);
        markedDates[dateStr] = {
          marked: true,
          dotColor: colors.brand.primary,
          selected: dateStr === normalizedSelectedDate,
          selectedColor:
            dateStr === normalizedSelectedDate
              ? colors.brand.secondary
              : undefined,
        };
      }
    });

    // Mark today
    if (!markedDates[todayStr]) {
      markedDates[todayStr] = {
        selected: todayStr === normalizedSelectedDate,
        selectedColor:
          todayStr === normalizedSelectedDate
            ? colors.brand.secondary
            : undefined,
      };
    }

    return markedDates;
  };

  // Handle date selection
  const handleDateSelect = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  // Check if selected date is today
  const isToday = () => {
    const today = new Date();
    const todayStr = formatDateToString(today);
    return todayStr === selectedDate;
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text className="mt-4 text-text-muted">Loading your calendar...</Text>
        </View>
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
            current={selectedDate}
            onDayPress={handleDateSelect}
            markedDates={getMarkedDates()}
            minDate={
              workoutPlan?.startDate
                ? formatDateToString(workoutPlan.startDate)
                : (() => {
                    const today = new Date();
                    return (
                      today.getFullYear() +
                      "-" +
                      String(today.getMonth() + 1).padStart(2, "0") +
                      "-" +
                      String(today.getDate()).padStart(2, "0")
                    );
                  })()
            }
            maxDate={
              workoutPlan?.startDate
                ? (() => {
                    // Use safe date parsing and add 6 days
                    const startDate =
                      workoutPlan.startDate instanceof Date
                        ? workoutPlan.startDate
                        : new Date(workoutPlan.startDate);
                    const maxDate = new Date(
                      startDate.getTime() + 6 * 24 * 60 * 60 * 1000
                    );
                    return formatDateToString(maxDate);
                  })()
                : (() => {
                    const futureDate = new Date(
                      Date.now() + 30 * 24 * 60 * 60 * 1000
                    );
                    return formatDateToString(futureDate);
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
              dotColor: colors.brand.primary,
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
              name="refresh"
              size={18}
              color={colors.neutral.light[1]}
            />
            <Text className="text-neutral-light-1 font-semibold text-sm ml-sm">
              Regenerate Workout Flow
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
                <View className="bg-neutral-light-2 p-6 rounded-xl items-center">
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
                          {currentSelectedPlanDay.exercises.length} exercises
                        </Text>
                        {currentSelectedPlanDay.exercises.some(
                          (ex) => ex.duration && ex.duration > 0
                        ) && (
                          <>
                            <Text className="text-text-muted mx-xs">•</Text>
                            <Text className="text-xs text-text-muted">
                              {Math.round(
                                calculateWorkoutDuration(
                                  currentSelectedPlanDay.exercises
                                ) / 60
                              )}{" "}
                              min
                            </Text>
                          </>
                        )}
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

                {/* Exercises List */}
                <View className="space-y-sm">
                  <Text className="text-sm font-semibold text-text-primary mb-md">
                    Exercises
                  </Text>

                  {currentSelectedPlanDay.exercises.map((exercise, index) => (
                    <View
                      key={exercise.id}
                      className="bg-brand-light-1 rounded-xl p-md mb-sm"
                    >
                      <View className="flex-col">
                        <View className="flex-row items-center justify-between mb-xs">
                          <View className="flex-1">
                            <Text className="text-sm font-semibold text-text-primary mb-xs">
                              {exercise.exercise.name}
                            </Text>
                            <View className="flex-row items-center">
                              <Text className="text-xs text-text-muted">
                                {exercise.sets && exercise.reps
                                  ? `${exercise.sets} sets • ${exercise.reps} reps`
                                  : exercise.duration
                                    ? formatExerciseDuration(
                                        exercise.duration,
                                        exercise.sets,
                                        exercise.restTime
                                      )
                                    : "Duration varies"}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Exercise Notes */}
                        {exercise.notes && (
                          <View className="mt-xs">
                            <Text className="text-xs text-text-muted leading-4">
                              {exercise.notes}
                            </Text>
                          </View>
                        )}

                        {/* Exercise Instructions */}
                        {exercise.exercise.instructions && (
                          <View className="mt-xs">
                            <Text className="text-xs text-text-muted leading-4 italic">
                              {exercise.exercise.instructions}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
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
        regenerationType="week"
      />
    </View>
  );
}
