---
name: release-preflight
description: Run BEFORE any deploy (iOS, Android, backend, or DB) to confirm the code on main is actually shippable. Checks the guardrail gates (typecheck, lint, tests, build), schema drift vs the target DB, EAS production secrets, and version bumps across the frontend + backend repos. Use when asked to "ship", "release", "cut a build", or "is this safe to deploy?".
---

# Release preflight

A single gate to run before `deploy-ios`, `deploy-android`, `deploy-backend`, or `deploy-db`.
It answers one question: **is what's on `main` actually safe to ship?** It does not deploy
anything — it verifies, reports, and stops. Deploy skills run only after this is green (or
after the user knowingly accepts a documented red).

Run the relevant section for what you're shipping. For a full release (app + backend), run all.

## 0. Confirm you're on the code that will ship

```bash
git checkout main && git pull origin main
git status --short          # must be clean; a dirty tree means uncommitted work won't ship
```

## 1. Backend gates (before deploy-backend / deploy-db)

From the **backend** repo root:

```bash
npm run tsc     # typecheck
npm run lint    # lint
npm test        # jest
npm run build   # tsoa spec-and-routes && tsup
```

Known-baseline handling — this repo's gates are not green today:
- **`tsc`**: there is a standing baseline of pre-existing errors. Capture the count on `main`
  first, then confirm your release introduces **no new** errors. Record the count so the
  baseline is visible and shrinking, never growing. A release must not raise it.
- **`lint`**: currently **non-functional** — no ESLint config file exists, so `npm run lint`
  errors out. Flag this as a release blocker to fix once (add a config), then treat lint as a
  real gate. Until then, note in the release that lint did not run.
- **`build` passing does NOT imply `tsc` passing** — `tsup`/esbuild strips types without
  checking them. Never use a green build as a substitute for the typecheck.

## 2. Schema drift vs the target database (before deploy-db, and before any backend deploy that touched src/models)

```bash
npm run db:check   # read-only diff: prints proposed SQL, applies nothing
```

- **Empty diff** → code and DB agree; safe.
- **Additive only** (CREATE / ADD COLUMN / ADD INDEX) → safe to apply via `deploy-db`.
- **Any DROP / rename / type change** → STOP. Push-based sync has no down-migration; the only
  rollback is a Neon branch/PITR restore. Before applying, take a Neon branch snapshot as the
  rollback target and get explicit sign-off. See the `change-db-schema` skill.

## 3. Frontend gates (before deploy-ios / deploy-android)

From the **frontend** repo root:

```bash
npx expo-doctor    # catches Expo SDK / native-module mismatches BEFORE a 20-min cloud build
npm run lint
npm test
```

> There is currently no frontend `tsc` script. If type safety matters for this release, run
> `npx tsc --noEmit -p tsconfig.json` directly and record the baseline the same way as the
> backend. Consider adding a `typecheck` script (a good `release-preflight` follow-up).

## 4. Production environment & secrets (before deploy-ios / deploy-android)

The EAS `production` build profile uses `"environment": "production"`, so the build pulls
**EAS-hosted** env vars — not local `.env`. Verify the production environment has what it needs:

```bash
eas env:list --environment production
```

- Confirm `EXPO_PUBLIC_*` keys are present.
- Confirm RevenueCat keys are **production**, not `test_...` sandbox keys (see launch_readiness
  LR-002). Shipping sandbox keys means real payments fail silently.

## 5. Version decision (before deploy-ios / deploy-android)

`eas.json` sets `"appVersionSource": "remote"` with `autoIncrement: true`:
- The **build number** auto-increments — nothing to do.
- The **marketing version** (`app.json` `version`, currently reflected remotely) is **manual**.
  Ask: does this release need a new store-facing version (e.g. 1.0.2 → 1.1.0)? If yes, set it
  in the remote source (`eas build:version:set`) before building.

## 6. Backend deploy target (before deploy-backend)

Backend auto-deploys to Render on merge/push to `main` — there is no manual deploy step. So
"deploy" here means "merge to `main`," and this preflight IS the gate. Confirm sections 1–2 are
green before merging the PR that triggers the deploy.

## ✅ Output

Produce a short go/no-go summary:
- Each gate: PASS / FAIL / N-A, with the tsc baseline count and any new errors.
- Schema diff verdict (empty / additive / destructive).
- Env + version decisions.
- A one-line verdict: **safe to ship**, or **blocked on X**.

Then hand off to the specific deploy skill (`deploy-ios`, `deploy-android`, `deploy-backend`,
`deploy-db`) — or stop and report the blockers.
