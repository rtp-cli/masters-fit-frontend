import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity,View } from "react-native";

import { SkeletonLoader } from "@/components/skeletons/skeleton-loader";
import { useThemeColors } from "@/lib/theme";

/**
 * Recap of the user's most-recent finished plan. Every provisioned user has at
 * least a week of history, so "no active plan" is always a *lapsed* state — the
 * card is a plan-ended recap, never first-run onboarding. Sourced from workout
 * history on the dashboard; only the `dashboard` variant uses it.
 */
export interface PlanEndedRecap {
  planName: string;
  /** Full weekday of the plan's last day, e.g. "Wednesday". */
  lastDayWeekday: string;
  daysDone: number;
  totalDays: number;
  /** Human date span of the plan, e.g. "14 July – 30 July". */
  dateSpan: string;
}

interface NoActiveWorkoutCardProps {
  isGenerating: boolean;
  onShowWorkoutChoice: () => void;
  title?: string;
  subtitle?: string;
  variant?: "dashboard" | "workout" | "calendar";
  showActionsOnlyForToday?: boolean;
  isToday?: boolean;
  /** Hide the in-card title when the screen's header already names the
   *  state (e.g. the Workout tab's "No Active Plan" header) — the card then
   *  carries only the supporting copy + CTA. */
  showTitle?: boolean;
  /** Dashboard-only: recap of the finished plan. When present, the dashboard
   *  variant renders the plan-ended layout instead of the generic empty card. */
  recap?: PlanEndedRecap;
  /** Dashboard-only: the recap is still being fetched. Shows a skeleton in its
   *  place so the generic empty card never flashes before the recap lands. */
  recapLoading?: boolean;
  /** [LR-087] False when a free user has no plan builds left. The card then
   *  stops inviting them to "Build my next plan" — a flow the server would
   *  refuse only AFTER they'd picked Generate and typed a request — and instead
   *  offers what they can actually do. Defaults to true, and the out-of-builds
   *  layout also needs both callbacks below; without them the card falls back
   *  to the normal flow rather than rendering a button that does nothing. */
  canBuildNextPlan?: boolean;
  /** Repeat a week they've already had. Costs no AI generation, so it's open to
   *  every tier — the honest way to keep training on a free account. */
  onRepeatPastWeek?: () => void;
  /** Open the paywall with plan-appropriate copy. */
  onUpgrade?: () => void;
}

export default function NoActiveWorkoutCard({
  isGenerating,
  onShowWorkoutChoice,
  title = "No Active Workout",
  subtitle = "You don't have a workout scheduled for this week.",
  variant = "dashboard",
  showActionsOnlyForToday = false,
  isToday = true,
  showTitle = true,
  recap,
  recapLoading = false,
  canBuildNextPlan = true,
  onRepeatPastWeek,
  onUpgrade,
}: NoActiveWorkoutCardProps) {
  const colors = useThemeColors();
  const router = useRouter();
  const outOfBuilds = !canBuildNextPlan && !!onRepeatPastWeek && !!onUpgrade;

  // [LR-087] The two ways forward for someone with no builds left. Repeat is
  // PRIMARY on purpose: the goal right now is people training, and it costs no
  // AI generation, so it's a real option rather than a consolation prize.
  const outOfBuildsActions = outOfBuilds ? (
    <View>
      <TouchableOpacity
        className="bg-primary rounded-md items-center justify-center"
        style={{ minHeight: 56 }}
        onPress={onRepeatPastWeek}
        accessibilityRole="button"
        accessibilityLabel="Repeat a past week. Train through a week you've already had again."
      >
        <Text className="text-base font-semibold text-content-on-primary">
          Repeat a past week
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="border border-neutral-medium-2 rounded-md items-center justify-center"
        style={{ minHeight: 48, marginTop: 8 }}
        onPress={onUpgrade}
        accessibilityRole="button"
        accessibilityLabel="Get a new plan with MastersFit+"
      >
        <Text className="text-sm font-semibold text-text-primary">
          Get a new plan with MastersFit+
        </Text>
      </TouchableOpacity>
    </View>
  ) : null;

  // Recap still loading (dashboard only): hold the card's shape with a skeleton
  // so the generic "No Active Workout" card never flashes before the finished-
  // plan recap resolves. Heights mirror the recap body below to avoid a jump.
  if (variant === "dashboard" && !recap && recapLoading) {
    return (
      <View>
        <SkeletonLoader width="70%" height={20} />
        <View style={{ marginTop: 8 }}>
          <SkeletonLoader width="100%" height={14} />
          <SkeletonLoader width="85%" height={14} style={{ marginTop: 6 }} />
        </View>
        <SkeletonLoader
          width="100%"
          height={92}
          style={{ marginTop: 18, marginBottom: 20 }}
        />
        <SkeletonLoader width="100%" height={56} />
        <SkeletonLoader width="100%" height={48} style={{ marginTop: 8 }} />
      </View>
    );
  }

  // Frame 1b — plan-ended recap. Dashboard only, and only once we have the
  // finished plan's record to fill it with (the whole point of this state is
  // that it's never empty). No 64px "nothing here" glyph: text earns the height.
  if (variant === "dashboard" && recap) {
    return (
      <View>
        <Text
          className="text-xl font-bold text-text-primary"
          style={{ letterSpacing: -0.2, lineHeight: 26 }}
        >
          Your plan has finished.
        </Text>
        <Text
          className="text-sm text-text-secondary leading-6"
          style={{ marginTop: 8 }}
        >
          {outOfBuilds ? (
            <>
              The last day of {recap.planName} was {recap.lastDayWeekday}.
              You&rsquo;ve used the free plans that come with MastersFit — you can
              keep training by repeating a week you&rsquo;ve already had.
            </>
          ) : (
            <>
              The last day of {recap.planName} was {recap.lastDayWeekday}. Build
              the next one whenever you&rsquo;re ready.
            </>
          )}
        </Text>

        <View
          className="bg-neutral-white border border-neutral-medium-1 rounded-lg"
          style={{
            marginTop: 18,
            marginBottom: 20,
            paddingVertical: 16,
            paddingHorizontal: 18,
          }}
        >
          <Text
            className="text-xs font-bold text-text-muted uppercase"
            style={{ letterSpacing: 0.78, marginBottom: 8 }}
          >
            How That Plan Went
          </Text>
          <View className="flex-row items-baseline" style={{ gap: 8 }}>
            <Text
              className="text-2xl font-bold text-text-primary"
              style={{ letterSpacing: -0.48, lineHeight: 24 }}
            >
              {recap.daysDone}
            </Text>
            <Text className="text-sm text-text-muted">
              of {recap.totalDays} days done
            </Text>
          </View>
          {/* Feedback-driven "N felt too easy" line is deferred (no client
              feedback aggregate yet); the plan's date span always fills the
              slot, so the recap never has a hole. */}
          <Text
            className="text-sm text-text-secondary"
            style={{ marginTop: 10 }}
          >
            {recap.dateSpan}
          </Text>
        </View>

        {outOfBuilds ? (
          outOfBuildsActions
        ) : (
          <>
            <TouchableOpacity
              className={`rounded-md items-center justify-center ${
                isGenerating ? "bg-primary/50 opacity-50" : "bg-primary"
              }`}
              style={{ minHeight: 56 }}
              onPress={isGenerating ? undefined : onShowWorkoutChoice}
              disabled={isGenerating}
            >
              <Text className="text-base font-semibold text-content-on-primary">
                {isGenerating ? "Building your plan…" : "Build my next plan"}
              </Text>
            </TouchableOpacity>

            {/* Names the one setting most likely to have drifted between plans.
                Equipment/limitations stay in Settings — don't fold them in here.
                Not shown when out of builds: there's no new plan for it to shape. */}
            <TouchableOpacity
              className="border border-neutral-medium-2 rounded-md items-center justify-center"
              style={{ minHeight: 48, marginTop: 8 }}
              onPress={() => router.push("/profile-edit")}
            >
              <Text className="text-sm font-semibold text-text-primary">
                Update my training days first
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  // Variant-specific styling and icons
  const getVariantStyles = () => {
    switch (variant) {
      case "workout":
        return {
          icon: "fitness-outline" as const,
          iconColor: colors.text.muted,
          title: "No Workout Plan",
          subtitle: "You don't have an active workout plan for this week.",
        };
      case "calendar":
        return {
          icon: "fitness-outline" as const,
          iconColor: colors.text.muted,
          title: "No Active Workout",
          subtitle: "You don't have a workout scheduled for this week.",
        };
      default: // dashboard
        return {
          icon: "fitness-outline" as const,
          iconColor: colors.text.muted,
          title: "No Active Workout",
          subtitle: "You don't have a workout scheduled for this week.",
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <View className="items-center py-6">
      <View className="size-16 bg-surface-elevated rounded-full items-center justify-center mb-4">
        <Ionicons
          name={variantStyles.icon}
          size={24}
          color={variantStyles.iconColor}
        />
      </View>
      {showTitle && (
        <Text className="text-base font-semibold text-text-primary mb-2">
          {title || variantStyles.title}
        </Text>
      )}
      <Text className="text-sm text-text-muted text-center mb-6 leading-5">
        {outOfBuilds
          ? "Your plan has finished, and you've used the free plans that come with MastersFit. You can keep training by repeating a week you've already had."
          : subtitle || variantStyles.subtitle}
      </Text>

      {outOfBuilds && (!showActionsOnlyForToday || isToday) && (
        <View className="w-full">{outOfBuildsActions}</View>
      )}

      {!outOfBuilds && (!showActionsOnlyForToday || isToday) && (
        <View className="w-full space-y-3">
          <TouchableOpacity
            className={`rounded-xl py-3 px-6 flex-row items-center justify-center ${
              isGenerating
                ? "bg-primary/50 opacity-50"
                : "bg-primary"
            }`}
            onPress={isGenerating ? undefined : onShowWorkoutChoice}
            disabled={isGenerating}
          >
            <Ionicons
              name="fitness-outline"
              size={18}
              color={isGenerating ? colors.contentOnPrimary + "70" : colors.contentOnPrimary}
            />
            <Text className={`font-semibold text-sm ml-2 ${
              isGenerating ? "text-content-on-primary/70" : "text-content-on-primary"
            }`}>
              {isGenerating
                ? "Creating a New Workout..."
                : "Create a New Workout"
              }
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
