# Launch Readiness — Bug Log

Lightweight, separate from BACKLOG.md's planned epics/tickets (`LR-0XX`) on purpose: bugs land
here the moment they're *found* during ad-hoc testing, with no scoping/prioritization overhead.
If a bug turns out to need real planned work, promote it into a BACKLOG.md ticket and link back
to its `BUG-0XX` id here.

**Process:** hit something broken while testing → describe it to Claude in chat (repro steps +
expected vs. actual, screenshot if you have one) → it gets an entry here immediately, severity
tagged, no need to stop and fix it in the moment unless you want to. Check items off / move to
"Resolved" as they're fixed — don't delete, keep the history.

**Severity:** P0 = blocks a core flow, crash, data loss. P1 = visibly broken, workaround exists.
P2 = cosmetic/minor.

---

## Open

- [ ] **BUG-001 · P2** — Single-day regeneration briefly shows the *initial full-week* generation
      progress screen ("Building today's workout — 3 of 3 ready", the onboarding-generation UI)
      before correcting itself to the right single-day progress screen a moment later. The actual
      generation completes fine (new exercise/API key worked) — this is purely a stale-UI flash.

  **Repro (found 2026-07-07):** create account → onboard → weekly plan generates fine → trigger a
  single-day regeneration → the wrong (stale weekly) progress screen renders first, then corrects.

  **Context — this is a regression, not new territory:** commit `320a96b` ("faster generation
  polling + reset timeline on job change") already targeted exactly this — its own commit message
  says it resets `useWorkoutProgress` day-state "so a new generation (or weekly->daily switch)
  never inherits the prior job's timeline." Confirmed 2026-07-07 that commit **is** present on the
  current branch (`git merge-base --is-ancestor 320a96b HEAD` → yes) — so this is either an
  incomplete fix or a code path that commit didn't cover, not a merge gap. Touched
  `components/workout-generation-modal.tsx`, `contexts/background-job-context.tsx`,
  `hooks/use-workout-progress.ts`, `constants/timeouts.ts` — start there. Related:
  `project_workout_generation_queue` memory (prior generation-UX work), Epic 3 in this folder's
  BACKLOG.md.

  **Not urgent — user's own call, deprioritized behind Phase 0/1 work.**

- [ ] **BUG-002 · P2** — Completing a subscription purchase shows the "Welcome to MastersFit
      Pro!" confirmation dialog **twice** in a row (screenshot shows the second one). Also: once
      fixed to a single dialog, the dialog's content/copy needs a revisit — not finalized either
      (same situation as LR-052's paywall bullets).

  **Root cause candidate (not confirmed, not fixed):** the exact same dialog is independently
  implemented twice — `components/dashboard/dashboard-screen.tsx:996-1014` and
  `components/settings/settings-view.tsx:574-589` each render their own `PaymentWallModal` with a
  copy-pasted `onPurchaseSuccess` → `setDialogConfig({ title: "Welcome to MastersFit Pro!", ... })`.
  If both screens are mounted simultaneously (likely, in a tab navigator that keeps inactive tabs
  alive rather than unmounting them) and both react to the same underlying purchase/entitlement
  event, each fires its own copy. Fix likely means consolidating this into one shared
  place (a single global listener/dialog host) rather than one-off per-screen logic — start by
  confirming whether both screens are actually mounted when this happens.

  **Found 2026-07-07, verified end-to-end purchase flow otherwise works correctly** (webhook
  fired, entitlement activated, backend synced — LR-003/LR-004 confirmed via Render logs).

## Resolved

- [x] **BUG-003 · P1** — `bg-secondary` and its paired "on-secondary" text/icon colors
      (`text-background`, `colors.background`, `colors.neutral.white`, `colors.contentOnPrimary`
      used against a `bg-secondary` fill) resolve to the *same* color as each other in every theme
      — both key off the same "opposite of primary" token (white in light themes, near-black in
      dark). Any button using this pairing had invisible text/icons. Found 6 live instances:
      `workout-choice-modal.tsx` ("Repeat a Past Workout"), `calendar-screen.tsx` ("Retry" on the
      error state), `calendar/sections/workout-day.tsx` ("Start" today's workout),
      `settings/sections/health-connect-section.tsx` (both "Connect" and "Update Permissions"),
      `dashboard/sections/health-metrics-carousel.tsx` ("Connect Health"), and
      `onboarding/steps/health-connect-step.tsx` (the Health Connect button — every new user who
      reached this onboarding step saw a blank button). Fixed by switching all 6 to the
      established secondary-button pairing already used elsewhere (`button.tsx`'s `secondary`
      variant): `bg-neutral-light-2` fill + `text-text-primary` text. Found 2026-07-10 while
      investigating what looked like an unnecessary extra prompt in the rest-day workout-creation
      flow — the "Repeat a Past Workout" option wasn't actually missing, its text was just
      invisible, making the choice modal look like it only offered one real option.
