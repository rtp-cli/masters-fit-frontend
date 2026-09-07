/**
 * User-facing copy for a workout-adjustment request that never started.
 *
 * Kept as a standalone, dependency-free function (not inline in
 * workout-regeneration-modal.tsx) so it's unit-testable without pulling in
 * that component's full import graph — same reasoning as
 * `utils/regeneration-tab.ts`.
 *
 * Why it exists: the adjust sheet closes itself before calling the API, so a
 * server refusal has no surface of its own. On 2026-09-07 an orphaned job left
 * an AI-operation reservation open, the backend answered every weekly rebuild
 * with `409 CONCURRENCY_LIMIT` for 15 minutes, and the app showed the user
 * NOTHING. Errors now travel out to the opening screen, which needs copy that
 * says what happened and what to do next.
 */

/** What the user was adjusting — shapes the noun in the copy. */
export type AdjustmentScope = "week" | "day";

export interface AdjustmentErrorCopy {
  title: string;
  description: string;
}

/** `apiRequest` attaches the HTTP status to the Error it throws. */
function statusOf(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "";
}

/** fetch() rejects with a TypeError when the request never reached the server. */
function looksOffline(error: unknown): boolean {
  if (statusOf(error) !== undefined) return false;
  if (error instanceof TypeError) return true;
  return /network request failed|failed to fetch|network error|timed? ?out/i.test(
    messageOf(error)
  );
}

export function describeAdjustmentError(
  error: unknown,
  scope: AdjustmentScope = "week"
): AdjustmentErrorCopy {
  const noun = scope === "week" ? "week" : "workout";
  const status = statusOf(error);

  // 409 CONCURRENCY_LIMIT — one AI job at a time per user. The usual cause is a
  // still-running adjustment; a crashed one clears itself after ~15 minutes.
  if (status === 409) {
    return {
      title: "Still finishing your last change",
      description: `Your previous adjustment is still building. Give it a minute, then try again — your ${noun} hasn't changed.`,
    };
  }

  // 429 RATE_LIMIT — reasonable-use ceiling.
  if (status === 429) {
    return {
      title: "Too many changes right now",
      description: `You've asked for a lot of adjustments in a short time. Try again in a few minutes — your ${noun} hasn't changed.`,
    };
  }

  if (looksOffline(error)) {
    return {
      title: "You're offline",
      description: `Check your connection and try again — your ${noun} hasn't changed.`,
    };
  }

  if (status !== undefined && status >= 500) {
    return {
      title: "Something went wrong on our end",
      description: `Your ${noun} hasn't changed. Please try again in a moment.`,
    };
  }

  // Any other 4xx: the server sends copy worth showing (apiRequest prefers the
  // server's own `message`/`error`), so use it rather than a generic line.
  const serverMessage = messageOf(error).trim();
  if (status !== undefined && serverMessage && !/^HTTP error \d+$/.test(serverMessage)) {
    return { title: "Couldn't start the adjustment", description: serverMessage };
  }

  return {
    title: "Couldn't start the adjustment",
    description: `Your ${noun} hasn't changed. Please try again.`,
  };
}
