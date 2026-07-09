# MastersFit Launch Readiness

Working plan for getting MastersFit to a production-ready App Store / Play Store submission.
Mirrors the structure of `../design_handoff_ux_remediation/` (BACKLOG.md = the ticket list,
PROGRESS.md = the live tracker/source of truth).

**Scope:** everything *except* UI/UX polish, which stays tracked in
`design_handoff_ux_remediation/` (Track 4 is still in flight there — MF-005 tail, MF-006,
MF-010, MF-012, MF-019–025, and the deferred MF-003 timers decision). This folder covers
payments, security, workout-generation quality, test coverage, search, platform parity,
observability, and store-submission compliance.

**Origin:** 2026-07-06 audit — four parallel code-exploration passes across both repos
(subscriptions/RevenueCat, search, workout-generation quality, and a general TODO/test-coverage/
crash-reporting sweep), plus manual verification of the two sharpest security findings before
they were trusted. See BACKLOG.md for the full ticket list with file:line evidence.

**How to use this:**
- BACKLOG.md — all tickets (LR-001...), grouped by epic, with priority and evidence.
- PROGRESS.md — the live checklist. Check items off here as they land; this is the source of truth
  for "what's actually done" (BACKLOG.md is not updated after the fact).
- BUGS.md — lightweight bug log for things found during ad-hoc testing, separate from the planned
  epic tickets above. Report a bug in chat and it gets logged here immediately; promote to a
  BACKLOG.md ticket only if it turns out to need real planned work.
