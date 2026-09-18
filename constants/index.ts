// Central export for all constants
export * from "./accessibility";
export * from "./api";
export * from "./colors";
export * from "./global.enum";
export * from "./limits";
export * from "./subscription";
export * from "./timeouts";
export * from "./undo";

/**
 * [LR-069] How many sessions a single date may hold — the planned one plus one
 * addition. Mirrors MAX_SESSIONS_PER_DATE on the backend, which is the real
 * enforcement; this only decides whether to OFFER the button, so a user is
 * never sent into a request that will 400.
 *
 * Two, not more, because each extra session spends a DAY_ADJUSTMENT (a free
 * account has three for its lifetime) and because the session switcher divides
 * the screen width — two pills fit, four are unreadable.
 */
export const MAX_SESSIONS_PER_DATE = 2;
