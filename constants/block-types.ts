/**
 * Single source of truth for workout block types.
 *
 * The backend generates exactly these 9 types (BLOCK_TYPES enum in the AI
 * schema, masters-fit-backend/src/utils/fanout-prompt-generator.ts), plus
 * "superset" which exists only as a display label today. Before this file,
 * three independent copies of these lists lived in circuit-utils, the
 * workout screen, and workout.types — and could silently drift.
 * blockType is free text in the DB, so unknown values must always fall
 * back gracefully (traditional set-by-set rendering).
 */

/** Block types that use round-based circuit logging (CircuitTracker). */
export const CIRCUIT_BLOCK_TYPES = [
  "amrap",
  "emom",
  "for_time",
  "circuit",
  "tabata",
] as const;

/** Block types that use traditional set-by-set logging. */
export const TRADITIONAL_BLOCK_TYPES = [
  "traditional",
  "superset",
  "warmup",
  "cooldown",
  "flow",
] as const;

export type CircuitBlockType = (typeof CIRCUIT_BLOCK_TYPES)[number];
export type TraditionalBlockType = (typeof TRADITIONAL_BLOCK_TYPES)[number];
export type BlockType = CircuitBlockType | TraditionalBlockType;

/**
 * How a block is SCORED, independent of how it is structured. Mirrors the
 * backend's scoring-type.ts (workout_blocks.scoring_type). Blocks created
 * before the column existed have scoringType=null — use
 * getEffectiveScoringType to fall back to the blockType-derived default.
 */
export type ScoringType =
  | "completion"
  | "rounds_reps"
  | "time"
  | "reps"
  | "load"
  | "quality"
  | "none";

export function deriveScoringType(blockType?: string | null): ScoringType {
  switch (blockType) {
    case "amrap":
    case "emom":
    case "circuit":
      return "rounds_reps";
    case "for_time":
      return "time";
    case "tabata":
      return "reps";
    case "warmup":
    case "cooldown":
    case "flow":
      return "completion";
    default:
      return "load";
  }
}

export function getEffectiveScoringType(block?: {
  blockType?: string;
  scoringType?: string | null;
}): ScoringType {
  if (!block) return "load";
  return (block.scoringType as ScoringType) || deriveScoringType(block.blockType);
}

/**
 * How the session UI logs a block. Structure picks the tracker (circuit
 * types always get round tracking); scoring picks completion-only for
 * non-circuit blocks (warmup, cooldown, flow — no fake set data).
 */
export type LoggingMode = "circuit" | "completion_only" | "set_by_set";

export function getLoggingMode(block?: {
  blockType?: string;
  scoringType?: string | null;
}): LoggingMode {
  if (!block) return "set_by_set";
  if (
    CIRCUIT_BLOCK_TYPES.includes(block.blockType as CircuitBlockType)
  ) {
    return "circuit";
  }
  if (getEffectiveScoringType(block) === "completion") {
    return "completion_only";
  }
  return "set_by_set";
}

export const BLOCK_TYPE_DISPLAY_NAMES: Record<string, string> = {
  traditional: "Strength Training",
  amrap: "AMRAP",
  emom: "EMOM",
  for_time: "For Time",
  circuit: "Circuit",
  tabata: "Tabata",
  warmup: "Warm-up",
  cooldown: "Cool-down",
  superset: "Superset",
  flow: "Flow",
};
