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
git fetch origin
git log --oneline main..origin/main     # MUST be empty
git status --short                      # must be clean; a dirty tree means uncommitted work won't ship
```

**Do not trust local `main`.** On 2026-09-09 a release branch was cut from a local `main` that was
3 commits behind `origin/main`; the build would have shipped a *regression*, silently reverting
fixes already live via OTA. `git pull` alone hides this when you are on another branch — the
check above is what catches it. If you cut a branch earlier in the session, re-verify its base:

```bash
git log --oneline origin/main..<your-branch>   # should show ONLY your commits
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

## 7. Verify the ARTIFACT, not just the config (after the build, before submitting)

Config introspection proves what prebuild *will* consume; store reviewers parse the **binary**.
When a release changes permissions, entitlements, or usage strings, check the built artifact:

```bash
# Android — download the .aab from the build, then:
unzip -p <app>.aab base/manifest/AndroidManifest.xml | strings \
  | grep -o "android.permission.health.[A-Z_]*" | sort -u

# iOS — download the .ipa, then:
unzip -q <app>.ipa -d x 'Payload/*.app/Info.plist'
plutil -extract NSHealthShareUsageDescription raw x/Payload/*.app/Info.plist
```

**Always run a positive control** — confirm the values that SHOULD be present are found. A bare
"0 hits" can mean your scan is blind rather than the string being absent.

⚠️ **iOS gotcha:** a config plugin's usage string **overrides** `ios.infoPlist`. The
`react-native-health` plugin's `healthSharePermission` is what actually lands in the binary, so
editing only `app.json`'s `infoPlist` key looks fixed and ships unfixed. Edit both.

## 8. Store-console truths (when a release touches permissions or availability)

- **The Play tracks API reports STAGED config, not what users can download.** Mid-review it will
  happily say `production: vc88 completed` while the console still reads "Last published on
  <old date>". Never call a build live from that field — read **Publishing overview → Submission
  activity**.
- **Play's Health apps declaration is BUNDLE-DRIVEN.** Steps 1-2 are generated from your uploaded
  bundles; there is no checkbox to remove a data type. A permission leaves that form only when a
  bundle without it is uploaded. Check **Policy status** first — "No issues found" is stronger and
  faster proof than inspecting the declaration form.
- **Managed publishing means approval ≠ release.** Both Play (Publish button) and ASC ("Manually
  release this version") hold their own gate. Plan for two.

## 9. OTA runtime alignment (whenever you bump `version`)

`runtimeVersion.policy` is `appVersion`, so **the version string IS the OTA runtime**. Bumping
`version` for one platform splits the cohorts: a JS fix then needs TWO `eas update` publishes
(one per version tree) to reach everyone, and a single publish silently covers only half your
users. Either ship both platforms at the new version, or keep the version and let the store's
build number distinguish the release. Realignment is **per-install as people update**, not
instant at publish.

## ✅ Output

Produce a short go/no-go summary:
- Each gate: PASS / FAIL / N-A, with the tsc baseline count and any new errors.
- Schema diff verdict (empty / additive / destructive).
- Env + version decisions, including the OTA runtime-alignment call (§9).
- Artifact verification result if permissions/entitlements changed (§7).
- A one-line verdict: **safe to ship**, or **blocked on X**.

Then hand off to the specific deploy skill (`deploy-ios`, `deploy-android`, `deploy-backend`,
`deploy-db`) — or stop and report the blockers.
