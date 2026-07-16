/**
 * Pending-resume registry for paywall interception.
 *
 * When a gated action (e.g. workout generation/adjustment) is blocked by the
 * server with a 403 paywall, `apiRequest` fires the global paywall modal and the
 * originating lib call returns `null` (swallowed by callers). Nothing retries it
 * — so a user who subscribes right there is dropped back with the action they
 * were trying to run silently lost, and has to figure out to re-tap it.
 *
 * A call site arms a resume thunk immediately before it makes a gated call, and
 * clears it on any non-paywall outcome. If the paywall fires and the user then
 * purchases, the global paywall modal's `onPurchaseSuccess` (in `app/_layout`)
 * runs the armed thunk — re-invoking the *UI-level* handler so the full flow
 * (generating screen, background-job polling) re-engages, not just the raw HTTP
 * request. The AI-generation calls send an `Idempotency-Key`, so re-invoking is
 * dedupe-safe on the server.
 *
 * Semantics: single-shot. The thunk is cleared once consumed (`runPendingResume`),
 * when the paywall modal is dismissed without purchasing, or when a newer action
 * arms a different resume (overwrite).
 */
let pendingResume: (() => void) | null = null;

/** Arm the action to re-run if the user purchases from the paywall it triggers. */
export function setPendingResume(fn: () => void) {
  pendingResume = fn;
}

/** Drop any armed resume (non-paywall outcome, or modal dismissed without buying). */
export function clearPendingResume() {
  pendingResume = null;
}

/** Run and clear the armed resume, if any. Called on paywall purchase-success. */
export function runPendingResume() {
  const fn = pendingResume;
  pendingResume = null;
  fn?.();
}
