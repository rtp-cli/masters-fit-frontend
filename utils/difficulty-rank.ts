/**
 * Order exercise difficulty so "Scale it" can offer only easier movements.
 *
 * The catalog stores low / moderate / high; older rows and profile fitness
 * levels use beginner / intermediate / advanced. Both map onto the same three
 * steps. Anything else (null, a value we don't know) has no rank, so it is
 * never claimed to be easier.
 */
const RANK: Readonly<Record<string, number>> = {
  low: 0,
  beginner: 0,
  moderate: 1,
  intermediate: 1,
  high: 2,
  advanced: 2,
};

export function difficultyRank(
  difficulty: string | null | undefined
): number | undefined {
  if (!difficulty) return undefined;
  return RANK[difficulty.trim().toLowerCase()];
}

/** True only when both are ranked and the candidate is strictly easier. */
export function isEasierThan(
  candidate: string | null | undefined,
  current: string | null | undefined
): boolean {
  const a = difficultyRank(candidate);
  const b = difficultyRank(current);
  return a !== undefined && b !== undefined && a < b;
}
