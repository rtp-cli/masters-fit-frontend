// Shared hitSlop presets that extend a sub-44px visual control to roughly the
// 44px Apple/Material minimum touch target (backlog MF-009). Defined at module
// scope so the object is allocated once and reused, rather than rebuilt inline
// on every render.

/** For ~32px controls (e.g. w-8 steppers): +6 each side ≈ 44px. */
export const HIT_SLOP_6 = { top: 6, bottom: 6, left: 6, right: 6 } as const;

/** For ~24px controls (e.g. p-1 icon buttons): +10 each side ≈ 44px. */
export const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 } as const;
