/**
 * Which tab the regeneration modal should default to when it opens.
 * Kept as a standalone, dependency-free function (not inline in
 * workout-regeneration-modal.tsx) so it's unit-testable without pulling in
 * that component's full import graph (RN native modules like health/
 * async-storage cascade in just from importing the component file).
 */
export function resolveDefaultRegenerationTab(opts: {
  singleTabOnly: boolean;
  isRestDay: boolean;
  noActiveWorkoutDay: boolean;
  regenerationType: "day" | "week";
}): "day" | "week" {
  if (opts.singleTabOnly) return "day";
  if (opts.isRestDay || opts.noActiveWorkoutDay) return "week";
  return opts.regenerationType;
}
