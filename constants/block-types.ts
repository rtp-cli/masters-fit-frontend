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
