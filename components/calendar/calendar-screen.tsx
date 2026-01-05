import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { DateData } from "react-native-calendars";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useBackgroundJobs } from "@/contexts/background-job-context";
import { useAppDataContext } from "@/contexts/app-data-context";
import { useAuth } from "@/contexts/auth-context";
import {
  regenerateWorkoutPlanAsync,
  regenerateDailyWorkoutAsync,
  generateWorkoutPlanAsync,
  invalidateActiveWorkoutCache,
} from "@lib/workouts";
import { registerForPushNotifications } from "@/lib/notifications";
import { getCurrentUser } from "@lib/auth";
import { setPaywallCallback } from "@/lib/api";
import Header from "@/components/header";
import WorkoutRegenerationModal from "@/components/workout-regeneration-modal";
import WorkoutRepeatModal from "@/components/workout-repeat-modal";
import WorkoutEditModal from "@/components/workout-edit-modal";
import PaymentWallModal from "@/components/subscription/payment-wall-modal";
import { CustomDialog, DialogButton } from "../ui";
import { CalendarSkeleton } from "@/components/skeletons/skeleton-screens";
import { RegenerationType } from "@/constants/global.enum";
import { colors } from "../../lib/theme";
import { formatDateAsString } from "../../utils";
import {
  PlanDayWithBlocks,
  WorkoutWithDetails,
  WorkoutBlockWithExercises,
  SubscriptionPlan,
} from "@/types/api";
import { RegenerationData } from "@/types/calendar.types";
import CalendarViewSection from "./sections/calendar-view";
import CalendarActionButtons from "./sections/action-buttons";
import WorkoutDaySection from "./sections/workout-day";

export default function CalendarScreen() {
  const router = useRouter();
  const {
    setIsGeneratingWorkout,
    setIsPreloadingData,
    user,
    isLoading: authLoading,
  } = useAuth();
  const { addJob, isGenerating } = useBackgroundJobs();
  const scrollViewRef = useRef<ScrollView>(null);
  const {
    data: { workoutData, historyData },
    refresh: { refreshWorkout, refreshHistory, reset },
    loading: { workoutLoading },
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

  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>(
    {}
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0);
  const [showPaymentWall, setShowPaymentWall] = useState(false);
  const [paywallData, setPaywallData] = useState<{
    type: string;
    message: string;
    limits: any;
  } | null>(null);
  const paywallErrorOccurredRef = useRef(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    description: string;
    primaryButton: DialogButton;
    secondaryButton?: DialogButton;
    icon?: keyof typeof Ionicons.glyphMap;
  } | null>(null);

  // Set up paywall callback
  useEffect(() => {
    console.log("[CALENDAR] Setting up paywall callback");
    setPaywallCallback((data) => {
      console.log("[CALENDAR] Paywall callback triggered with data:", data);
      paywallErrorOccurredRef.current = true;
      setPaywallData(data);
      setShowPaymentWall(true);
      console.log(
        "[CALENDAR] Payment wall state updated - showPaymentWall:",
        true
      );
      // Reset the flag after a short delay to allow state to update
      setTimeout(() => {
        paywallErrorOccurredRef.current = false;
      }, 1000);
    });

    return () => {
      setPaywallCallback(() => {});
    };
  }, []);

  // Debug: Log when showPaymentWall changes
  useEffect(() => {
    console.log("[CALENDAR] showPaymentWall changed:", showPaymentWall);
    console.log("[CALENDAR] paywallData:", paywallData);
  }, [showPaymentWall, paywallData]);

  const workoutPlan = useMemo(() => {
    if (!workoutData) {
      return null;
    }

    const today = new Date();
    const todayString = formatDateAsString(today);
    const startDate = workoutData.startDate
      ? formatDateAsString(workoutData.startDate)
      : null;
    const endDate = workoutData.endDate
      ? formatDateAsString(workoutData.endDate)
      : null;

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

  const error = null;

  useEffect(() => {
    if (!workoutData) {
      refreshWorkout();
    }

    if (!historyData) {
      refreshHistory();
    }
  }, [workoutData, historyData, refreshWorkout, refreshHistory]);

  useEffect(() => {
    if (!user && !authLoading) {
      reset();
    }
  }, [user, authLoading, reset]);

  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  useEffect(() => {
    const handleScrollToTop = () => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    };

    const { tabEvents } = require("../../lib/tab-events");
    tabEvents.on("scrollToTop:calendar", handleScrollToTop);

    return () => {
      tabEvents.off("scrollToTop:calendar", handleScrollToTop);
    };
  }, []);

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

      setIsGeneratingWorkout(
        true,
        regenerateType === "day"
          ? RegenerationType.Daily
          : RegenerationType.Weekly
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
          await addJob(response.jobId, "daily-regeneration");
          router.replace("/(tabs)/dashboard");
        } else {
          setIsGeneratingWorkout(false);
        }
      } else {
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
          await addJob(response.jobId, "regeneration");
          router.replace("/(tabs)/dashboard");
        } else {
          setIsGeneratingWorkout(false);
          // Don't show alert if paywall error occurred (modal is already showing)
          if (!paywallErrorOccurredRef.current) {
            setDialogConfig({
              title: "Regeneration Failed",
              description:
                "Unable to start workout regeneration. Please check your connection and try again.",
              primaryButton: {
                text: "OK",
                onPress: () => setDialogVisible(false),
              },
              icon: "alert-circle",
            });
            setDialogVisible(true);
          }
        }
      }
    } catch (err) {
      setIsGeneratingWorkout(false);
      // Don't show alert if paywall error occurred (modal is already showing)
      if (!paywallErrorOccurredRef.current) {
        setDialogConfig({
          title: "Regeneration Error",
          description:
            "An error occurred while starting regeneration. Please try again.",
          primaryButton: {
            text: "OK",
            onPress: () => setDialogVisible(false),
          },
          icon: "alert-circle",
        });
        setDialogVisible(true);
      }
    }
  };

  const handleOpenRegeneration = (planDay?: PlanDayWithBlocks) => {
    setSelectedPlanDay(planDay || null);
    setShowRegenerationModal(true);
  };

  const handleGenerateNewWorkout = async () => {
    if (!user?.id) return;

    if (isGenerating) {
      setDialogConfig({
        title: "Generation in Progress",
        description:
          "A workout is already being generated. Please wait for it to complete.",
        primaryButton: {
          text: "OK",
          onPress: () => setDialogVisible(false),
        },
        icon: "information-circle",
      });
      setDialogVisible(true);
      return;
    }

    try {
      await registerForPushNotifications();

      const result = await generateWorkoutPlanAsync(user.id);
      if (result?.success && result.jobId) {
        await addJob(result.jobId, "generation");
        router.replace("/(tabs)/dashboard");
      } else {
        setDialogConfig({
          title: "Generation Failed",
          description:
            "Unable to start workout generation. Please check your connection and try again.",
          primaryButton: {
            text: "OK",
            onPress: () => setDialogVisible(false),
          },
          icon: "alert-circle",
        });
        setDialogVisible(true);
      }
    } catch (error) {
      setDialogConfig({
        title: "Generation Error",
        description:
          "An error occurred while starting workout generation. Please try again.",
        primaryButton: {
          text: "OK",
          onPress: () => setDialogVisible(false),
        },
        icon: "alert-circle",
      });
      setDialogVisible(true);
    }
  };

  const handleRepeatWorkoutSuccess = () => {
    setIsPreloadingData(true);
    router.replace("/(tabs)/dashboard");
  };

  const getPlanDayForDate = (
    date: string
  ): {
    day: PlanDayWithBlocks;
    index: number;
    isHistorical?: boolean;
  } | null => {
    if (workoutPlan?.planDays) {
      for (let i = 0; i < workoutPlan.planDays.length; i++) {
        const planDay = workoutPlan.planDays[i];
        const planDate = formatDateAsString(planDay.date);
        if (planDate === date) {
          return { day: planDay, index: i, isHistorical: false };
        }
      }
    }

    if (historyData && Array.isArray(historyData)) {
      const today = formatDateAsString(new Date());

      for (const historicalWorkout of historyData) {
        const workoutEndDate = historicalWorkout.endDate
          ? formatDateAsString(historicalWorkout.endDate)
          : null;
        if (!workoutEndDate || today <= workoutEndDate) {
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

  const getMarkedDates = (): Record<string, any> => {
    const markedDates: Record<string, any> = {};
    const today = formatDateAsString(new Date());

    if (workoutPlan?.planDays) {
      workoutPlan.planDays.forEach((planDay) => {
        const dateStr = formatDateAsString(planDay.date);
        const hasBlocks = planDay.blocks && planDay.blocks.length > 0;
        if (hasBlocks) {
          const dots = [];

          if (planDay.isComplete) {
            dots.push({ color: colors.brand.primary });
          } else {
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
        const workoutEndDate = historicalWorkout.endDate
          ? formatDateAsString(historicalWorkout.endDate)
          : null;
        if (!workoutEndDate || today <= workoutEndDate) {
          return;
        }

        if (
          historicalWorkout.planDays &&
          Array.isArray(historicalWorkout.planDays)
        ) {
          historicalWorkout.planDays.forEach((planDay: PlanDayWithBlocks) => {
            const dateStr = formatDateAsString(planDay.date);

            if (!markedDates[dateStr] && planDay.blocks?.length > 0) {
              const dots = [];

              if (planDay.isComplete) {
                dots.push({ color: colors.brand.primary });
              } else {
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

    if (!markedDates[today]) {
      markedDates[today] = {};
    }
    markedDates[today] = {
      ...markedDates[today],
      today: true,
    };

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshWorkout(), refreshHistory()]);
    } catch (error) {
      console.error("Calendar refresh error:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const showTodayButton =
    selectedDate !== formatDateAsString(new Date()) ||
    currentMonth.substring(0, 7) !==
      formatDateAsString(new Date()).substring(0, 7);

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
        <Header workoutTitle={workoutPlan?.name} />

        <CalendarViewSection
          calendarKey={calendarKey}
          currentMonth={currentMonth}
          markedDates={getMarkedDates()}
          onDayPress={handleDateSelect}
          onMonthChange={(month: DateData) => {
            if (month && month.dateString) {
              setCurrentMonth(month.dateString);
            }
          }}
          onPressToday={() => {
            const today = formatDateAsString(new Date());
            setSelectedDate(today);
            setCurrentMonth(today);
            setCalendarKey((prev) => prev + 1);
          }}
          showTodayButton={showTodayButton}
        />

        <CalendarActionButtons
          workoutPlan={workoutPlan}
          isHistoricalWorkout={isHistoricalWorkout}
          isPastDate={isPastDate()}
          currentSelectedPlanDay={currentSelectedPlanDay}
          onOpenRegeneration={handleOpenRegeneration}
          onOpenEditExercises={(planDay) => {
            setSelectedPlanDay(planDay);
            setShowEditModal(true);
          }}
        />

        <WorkoutDaySection
          selectedDate={selectedDate}
          workoutPlan={workoutPlan}
          currentSelectedPlanDay={currentSelectedPlanDay}
          isHistoricalWorkout={isHistoricalWorkout}
          isToday={isToday()}
          isGenerating={isGenerating}
          expandedBlocks={expandedBlocks}
          onToggleBlock={toggleBlockExpansion}
          getTotalExerciseCount={getTotalExerciseCount}
          onStartWorkout={() => {
            router.push("/(tabs)/workout");
          }}
          onRepeatWorkout={() => setShowRepeatModal(true)}
          onGenerateWorkout={handleGenerateNewWorkout}
        />
      </ScrollView>

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

      <WorkoutRepeatModal
        visible={showRepeatModal}
        onClose={() => setShowRepeatModal(false)}
        onSuccess={handleRepeatWorkoutSuccess}
      />

      <WorkoutEditModal
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedPlanDay(null);
        }}
        planDay={selectedPlanDay}
        onSuccess={() => {
          refreshWorkout();
        }}
      />

      <PaymentWallModal
        visible={showPaymentWall}
        onClose={() => {
          console.log("[CALENDAR] Closing payment wall modal");
          setShowPaymentWall(false);
          setPaywallData(null);
        }}
        paywallData={
          paywallData || {
            type: "subscription_required",
            message:
              "A subscription is required to generate new workout plans.",
            limits: {},
          }
        }
        onPlanSelect={(plan: SubscriptionPlan) => {
          // In the future, this will trigger RevenueCat purchase flow
          console.log("Plan selected for purchase:", plan.planId);
          // TODO: Integrate RevenueCat purchase flow here
        }}
      />

      {/* Custom Dialog */}
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
    </View>
  );
}
