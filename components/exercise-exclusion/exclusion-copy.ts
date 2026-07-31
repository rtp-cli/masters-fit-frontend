import { type ExclusionReason } from "@/types/api";
import { formatEnumValue } from "@/utils";

// The four reason options (1c). Order is intentional; consequence lines are why
// this is a full-width list, not a 2×2 grid.
export const REASON_OPTIONS: {
  reason: ExclusionReason;
  title: string;
  consequence: string;
}[] = [
  {
    reason: "hurts",
    title: "It hurts, or I've been told not to",
    consequence: "We'll check your plan for others like it, not just this lift.",
  },
  {
    reason: "no_equipment",
    title: "I don't have the equipment",
    consequence: "We'll check your equipment list too.",
  },
  {
    reason: "too_hard",
    title: "Too hard right now",
    consequence: "We'll suggest an easier version of the same work.",
  },
  {
    reason: "dislike",
    title: "I just don't like it",
    consequence: "Fair. We'll find something that trains the same muscles.",
  },
];

// Muscle group → PhysicalLimitations enum mapping for the 1d opt-in card. Only
// muscle groups that map to a real limitation region get the card (user
// decision: hide when no match) — a claim about the body is never invented.
// Conservative on purpose: only regions the contraindication filter recognises.
const MUSCLE_TO_LIMITATION: {
  match: RegExp;
  limitation: string;
  display: string;
}[] = [
  { match: /shoulder|deltoid/i, limitation: "shoulder_pain", display: "shoulder" },
  { match: /lower[\s_]*back|lumbar/i, limitation: "lower_back_pain", display: "lower back" },
  { match: /neck/i, limitation: "neck_pain", display: "neck" },
  { match: /\bhip/i, limitation: "hip_pain", display: "hip" },
  { match: /wrist/i, limitation: "wrist_pain", display: "wrist" },
  { match: /elbow/i, limitation: "elbow_pain", display: "elbow" },
  { match: /knee/i, limitation: "knee_pain", display: "knee" },
  { match: /ankle/i, limitation: "ankle_instability", display: "ankle" },
];

/**
 * The limitation this exercise's muscle groups map to, if any. Returns null when
 * nothing maps — the 1d limitation card is then hidden entirely.
 */
export function resolveLimitation(
  muscleGroups: string[] | undefined
): { limitation: string; display: string } | null {
  for (const mg of muscleGroups ?? []) {
    const hit = MUSCLE_TO_LIMITATION.find((m) => m.match.test(mg));
    if (hit) return { limitation: hit.limitation, display: hit.display };
  }
  return null;
}

/**
 * The word used for "bothers your {muscle}?" in 1d — the mapped limitation
 * region when one exists (matches the mock's "shoulder"), else the primary
 * muscle group.
 */
export function bodyPartWord(muscleGroups: string[] | undefined): string {
  const mapped = resolveLimitation(muscleGroups);
  if (mapped) return mapped.display;
  const first = (muscleGroups ?? [])[0];
  return first ? formatEnumValue(first).toLowerCase() : "this area";
}

const DIFFICULTY_RANK: Record<string, number> = {
  low: 0,
  moderate: 1,
  high: 2,
  // Legacy labels that may still appear on older rows.
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

function rank(d: string | null | undefined): number | null {
  if (!d) return null;
  const r = DIFFICULTY_RANK[d.toLowerCase()];
  return r === undefined ? null : r;
}

/** 1e "Effort" value — gentle framing; never "easier" as a verdict. */
export function effortLabel(
  original: string | null | undefined,
  candidate: string | null | undefined
): string {
  const a = rank(original);
  const b = rank(candidate);
  if (a === null || b === null || a === b) return "About the same";
  return b < a ? "Slightly easier" : "Slightly harder";
}

/** 1f alternate sentence difficulty clause. */
export function difficultyClause(
  original: string | null | undefined,
  candidate: string | null | undefined
): string {
  const a = rank(original);
  const b = rank(candidate);
  if (a === null || b === null || a === b) return "Same difficulty";
  return b < a ? "One step easier" : "One step harder";
}

/** Join a list of words with commas and a trailing "and". */
function humanJoin(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** Muscles the original trained that this candidate also trains. */
export function sharedMuscles(
  original: string[],
  candidate: string[]
): string[] {
  const set = new Set(candidate.map((m) => m.toLowerCase()));
  return original.filter((m) => set.has(m.toLowerCase()));
}

/** Muscles the original trained that this candidate does NOT. */
export function missingMuscles(
  original: string[],
  candidate: string[]
): string[] {
  const set = new Set(candidate.map((m) => m.toLowerCase()));
  return original.filter((m) => !set.has(m.toLowerCase()));
}

/**
 * 1e primary sentence — assembled only from real columns. Nothing else may be
 * asserted; the flatness is the price of never being wrong.
 */
export function recommendedSentence(
  originalName: string,
  originalMuscles: string[],
  candidateMuscles: string[],
  candidateEquipment: string[] | null
): string {
  const shared = sharedMuscles(originalMuscles, candidateMuscles).map((m) =>
    formatEnumValue(m).toLowerCase()
  );
  const equip =
    candidateEquipment && candidateEquipment.length > 0
      ? candidateEquipment.map((e) => formatEnumValue(e).toLowerCase()).join(", ")
      : "no equipment";
  const trains = shared.length > 0 ? humanJoin(shared) : "the same area";
  let sentence = `Trains ${trains}, same as ${originalName.toLowerCase()}, with ${equip} you already own.`;
  const missing = missingMuscles(originalMuscles, candidateMuscles).map((m) =>
    formatEnumValue(m).toLowerCase()
  );
  if (missing.length > 0) {
    sentence += ` It doesn't cover ${humanJoin(missing)}.`;
  }
  return sentence;
}

/** 1f alternate card sentence. */
export function alternateSentence(
  candidateMuscles: string[],
  originalDifficulty: string | null | undefined,
  candidateDifficulty: string | null | undefined
): string {
  const muscles = candidateMuscles.map((m) => formatEnumValue(m).toLowerCase());
  const trains = muscles.length > 0 ? humanJoin(muscles) : "the same area";
  return `Trains ${trains}. ${difficultyClause(originalDifficulty, candidateDifficulty)}.`;
}
