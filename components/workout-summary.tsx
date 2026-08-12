import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import DemoChip from "@/components/demo-chip";
import SetStepperFields from "@/components/set-stepper-fields";
import { ShareWorkoutButton } from "@/components/share";
import { SkeletonLoader } from "@/components/skeletons/skeleton-loader";
import CustomDialog from "@/components/ui/custom-dialog";
import WorkoutFeedbackCard from "@/components/workout-feedback-card";
import { getLoggingMode } from "@/constants/block-types";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics-events";
import { exerciseHasDemo } from "@/lib/exercise-video";
import { type ThemeColorPalette,useThemeColors } from "@/lib/theme";
import {
  createExerciseLog,
  fetchBlockLogsForPlanDay,
  fetchExerciseLogsForPlanDay,
  getPlanDayLog,
  notifyWorkoutUpdated,
  recomputePlanDayRollups,
  skipExercise,
} from "@/lib/workouts";
import {
  type BlockLog,
  type ExerciseLog,
  type ExerciseSetLog,
  type PlanDayLog,
} from "@/types/api/logs.types";
import {
  getBlockTypeDisplayName,
  type PlanDayWithBlocks,
  type WorkoutBlockWithExercise,
  type WorkoutBlockWithExercises,
} from "@/types/api/workout.types";
import { isCircuitBlock } from "@/utils/circuit-utils";
import { formatDistance, shouldShowWeightInput } from "@/utils/exercise-helpers";

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
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

type ExerciseStatus = "completed" | "skipped" | "not_attempted";

/** Which metric a logged set is edited by — mirrors the read view's precedence
 *  (distance → duration → reps) so the value line and the editor agree. A set
 *  that carries e.g. both weight and distance is edited as distance in v1. */
type SetKind = "distance" | "duration" | "reps";
const setKind = (s: ExerciseSetLog): SetKind => {
  if (s.distanceM && s.distanceM > 0) return "distance";
  if (s.durationSeconds && s.durationSeconds > 0) return "duration";
  return "reps";
};

const setValueLine = (s: ExerciseSetLog): string => {
  const weightPrefix =
    s.weight && Number(s.weight) > 0 ? `${s.weight} lb · ` : "";
  switch (setKind(s)) {
    case "distance":
      return `${weightPrefix}${formatDistance(s.distanceM || 0)}`;
    case "duration":
      return `${weightPrefix}${s.durationSeconds}s`;
    default:
      return `${weightPrefix}${s.reps ?? 0} reps`;
  }
};

// A stable, order-insensitive projection of a log's editable values, used both
// to detect "did anything change" (Save enable, discard guard) and to decide
// which (planDayExerciseId, roundNumber) pairs to rewrite on Save.
const serializeLog = (log?: ExerciseLog): string =>
  JSON.stringify(
    (log?.sets || []).map((s) => ({
      n: s.setNumber,
      w: s.weight,
      r: s.reps,
      d: s.durationSeconds,
      m: s.distanceM,
    }))
  );

const serializeLogs = (map: Record<number, ExerciseLog[]>): string =>
  JSON.stringify(
    Object.keys(map)
      .map(Number)
      .sort((a, b) => a - b)
      .map((k) => (map[k] || []).map(serializeLog))
  );

function SummarySkeleton({ compact }: { compact: boolean }) {
  return (
    <View className="flex-1 bg-background">
      {/* Header skeleton */}
      {compact ? (
        <View className="p-4">
          <View className="flex-row items-center mb-2">
            <SkeletonLoader width={18} height={18} variant="circular" />
            <View className="ml-2 flex-1">
              <SkeletonLoader width="60%" height={18} variant="text" />
            </View>
          </View>
          <View className="ml-7">
            <SkeletonLoader width="40%" height={12} variant="text" />
          </View>
        </View>
      ) : (
        <View className="items-center pt-10 pb-6 px-6">
          <SkeletonLoader width={48} height={48} variant="circular" />
          <View className="mt-4 mb-2 w-full items-center">
            <SkeletonLoader width="50%" height={24} variant="text" />
          </View>
          <SkeletonLoader width="35%" height={14} variant="text" />
        </View>
      )}
      {/* Block skeletons */}
      <View className="px-4">
        {[1, 2, 3].map((i) => (
          <View key={i} className="mb-4">
            <SkeletonLoader
              width="100%"
              height={56}
              style={{
                borderRadius: 12,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
              }}
            />
            <View className="bg-surface rounded-b-xl border border-t-0 border-neutral-light-2 p-4">
              <SkeletonLoader
                width="70%"
                height={14}
                variant="text"
                style={{ marginBottom: 8 }}
              />
              <SkeletonLoader width="50%" height={14} variant="text" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

interface WorkoutSummaryProps {
  workout: PlanDayWithBlocks;
  footer?: React.ReactNode;
  /** Compact header for inline use (e.g. calendar tab) */
  compact?: boolean;
  /** Called when user taps "Resume Workout" — only shown for ended-early workouts */
  onResume?: () => void;
  /** Whether resume is in progress */
  isResuming?: boolean;
  /** When provided, exercise rows whose exercise has a demo get an icon-only
   *  play chip (right-aligned). Optional so the post-workout summary is
   *  unaffected until a host opts in — currently only the Calendar completed
   *  day does. Passes the exercise's block so the caller can build the
   *  block-scoped prev/next entries. */
  onExerciseDemoPress?: (
    block: WorkoutBlockWithExercises,
    exercise: WorkoutBlockWithExercise
  ) => void;
  /** When true, the header shows an "Edit log" affordance. Hosts compute
   *  editability (the window, SPEC §8) — the component does not. */
  canEditLog?: boolean;
  /** Fired after a successful save so the host can refresh sibling views. */
  onLogEdited?: () => void;
  /** Authoritative "this session ended early" signal from the host. When set,
   *  it overrides the derived not-attempted heuristic for the header + Resume,
   *  so correcting a completed day's log can never resurrect "Ended Early" /
   *  Resume. The Workout tab passes its real session state; hosts that don't
   *  pass it (e.g. Calendar, compact) fall back to the derived value. */
  endedEarly?: boolean;
}

export default function WorkoutSummary({
  workout,
  footer,
  compact = false,
  onResume,
  isResuming = false,
  onExerciseDemoPress,
  canEditLog = false,
  onLogEdited,
  endedEarly,
}: WorkoutSummaryProps) {
  const colors = useThemeColors();
  // Reserved completion accent (MF-004/005); falls back to ink for themes without it.
  const successColor =
    (colors as ThemeColorPalette).success ?? colors.brand.primary;
  const [planDayLog, setPlanDayLog] = useState<PlanDayLog | null>(null);
  const [exerciseLogs, setExerciseLogs] = useState<
    Record<number, ExerciseLog[]>
  >({});
  const [blockLogs, setBlockLogs] = useState<Record<number, BlockLog>>({});
  const [loading, setLoading] = useState(true);
  const [collapsedBlocks, setCollapsedBlocks] = useState<
    Record<number, boolean>
  >({});
  // Ended-early feedback: "Skip for now" hides the card; an answer hides the
  // skip link. Completed-workout feedback has neither (zero-tap to ignore).
  const [feedbackSkipped, setFeedbackSkipped] = useState(false);
  const [feedbackAnswered, setFeedbackAnswered] = useState(false);

  // ── Edit-log mode (SPEC §6). A working copy of exerciseLogs is held here and
  // all edits mutate it; nothing is written until Save. ──
  const [isEditing, setIsEditing] = useState(false);
  const [workingLogs, setWorkingLogs] = useState<Record<number, ExerciseLog[]>>(
    {}
  );
  // One set row expanded at a time, keyed `${exId}:${round}:${setNumber}`.
  const [expandedSet, setExpandedSet] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [showError, setShowError] = useState(false);
  // Phase 2 (SPEC §7): the working + baseline three-way status per exercise id.
  const [workingStatus, setWorkingStatus] = useState<
    Record<number, ExerciseStatus>
  >({});
  const [baselineStatus, setBaselineStatus] = useState<
    Record<number, ExerciseStatus>
  >({});
  // A completed→skipped/didn't-do change must warn before deleting logs (§7).
  const [pendingDemotion, setPendingDemotion] = useState<{
    exId: number;
    name: string;
    next: ExerciseStatus;
    count: number;
  } | null>(null);

  const toggleBlock = (blockId: number) => {
    setCollapsedBlocks((prev) => ({
      ...prev,
      [blockId]: !prev[blockId],
    }));
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [log, logs, blockResults] = await Promise.all([
      getPlanDayLog(workout.id),
      fetchExerciseLogsForPlanDay(workout.id),
      fetchBlockLogsForPlanDay(workout.id),
    ]);
    setPlanDayLog(log);
    setExerciseLogs(logs);
    setBlockLogs(blockResults);
    setLoading(false);
  }, [workout.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const statusDirty = useMemo(
    () =>
      Object.keys(workingStatus).some(
        (k) => workingStatus[Number(k)] !== baselineStatus[Number(k)]
      ),
    [workingStatus, baselineStatus]
  );

  const isDirty = useMemo(
    () =>
      serializeLogs(workingLogs) !== serializeLogs(exerciseLogs) || statusDirty,
    [workingLogs, exerciseLogs, statusDirty]
  );

  const startEditing = () => {
    // Deep clone so edits never touch the persisted read-view state.
    setWorkingLogs(JSON.parse(JSON.stringify(exerciseLogs)));
    // Snapshot each exercise's derived status as the edit baseline (§7).
    const status: Record<number, ExerciseStatus> = {};
    for (const block of workout.blocks) {
      for (const ex of block.exercises) {
        status[ex.id] =
          (exerciseLogs[ex.id] || []).length > 0
            ? "completed"
            : ex.isSkipped
              ? "skipped"
              : "not_attempted";
      }
    }
    setWorkingStatus(status);
    setBaselineStatus(status);
    setExpandedSet(null);
    setIsEditing(true);
  };

  const exitEditing = () => {
    setShowDiscard(false);
    setIsEditing(false);
    setExpandedSet(null);
    setWorkingLogs({});
    setWorkingStatus({});
    setBaselineStatus({});
    setPendingDemotion(null);
  };

  const requestCancel = () => {
    if (isDirty) setShowDiscard(true);
    else exitEditing();
  };

  // A fresh log seeded from the prescription for a promotion to "completed"
  // (§7) — matching how the session materialises sets. completion-only
  // exercises seed an empty set list (their "log" is just existence).
  const seedLogFromPrescription = (
    exercise: WorkoutBlockWithExercise,
    completionOnly: boolean
  ): ExerciseLog => {
    const count = completionOnly ? 0 : Math.max(1, exercise.sets || 1);
    const sets: ExerciseSetLog[] = Array.from({ length: count }, (_, i) => ({
      id: -(i + 1),
      exerciseLogId: -1,
      roundNumber: 1,
      setNumber: i + 1,
      weight: exercise.weight ?? 0,
      reps: exercise.reps ?? 0,
      restAfter: null,
      durationSeconds:
        exercise.duration && exercise.duration > 0 ? exercise.duration : null,
      distanceM:
        exercise.distanceM && exercise.distanceM > 0 ? exercise.distanceM : null,
      createdAt: "",
    }));
    return {
      id: -1,
      planDayExerciseId: exercise.id,
      roundNumber: 1,
      durationCompleted: null,
      timeTaken: null,
      isComplete: true,
      isSkipped: false,
      notes: null,
      difficulty: null,
      rating: null,
      createdAt: "",
      updatedAt: "",
      sets,
    };
  };

  // Two-option status control (SPEC §7, amended): "I did this" / "I didn't do
  // this". `intent` "did" → completed; "didnt" → skipped. There is NO path here
  // that produces `not_attempted` — that state is set only by how a session
  // ended (it drives wasEndedEarly, Resume and Share), so a correction must
  // never write it.
  const changeStatus = (
    exercise: WorkoutBlockWithExercise,
    intent: "did" | "didnt",
    completionOnly: boolean
  ) => {
    const exId = exercise.id;
    const current = workingStatus[exId];

    if (intent === "did") {
      if (current === "completed") return;
      // Promote (from skipped OR not_attempted): seed prescription sets if we
      // don't already have some to edit. Promoting a not-attempted exercise is
      // the only correct way for wasEndedEarly to move — downward.
      setWorkingLogs((prev) => {
        const existing = prev[exId] || [];
        if (existing.length && (existing[0].sets || []).length) return prev;
        return { ...prev, [exId]: [seedLogFromPrescription(exercise, completionOnly)] };
      });
      setWorkingStatus((prev) => ({ ...prev, [exId]: "completed" }));
      return;
    }

    // intent === "didnt". Already on the "didn't" side (skipped or the
    // untouched not_attempted): no-op — never convert not_attempted → skipped
    // spuriously, and never the reverse.
    if (current !== "completed") return;

    // Demoting from completed → skipped. Warn only when real (persisted) sets
    // would be lost.
    const persistedSets = (exerciseLogs[exId] || []).reduce(
      (n, l) => n + (l.sets?.length || 0),
      0
    );
    if (baselineStatus[exId] === "completed" && persistedSets > 0) {
      setPendingDemotion({
        exId,
        name: exercise.exercise.name,
        next: "skipped",
        count: persistedSets,
      });
      return;
    }
    // Only a seeded (unsaved) promotion being undone — drop it silently.
    setWorkingLogs((prev) => {
      const n = { ...prev };
      delete n[exId];
      return n;
    });
    setWorkingStatus((prev) => ({ ...prev, [exId]: "skipped" }));
    setExpandedSet(null);
  };

  const confirmDemotion = () => {
    if (!pendingDemotion) return;
    const { exId, next } = pendingDemotion;
    setWorkingLogs((prev) => {
      const n = { ...prev };
      delete n[exId];
      return n;
    });
    setWorkingStatus((prev) => ({ ...prev, [exId]: next }));
    setExpandedSet(null);
    setPendingDemotion(null);
  };

  const patchWorkingSet = (
    exId: number,
    roundNumber: number,
    setNumber: number,
    patch: Partial<ExerciseSetLog>
  ) => {
    setWorkingLogs((prev) => ({
      ...prev,
      [exId]: (prev[exId] || []).map((log) =>
        log.roundNumber !== roundNumber
          ? log
          : {
              ...log,
              sets: (log.sets || []).map((s) =>
                s.setNumber === setNumber ? { ...s, ...patch } : s
              ),
            }
      ),
    }));
  };

  const addWorkingSet = (exId: number, roundNumber: number) => {
    setWorkingLogs((prev) => ({
      ...prev,
      [exId]: (prev[exId] || []).map((log) => {
        if (log.roundNumber !== roundNumber) return log;
        const sets = log.sets || [];
        const last = sets[sets.length - 1];
        // Seed from the last logged set, matching addSet() in the tracker.
        const newSet: ExerciseSetLog = {
          id: -(sets.length + 1),
          exerciseLogId: log.id,
          roundNumber,
          setNumber: (last?.setNumber || 0) + 1,
          weight: last?.weight ?? 0,
          reps: last?.reps ?? 0,
          restAfter: last?.restAfter ?? null,
          durationSeconds: last?.durationSeconds ?? null,
          distanceM: last?.distanceM ?? null,
          createdAt: "",
        };
        return { ...log, sets: [...sets, newSet] };
      }),
    }));
  };

  const removeWorkingSet = (
    exId: number,
    roundNumber: number,
    setNumber: number
  ) => {
    setWorkingLogs((prev) => ({
      ...prev,
      [exId]: (prev[exId] || []).map((log) =>
        log.roundNumber !== roundNumber
          ? log
          : {
              ...log,
              sets: (log.sets || [])
                .filter((s) => s.setNumber !== setNumber)
                .map((s, i) => ({ ...s, setNumber: i + 1 })),
            }
      ),
    }));
    setExpandedSet(null);
  };

  const handleSave = async () => {
    // Classify every exercise's intent from its status transition + set diffs.
    // The control only ever yields completed or skipped, so there is no
    // not_attempted-producing path here (SPEC §7, amended).
    const promotions: { exId: number; log: ExerciseLog }[] = []; // → completed (write)
    const skips: number[] = []; // → skipped ("I didn't do this")
    const setEdits: { exId: number; log: ExerciseLog }[] = []; // stayed completed, sets changed

    for (const key of Object.keys(baselineStatus)) {
      const exId = Number(key);
      const from = baselineStatus[exId];
      const to = workingStatus[exId];
      if (to === "completed") {
        if (from !== "completed") {
          const log = (workingLogs[exId] || [])[0];
          if (log) promotions.push({ exId, log });
        } else {
          const orig = exerciseLogs[exId] || [];
          for (const wl of workingLogs[exId] || []) {
            const ol = orig.find((o) => o.roundNumber === wl.roundNumber);
            if (serializeLog(wl) !== serializeLog(ol)) setEdits.push({ exId, log: wl });
          }
        }
      } else if (to === "skipped" && from !== "skipped") {
        skips.push(exId);
      }
      // to === "not_attempted" only ever means "unchanged" here → no-op.
    }

    const statusChanges = promotions.length + skips.length;
    if (statusChanges === 0 && setEdits.length === 0) {
      exitEditing();
      return;
    }

    setSaving(true);
    let setsChanged = 0;
    const toApiSets = (log: ExerciseLog) =>
      (log.sets || []).map((s) => ({
        roundNumber: s.roundNumber,
        setNumber: s.setNumber,
        weight: Number(s.weight) || 0,
        reps: Number(s.reps) || 0,
        restAfter: s.restAfter ?? undefined,
        durationSeconds: s.durationSeconds ?? undefined,
        distanceM: s.distanceM ?? undefined,
      }));
    try {
      // Sequentially, demotions before writes — a partial failure stops rather
      // than continuing (SPEC §6.5). Each call is destructive server-side.
      // "I didn't do this" is a skip (deletes logs + sets isSkipped); it never
      // writes not_attempted, so a completed day can't be turned ended-early.
      for (const exId of skips) {
        const res = await skipExercise(workout.workoutId, exId);
        if (res === null) throw new Error("save-failed");
      }
      for (const { exId, log } of [...promotions, ...setEdits]) {
        const nextSets = toApiSets(log);
        const res = await createExerciseLog({
          planDayExerciseId: exId,
          roundNumber: log.roundNumber,
          sets: nextSets,
          durationCompleted: log.durationCompleted ?? undefined,
          timeTaken: log.timeTaken ?? undefined,
          isComplete: true,
        });
        if (!res) throw new Error("save-failed");
        setsChanged += nextSets.length;
      }

      // One honest recompute after any status change keeps the day's counts
      // truthful (§9). Pure set-value edits don't move the counts, so skip it.
      if (statusChanges > 0) {
        await recomputePlanDayRollups(workout.id);
      }

      const changedIds = new Set<number>([
        ...promotions.map((p) => p.exId),
        ...skips,
        ...setEdits.map((e) => e.exId),
      ]);
      const hoursSinceCompletion = planDayLog?.updatedAt
        ? Math.round(
            ((Date.now() - new Date(planDayLog.updatedAt).getTime()) / 3.6e6) *
              10
          ) / 10
        : undefined;
      trackEvent(AnalyticsEvent.WORKOUT_LOG_EDITED, {
        plan_day_id: workout.id,
        exercises_changed: changedIds.size,
        sets_changed: setsChanged,
        status_changes: statusChanges,
        hours_since_completion: hoursSinceCompletion,
      });

      setIsEditing(false);
      setExpandedSet(null);
      setWorkingLogs({});
      setWorkingStatus({});
      setBaselineStatus({});
      await loadData();
      onLogEdited?.();
      // So Dashboard + Calendar pick up the corrected numbers.
      notifyWorkoutUpdated();
    } catch {
      // Keep edit mode open with the working copy intact (SPEC §6.5, §11.9).
      setShowError(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <SummarySkeleton compact={compact} />;
  }

  // Determine status for each exercise:
  // - has logs → completed
  // - no logs + isSkipped flag → explicitly skipped by user
  // - no logs + not skipped → not attempted (workout ended early)
  const allExercises = workout.blocks.flatMap((b) => b.exercises);
  const duration = planDayLog?.totalTimeSeconds || 0;

  const getExerciseStatus = (
    exercise: (typeof allExercises)[0]
  ): ExerciseStatus => {
    if ((exerciseLogs[exercise.id] || []).length > 0) return "completed";
    if (exercise.isSkipped) return "skipped";
    return "not_attempted";
  };

  const completedCount = allExercises.filter((e) => getExerciseStatus(e) === "completed").length;
  const skippedCount = allExercises.filter((e) => getExerciseStatus(e) === "skipped").length;
  const notAttemptedCount = allExercises.filter((e) => getExerciseStatus(e) === "not_attempted").length;
  // Prefer the host's authoritative session state; only fall back to the
  // derived not-attempted heuristic when a host doesn't supply it. This keeps a
  // completed day that gets its log edited from flipping to "Ended Early" /
  // offering Resume just because an edit left an exercise unlogged.
  const wasEndedEarly = endedEarly ?? notAttemptedCount > 0;

  const getRoundCount = (block: WorkoutBlockWithExercises): number => {
    if (!isCircuitBlock(block.blockType)) return 0;
    const firstExercise = block.exercises[0];
    if (!firstExercise) return 0;
    return (exerciseLogs[firstExercise.id] || []).length;
  };

  // Prescribed session length for the feedback card's duration trigger and
  // confirmation copy; null when blocks carry no duration estimates.
  const prescribedMinutes = workout.blocks.reduce(
    (sum: number, b) => sum + (b.blockDurationMinutes || 0),
    0
  );

  const feedbackCard = !compact && (
    <WorkoutFeedbackCard
      planDayId={workout.id}
      workoutId={workout.workoutId}
      wasEndedEarly={wasEndedEarly}
      durationSeconds={duration}
      prescribedMinutes={prescribedMinutes > 0 ? prescribedMinutes : null}
      skipped={feedbackSkipped}
      onAnswered={() => setFeedbackAnswered(true)}
    />
  );

  // `compact` mirrors ShareWorkoutButton's own `self-start mt-2.5` + gap-6 so
  // the two sit on the same baseline in the shared row; `post` is the centred
  // link under the post-workout metadata (SPEC §4).
  const editLogLink = (placement: "compact" | "post") => (
    <TouchableOpacity
      className={`flex-row items-center ${
        placement === "compact" ? "self-start mt-2.5" : "mt-3"
      }`}
      style={{ gap: 6 }}
      onPress={startEditing}
      hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel="Edit log"
    >
      <Ionicons name="pencil-outline" size={14} color={colors.text.primary} />
      <Text className="text-xs font-medium text-text-primary">Edit log</Text>
    </TouchableOpacity>
  );

  const statusPill = (status: ExerciseStatus) => {
    if (status === "completed") {
      return (
        <View
          className="flex-row items-center rounded-full px-2.5 py-1"
          style={{ backgroundColor: successColor + "1A" }}
        >
          <Ionicons name="checkmark" size={12} color={successColor} />
          <Text
            className="text-xs font-semibold ml-1"
            style={{ color: successColor }}
          >
            Completed
          </Text>
        </View>
      );
    }
    return (
      <View className="rounded-full px-2.5 py-1 bg-neutral-light-2">
        <Text className="text-xs font-medium text-text-muted">
          {status === "skipped" ? "Skipped" : "Not attempted"}
        </Text>
      </View>
    );
  };

  // Two-option status control (SPEC §7, amended). First person: it's a
  // statement about the user, not a label on a row. "I didn't do this" covers
  // both skipped and not-attempted — the same claim from the user's side; the
  // read view still distinguishes them (it reports what happened).
  const statusSegment = (
    exercise: WorkoutBlockWithExercise,
    completionOnly: boolean
  ) => {
    const didActive = workingStatus[exercise.id] === "completed";
    const options: { intent: "did" | "didnt"; label: string; active: boolean }[] =
      [
        { intent: "did", label: "I did this", active: didActive },
        { intent: "didnt", label: "I didn't do this", active: !didActive },
      ];
    return (
      <View className="flex-row bg-neutral-light-2 rounded-lg p-1">
        {options.map((o) => (
          <TouchableOpacity
            key={o.intent}
            className={`flex-1 items-center justify-center rounded-md ${
              o.active ? "bg-surface" : ""
            }`}
            style={{ minHeight: 44 }}
            onPress={() => changeStatus(exercise, o.intent, completionOnly)}
            accessibilityRole="button"
            accessibilityState={{ selected: o.active }}
            accessibilityLabel={`${exercise.exercise.name}: ${o.label}`}
          >
            <Text
              className={
                o.active
                  ? "text-sm font-bold text-text-primary"
                  : "text-sm font-medium text-text-muted"
              }
            >
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // ── Edit mode (SPEC §6) ──
  if (isEditing) {
    const renderSetEditor = (
      exercise: WorkoutBlockWithExercise,
      log: ExerciseLog,
      set: ExerciseSetLog
    ) => {
      const kind = setKind(set);
      if (kind === "reps") {
        return (
          <SetStepperFields
            weight={Number(set.weight) || 0}
            reps={set.reps ?? 0}
            showWeight={shouldShowWeightInput(exercise)}
            onChange={(patch) =>
              patchWorkingSet(exercise.id, log.roundNumber, set.setNumber, patch)
            }
          />
        );
      }
      const isDistance = kind === "distance";
      return (
        <View>
          <Text className="text-xs mb-2 text-text-muted">
            {isDistance ? "Distance (meters)" : "Duration (seconds)"}
          </Text>
          <View className="flex-row justify-center">
            <View className="bg-background rounded-full px-4 py-2 border border-neutral-medium-1 min-w-[80px] items-center">
              <TextInput
                className="text-base font-bold text-center text-text-primary"
                value={String(
                  (isDistance ? set.distanceM : set.durationSeconds) ?? 0
                )}
                onChangeText={(text) =>
                  patchWorkingSet(
                    exercise.id,
                    log.roundNumber,
                    set.setNumber,
                    isDistance
                      ? { distanceM: parseInt(text, 10) || 0 }
                      : { durationSeconds: parseInt(text, 10) || 0 }
                  )
                }
                keyboardType="number-pad"
                maxLength={isDistance ? 6 : 5}
                placeholder="0"
                placeholderTextColor={colors.text.muted}
                accessibilityLabel={
                  isDistance
                    ? "Distance in meters"
                    : "Duration in seconds"
                }
              />
            </View>
          </View>
        </View>
      );
    };

    const renderSetRow = (
      exercise: WorkoutBlockWithExercise,
      log: ExerciseLog,
      set: ExerciseSetLog
    ) => {
      const key = `${exercise.id}:${log.roundNumber}:${set.setNumber}`;
      const expanded = expandedSet === key;
      return (
        <View
          key={key}
          className="rounded-md"
          style={{
            borderColor: expanded
              ? colors.brand.primary
              : colors.neutral.light[2],
            borderWidth: expanded ? 1.5 : 1,
          }}
        >
          <TouchableOpacity
            className="flex-row items-center p-2.5"
            onPress={() => setExpandedSet(expanded ? null : key)}
            accessibilityRole="button"
            accessibilityLabel={`Set ${set.setNumber}: ${setValueLine(set)}. Tap to ${expanded ? "collapse" : "edit"}.`}
          >
            <View
              className="size-7 rounded-full items-center justify-center mr-2.5"
              style={{ backgroundColor: colors.brand.primary + "1A" }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: colors.brand.primary }}
              >
                {set.setNumber}
              </Text>
            </View>
            <Text className="text-base font-semibold text-text-primary flex-1">
              {setValueLine(set)}
            </Text>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={14}
              color={colors.text.muted}
            />
          </TouchableOpacity>

          {expanded && (
            <View className="px-2.5 pb-2.5">
              {renderSetEditor(exercise, log, set)}
              <View className="flex-row items-center justify-end mt-3">
                <TouchableOpacity
                  className="flex-row items-center p-1"
                  onPress={() =>
                    removeWorkingSet(exercise.id, log.roundNumber, set.setNumber)
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Remove set ${set.setNumber}`}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="trash-outline"
                    size={14}
                    color={colors.text.muted}
                  />
                  <Text className="text-xs ml-1 text-text-muted">
                    Remove set
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      );
    };

    return (
      <View className="flex-1 bg-background">
        {/* Editing chrome replaces the summary header (SPEC §6.2) */}
        <View className="flex-row items-center justify-between border-b border-neutral-light-2 px-4 py-3.5">
          <TouchableOpacity
            onPress={requestCancel}
            disabled={saving}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Cancel editing"
          >
            <Text className="text-sm font-medium text-text-muted">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-base font-bold text-text-primary">
            Editing log
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!isDirty || saving}
            style={{ opacity: !isDirty || saving ? 0.4 : 1 }}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Save changes"
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.text.primary} />
            ) : (
              <Text className="text-sm font-bold text-text-primary">Save</Text>
            )}
          </TouchableOpacity>
        </View>
        <Text className="text-xs text-text-muted px-4 pt-2 pb-1">
          Correct what you actually did. This doesn't change the workout itself.
        </Text>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-4 mt-4">
            {workout.blocks.map((block) => {
              const isCircuit = isCircuitBlock(block.blockType);
              const isCompletionOnly =
                getLoggingMode(block) === "completion_only";
              const isCollapsed = collapsedBlocks[block.id] ?? false;

              return (
                <View key={block.id} className="mb-4">
                  {/* Block header — stays tappable to collapse (SPEC §6.2) */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => toggleBlock(block.id)}
                    className={`bg-brand-light-2 p-4 ${isCollapsed ? "rounded-xl" : "rounded-t-xl"}`}
                  >
                    <View className="flex-row items-center">
                      <View className="size-8 rounded-full bg-white/20 items-center justify-center mr-3">
                        <Ionicons
                          name={getBlockIcon(block.blockType) as any}
                          size={16}
                          color={colors.text.primary}
                        />
                      </View>
                      <Text className="font-bold text-text-primary text-base flex-1">
                        {block.blockName ||
                          getBlockTypeDisplayName(block.blockType)}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {!isCollapsed && (
                    <View className="bg-surface rounded-b-xl border border-t-0 border-neutral-light-2 p-3">
                      {block.exercises.map((exercise) => {
                        // Circuit exercises stay fully read-only in v1 (§6.4):
                        // static pill, no status control, no set editor.
                        if (isCircuit) {
                          return (
                            <View key={exercise.id} className="mb-3">
                              <View className="flex-row items-center justify-between mb-1">
                                <Text className="font-semibold text-text-primary text-sm flex-1 mr-2">
                                  {exercise.exercise.name}
                                </Text>
                                {statusPill(getExerciseStatus(exercise))}
                              </View>
                              <Text className="text-xs text-text-muted">
                                Circuit results aren't editable here.
                              </Text>
                            </View>
                          );
                        }

                        // Everything else is status-changeable (§7). Only
                        // set-by-set exercises expose the set editor; completion-
                        // only blocks are status-only.
                        const wStatus =
                          workingStatus[exercise.id] ??
                          getExerciseStatus(exercise);
                        const logs = workingLogs[exercise.id] || [];
                        const showSets =
                          !isCompletionOnly && wStatus === "completed";

                        return (
                          <View key={exercise.id} className="mb-4">
                            <Text className="font-semibold text-text-primary text-sm mb-2">
                              {exercise.exercise.name}
                            </Text>
                            {statusSegment(exercise, isCompletionOnly)}

                            {showSets ? (
                              <View className="mt-2">
                                {logs.map((log) => (
                                  <View key={log.id} className="gap-2">
                                    {(log.sets || []).map((set) =>
                                      renderSetRow(exercise, log, set)
                                    )}
                                    <TouchableOpacity
                                      className="flex-row items-center justify-center border rounded-lg py-3 mt-1"
                                      style={{ borderColor: colors.brand.primary }}
                                      onPress={() =>
                                        addWorkingSet(exercise.id, log.roundNumber)
                                      }
                                      accessibilityRole="button"
                                      accessibilityLabel="Add a set"
                                    >
                                      <Ionicons
                                        name="add-circle-outline"
                                        size={17}
                                        color={colors.brand.primary}
                                      />
                                      <Text
                                        className="text-sm font-semibold ml-2"
                                        style={{ color: colors.brand.primary }}
                                      >
                                        Add a set
                                      </Text>
                                    </TouchableOpacity>
                                  </View>
                                ))}
                              </View>
                            ) : isCompletionOnly && wStatus === "completed" ? (
                              <Text className="text-xs text-text-muted mt-2">
                                Marked complete.
                              </Text>
                            ) : (
                              <Text className="text-xs text-text-muted mt-2">
                                Tap "I did this" to log what you did.
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Window caption (SPEC §8) */}
          <Text className="text-xs text-text-muted text-center px-6 my-2">
            You can correct this log until your next workout is complete.
          </Text>
        </ScrollView>

        <CustomDialog
          visible={showDiscard}
          title="Discard changes?"
          description="Your corrections won't be saved."
          primaryButton={{
            text: "Discard",
            onPress: exitEditing,
            destructive: true,
          }}
          secondaryButton={{
            text: "Keep editing",
            onPress: () => setShowDiscard(false),
          }}
          onClose={() => setShowDiscard(false)}
        />
        <CustomDialog
          visible={showError}
          title="Couldn't save your changes"
          description="Something went wrong saving your corrections. Your edits are still here — try again."
          primaryButton={{ text: "OK", onPress: () => setShowError(false) }}
          onClose={() => setShowError(false)}
        />
        {/* Demotion warns before the sets are dropped (SPEC §7). */}
        <CustomDialog
          visible={!!pendingDemotion}
          title="Delete your logged sets?"
          description={
            pendingDemotion
              ? `This deletes the ${pendingDemotion.count} set${
                  pendingDemotion.count !== 1 ? "s" : ""
                } you logged for ${pendingDemotion.name}.`
              : ""
          }
          primaryButton={{
            text: "Delete",
            onPress: confirmDemotion,
            destructive: true,
          }}
          secondaryButton={{
            text: "Keep them",
            onPress: () => setPendingDemotion(null),
          }}
          onClose={() => setPendingDemotion(null)}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        {compact ? (
          <View className="px-4 pt-4 pb-2 flex-row">
            <Ionicons
              name="checkmark-circle"
              size={28}
              color={successColor}
              style={{ marginTop: 2 }}
            />
            <View className="flex-1 ml-3">
              <Text className="text-lg font-bold text-text-primary">
                {workout.name || "Workout"}
              </Text>
              <View className="flex-row items-center mt-1">
                {duration > 0 && (
                  <>
                    <Text className="text-text-muted text-xs">
                      {formatTime(duration)}
                    </Text>
                    <Text className="text-text-muted text-xs mx-1.5">·</Text>
                  </>
                )}
                <Text className="text-text-muted text-xs">
                  {completedCount} exercise{completedCount !== 1 ? "s" : ""}
                </Text>
                {skippedCount > 0 && (
                  <Text className="text-text-muted text-xs">
                    {" "}· {skippedCount} skipped
                  </Text>
                )}
                {notAttemptedCount > 0 && (
                  <Text className="text-text-muted text-xs">
                    {" "}· {notAttemptedCount} not attempted
                  </Text>
                )}
              </View>
              {/* Quiet share + edit affordances under the metadata row —
                  left-aligned with the name above it. Share only on a
                  genuinely completed day; Edit log only inside the window
                  (canEditLog), computed by the host (SPEC §4, §8). */}
              {(!wasEndedEarly || canEditLog) && (
                <View className="flex-row items-start" style={{ gap: 20 }}>
                  {!wasEndedEarly && (
                    <ShareWorkoutButton
                      planDayId={workout.id}
                      kind="completed"
                      workoutName={workout.name ?? undefined}
                      variant="calendar"
                    />
                  )}
                  {canEditLog && editLogLink("compact")}
                </View>
              )}
            </View>
          </View>
        ) : (
          <View className="items-center pt-10 pb-6 px-6">
            <Ionicons
              name="checkmark-circle"
              size={48}
              color={successColor}
            />
            <Text className="text-2xl font-bold text-text-primary text-center mt-4 mb-2">
              {wasEndedEarly ? "Workout Ended Early" : "Workout Complete!"}
            </Text>
            <View className="flex-row items-center justify-center flex-wrap">
              {duration > 0 && (
                <>
                  <Ionicons name="time-outline" size={14} color={colors.text.muted} />
                  <Text className="text-text-muted text-sm ml-1">
                    {formatTime(duration)}
                  </Text>
                  <Text className="text-text-muted text-sm mx-1.5">·</Text>
                </>
              )}
              <Text className="text-text-muted text-sm">
                {completedCount} exercise{completedCount !== 1 ? "s" : ""}
              </Text>
              {skippedCount > 0 && (
                <Text className="text-text-muted text-sm">
                  {" "}· {skippedCount} skipped
                </Text>
              )}
              {notAttemptedCount > 0 && (
                <Text className="text-text-muted text-sm">
                  {" "}· {notAttemptedCount} not attempted
                </Text>
              )}
            </View>
            {/* Centred Edit log affordance beneath the metadata (SPEC §4) */}
            {canEditLog && editLogLink("post")}
          </View>
        )}

        {/* Post-workout feedback — inline between the header and the rest */}
        {feedbackCard}

        {/* Resume button for ended-early workouts */}
        {wasEndedEarly && onResume && !compact && (
          <View className="px-4 mb-4">
            <TouchableOpacity
              className={`bg-primary rounded-xl py-3 items-center flex-row justify-center ${isResuming ? "opacity-70" : ""}`}
              onPress={onResume}
              disabled={isResuming}
            >
              {isResuming ? (
                <>
                  <ActivityIndicator size="small" color={colors.contentOnPrimary} />
                  <Text className="text-content-on-primary font-semibold text-base ml-2">
                    Resuming...
                  </Text>
                </>
              ) : (
                <Text className="text-content-on-primary font-semibold text-base">
                  Resume Workout
                </Text>
              )}
            </TouchableOpacity>
            {/* Skip belongs to the ended-early ask; Resume stays first in tap
                order. hitSlop keeps the 44px target without inflating the row. */}
            {!feedbackSkipped && !feedbackAnswered && (
              <TouchableOpacity
                className="items-center mt-4"
                onPress={() => setFeedbackSkipped(true)}
                hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Skip feedback for now"
              >
                <Text className="text-sm font-medium text-text-muted">
                  Skip for now
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Block & Exercise Breakdown */}
        <View className={compact ? "px-4 mt-4" : "px-4"}>
          {workout.blocks.map((block) => {
            const blockExercises = block.exercises;
            const roundCount = getRoundCount(block);
            const isCircuit = isCircuitBlock(block.blockType);
            const isCompletionOnly =
              getLoggingMode(block) === "completion_only";
            const isCollapsed = collapsedBlocks[block.id] ?? false;

            return (
              <View key={block.id} className="mb-4">
                {/* Block Header — tappable to collapse */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => toggleBlock(block.id)}
                  className={`bg-brand-light-2 p-4 ${isCollapsed ? "rounded-xl" : "rounded-t-xl"}`}
                >
                  <View className="flex-row items-center">
                    <View className="size-8 rounded-full bg-white/20 items-center justify-center mr-3">
                      <Ionicons
                        name={getBlockIcon(block.blockType) as any}
                        size={16}
                        color={colors.text.primary}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-text-primary text-base">
                        {block.blockName ||
                          getBlockTypeDisplayName(block.blockType)}
                      </Text>
                      {isCircuit && blockLogs[block.id]?.score ? (
                        <Text className="text-text-secondary text-sm mt-1">
                          Score: {blockLogs[block.id].score}
                          {blockLogs[block.id].actualTimeMinutes &&
                          block.blockType !== "for_time"
                            ? ` · ${blockLogs[block.id].actualTimeMinutes} min`
                            : ""}
                        </Text>
                      ) : isCircuit && roundCount > 0 ? (
                        <Text className="text-text-secondary text-sm mt-1">
                          {roundCount} round{roundCount !== 1 ? "s" : ""}{" "}
                          completed
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Exercises in Block — collapsible */}
                {!isCollapsed && (
                  <View className="bg-surface rounded-b-xl border border-t-0 border-neutral-light-2">
                    {blockExercises.map((exercise, exerciseIndex) => {
                      const logs = exerciseLogs[exercise.id] || [];
                      const status = getExerciseStatus(exercise);
                      const isLast =
                        exerciseIndex === blockExercises.length - 1;

                      const allSets = logs.flatMap((log) =>
                        (log.sets || []).map((set) => ({
                          ...set,
                          logRoundNumber: log.roundNumber,
                        }))
                      );

                      const statusIcon =
                        status === "completed"
                          ? "checkmark"
                          : status === "skipped"
                            ? "play-skip-forward"
                            : "remove";

                      return (
                        <View
                          key={exercise.id}
                          className={`p-4 ${!isLast ? "border-b border-neutral-light-2" : ""}`}
                        >
                          {/* Exercise Header */}
                          <View className="flex-row items-center mb-1">
                            <View
                              className={`size-6 rounded-full items-center justify-center mr-2 ${
                                status === "completed"
                                  ? "bg-success"
                                  : "bg-neutral-medium-1"
                              }`}
                            >
                              <Ionicons
                                name={statusIcon}
                                size={12}
                                color={colors.contentOnPrimary}
                              />
                            </View>
                            <Text className="font-semibold text-text-primary text-sm flex-1">
                              {exercise.exercise.name}
                            </Text>
                            {/* Icon-only demo chip — the row already names the
                                exercise. Rows without a demo get nothing. */}
                            {onExerciseDemoPress &&
                            exerciseHasDemo(exercise.exercise) ? (
                              <DemoChip
                                accessibilityLabel={`Demo: ${exercise.exercise.name}`}
                                onPress={() =>
                                  onExerciseDemoPress(block, exercise)
                                }
                                className="ml-2"
                              />
                            ) : null}
                          </View>

                          {/* Logged Data */}
                          {status === "skipped" ? (
                            <Text className="text-text-muted text-xs ml-8">
                              Skipped
                            </Text>
                          ) : status === "not_attempted" ? (
                            <Text className="text-text-muted text-xs ml-8">
                              Not attempted
                            </Text>
                          ) : isCompletionOnly ? (
                            <Text className="text-text-muted text-xs ml-8">
                              Completed
                            </Text>
                          ) : isCircuit && allSets.length > 0 ? (
                            <Text className="text-text-muted text-xs ml-8">
                              {allSets[0]?.weight &&
                              Number(allSets[0].weight) > 0
                                ? `${allSets[0].weight} lbs × `
                                : ""}
                              {allSets[0]?.reps || 0} reps × {logs.length} round
                              {logs.length !== 1 ? "s" : ""}
                            </Text>
                          ) : allSets.length > 0 ? (
                            <View className="ml-8">
                              {allSets.map((set, setIdx) => (
                                <Text
                                  key={setIdx}
                                  className="text-text-muted text-xs leading-5"
                                >
                                  Set {set.setNumber}:{" "}
                                  {set.weight && Number(set.weight) > 0
                                    ? `${set.weight} lbs × `
                                    : ""}
                                  {set.distanceM && set.distanceM > 0
                                    ? formatDistance(set.distanceM)
                                    : set.durationSeconds &&
                                        set.durationSeconds > 0
                                      ? `${set.durationSeconds}s`
                                      : `${set.reps} reps`}
                                </Text>
                              ))}
                            </View>
                          ) : logs.length > 0 && logs[0].durationCompleted ? (
                            <Text className="text-text-muted text-xs ml-8">
                              Duration: {logs[0].durationCompleted}s
                            </Text>
                          ) : logs.length > 0 ? (
                            <Text className="text-text-muted text-xs ml-8">
                              Completed
                            </Text>
                          ) : (
                            <Text className="text-text-muted text-xs ml-8">
                              Not attempted
                            </Text>
                          )}

                          {/* Notes */}
                          {logs.length > 0 && logs[0].notes ? (
                            <Text className="text-text-muted text-xs italic ml-8 mt-1">
                              {logs[0].notes}
                            </Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Footer */}
        {footer}
      </ScrollView>
    </View>
  );
}
