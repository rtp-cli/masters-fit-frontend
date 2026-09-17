// How long a deferred completion stays undoable.
//
// Both windows live here so the two logging paths can't drift apart the way
// they did before (UNDO_DURATION_MS in use-circuit-session, a local
// UNDO_WINDOW_MS in workout-screen). They share a home, not a value — the
// paths genuinely differ:
//
// - Circuits close the window on the next interaction (logging reps or weight
//   into the new round is proof the last one was right, see use-circuit-session),
//   so the duration is a ceiling that rarely gets reached.
// - Set-by-set has no such dismissal — nothing the user does next retires it —
//   so the full window is all they get to notice the strip and reach it.

export const CIRCUIT_UNDO_MS = 3000;
export const EXERCISE_UNDO_MS = 5000;
