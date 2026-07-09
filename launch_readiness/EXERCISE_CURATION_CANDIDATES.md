# Exercise Catalog Curation Candidates — LOCAL

> **This file covers the LOCAL database only (107 rows).** Production (Neon) has 2,081 rows —
> an independently-grown, much larger and messier catalog — see
> `EXERCISE_CURATION_CANDIDATES_PROD.md` for that analysis. Discovered 2026-07-08 while fixing
> the demo-reseed script; don't mistake this file's small scope for the whole picture.

Prep for **LR-035** (exercise catalog curation/pruning) — candidates for your review, nothing
deleted or modified. DB row count confirmed unchanged: **107 before, 107 after** this analysis.

Generated 2026-07-08 using `pg_trgm` (enabled during L19) via a self-join on the local `exercises`
table: `similarity(lower(a.name), lower(b.name)) > 0.5`. Categorized by confidence — I'm not
merging or deleting anything myself, this is triage to make your review faster.

## High confidence — likely true duplicates (same exercise, formatting difference only)

| ID 1 | Name 1 | ID 2 | Name 2 | Similarity |
|---|---|---|---|---|
| 61 | Single-Leg Balance Hold | 99 | Single Leg Balance Hold | 1.00 |
| 63 | Single-Leg Deadlift Reach | 78 | Single Leg Deadlift Reach | 1.00 |

Confirmed via a separate exact-match query these aren't literal string duplicates (they differ by
a hyphen) — `GROUP BY lower(name)` found zero exact case-insensitive collisions in the table, so
nothing is duplicated *verbatim*, but these two pairs read as the same exercise to a user.

## Medium confidence — possible duplicates, needs your judgment

| ID 1 | Name 1 | ID 2 | Name 2 | Similarity | Why it's ambiguous |
|---|---|---|---|---|---|
| 93 | Squat Jumps | 94 | Jump Squats | 0.60 | Same movement, words reordered — genuinely the same exercise, or intentionally distinct (e.g. different tempo/style)? |
| 77 | Single Leg Balance | 99 | Single Leg Balance Hold | 0.79 | Could be the same exercise with/without an explicit "hold," or a real distinction (static hold vs. dynamic balance work) |
| 61 | Single-Leg Balance Hold | 77 | Single Leg Balance | 0.79 | Same cluster as above — worth resolving all three (61/77/99) together, not pairwise |

## Low confidence — flagged by similarity but likely NOT duplicates (false positives)

Sharing words doesn't mean sharing an exercise. Listing these so they *aren't* accidentally
merged during cleanup:

- **Warrior III Hold** (64) vs. **Warrior II Hold** (66), sim 0.94 — different yoga poses.
- **Dumbbell Floor Press** (40) vs. **Flat Dumbbell Press** (49) vs. **Incline Dumbbell Press**
  (21) — legitimately distinct bench-angle variations, all worth keeping.
- **Thread the Needle** (58) vs. **Thread the Needle Pose** (84) — possibly a real duplicate
  (name vs. "Pose" suffix) or a deliberate stretch-vs-yoga-pose distinction; leaning toward
  duplicate but less confident than the "high confidence" pair above, listing here to be safe.
- **Plank Hold** (48) vs. **Side Plank Hold** (76) — different exercises (front vs. side plank).
- **Glute Bridge** (27) vs. **Glute Bridge March** (30) vs. **Single-Leg Glute Bridge** (69) —
  progressions/variations of the same base movement, not duplicates.
- **Rowing Machine** (46) vs. **Rowing Machine Sprint** (51) — intensity variant, not a duplicate.
- **Tree Pose** (62) vs. **Tree Pose Hold** (71) — likely the same, lower confidence than the
  top-tier pair.
- **Chest Stretch** (12) vs. **Doorway Chest Stretch** (55) — a specific variant, not a duplicate.
- **Sauna Session** (34) vs. **Sauna Recovery Session** (35) — possibly the same, unclear if
  intentional distinction (recovery-specific framing).
- **Ab Wheel Rollout** (25) vs. **Ab Roller Rollout** (43) — "wheel" vs. "roller" is probably the
  same equipment/exercise described two ways — plausible duplicate, listing here since I'm not
  confident enough to put it in the top tier.
- **Slam Ball Slam** (33) vs. **Medicine Ball Slam** (39) — same movement, different named
  equipment (slam ball vs. medicine ball are genuinely different objects in most gyms) — likely
  NOT a duplicate.
- **Single Leg Balance** (77) vs. **Single Leg Balance with Eyes Closed** (79) — deliberate
  progression, not a duplicate.
- **Arm Circles** (2) vs. **Ankle Circles** (60) — different body parts, not a duplicate (caught
  only because both are "___ Circles").

## Equipment data-quality issues (re-confirmed from LR-015/L3's work, with row IDs this time)

These use equipment values that either aren't in the official `AvailableEquipment` enum at all, or
use a non-canonical form of a real one:

| ID | Name | Equipment (as stored) | Issue |
|---|---|---|---|
| 28 | Ski Erg Sprint | `machines` | `"machines"` isn't in the official enum at all |
| 30 | Glute Bridge March | `bodyweight, yoga_mat` | `"yoga_mat"` isn't in the official enum |
| 33 | Slam Ball Slam | `medicine_ball` | Should be `"medicine_balls"` (plural) — the official enum value |
| 54 | Pigeon Pose Hip Stretch | `yoga_mat` | `"yoga_mat"` isn't in the official enum |

Since LR-015 (L3), any *new* exercise the LLM introduces gets checked against the real enum and
logged if it doesn't match — but these 4 pre-existing rows slipped in before that validation
existed and are still sitting in the table with bad equipment values today.

## Not analyzed: "rarely useful" / low-value entries

The original LR-035 ticket also asked about exercises that "never show up in `getFilteredExercises`
results in practice." I don't have real usage data to answer that — it would need generation-time
telemetry (which exercises actually get selected/prescribed over time) or search-telemetry data
(LR-025's work, but that's about the search feature, not generation selection). Flagging this as a
real gap rather than guessing: if you want this analyzed properly, it needs actual usage logging
first, which doesn't exist yet.

## Muscle-group casing (context, not new — see LR-015/L3)

Not re-litigating here since it's already documented in `BACKLOG.md`'s LR-015 entry, but worth
remembering while you're in here reviewing exercise data anyway: `muscle_groups` has real casing/
naming inconsistency (e.g. `"chest"`/`"Chest"`, `"hip flexors"`/`"Hip Flexors"`/`"hip_flexors"`)
that a full catalog cleanup pass would probably want to normalize too.
