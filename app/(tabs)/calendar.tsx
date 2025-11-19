import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { Calendar as RNCalendar, DateData } from "react-native-calendars";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  regenerateWorkoutPlanAsync,
  regenerateDailyWorkoutAsync,
  generateWorkoutPlanAsync,
  invalidateActiveWorkoutCache,
} from "@lib/workouts";
import { registerForPushNotifications } from "@/lib/notifications";
import { useAppDataContext } from "@contexts/AppDataContext";
import { useAuth } from "@contexts/AuthContext";
import {
  PlanDayWithBlocks,
  WorkoutWithDetails,
  WorkoutBlockWithExercises,
} from "../types";
import { RegenerationData } from "@/types/calendar.types";
import { getCurrentUser } from "@lib/auth";
import { Ionicons } from "@expo/vector-icons";
import WorkoutRegenerationModal from "@components/WorkoutRegenerationModal";
import WorkoutRepeatModal from "@components/WorkoutRepeatModal";
import WorkoutEditModal from "@components/WorkoutEditModal";
import { useBackgroundJobs } from "@contexts/BackgroundJobContext";
import WorkoutBlock from "@components/WorkoutBlock";
import NoActiveWorkoutCard from "@/components/NoActiveWorkoutCard";
import {
  calculatePlanDayDuration,
  formatWorkoutDuration,
  formatDateAsString,
} from "../../utils";
import { colors } from "../../lib/theme";
import { CalendarSkeleton } from "../../components/skeletons/SkeletonScreens";

export default function CalendarScreen() {
  const router = useRouter();
  const {
    setIsGeneratingWorkout,
    setIsPreloadingData,
    user,
    isLoading: authLoading,
  } = useAuth();

  // Background jobs hook
  const { addJob, activeJobs, isGenerating } = useBackgroundJobs();

  // Scroll to top ref
  const scrollViewRef = useRef<ScrollView>(null);
  const {
    data: { workoutData, historyData },
    refresh: { refreshWorkout, refreshHistory, refreshAll, reset },
    loading: { historyLoading, workoutLoading },
  } = useAppDataContext();

  const [selectedDate, setSelectedDate] = useState(
    formatDateAsString(new Date())
  );
  const [currentMonth, setCurrentMonth] = useState(
    formatDateAsString(new Date())
  );
  const [showRegenerationModal, setShowRegenerationModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlanDay, setSelectedPlanDay] =
    useState<PlanDayWithBlocks | null>(null);

  // Generation modal states
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>(
    {}
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0);

  // Use workout data from the centralized store - only if it's active and current
  const workoutPlan = useMemo(() => {
    if (!workoutData) {
      return null;
    }

    // Check if workout is active and within date range
    const today = new Date();
    const todayString = formatDateAsString(today);
    const startDate = workoutData.startDate
      ? formatDateAsString(workoutData.startDate)
      : null;
    const endDate = workoutData.endDate
      ? formatDateAsString(workoutData.endDate)
      : null;

    // Only show workout as active if today is within the date range
    // If today is after the end date, the workout should be considered historical
    if (
      startDate &&
      endDate &&
      todayString >= startDate &&
      todayString <= endDate
    ) {
      return workoutData;
    }

    return null;
  }, [workoutData]);

  const error = null; // Error handling is centralized in useAppData

  useEffect(() => {
    // Only fetch if we don't have data yet
    if (!workoutData) {
      refreshWorkout();
    }

    // Always load historical data for calendar - this is the entire point!
    if (!historyData) {
      refreshHistory();
    }
  }, [workoutData, historyData, refreshWorkout, refreshHistory]);

  // Clear app data when user logs out (but not during initial auth loading)
  useEffect(() => {
    if (!user && !authLoading) {
      reset();
    }
  }, [user, authLoading, reset]);

  // Scroll to top when tab is focused
  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  // Listen for tab re-click events
  useEffect(() => {
    const handleScrollToTop = () => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    };

    const { tabEvents } = require("../../lib/tabEvents");
    tabEvents.on("scrollToTop:calendar", handleScrollToTop);

    return () => {
      tabEvents.off("scrollToTop:calendar", handleScrollToTop);
    };
  }, []);

  // Set current month when workout data is available
  useEffect(() => {
    if (workoutPlan?.planDays && workoutPlan.planDays.length > 0) {
      const firstWorkoutDate = formatDateAsString(workoutPlan.planDays[0].date);
      setCurrentMonth(firstWorkoutDate);
    } else {
      setCurrentMonth(formatDateAsString(new Date()));
    }
  }, [workoutPlan]);

  const handleRegenerate = async (
    data: RegenerationData,
    selectedType?: "week" | "day"
  ) => {
    try {
      const regenerateType = selectedType || "week";

      // Show global generating modal with correct type
      setIsGeneratingWorkout(
        true,
        regenerateType === "day" ? "daily" : "weekly"
      );
      setShowRegenerationModal(false);

      const user = await getCurrentUser();
      if (!user) {
        console.error("User not found");
        return;
      }

      if (regenerateType === "day") {
        const currentPlanDayResult = getPlanDayForDate(selectedDate);
        const dayToRegenerate = selectedPlanDay || currentPlanDayResult?.day;

        if (!dayToRegenerate) {
          console.error("No workout found for the selected day");
          return;
        }

        const response = await regenerateDailyWorkoutAsync(
          user.id,
          dayToRegenerate.id,
          {
            reason: data.customFeedback || "User requested regeneration",
          }
        );
        if (response?.success && response.jobId) {
          // Add job to background tracking
          await addJob(response.jobId, "daily-regeneration");

          // Job started successfully - FAB will show progress
          router.replace("/(tabs)/dashboard");
        } else {
          setIsGeneratingWorkout(false);
          Alert.alert(
            "Daily Regeneration Failed",
            "Unable to start daily workout regeneration. Please check your connection and try again.",
            [{ text: "OK" }]
          );
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

        const response = await regenerateWorkoutPlanAsync(user.id, apiData);
        if (response?.success && response.jobId) {
          // Add job to background tracking
          await addJob(response.jobId, "regeneration");

          // Job started successfully - FAB will show progress
          router.replace("/(tabs)/dashboard");
        } else {
          setIsGeneratingWorkout(false);
          Alert.alert(
            "Regeneration Failed",
            "Unable to start workout regeneration. Please check your connection and try again.",
            [{ text: "OK" }]
          );
        }
      }
    } catch (err) {
      setIsGeneratingWorkout(false);
      Alert.alert(
        "Regeneration Error",
        "An error occurred while starting regeneration. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const handleOpenRegeneration = (planDay?: PlanDayWithBlocks) => {
    setSelectedPlanDay(planDay || null);
    setShowRegenerationModal(true);
  };

  const handleGenerateNewWorkout = async () => {
    if (!user?.id) return;

    // Simple prevention using the isGenerating flag
    if (isGenerating) {
      Alert.alert(
        "Generation in Progress",
        "A workout is already being generated. Please wait for it to complete.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      // Register for push notifications
      await registerForPushNotifications();

      const result = await generateWorkoutPlanAsync(user.id);
      if (result?.success && result.jobId) {
        await addJob(result.jobId, "generation");
        router.replace("/(tabs)/dashboard");
      } else {
        Alert.alert(
          "Generation Failed",
          "Unable to start workout generation. Please check your connection and try again.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      Alert.alert(
        "Generation Error",
        "An error occurred while starting workout generation. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const handleRepeatWorkoutSuccess = () => {
    // Refresh all data after successful workout repetition
    setIsPreloadingData(true);
    // Navigate to dashboard to trigger the warming up flow
    router.replace("/(tabs)/dashboard");
  };

  const getPlanDayForDate = (
    date: string
  ): {
    day: PlanDayWithBlocks;
    index: number;
    isHistorical?: boolean;
  } | null => {
    // First check current workout plan
    if (workoutPlan?.planDays) {
      for (let i = 0; i < workoutPlan.planDays.length; i++) {
        const planDay = workoutPlan.planDays[i];
        const planDate = formatDateAsString(planDay.date);
        if (planDate === date) {
          return { day: planDay, index: i, isHistorical: false };
        }
      }
    }

    // If not found in current plan, check historical data
    // Only show workouts that have actually ended (past their end date)
    if (historyData && Array.isArray(historyData)) {
      const today = formatDateAsString(new Date());

      for (const historicalWorkout of historyData) {
        // Only show workouts that have ended
        const workoutEndDate = historicalWorkout.endDate
          ? formatDateAsString(historicalWorkout.endDate)
          : null;
        if (!workoutEndDate || today <= workoutEndDate) {
          // Skip workouts that haven't ended yet
          continue;
        }

        if (
          historicalWorkout.planDays &&
          Array.isArray(historicalWorkout.planDays)
        ) {
          for (let i = 0; i < historicalWorkout.planDays.length; i++) {
            const planDay = historicalWorkout.planDays[i];
            const planDate = formatDateAsString(planDay.date);
            if (planDate === date) {
              return { day: planDay, index: i, isHistorical: true };
            }
          }
        }
      }
    }

    return null;
  };

  const getMarkedDates = (): any => {
    const markedDates: any = {};
    const today = formatDateAsString(new Date());

    // Build marked dates for calendar display

    // Mark current workout plan days
    if (workoutPlan?.planDays) {
      workoutPlan.planDays.forEach((planDay) => {
        const dateStr = formatDateAsString(planDay.date);
        const hasBlocks = planDay.blocks && planDay.blocks.length > 0;
        if (hasBlocks) {
          const dots = [];

          // Add dot based on completion status
          if (planDay.isComplete) {
            // Completed workout - green dot
            dots.push({ color: colors.brand.primary });
          } else {
            // Planned workout - blue dot
            dots.push({ color: colors.brand.secondary });
          }

          markedDates[dateStr] = {
            dots,
            selectedColor: colors.brand.secondary,
            selected: dateStr === selectedDate,
          };
        }
      });
    }

    if (historyData && Array.isArray(historyData)) {
      const today = formatDateAsString(new Date());

      historyData.forEach((historicalWorkout: WorkoutWithDetails) => {
        // Only show workouts that have ended
        const workoutEndDate = historicalWorkout.endDate
          ? formatDateAsString(historicalWorkout.endDate)
          : null;
        if (!workoutEndDate || today <= workoutEndDate) {
          // Skip workouts that haven't ended yet
          return;
        }

        if (
          historicalWorkout.planDays &&
          Array.isArray(historicalWorkout.planDays)
        ) {
          historicalWorkout.planDays.forEach((planDay: PlanDayWithBlocks) => {
            const dateStr = formatDateAsString(planDay.date);

            // Only mark historical dates that aren't already in current plan
            if (!markedDates[dateStr] && planDay.blocks?.length > 0) {
              const dots = [];

              if (planDay.isComplete) {
                // Historical completed workout - green dot
                dots.push({ color: colors.brand.primary });
              } else {
                // Historical incomplete workout - muted dot
                dots.push({ color: colors.text.muted });
              }

              markedDates[dateStr] = {
                dots,
                selectedColor: colors.neutral.light[2],
                selected: dateStr === selectedDate,
              };
            }
          });
        }
      });
    }

    // Mark today with enhanced styling
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
    setExpandedBlocks({});
  };

  const isToday = () => {
    const today = formatDateAsString(new Date());
    return selectedDate === today;
  };

  const isPastDate = () => {
    const today = formatDateAsString(new Date());
    return selectedDate < today;
  };

  const toggleBlockExpansion = (blockId: number) => {
    setExpandedBlocks((prev) => ({
      ...prev,
      [blockId]: prev[blockId] === false ? undefined : false,
    }));
  };

  const getTotalExerciseCount = (blocks: WorkoutBlockWithExercises[]) => {
    return blocks.reduce((total, block) => {
      return total + (block.exercises?.length || 0);
    }, 0);
  };

  if (workoutLoading) {
    return <CalendarSkeleton />;
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-background px-5">
        <Text className="text-sm text-red-500 mb-md text-center">{error}</Text>
        <TouchableOpacity
          className="bg-secondary py-3 px-6 rounded-xl"
          onPress={refreshWorkout}
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
  const isHistoricalWorkout = selectedPlanDayResult?.isHistorical || false;

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

  // Handle pull to refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshWorkout(),
        refreshHistory(), // Always refresh historical data too
      ]);
    } catch (error) {
      console.error("Calendar refresh error:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <View className="flex-1 pt-4 bg-background">
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
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
            key={calendarKey}
            current={currentMonth}
            onDayPress={handleDateSelect}
            onMonthChange={(month: DateData) => {
              // Update the current month when user manually navigates
              if (month && month.dateString) {
                setCurrentMonth(month.dateString);
              }
            }}
            markedDates={getMarkedDates()}
            markingType="multi-dot"
            hideExtraDays={false}
            disableMonthChange={false}
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
              "stylesheet.day.basic": {
                todayText: {
                  color: colors.brand.primary,
                  fontWeight: "bold",
                },
              },
              "stylesheet.day.single": {
                todayText: {
                  color: colors.brand.primary,
                  fontWeight: "bold",
                },
              },
            }}
          />
        </View>

        {/* Go to Today Button - Option 5: Below the calendar */}
        {(selectedDate !== formatDateAsString(new Date()) ||
          currentMonth.substring(0, 7) !==
            formatDateAsString(new Date()).substring(0, 7)) && (
          <View className="mx-lg mb-4">
            <View className="flex justify-center items-center">
              <TouchableOpacity
                className="px-4 py-2 rounded-lg shadow-rn-sm"
                onPress={() => {
                  const today = formatDateAsString(new Date());
                  setSelectedDate(today);
                  setCurrentMonth(today);
                  setCalendarKey((prev) => prev + 1);
                }}
              >
                <Text className="text-brand-primary text-md font-semibold">
                  Today
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Action Buttons - Only show for current workouts */}
        {workoutPlan && !isHistoricalWorkout && !isPastDate() && (
          <View className="px-lg my-lg">
            <View className="flex-row space-x-3">
              {/* Edit Workout Plan Button */}
              <TouchableOpacity
                className="flex-1 bg-primary py-3 rounded-lg items-center flex-row justify-center"
                onPress={() =>
                  handleOpenRegeneration(currentSelectedPlanDay || undefined)
                }
              >
                <Ionicons
                  name="settings-outline"
                  size={16}
                  color={colors.neutral.light[1]}
                />
                <Text className="text-neutral-light-1 font-semibold text-sm ml-2">
                  Edit Workout Plan
                </Text>
              </TouchableOpacity>

              {/* Edit Exercises Button */}
              {currentSelectedPlanDay && (
                <TouchableOpacity
                  className="flex-1 ml-2 bg-white border border-primary py-3 rounded-lg items-center flex-row justify-center"
                  onPress={() => {
                    setSelectedPlanDay(currentSelectedPlanDay);
                    setShowEditModal(true);
                  }}
                >
                  <Ionicons
                    name="create-outline"
                    size={16}
                    color={colors.brand.primary}
                  />
                  <Text className="text-primary font-semibold text-sm ml-2">
                    Replace Exercises
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Selected Date Workout */}
        {selectedDate && (
          <View className="px-lg">
            {!currentSelectedPlanDay ? (
              <View>
                <Text className="text-base font-bold text-text-primary mb-md">
                  {formatDate(selectedDate)}
                </Text>
                {!workoutPlan ||
                (workoutPlan?.endDate &&
                  selectedDate > formatDateAsString(workoutPlan.endDate)) ? (
                  // No active workout plan at all OR selected date is beyond workout plan end date
                  <NoActiveWorkoutCard
                    isGenerating={isGenerating}
                    onRepeatWorkout={() => setShowRepeatModal(true)}
                    onGenerateWorkout={handleGenerateNewWorkout}
                    variant="calendar"
                    showActionsOnlyForToday={true}
                    isToday={isToday()}
                  />
                ) : (
                  // Active workout plan and selected date is within plan duration but no workout scheduled (rest day)
                  <View className="bg-brand-light-1 p-6 rounded-xl items-center">
                    <Text className="text-base font-bold text-text-primary mb-xs">
                      Rest Day
                    </Text>
                    <Text className="text-sm text-text-muted text-center leading-5">
                      Take this time to recover and prepare for your next
                      workout!
                    </Text>
                  </View>
                )}
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
                            calculatePlanDayDuration(currentSelectedPlanDay)
                          )}
                        </Text>
                        {currentSelectedPlanDay.isComplete && (
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
                    <View className="flex-row items-center space-x-sm">
                      {isToday() && !isHistoricalWorkout && workoutPlan && (
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
                    currentSelectedPlanDay.blocks
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map((block, blockIndex) => (
                        <WorkoutBlock
                          key={block.id}
                          block={block}
                          blockIndex={blockIndex}
                          isExpanded={expandedBlocks[block.id] !== false} // undefined = expanded, false = collapsed
                          onToggleExpanded={() =>
                            toggleBlockExpansion(block.id)
                          }
                          showDetails={true}
                          variant="calendar"
                        />
                      ))
                  ) : (
                    <View className="bg-brand-light-1 p-6 rounded-xl items-center">
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
        loading={false}
        regenerationType={selectedPlanDay ? "day" : "week"}
        selectedPlanDay={selectedPlanDay}
        isRestDay={
          !selectedPlanDay &&
          !!workoutPlan &&
          workoutPlan.endDate &&
          selectedDate <= formatDateAsString(workoutPlan.endDate)
        }
        noActiveWorkoutDay={
          !workoutPlan ||
          (workoutPlan?.endDate &&
            selectedDate > formatDateAsString(workoutPlan.endDate))
        }
        selectedDate={selectedDate}
        onSuccess={() => {
          invalidateActiveWorkoutCache();
        }}
      />

      {/* Workout Repeat Modal */}
      <WorkoutRepeatModal
        visible={showRepeatModal}
        onClose={() => setShowRepeatModal(false)}
        onSuccess={handleRepeatWorkoutSuccess}
      />

      {/* Workout Edit Modal */}
      <WorkoutEditModal
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedPlanDay(null);
        }}
        planDay={selectedPlanDay}
        onSuccess={() => {
          // Refresh workout data
          refreshWorkout();
        }}
      />
    </View>
  );
}
