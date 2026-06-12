# Deploy iOS — Build and submit to TestFlight via EAS

Builds the production iOS app on EAS cloud servers and submits it to TestFlight automatically.

## Steps

1. Check for open PRs targeting `main` on the frontend repo:
   ```bash
   gh pr list --repo $(git -C /Users/richpusateri/Projects/MastersFit/frontend remote get-url origin) --base main
   ```
   Ask the user which ones to merge if more than one is open.

2. Merge approved PRs:
   ```bash
   gh pr merge <number> --merge --repo $(git -C /Users/richpusateri/Projects/MastersFit/frontend remote get-url origin)
   ```

3. Switch to `main` and pull:
   ```bash
   git -C /Users/richpusateri/Projects/MastersFit/frontend checkout main && git -C /Users/richpusateri/Projects/MastersFit/frontend pull origin main
   ```

4. Confirm `eas` is installed:
   ```bash
   which eas || npm install -g eas-cli
   ```

5. Confirm EAS login:
   ```bash
   eas whoami
   ```
   If not logged in, tell the user to run `eas login` and re-invoke this skill.

6. Kick off the build and auto-submit to TestFlight:
   ```bash
   cd /Users/richpusateri/Projects/MastersFit/frontend && eas build --platform ios --profile production --auto-submit
   ```
   This increments the build number automatically (`autoIncrement: true` in `eas.json`) and submits to App Store Connect app ID `6752777203` on completion.

7. Report the EAS build URL so the user can monitor progress. Build typically takes 15–25 minutes.
