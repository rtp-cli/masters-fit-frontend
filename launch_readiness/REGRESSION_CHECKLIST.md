# Manual regression checklist — LR-021 / LR-033 / LR-034

Scripted checklist for the pre-launch regression passes. Covers the purchase flow
(LR-021's scoped ask), plus core flows for the TestFlight (LR-033) and Play Store
alpha (LR-034) passes. Run once per platform. Check off inline or copy into a fresh
doc per run with date + build number.

Run this **after** LR-005 (anonymous→identified purchase linking) lands, since a
couple of items below exercise that path directly.

## Setup
- [ ] Note build number / EAS build ID being tested: ______
- [ ] iOS: TestFlight build installed on a real device (not simulator) — sandbox
      purchases don't reliably behave the same in-sim.
- [ ] Android: Play internal/alpha track build installed via the Play Store app
      (not `eas build` sideload) — some purchase behavior only triggers through
      the real Play Billing flow.
- [ ] A fresh sandbox/test Apple ID (iOS) and a licensed test account (Android)
      with no prior purchase history, or reset purchase history if reusing one.

## Purchase flow (LR-021 core ask)
- [ ] **Anonymous purchase before login**: open the app fresh (logged out), reach
      the paywall, complete a sandbox purchase *before* signing in. Then sign
      in/create an account. Confirm the purchase is linked to the new account
      (check `GET /subscriptions/status` reflects `active`, not still on trial).
- [ ] **Purchase after login (normal path)**: sign in first, then purchase.
      Confirm entitlement reflects immediately (no stuck paywall after buy).
- [ ] **Restore purchases**: sign in with an account that has a prior purchase on
      this device/Apple ID, tap "Restore Purchases," confirm entitlement restores
      without a new charge.
- [ ] **Cancel via store settings**: cancel the subscription from
      iOS Settings → Subscriptions (or Play Store → Subscriptions), then relaunch
      the app. Confirm the app doesn't still claim "Pro" past the current period end.
- [ ] **Grace period**: (if reachable in sandbox — Apple/Google sandbox both
      support accelerated billing-issue simulation) confirm a billing-issue state
      doesn't immediately lock the user out mid-grace-period.
- [ ] **Double-purchase guard**: with an already-active subscription, try to
      purchase again — confirm the app doesn't double-charge or error ungracefully.

## Core flows (LR-033 / LR-034)
- [ ] **Onboarding → first workout**: fresh account, complete onboarding
      end-to-end, confirm a workout plan generates and displays.
- [ ] **Manual workout generation**: trigger a regenerate (weekly and/or daily)
      from an existing account, confirm it completes and the new plan replaces
      the old one correctly.
- [ ] **Active workout session**: start a workout, mark sets/exercises complete,
      finish it via "Finish" — confirm it's not mistakenly treated as abandoned.
- [ ] **Abandon a workout**: start a workout, exit early via "End Workout" →
      abandon path, confirm it's recorded as abandoned, not finished.
- [ ] **Search**: search exercises, scroll to bottom, tap Load More, confirm the
      count header and Load More visibility are correct at each stage (regression
      guard for the pagination bug fixed this session).
- [ ] **Calendar / dashboard**: check today's workout card, weekly bars, and streak
      chip render correctly and agree with each other (see [[project_timezone_today_bug]]
      class of issue — worth an explicit look at evening-local-time behavior).
- [ ] **Health sync**: (iOS) confirm HealthKit write-back after finishing a workout;
      (Android) confirm Health Connect read works if connected.
- [ ] **Push notifications**: confirm a test notification is receivable (don't need
      to test every notification type, just that permissions + delivery work).
- [ ] **Profile / account**: edit profile fields, confirm they persist after app
      restart.
- [ ] **Logout / login cycle**: log out, log back in, confirm state (plan, streak,
      subscription status) reloads correctly — not stale from the previous session.

## Sign-off
- [ ] iOS pass: date ______, build ______, result: ______
- [ ] Android pass: date ______, build ______, result: ______
