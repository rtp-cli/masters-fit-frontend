import { Ionicons } from "@expo/vector-icons";
import { getCurrentUser } from "@lib/auth";
import {
  invalidateActiveWorkoutCache,
  regenerateDailyWorkoutAsync,
  regenerateWorkoutPlanAsync,
} from "@lib/workouts";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef,useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { type DateData } from "react-native-calendars";

import Header from "@/components/header";
import JustGeneratedBadge from "@/components/just-generated-badge";
import { LogActivitySheet, LoggedActivityRow } from "@/components/log-activity";
import {
  CoachingCautionsBanner,
  FeedbackConflictsBanner,
} from "@/components/plan-advisory-banner";
import { CalendarSkeleton } from "@/components/skeletons/skeleton-screens";
import WorkoutChoiceModal from "@/components/workout-choice-modal";
import WorkoutEditModal from "@/components/workout-edit-modal";
import WorkoutRegenerationModal from "@/components/workout-regeneration-modal";
import WorkoutRepeatPicker from "@/components/workout-repeat-picker";
import { RegenerationType } from "@/constants/global.enum";
import { useAppDataContext } from "@/contexts/app-data-context";
import { useAuth } from "@/contexts/auth-context";
import { useBackgroundJobs } from "@/contexts/background-job-context";
import { useWorkout } from "@/contexts/workout-context";
import { useLoggedActivities } from "@/hooks/use-logged-activities";
import { PaywallError } from "@/lib/api";
import { clearPendingResume, setPendingResume } from "@/lib/paywall-resume";
import { tabEvents } from "@/lib/tab-events";
import {
  type PlanDayWithBlocks,
  type WorkoutBlockWithExercises,
  type WorkoutWithDetails,
} from "@/types/api";
import { type RegenerationData } from "@/types/calendar.types";

import { type ThemeColorPalette,useThemeColors } from "../../lib/theme";
import { useTheme } from "../../lib/theme-context";
import { formatDateAsString } from "../../utils";
import {
  selectSessionForDate,
  sessionsForDate,
} from "../../utils/session-for-date";
import { CustomDialog, type DialogButton } from "../ui";
import SessionSwitcher from "../workout/session-switcher";
import CalendarActionButtons from "./sections/action-buttons";
import CalendarViewSection from "./sections/calendar-view";
import WorkoutDaySection from "./sections/workout-day";

export default function CalendarScreen() {
  const colors = useThemeColors();
  // Reserved completion accent (MF-004/005); falls back to ink for themes without it.
  const successColor =
    (colors as ThemeColorPalette).success ?? colors.brand.primary;
  const { isDark } = useTheme();
  const router = useRouter();
  const { requestAutoStart } = useWorkout();
  const {
    setIsGeneratingWorkout,
    user,
    isLoading: authLoading,
  } = useAuth();
  const { addJob, isGenerating, justGenerated, clearJustGenerated } =
    useBackgroundJobs();
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

  // [LR-077] Activities the user logged themselves.
  //
  // Loaded UNWINDOWED rather than per visible month: the list is small (one row
  // per activity, not per exercise), and a window keyed on currentMonth would
  // refetch on every month swipe and leave dots missing for the month either
  // side while it did. Revisit if anyone ever accumulates enough of these for
  // the payload to matter.
  const [showLogActivity, setShowLogActivity] = useState(false);
  const loggedActivities = useLoggedActivities();
  // [LR-069] Which session the user picked when a date holds more than one.
  // Null means "whatever selectSessionForDate would choose".
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    null,
  );
  const [selectedPlanDay, setSelectedPlanDay] =
    useState<PlanDayWithBlocks | null>(null);
  // "Edit it myself" hands off from the regeneration sheet to the editor. On
  // iOS a pageSheet can't be presented while another is dismissing, so we arm
  // this, close the sheet, and open the editor from the sheet's onDismiss.
  const pendingEditRef = useRef(false);
  // Same hand-off for "Use a workout I've done before".
  const pendingRepeatRef = useRef(false);

  const [showWorkoutChoice, setShowWorkoutChoice] = useState(false);
  const [showRepeatPicker, setShowRepeatPicker] = useState(false);
  // Set when the repeat picker is opened FROM the Change Workout sheet, which
  // is day-scoped and lands on a day that already has a workout. Captured at
  // tap time because closing the sheet nulls selectedPlanDay. Null when the
  // picker is opened from the no-plan card, which keeps its week tab and its
  // default "today" target.
  const [repeatTarget, setRepeatTarget] = useState<{
    date: string;
    name: string;
  } | null>(null);
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>(
    {}
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    description: string;
    primaryButton: DialogButton;
    secondaryButton?: DialogButton;
    icon?: keyof typeof Ionicons.glyphMap;
  } | null>(null);

  // Screen-level failure dialog for the adjust sheet: that sheet dismisses
  // itself before calling the API, so its own dialog can't be seen (LR-067).
  const showAdjustmentError = useCallback((title: string, description: string) => {
    setDialogConfig({
      title,
      description,
      primaryButton: { text: "OK", onPress: () => setDialogVisible(false) },
      icon: "alert-circle",
    });
    setDialogVisible(true);
  }, []);

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

  const hasFocusedOnce = useRef(false);

  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      // Self-heal on tab focus (mirrors the Workout screen). The completion
      // event bus is the primary path, but if Calendar ever lands stale data
      // — e.g. a post-regen refresh raced backend read-after-write — a plain
      // tab switch back here re-fetches fresh instead of stranding the user
      // on the old plan until a manual pull-to-refresh. Skip the very first
      // focus, which the mount effect already covers.
      if (hasFocusedOnce.current) {
        refreshWorkout();
      } else {
        hasFocusedOnce.current = true;
      }
      // Clear the "Just generated" badge once the user navigates away.
      return () => clearJustGenerated();
    }, [clearJustGenerated, refreshWorkout])
  );

  useEffect(() => {
    const handleScrollToTop = () => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    };

    // Re-select today in the month grid when a full-week generation lands here.
    const handleSelectToday = () => {
      const today = formatDateAsString(new Date());
      setSelectedDate(today);
      setCurrentMonth(today);
      setCalendarKey((prev) => prev + 1);
    };

    tabEvents.on("scrollToTop:calendar", handleScrollToTop);
    tabEvents.on("selectToday:calendar", handleSelectToday);

    return () => {
      tabEvents.off("scrollToTop:calendar", handleScrollToTop);
      tabEvents.off("selectToday:calendar", handleSelectToday);
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

      // Arm resume-after-purchase: if the server gates this behind a paywall and
      // the user subscribes, re-run this whole handler with the same args.
      setPendingResume(() => {
        void handleRegenerate(data, selectedType);
      });

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
          clearPendingResume();
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
          clearPendingResume();
          await addJob(response.jobId, "regeneration");
          router.replace("/(tabs)/dashboard");
        } else if (response !== null) {
          setIsGeneratingWorkout(false);
          // Only show error dialog for genuine failures, not paywall-intercepted nulls
          setDialogConfig({
            title: "Adjustment Failed",
            description:
              "Unable to start workout adjustment. Please check your connection and try again.",
            primaryButton: {
              text: "OK",
              onPress: () => setDialogVisible(false),
            },
            icon: "alert-circle",
          });
          setDialogVisible(true);
        }
      }
    } catch (err) {
      setIsGeneratingWorkout(false);
      // Don't show error dialog if paywall modal is already handling it
      if (!(err instanceof PaywallError)) {
        setDialogConfig({
          title: "Adjustment Error",
          description:
            "An error occurred while starting adjustment. Please try again.",
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
    if (planDay?.isComplete) return;
    setSelectedPlanDay(planDay || null);
    setShowRegenerationModal(true);
  };

  const getPlanDayForDate = (
    date: string
  ): {
    day: PlanDayWithBlocks;
    index: number;
    isHistorical?: boolean;
  } | null => {
    if (workoutPlan?.planDays) {
      // [LR-069] Not "first match" — a date can hold more than one session now
      // (a bonus workout added to a day already trained), and the first is the
      // one already finished. Picking the actionable session keeps this in step
      // with what the Workout tab shows for the same date.
      //
      // Known limitation: the day detail still shows ONE session. With two, the
      // completed one is not reachable from here. Listing both is the right
      // answer for a review surface and is deliberately left as a follow-up —
      // that is a layout change, not a selection fix.
      const chosen = selectSessionForDate<PlanDayWithBlocks>(
        workoutPlan.planDays,
        date,
        formatDateAsString,
      );
      if (chosen) {
        return {
          day: chosen,
          index: workoutPlan.planDays.indexOf(chosen),
          isHistorical: false,
        };
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

          // [MF-005] No selectedDotColor override — selection is now a ring
          // (calendar-view.tsx), not a filled circle, so the dot keeps its
          // real status color even on the selected day.
          if (planDay.isComplete) {
            // Completed days use the reserved success green (MF-005), distinct
            // from scheduled (ink) — see the legend below the calendar.
            dots.push({ color: successColor });
          } else {
            // text.secondary, not brand.secondary — the latter is white in
            // the light monochrome theme and the dot disappears
            dots.push({ color: colors.text.secondary });
          }

          // [LR-069] Append rather than replace. A date can now hold more than
          // one session (a bonus workout added to a day already trained), and
          // assigning here meant the second plan day overwrote the first —
          // one dot instead of two, showing only the later session's status.
          // markingType is already "multi-dot"; this just stops throwing the
          // earlier dots away.
          const existingDots = markedDates[dateStr]?.dots ?? [];
          markedDates[dateStr] = {
            dots: [...existingDots, ...dots],
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
                dots.push({ color: successColor });
              } else {
                dots.push({ color: colors.text.muted });
              }

              markedDates[dateStr] = {
                dots,
                selected: dateStr === selectedDate,
              };
            }
          });
        }
      });
    }

    // [LR-077] A logged activity gets its own dot, APPENDED like LR-069's
    // second session rather than assigned — a date can hold a planned session
    // AND something the user did on their own, and overwriting here would hide
    // whichever came second. Its own color so it never reads as a completed
    // plan day: the plan was not done, something else was.
    loggedActivities.activities.forEach((activity) => {
      const dateStr = activity.date;
      const existingDots = markedDates[dateStr]?.dots ?? [];
      markedDates[dateStr] = {
        ...markedDates[dateStr],
        // brand.primary, NOT brand.secondary: the latter is white in the light
        // monochrome theme and the dot vanishes (same trap the scheduled dot
        // above documents).
        dots: [
          ...existingDots,
          { color: colors.brand.primary, key: `activity-${activity.id}` },
        ],
      };
    });

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
    };

    return markedDates;
  };

  const handleDateSelect = (day: DateData) => {
    setSelectedDate(day.dateString);
    setExpandedBlocks({});
    // A session choice belongs to the date it was made on.
    setSelectedSessionId(null);
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

  // Derive live planDay from context data so the edit modal always has fresh data
  const editModalPlanDay = useMemo(() => {
    if (!showEditModal || !selectedPlanDay) return null;
    if (!workoutPlan?.planDays) return selectedPlanDay;
    return (
      workoutPlan.planDays.find((d) => d.id === selectedPlanDay.id) ||
      selectedPlanDay
    );
  }, [showEditModal, selectedPlanDay, workoutPlan]);

  if (workoutLoading && !showEditModal) {
    return <CalendarSkeleton />;
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-background px-5">
        <Text className="text-sm text-red-500 mb-md text-center">{error}</Text>
        <TouchableOpacity
          // [Bug fix] bg-secondary + text-background resolve to the SAME
          // color in every theme -- this text was invisible. Use the
          // established secondary-button pairing instead.
          className="bg-neutral-light-2 py-3 px-6 rounded-xl"
          onPress={refreshWorkout}
        >
          <Text className="text-text-primary font-semibold text-sm">
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const selectedPlanDayResult = getPlanDayForDate(selectedDate);

  // [LR-069] Every session on this date, so a doubled-up day can offer both.
  // Without this the one the screen does not pick is unreachable from the
  // calendar — on production that hid a completed workout behind a second
  // session logged the same day.
  const sessionsOnDate = sessionsForDate<PlanDayWithBlocks>(
    workoutPlan?.planDays,
    selectedDate,
    formatDateAsString,
  );
  const chosenSession = selectedSessionId
    ? sessionsOnDate.find((session) => session.id === selectedSessionId)
    : undefined;

  // [LR-077] The sibling of sessionsOnDate: everything the USER logged for this
  // date, as opposed to everything the app planned for it.
  const activitiesOnDate = loggedActivities.activitiesForDate(selectedDate);

  const currentSelectedPlanDay =
    chosenSession ?? (selectedPlanDayResult ? selectedPlanDayResult.day : null);
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
    // No pt on the root — Dashboard/Workout roots have none, and the extra
    // 16px pushed this tab's header visibly lower than the other two.
    <View className="flex-1 bg-background">
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Fixed label as the title — plan names are user-generated and
            unbounded, so the meaning-carrying text lives in the wider
            subtitle slot instead of truncating at 17px. */}
        <Header title="Your Plan" subtitle={workoutPlan?.name} />

        {/* [GQ-04] Dismissible "we adjusted your requests" banner — renders only
            when the generated plan couldn't fully honor the user's request. */}
        <FeedbackConflictsBanner
          workoutId={workoutPlan?.id}
          conflicts={workoutPlan?.feedbackConflicts}
        />

        {/* [GQ-04b] Its sibling: the plan DID do what was asked, but there's a
            risk worth naming. Separate banner so the heading stays honest. */}
        <CoachingCautionsBanner
          workoutId={workoutPlan?.id}
          cautions={workoutPlan?.coachingCautions}
        />

        <CalendarViewSection
          calendarKey={`${calendarKey}-${isDark ? "dark" : "light"}`}
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

        {/* Dot legend — so calendar status isn't conveyed by color alone (MF-005). */}
        <View className="flex-row flex-wrap justify-center gap-4 px-lg mb-3">
          <View className="flex-row items-center">
            <View className="size-2 rounded-full bg-success mr-1.5" />
            <Text className="text-xs text-text-muted">Completed</Text>
          </View>
          <View className="flex-row items-center">
            <View className="size-2 rounded-full bg-text-secondary mr-1.5" />
            <Text className="text-xs text-text-muted">Scheduled</Text>
          </View>
          {/* [LR-077] Named separately from "Completed": this dot means the
              user logged something themselves, not that the plan was done. */}
          <View className="flex-row items-center">
            <View className="size-2 rounded-full bg-primary mr-1.5" />
            <Text className="text-xs text-text-muted">You logged</Text>
          </View>
          <View className="flex-row items-center">
            <View className="size-3 rounded-full border border-primary mr-1.5" />
            <Text className="text-xs text-text-muted">Today</Text>
          </View>
        </View>

        <CalendarActionButtons
          workoutPlan={workoutPlan}
          isHistoricalWorkout={isHistoricalWorkout}
          isPastDate={isPastDate()}
          currentSelectedPlanDay={currentSelectedPlanDay}
          // [MF-022] Go straight to the day/week regeneration modal --
          // "Regenerate" already means "make something new," so routing
          // through the separate "Create a New Workout: Generate New vs.
          // Repeat a Past Workout" choice first was a confusing, irrelevant
          // extra step. That choice modal still applies where it actually
          // makes sense: WorkoutDaySection's NoActiveWorkoutCard, for dates
          // outside any existing plan (nothing to "regenerate" there).
          onOpenRegeneration={() =>
            handleOpenRegeneration(currentSelectedPlanDay || undefined)
          }
        />

        {/* "Just generated" badge after a full-week generation */}
        {justGenerated === "week" && currentSelectedPlanDay && (
          <View className="px-lg mb-2">
            <JustGeneratedBadge />
          </View>
        )}

        {/* [LR-069] Only renders when the date holds more than one session. */}
        <SessionSwitcher
          sessions={sessionsOnDate}
          selectedId={currentSelectedPlanDay?.id ?? null}
          onSelect={setSelectedSessionId}
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
            // "Start" should actually start — flag the intent, then navigate to
            // the Workout tab, which auto-begins the session once it loads.
            requestAutoStart();
            router.push("/(tabs)/workout");
          }}
          onShowWorkoutChoice={() => setShowWorkoutChoice(true)}
        />

        {/* [LR-077] What the user logged for this date, plus the door to log
            more. Renders on EVERY date, not just rest days: the point is that a
            day the plan says was missed can still show what actually happened.

            This ships in the same change as the ability to create one, because
            a date that accepts a record but never displays it is
            indistinguishable from data loss — the LR-069 lesson, learned on
            production. */}
        <View className="px-lg mb-6">
          {activitiesOnDate.length > 0 && (
            <View className="mb-3">
              <Text
                className="text-xs font-bold text-text-muted uppercase mb-2"
                style={{ letterSpacing: 0.78 }}
              >
                You logged
              </Text>
              <View className="gap-2">
                {activitiesOnDate.map((activity) => (
                  <LoggedActivityRow
                    key={activity.id}
                    activity={activity}
                    onDelete={(a) =>
                      void loggedActivities.removeActivity(a.id)
                    }
                    deleting={loggedActivities.deletingId === activity.id}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Hidden on future dates only — you cannot have already done
              something you have not done yet, and the server rejects it too. */}
          {selectedDate <= formatDateAsString(new Date()) && (
            <TouchableOpacity
              onPress={() => setShowLogActivity(true)}
              accessibilityRole="button"
              accessibilityLabel="Log an activity you already did on this day"
              className="flex-row items-center rounded-xl border border-neutral-medium-1 bg-neutral-light-2"
              style={{
                paddingHorizontal: 18,
                paddingVertical: 14,
                minHeight: 44,
              }}
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={colors.text.secondary}
              />
              <Text className="text-base font-semibold text-text-primary ml-2 flex-1">
                {activitiesOnDate.length > 0
                  ? "Log something else"
                  : "I did something else"}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.text.muted}
              />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* [LR-077] Opens against the SELECTED date, not today — the user tapped
          Saturday because Saturday is what they want to record. */}
      <LogActivitySheet
        visible={showLogActivity}
        onClose={() => setShowLogActivity(false)}
        initialDate={selectedDate}
        submitting={loggedActivities.submitting}
        onSubmit={async (input) => {
          await loggedActivities.logActivity(input);
          setShowLogActivity(false);
        }}
      />

      <WorkoutRegenerationModal
        visible={showRegenerationModal}
        onClose={() => {
          setShowRegenerationModal(false);
          setSelectedPlanDay(null);
        }}
        onRegenerate={handleRegenerate}
        onError={showAdjustmentError}
        loading={false}
        regenerationType={selectedPlanDay ? "day" : "week"}
        selectedPlanDay={selectedPlanDay}
        // Scheduled-day entry: lock to day scope and hide the Single/Full-Week
        // control. Rest-day and no-plan entries (no selectedPlanDay) keep both
        // tabs — they call genuinely different endpoints.
        singleTabOnly={!!selectedPlanDay}
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
        // "Edit it myself": close the sheet WITHOUT clearing selectedPlanDay
        // (onClose would null it), then open the editor once the sheet has
        // dismissed. Android has no onDismiss and no present-while-dismissing
        // limit, so open immediately there.
        onEditManually={() => {
          pendingEditRef.current = true;
          setShowRegenerationModal(false);
          if (Platform.OS !== "ios") {
            pendingEditRef.current = false;
            setShowEditModal(true);
          }
        }}
        // Same dismiss-then-present dance as "Edit it myself" above.
        onRepeatPast={() => {
          setRepeatTarget({
            date: selectedDate,
            name: selectedPlanDay?.name || "Today's workout",
          });
          pendingRepeatRef.current = true;
          setShowRegenerationModal(false);
          if (Platform.OS !== "ios") {
            pendingRepeatRef.current = false;
            setShowRepeatPicker(true);
          }
        }}
        onDismiss={() => {
          if (pendingEditRef.current) {
            pendingEditRef.current = false;
            setShowEditModal(true);
          }
          if (pendingRepeatRef.current) {
            pendingRepeatRef.current = false;
            setShowRepeatPicker(true);
          }
        }}
      />

      <WorkoutChoiceModal
        visible={showWorkoutChoice}
        onClose={() => setShowWorkoutChoice(false)}
        onGenerateNew={() => handleOpenRegeneration(currentSelectedPlanDay || undefined)}
        onRepeatPast={() => {
          // No-plan entry: nothing scheduled to replace, both tabs stay.
          setRepeatTarget(null);
          setShowRepeatPicker(true);
        }}
      />

      <WorkoutRepeatPicker
        visible={showRepeatPicker}
        // Opened from the day-scoped sheet: hide the week tab, so "change this
        // one day" can't quietly replace the whole plan.
        singleDayOnly={!!repeatTarget}
        targetDate={repeatTarget?.date}
        replacingWorkoutName={repeatTarget?.name}
        onClose={() => setShowRepeatPicker(false)}
        onSuccess={() => {
          invalidateActiveWorkoutCache();
          setShowRepeatPicker(false);
          refreshWorkout();
        }}
      />

      <WorkoutEditModal
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedPlanDay(null);
        }}
        planDay={editModalPlanDay}
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
