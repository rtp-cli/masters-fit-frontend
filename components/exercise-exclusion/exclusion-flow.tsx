import { Ionicons } from "@expo/vector-icons";
import { type ReactElement, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MuscleCoverageChip } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import {
  addExclusionsAPI,
  type ExclusionReason,
  getRelatedScheduledAPI,
  getReplacementsAPI,
  getSweepPreviewAPI,
  type RelatedScheduledExercise,
  type ReplacementCandidate,
} from "@/lib/exclusions";
import { type ThemeColorPalette, useThemeColors } from "@/lib/theme";
import { deleteExerciseFromBlock, replaceExercise } from "@/lib/workouts";
import { type WorkoutBlockWithExercise } from "@/types/api/workout.types";
import { formatEnumValue } from "@/utils";

import Text from "../text";
import {
  alternateSentence,
  bodyPartWord,
  effortLabel,
  REASON_OPTIONS,
  recommendedSentence,
  resolveLimitation,
} from "./exclusion-copy";

type Step = "reason" | "pain" | "recommended" | "other";

interface ExclusionFlowProps {
  visible: boolean;
  /** The slot being excluded — carries the plan-day-exercise id and catalog. */
  exercise: WorkoutBlockWithExercise | null;
  /** Where the flow was entered from. Banked for the deferred mid-workout mount. */
  source: string;
  /** Dismiss the flow (cancel / back out). */
  onClose: () => void;
  /** Committed and today's slot handled — parent should refresh + close. */
  onDone: () => void;
  /** Escape hatch to the full exercise search for this slot (1f). */
  onSearchInstead: () => void;
}

/**
 * The exclude-an-exercise flow (frames 1c–1f), built as ONE self-contained
 * component taking `{exercise, source}` so the deferred mid-workout entry point
 * is a one-line mount, not a refactor. It owns the reason → (pain) →
 * recommended → other state machine and assembles every user-facing sentence
 * from real catalog columns (no model call).
 */
export default function ExclusionFlow({
  visible,
  exercise,
  // `source` is part of the component's contract (the deferred mid-workout
  // entry passes "set-tracker") but isn't read yet — kept in the interface.
  onClose,
  onDone,
  onSearchInstead,
}: ExclusionFlowProps) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const ink = colors.brand.primary;

  const catalog = exercise?.exercise ?? null;
  const originalId = catalog?.id ?? null;
  const originalName = catalog?.name ?? "this exercise";
  const originalMuscles = catalog?.muscles_targeted ?? [];
  const limitationMatch = resolveLimitation(originalMuscles);

  const [step, setStep] = useState<Step>("reason");
  const [selectedReason, setSelectedReason] = useState<ExclusionReason | null>(
    null
  );
  const [sweepDayNames, setSweepDayNames] = useState<string[]>([]);
  const [related, setRelated] = useState<RelatedScheduledExercise[]>([]);
  const [additional, setAdditional] = useState<Set<number>>(new Set());
  const [addLimitation, setAddLimitation] = useState(false);
  const [candidates, setCandidates] = useState<ReplacementCandidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Reset + resolve the sweep days each time the flow opens (before 1c renders,
  // so the disclosure can name them).
  useEffect(() => {
    if (!visible || !user || originalId == null) return;
    setStep("reason");
    setSelectedReason(null);
    setAdditional(new Set());
    setAddLimitation(false);
    setCandidates([]);
    setRelated([]);
    getSweepPreviewAPI(user.id, originalId).then(setSweepDayNames);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, originalId]);

  if (!exercise || !catalog || originalId == null) return null;

  const loadCandidates = async () => {
    if (!user) return;
    setLoadingCandidates(true);
    const list = await getReplacementsAPI(user.id, originalId, 3);
    setCandidates(list);
    setLoadingCandidates(false);
  };

  const commit = async () => {
    if (!user || !selectedReason) return;
    setBusy(true);
    const items = [{ exerciseId: originalId, reason: selectedReason }];
    for (const exId of additional) {
      items.push({ exerciseId: exId, reason: selectedReason });
    }
    await addExclusionsAPI(
      user.id,
      items,
      addLimitation && limitationMatch ? limitationMatch.limitation : null
    );
    setBusy(false);
    setStep("recommended");
    loadCandidates();
  };

  const onPrimaryReasonPress = async () => {
    if (!selectedReason) return;
    if (selectedReason === "hurts") {
      if (user) {
        const rel = await getRelatedScheduledAPI(user.id, originalId);
        setRelated(rel);
      }
      setStep("pain");
    } else {
      commit();
    }
  };

  const applyReplacement = async (candidate: ReplacementCandidate) => {
    setBusy(true);
    await replaceExercise(exercise.id, candidate.id);
    setBusy(false);
    onDone();
  };

  const leaveEmpty = async () => {
    setBusy(true);
    await deleteExerciseFromBlock(exercise.id);
    setBusy(false);
    onDone();
  };

  const handleBack = () => {
    if (step === "pain") setStep("reason");
    else if (step === "other") setStep("recommended");
    else onClose();
  };

  // ---- shared header ----
  const Header = ({ title }: { title: string }) => (
    <View className="flex-row items-center px-5 py-4 border-b border-neutral-light-2">
      <TouchableOpacity
        onPress={handleBack}
        accessibilityRole="button"
        accessibilityLabel="Back"
        className="size-8 items-center justify-center"
      >
        <Ionicons name="chevron-back" size={22} color={colors.text.muted} />
      </TouchableOpacity>
      <Text className="flex-1 text-center text-base font-semibold text-text-primary mr-8">
        {title}
      </Text>
    </View>
  );

  const sweepDisclosure =
    sweepDayNames.length > 0
      ? `It's also in ${listDays(sweepDayNames)}. We'll swap it there too.`
      : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleBack}
    >
      <SafeAreaView edges={["top"]} className="flex-1 bg-background">
        {step === "reason" && (
          <View className="flex-1">
            <Header title="Stop prescribing this" />
            <ScrollView
              className="flex-1 px-5"
              contentContainerStyle={{ paddingTop: 20, paddingBottom: 20 }}
            >
              <Text
                className="text-2xl font-bold text-text-primary"
                style={{ letterSpacing: -0.4, lineHeight: 30 }}
              >
                Why should we stop prescribing {originalName.toLowerCase()}?
              </Text>
              <Text className="text-[15px] text-text-secondary mt-2 mb-5">
                Your answer changes what we put in its place.
              </Text>

              {REASON_OPTIONS.map((opt) => {
                const selected = selectedReason === opt.reason;
                return (
                  <TouchableOpacity
                    key={opt.reason}
                    onPress={() => setSelectedReason(opt.reason)}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    className="rounded-2xl mb-2.5 px-4 py-3.5 bg-surface"
                    style={{
                      minHeight: 56,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? ink : colors.neutral.medium[1],
                    }}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="flex-1 text-base font-semibold text-text-primary pr-3">
                        {opt.title}
                      </Text>
                      {selected && (
                        <View
                          className="size-6 rounded-full items-center justify-center"
                          style={{ backgroundColor: ink }}
                        >
                          <Ionicons
                            name="checkmark"
                            size={15}
                            color={colors.contentOnPrimary}
                          />
                        </View>
                      )}
                    </View>
                    <Text className="text-xs text-text-muted mt-1">
                      {opt.consequence}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Footer */}
            <View className="px-5 pt-4 pb-6 border-t border-neutral-light-2">
              {sweepDisclosure && (
                <Text className="text-sm text-text-secondary mb-2">
                  {sweepDisclosure}
                </Text>
              )}
              <Text className="text-xs text-text-muted mb-3">
                You can allow it again any time in Settings → Excluded exercises.
              </Text>
              <TouchableOpacity
                onPress={onPrimaryReasonPress}
                disabled={!selectedReason || busy}
                accessibilityRole="button"
                accessibilityLabel="Exclude and find a replacement"
                className="rounded-2xl items-center justify-center bg-primary"
                style={{ minHeight: 56, opacity: selectedReason ? 1 : 0.4 }}
              >
                {busy ? (
                  <ActivityIndicator color={colors.contentOnPrimary} />
                ) : (
                  <Text
                    className="text-lg font-semibold"
                    style={{ color: colors.contentOnPrimary }}
                  >
                    Exclude and find a replacement
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === "pain" && (
          <View className="flex-1">
            <Header title="Stop prescribing this" />
            <ScrollView
              className="flex-1 px-5"
              contentContainerStyle={{ paddingTop: 20, paddingBottom: 20 }}
            >
              <Text
                className="text-2xl font-bold text-text-primary"
                style={{ letterSpacing: -0.4, lineHeight: 30 }}
              >
                Anything else that bothers your {bodyPartWord(originalMuscles)}?
              </Text>
              <Text className="text-[15px] text-text-secondary mt-2 mb-5">
                {related.length > 0
                  ? `These ${bodyPartWord(originalMuscles)} exercises are already in your plan. Tick any that bother you.`
                  : `Nothing else in your plan works the same area. You can still exclude just this one.`}
              </Text>

              {related.map((r) => {
                const checked = additional.has(r.exerciseId);
                return (
                  <TouchableOpacity
                    key={r.exerciseId}
                    onPress={() =>
                      setAdditional((prev) => {
                        const next = new Set(prev);
                        if (next.has(r.exerciseId)) next.delete(r.exerciseId);
                        else next.add(r.exerciseId);
                        return next;
                      })
                    }
                    activeOpacity={0.8}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    className="rounded-2xl mb-2.5 px-4 py-3.5 bg-surface flex-row items-center"
                    style={{
                      minHeight: 56,
                      borderWidth: checked ? 2 : 1,
                      borderColor: checked ? ink : colors.neutral.medium[1],
                    }}
                  >
                    <View
                      className="size-6 rounded-md items-center justify-center mr-3.5"
                      style={{
                        borderWidth: checked ? 0 : 2,
                        borderColor: colors.neutral.medium[1],
                        backgroundColor: checked ? ink : "transparent",
                      }}
                    >
                      {checked && (
                        <Ionicons
                          name="checkmark"
                          size={15}
                          color={colors.contentOnPrimary}
                        />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-text-primary">
                        {r.name}
                      </Text>
                      <Text className="text-xs text-text-muted mt-0.5">
                        {r.dayName} ·{" "}
                        {r.muscleGroups
                          .map((m) => formatEnumValue(m).toLowerCase())
                          .join(", ")}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Limitation opt-in card — only when a real limitation maps. */}
              {limitationMatch && (
                <View
                  className="rounded-2xl p-4 mt-2 bg-surface"
                  style={{ borderWidth: 1, borderColor: colors.neutral.medium[1] }}
                >
                  <Text className="text-[15px] font-semibold text-text-primary">
                    Add "{limitationMatch.display}" to your limitations?
                  </Text>
                  <Text className="text-sm text-text-secondary mt-1 mb-3">
                    Every future plan works around it, not just these lifts. We
                    won't change your profile unless you say so.
                  </Text>
                  <View className="flex-row items-center">
                    <TouchableOpacity
                      onPress={() => setAddLimitation((v) => !v)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: addLimitation }}
                      className="rounded-2xl items-center justify-center px-5"
                      style={{
                        minHeight: 44,
                        borderWidth: addLimitation ? 2 : 1,
                        borderColor: ink,
                        backgroundColor: addLimitation ? ink : "transparent",
                      }}
                    >
                      <Text
                        className="text-sm font-semibold"
                        style={{
                          color: addLimitation
                            ? colors.contentOnPrimary
                            : colors.text.primary,
                        }}
                      >
                        {addLimitation ? "Added" : "Add it"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setAddLimitation(false)}
                      accessibilityRole="button"
                      className="items-center justify-center px-5 ml-1"
                      style={{ minHeight: 44 }}
                    >
                      <Text className="text-sm text-text-muted">Not now</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View className="px-5 pt-4 pb-6 border-t border-neutral-light-2">
              <TouchableOpacity
                onPress={commit}
                disabled={busy}
                accessibilityRole="button"
                className="rounded-2xl items-center justify-center bg-primary mb-2"
                style={{ minHeight: 56 }}
              >
                {busy ? (
                  <ActivityIndicator color={colors.contentOnPrimary} />
                ) : (
                  <Text
                    className="text-lg font-semibold"
                    style={{ color: colors.contentOnPrimary }}
                  >
                    Exclude {1 + additional.size}{" "}
                    {1 + additional.size === 1 ? "exercise" : "exercises"}
                  </Text>
                )}
              </TouchableOpacity>
              {additional.size > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setAdditional(new Set());
                    commit();
                  }}
                  disabled={busy}
                  accessibilityRole="button"
                  className="items-center justify-center"
                  style={{ minHeight: 44 }}
                >
                  <Text className="text-base text-text-muted">Just the one</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {step === "recommended" && (
          <RecommendedView
            colors={colors}
            loading={loadingCandidates}
            busy={busy}
            candidate={candidates[0] ?? null}
            original={{
              name: originalName,
              muscles: originalMuscles,
              difficulty: catalog.difficulty,
              sets: exercise.sets,
              reps: exercise.reps,
              weight: exercise.weight,
            }}
            reason={selectedReason}
            sweepDayNames={sweepDayNames}
            onUse={() => candidates[0] && applyReplacement(candidates[0])}
            onOther={() => setStep("other")}
            onLeaveEmpty={leaveEmpty}
            Header={Header}
          />
        )}

        {step === "other" && (
          <OtherOptionsView
            colors={colors}
            candidates={candidates}
            original={{ muscles: originalMuscles, difficulty: catalog.difficulty }}
            busy={busy}
            onPick={applyReplacement}
            onSearchInstead={onSearchInstead}
            Header={Header}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ---- 1e ----
function RecommendedView({
  colors,
  loading,
  busy,
  candidate,
  original,
  reason,
  sweepDayNames,
  onUse,
  onOther,
  onLeaveEmpty,
  Header,
}: {
  colors: ThemeColorPalette;
  loading: boolean;
  busy: boolean;
  candidate: ReplacementCandidate | null;
  original: {
    name: string;
    muscles: string[];
    difficulty: string | null;
    sets?: number;
    reps?: number;
    weight?: number;
  };
  reason: ExclusionReason | null;
  sweepDayNames: string[];
  onUse: () => void;
  onOther: () => void;
  onLeaveEmpty: () => void;
  Header: (p: { title: string }) => ReactElement;
}) {
  const ink = colors.brand.primary;
  const removedLine = `${reasonWord(reason)} · removed from today${
    sweepDayNames.length ? ` and ${listDays(sweepDayNames)}` : ""
  }`;
  // The slot inherits the original's prescription, but a bodyweight
  // replacement drops the weight (the backend does the same on swap) — never
  // print "30 lb" against an unloaded movement.
  const candidateBodyweight =
    !candidate?.equipment ||
    candidate.equipment.length === 0 ||
    candidate.equipment.every((e) => /bodyweight|none/i.test(e));
  const prescription = formatPrescription(
    original.sets,
    original.reps,
    candidateBodyweight ? undefined : original.weight
  );

  return (
    <View className="flex-1">
      <Header title="Replacement" />

      {/* Excluded strip */}
      <View className="bg-surface px-5 pt-4 pb-3 border-b border-neutral-light-2">
        <Text className="text-xs font-bold text-text-muted tracking-widest">
          EXCLUDED
        </Text>
        <Text
          className="text-lg font-semibold text-text-muted mt-1"
          style={{ textDecorationLine: "line-through" }}
        >
          {original.name}
        </Text>
        <Text className="text-sm text-text-muted mt-1">{removedLine}</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={ink} />
          <Text className="text-sm text-text-muted mt-3">
            Finding a replacement…
          </Text>
        </View>
      ) : !candidate ? (
        <View className="flex-1 px-5 pt-8">
          <Text className="text-base text-text-secondary">
            We couldn't find a good match from your equipment that we haven't
            already ruled out. You can leave the slot empty — a shorter workout
            beats a wrong one.
          </Text>
          <TouchableOpacity
            onPress={onLeaveEmpty}
            disabled={busy}
            className="mt-6 items-center justify-center rounded-2xl bg-primary"
            style={{ minHeight: 56 }}
          >
            <Text
              className="text-lg font-semibold"
              style={{ color: colors.contentOnPrimary }}
            >
              Leave the slot empty
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
        >
          <Text className="text-xs font-bold text-text-muted tracking-widest mb-3">
            WE'D PUT THIS IN ITS PLACE
          </Text>

          <View
            className="rounded-3xl p-[18px] bg-background"
            style={{ borderWidth: 2, borderColor: ink }}
          >
            <Text
              className="text-xl font-bold text-text-primary"
              style={{ letterSpacing: -0.4 }}
            >
              {candidate.name}
            </Text>
            <Text className="text-[15px] text-text-secondary mt-2 leading-5">
              {recommendedSentence(
                original.name,
                original.muscles,
                candidate.muscleGroups,
                candidate.equipment
              )}
            </Text>

            <View className="h-px bg-neutral-light-2 my-4" />

            <Text className="text-xs font-semibold text-text-muted mb-2">
              Muscles the original trained
            </Text>
            <View className="flex-row flex-wrap">
              {original.muscles.map((m) => (
                <MuscleCoverageChip
                  key={m}
                  label={formatEnumValue(m)}
                  covered={candidate.muscleGroups.some(
                    (cm) => cm.toLowerCase() === m.toLowerCase()
                  )}
                />
              ))}
            </View>

            <LabelValue
              label="Equipment"
              value={
                candidate.equipment && candidate.equipment.length > 0
                  ? `${candidate.equipment
                      .map((e) => formatEnumValue(e))
                      .join(", ")} — you have these`
                  : "No equipment needed"
              }
            />
            <View className="flex-row mt-3">
              <View className="flex-1">
                <LabelValue
                  label="Effort"
                  value={effortLabel(original.difficulty, candidate.difficulty)}
                  noMargin
                />
              </View>
              {prescription && (
                <View className="flex-1">
                  <LabelValue label="Prescription" value={prescription} noMargin />
                </View>
              )}
            </View>
          </View>

          {/* Footer actions, descending weight */}
          <TouchableOpacity
            onPress={onUse}
            disabled={busy}
            accessibilityRole="button"
            className="mt-5 items-center justify-center rounded-2xl bg-primary"
            style={{ minHeight: 56 }}
          >
            {busy ? (
              <ActivityIndicator color={colors.contentOnPrimary} />
            ) : (
              <Text
                className="text-lg font-semibold"
                style={{ color: colors.contentOnPrimary }}
              >
                Use this one
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onOther}
            className="items-center justify-center mt-1"
            style={{ minHeight: 48 }}
          >
            <Text className="text-base font-medium text-text-secondary">
              Show other options
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onLeaveEmpty}
            disabled={busy}
            className="items-center justify-center"
            style={{ minHeight: 44 }}
          >
            <Text className="text-base text-text-muted">Leave the slot empty</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

// ---- 1f ----
function OtherOptionsView({
  colors,
  candidates,
  original,
  busy,
  onPick,
  onSearchInstead,
  Header,
}: {
  colors: ThemeColorPalette;
  candidates: ReplacementCandidate[];
  original: { muscles: string[]; difficulty: string | null };
  busy: boolean;
  onPick: (c: ReplacementCandidate) => void;
  onSearchInstead: () => void;
  Header: (p: { title: string }) => ReactElement;
}) {
  const ink = colors.brand.primary;
  const total = original.muscles.length;

  return (
    <View className="flex-1">
      <Header title="Other options" />
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
      >
        <Text className="text-[15px] text-text-secondary mb-4">
          Ranked by how much of the original's muscle work they cover. Equipment
          you have only.
        </Text>

        {candidates.map((c, i) => {
          const isPick = i === 0;
          return (
            <TouchableOpacity
              key={c.id}
              onPress={() => onPick(c)}
              disabled={busy}
              activeOpacity={0.85}
              className="rounded-2xl p-4 mb-3 bg-background"
              style={{
                borderWidth: isPick ? 2 : 1,
                borderColor: isPick ? ink : colors.neutral.medium[1],
              }}
            >
              <View className="flex-row items-center justify-between mb-1">
                <Text
                  className={`text-lg text-text-primary ${
                    isPick ? "font-bold" : "font-semibold"
                  } flex-1 pr-2`}
                >
                  {c.name}
                </Text>
                {isPick && (
                  <View
                    className="rounded-md px-2 py-1"
                    style={{ backgroundColor: ink }}
                  >
                    <Text
                      className="text-[11px] font-bold tracking-wider"
                      style={{ color: colors.contentOnPrimary }}
                    >
                      OUR PICK
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-sm text-text-secondary">
                {alternateSentence(c.muscleGroups, original.difficulty, c.difficulty)}
              </Text>
              <Text className="text-xs text-text-muted mt-2">
                Covers {c.overlapCount} of the {total}{" "}
                {total === 1 ? "muscle" : "muscles"}
              </Text>
            </TouchableOpacity>
          );
        })}

        <View className="h-px bg-neutral-light-2 my-3" />

        <TouchableOpacity
          onPress={onSearchInstead}
          accessibilityRole="button"
          className="flex-row items-center"
          style={{ minHeight: 52 }}
        >
          <Ionicons name="search" size={20} color={colors.text.primary} />
          <Text className="text-base font-semibold text-text-primary ml-3">
            Search all exercises instead
          </Text>
        </TouchableOpacity>

        {/* Metering — the honest message. Swapping is always free. */}
        <View
          className="rounded-2xl p-4 mt-6 bg-surface"
          style={{ borderWidth: 1, borderColor: colors.neutral.medium[1] }}
        >
          <Text className="text-sm text-text-secondary leading-5">
            Swapping an exercise is always free. Regenerating a whole day still
            counts against your weekly limit.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ---- small building blocks ----
function LabelValue({
  label,
  value,
  noMargin,
}: {
  label: string;
  value: string;
  noMargin?: boolean;
}) {
  return (
    <View className={noMargin ? "" : "mt-3"}>
      <Text className="text-xs font-semibold text-text-muted">{label}</Text>
      <Text className="text-[15px] font-semibold text-text-primary mt-0.5">
        {value}
      </Text>
    </View>
  );
}

// ---- pure helpers ----
function listDays(days: string[]): string {
  if (days.length === 0) return "";
  if (days.length === 1) return `${days[0]}'s workout`;
  if (days.length === 2) return `${days[0]} and ${days[1]}`;
  return `${days.slice(0, -1).join(", ")}, and ${days[days.length - 1]}`;
}

function reasonWord(reason: ExclusionReason | null): string {
  switch (reason) {
    case "hurts":
      return "It hurts";
    case "no_equipment":
      return "No equipment";
    case "too_hard":
      return "Too hard";
    case "dislike":
      return "Not for me";
    default:
      return "Excluded";
  }
}

function formatPrescription(
  sets?: number,
  reps?: number,
  weight?: number
): string | null {
  const parts: string[] = [];
  if (sets && reps) parts.push(`${sets} × ${reps}`);
  else if (reps) parts.push(`${reps} reps`);
  else if (sets) parts.push(`${sets} sets`);
  if (weight) parts.push(`${weight} lb`);
  return parts.length ? parts.join(" · ") : null;
}
