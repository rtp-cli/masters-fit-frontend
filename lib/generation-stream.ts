// Streaming status messages shown on the generation ("timeline") screen while
// a workout plan builds. Turning wait time into visible proof of
// personalization. See design_handoff §3 for copy + rationale.

// Credible backbone — always present, loosely tracks real phases
// (profile → goals/equipment → programming → safety → finalize).
export const CREDIBLE_LINES: string[] = [
  "Analyzing your fitness profile…",
  "Reviewing your goals, equipment, and schedule…",
  "Factoring in recovery, mobility, and joint health…",
  "Checking the plan against your experience level…",
  "Calibrating intensity for maximum progress…",
  "Fine-tuning sets, reps, and recovery intervals…",
  "Running final quality checks…",
];

// Playful — age-aware, never juvenile (audience is masters athletes, 40+).
// Woven in ~1 per 2 credible, only when "Playful messages" is on.
export const PLAYFUL_LINES: string[] = [
  "Rejecting 3,482 terrible workout ideas…",
  "Removing anything that requires the knees of a 22-year-old.",
  "Negotiating with the burpees…",
  "Eliminating exercises that belong on social media instead of in workouts.",
  "Consulting the MastersFit Exercise Brain™…",
  "Making sure it's challenging, not punishing.",
];

// Shown at 100%, replaces the stream.
export const COMPLETION_LINE =
  "Workout plan locked and loaded. Let's get after it.";

/**
 * Weave the stream so a user who bails early sees only competence:
 *   - open on a credible line and close on a credible line;
 *   - push 2 credible : 1 playful, repeat;
 *   - after credible lines are exhausted, append remaining playful lines;
 *   - then ensure the last pre-completion line is a credible one.
 * When `playful` is false the stream is the credible lines only.
 */
export function buildStream(playful: boolean): string[] {
  if (!playful) return [...CREDIBLE_LINES];

  const credible = [...CREDIBLE_LINES];
  const playfulQueue = [...PLAYFUL_LINES];
  const out: string[] = [];

  while (credible.length > 0) {
    // 2 credible
    if (credible.length > 0) out.push(credible.shift()!);
    if (credible.length > 0) out.push(credible.shift()!);
    // then 1 playful
    if (playfulQueue.length > 0) out.push(playfulQueue.shift()!);
  }
  // any remaining playful lines
  while (playfulQueue.length > 0) out.push(playfulQueue.shift()!);

  // Ensure the final pre-completion line is credible. If a playful line landed
  // last, move the final credible line to the end.
  if (out.length > 0 && PLAYFUL_LINES.includes(out[out.length - 1])) {
    const lastCredibleIdx = (() => {
      for (let i = out.length - 1; i >= 0; i--) {
        if (CREDIBLE_LINES.includes(out[i])) return i;
      }
      return -1;
    })();
    if (lastCredibleIdx >= 0) {
      const [line] = out.splice(lastCredibleIdx, 1);
      out.push(line);
    }
  }

  return out;
}
