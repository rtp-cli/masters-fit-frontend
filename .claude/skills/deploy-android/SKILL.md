---
name: deploy-android
description: Use when building or shipping the Android app via EAS — the one-command release to Google Play ("deploy Android", "ship to Play Store", "push an Android build", "release on Android") or a sideloadable APK for quick local device testing ("make an APK", "test on my Android"). Mirrors deploy-ios.
---

# Deploy Android via EAS

The Android counterpart to **`deploy-ios`**. There are two flows — **pick by goal**:

| Goal | Command | Output | Notes |
|------|---------|--------|-------|
| **Ship to Play (normal release)** | `npm run deploy:android` | `.aab` → Play `internal` track | One command: build **+ auto-submit**. The default. |
| Quick sideload test | `npm run build:android:apk` | `.apk` (sideloadable) | No Play, no review; install via link. |

Run all commands from the **frontend repo root**.

## How submission is wired (already set up — don't redo)

Play submission is **fully configured** and proven working (first successful auto-submit:
build 48, 2026-06-18):

- **`eas.json` → `submit.production.android`**: `track: "internal"` (Internal testing — instant,
  no Google review, the TestFlight-internal equivalent; the older `alpha` closed track had a
  per-release review delay),
  `serviceAccountKeyPath: "./google-play-service-account.json"`.
- The **Google Play service-account key** lives at `frontend/google-play-service-account.json`
  — **gitignored**, treat like a password. Service account:
  `eas-play-publisher@mastersfit-89a61.iam.gserviceaccount.com`, granted "Release to testing
  tracks" in Play Console. If this file is missing on a fresh machine, re-download it from
  Google Cloud Console (it's the only piece not in the repo).
- The EAS Android **keystore** (`Build Credentials Fw9RWZFNbl`, on the `mastersfit` Expo
  account) **is the registered Play upload key** — uploads are accepted with no signing fuss.
  See memory `project_android_play_distribution`.

## Cost note (Android is the cheap platform)

EAS bills **~$1 per Android medium build** vs **~$2 for iOS** (both on the default `medium`
resource class — no `resourceClass` set in `eas.json`). Local builds (`eas build --local …`,
`expo run:android`) cost **$0**. The user is fine with small overages but watch the monthly
credit % shown in build output (resets ~July 8).

## Before you ship — get `main` ready

Like `deploy-ios`, the build ships whatever is committed. Land the work first:

```bash
gh pr list --base main          # if >1 open, ask which to merge
gh pr merge <number> --merge
git checkout main && git pull origin main
```

EAS only ships **committed** code; a dirty tree makes `eas build` prompt about uncommitted
changes (answer `y` interactively, or commit/stash first to keep it unattended).

---

## Flow 1 — Ship to Play (the normal release)

```bash
npm run deploy:android      # = eas build --platform android --profile production --auto-submit
```

- Builds a signed `.aab`, versionCode **auto-increments** (`autoIncrement`,
  `appVersionSource: remote`), then **auto-submits** to the **`internal`** testing track.
- Watch the output: `✔ Scheduled Android submission` + a submission URL means it worked.
  Build ~10–15 min; internal-track releases are available to testers almost immediately (no
  Google review, unlike closed/production tracks).
- To submit an **already-built** bundle without rebuilding (saves a credit):
  `npm run submit:android:prod` (= `eas submit … --latest`).

### Get it on the phone
User `rtp@mastersfit.ai` is a tester on the track → after rollout, open **Play Store →
MastersFit → Update**. **One-time gotcha:** if a *sideloaded* APK is currently installed, it's
signed with a different key than Play builds → "conflicts with existing package." Fix:
**uninstall the sideloaded app once**, then install from Play. After that, Play updates are
seamless.

### ✅ How to know it worked
1. `eas build` → "Build finished"; submission ends with success at its submission URL.
2. Build appears in **Play Console → Test and release → Testing → Internal testing**
   with the new versionCode.
3. Play Store on the phone shows the update.

---

## Flow 2 — Sideload APK (quick test, no Play)

```bash
npm run build:android:apk        # = eas build --platform android --profile apk
```

- `apk` profile (`distribution: internal`, `assembleRelease`). Carries
  `SENTRY_DISABLE_AUTO_UPLOAD: "true"` — **required**, or the Gradle phase fails on Sentry
  symbol upload.
- EAS prints a **build URL / QR**. Easiest install: email/text the link to the phone, tap it,
  download the `.apk`, allow "install unknown apps," install.
- ⚠️ Won't install over a Play-signed copy (signature conflict) — uninstall that first, and
  know this sideloaded build won't get Play updates.

## Notes

- Only `main` for releases. APK tests from a feature branch are fine (tests that branch's
  committed state).
- Cloud builds cost a credit — confirm before running if unsure the user wants to spend one.
- iOS shipping is the separate **`deploy-ios`** skill (build + TestFlight submit).
