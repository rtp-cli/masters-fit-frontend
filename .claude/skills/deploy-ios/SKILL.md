---
name: deploy-ios
description: Use when shipping the iOS app — building and submitting to TestFlight / App Store Connect ("deploy to iOS", "ship to TestFlight", "release the app", "push a new build to Apple"). Covers the EAS production build + submit flow.
---

# Deploy iOS to TestFlight

This builds the production iOS app on **EAS** (Expo's cloud build servers) and submits it to
**TestFlight** (App Store Connect app ID `6752777203`, configured in `eas.json`).

Run all commands from the **frontend repo root** (`masters-fit-frontend`).

## Before you build — get `main` ready

The build ships whatever is on `main`, so land the work first.

1. See what's open against `main`:
   ```bash
   gh pr list --base main
   ```
   If more than one is open, ask the user which to merge.
2. Merge the approved PR(s):
   ```bash
   gh pr merge <number> --merge
   ```
3. Get onto the final code:
   ```bash
   git checkout main && git pull origin main
   ```

## Check your tools

```bash
which eas || npm install -g eas-cli   # install the EAS CLI if missing
eas whoami                            # confirm you're logged in
```

If `eas whoami` says you're not logged in, tell the user to run `eas login` themselves
(it's interactive), then re-run this skill.

## Step 1 — Build

```bash
npm run build:ios:prod       # = eas build --platform ios --profile production
```

- Uses the `production` build profile in `eas.json`.
- The build number auto-increments (`autoIncrement: true` in `eas.json`) — you don't manage it.

EAS prints a **build URL** — report it so the user can watch progress. Builds usually take
**15–25 minutes**. **Wait for the build to finish successfully before submitting.**

## Step 2 — Submit

Once the build has completed, submit the latest production build to TestFlight:

```bash
npm run submit:ios:prod      # = eas submit --platform ios --profile production
```

This sends the build you just made to App Store Connect (app ID `6752777203`).

## ✅ How to know it worked

1. The `eas build` command shows the build URL and, on success, an "submitted to App Store
   Connect" message.
2. In **App Store Connect → TestFlight**, the new build appears (it sits in "Processing" for a
   few minutes before it's available to testers).
3. The build number is one higher than the previous one.

## Notes

- **Android** uses the same setup:
  `eas build --platform android --profile production`.
- Only `main` should be deployed. Don't build from a feature branch unless you intend to.
- This costs an EAS build credit and pushes to real testers — confirm with the user before
  running if you're unsure they want to ship right now.
