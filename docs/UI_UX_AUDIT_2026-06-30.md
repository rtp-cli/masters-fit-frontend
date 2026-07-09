# MastersFit UI/UX Audit

Date: 2026-06-30
Scope: frontend app structure, design system usage, primary flows, dashboard analytics, workout execution, calendar, search, settings, subscription, accessibility, and visual consistency.

## Executive Summary

MastersFit has a strong product foundation: the app is organized around real user jobs, the main navigation is simple, the workout execution screen prioritizes the current task, and the design token system is more mature than many early mobile apps. The product already feels like a serious training companion rather than a generic fitness template.

The biggest UX risks are consistency and confidence. A few theme classes are used but not defined, analytics filters expose ranges that the data layer does not honor, timer affordances appear to be half-disabled in the workout flow, and accessibility metadata is sparse across interactive controls. These are not cosmetic issues; they affect whether users trust the numbers, understand the workout state, and can operate the app comfortably during exercise.

Recommended focus:

1. Fix high-confidence UI correctness issues first: undefined `bg-card`, dashboard filter/date range mismatch, timer behavior, and dark-mode status bar/logo treatment.
2. Standardize common controls: segmented filters, cards, bottom action bars, icon buttons, dialogs, and loading/empty states.
3. Improve workout execution ergonomics: larger tap targets, clearer state, less duplicated overview content, and reliable rest/exercise timers.
4. Add an accessibility pass: roles, labels, hit targets, dynamic type, error announcements, and reduced reliance on color-only status.

## Strengths

- Primary navigation is restrained: Dashboard, Workout, and Calendar map well to the main user tasks.
- The design token layer in `lib/theme.ts` and `tailwind.config.js` gives the app a good foundation for theming.
- The dashboard has useful information architecture: active workout first, progress/health context next, then analytics.
- Workout execution puts media and current exercise context before logging, which is appropriate for in-session use.
- Calendar separates month selection, day actions, and day detail, making the screen conceptually understandable.
- The app has robust modal sequencing in several places, especially around logout and purchase success flows.

## Priority Findings

### P0 / High

#### Undefined `bg-card` Class Used In High-Traffic Screens

`bg-card` appears in workout, calendar, circuit, video, and picker surfaces, but `tailwind.config.js` defines `background`, `surface`, `primary`, and other colors without a `card` token. See `tailwind.config.js:8-56` and usages such as `app/(tabs)/workout.tsx:1991`, `app/(tabs)/workout.tsx:2262`, `app/(tabs)/workout.tsx:2300`, `app/(tabs)/workout.tsx:2407`, and `components/calendar/sections/action-buttons.tsx:90`.

Impact: NativeWind may drop the class or fail to apply the expected surface color. This can make critical workout cards, bottom action bars, and secondary buttons look inconsistent across themes.

Recommendation: Either add a `card` color token mapped to a deliberate CSS variable or replace `bg-card` with `bg-surface`/`bg-background` according to the design role. Prefer a named token if cards need separation from page surface.

#### Dashboard Range Filters Overpromise Data

The enum exposes `1W`, `1M`, `3M`, `6M`, and `1Y`, and dashboard cards render `Object.values(TIME_RANGE_FILTER)`. The filter logic only handles `1W`, `1M`, and `3M`; `6M` and `1Y` fall back to 30 days in `components/dashboard/dashboard-screen.tsx:319-330`. Card subtitles also fall through to “Last 1 week” for unhandled ranges, for example `components/dashboard/sections/weight-performance.tsx:35-40`.

Impact: Users selecting `6M` or `1Y` see mislabeled and incorrectly filtered analytics. That directly undermines trust in progress data.

Recommendation: Add explicit `6M` and `1Y` handling in `filterDataByDateRange`, centralize a `getTimeRangeLabel` helper, and avoid rendering filters that are not supported. Apply to Weight Performance, Strength Progress, and General Fitness Progress.

#### Workout Timers Are Partially Disabled But Still Present In State

Exercise timer logic is commented out in `components/adaptive-set-tracker.tsx:104-165`, while state and UI paths still imply timers exist. Rest timer UI is commented out in `app/(tabs)/workout.tsx:2191-2234`, but rest timer state and completion modal paths remain in the file.

Impact: Time-based exercises and rest periods can feel unreliable. During a workout, ambiguity around whether a timer is active is a high-friction moment.

Recommendation: Decide the product behavior. If timers are supported, restore and test countdown behavior, haptics, notifications, pause/resume, and background handling. If timers are not supported, remove timer controls/state and replace with clear manual logging.

#### Accessibility Coverage Is Sparse

The repo has hundreds of `TouchableOpacity` instances but very few `accessibilityRole`, `accessibilityLabel`, or `hitSlop` declarations. Header icon buttons at `components/header.tsx:123-134`, search clear/date controls at `components/search/search-view.tsx:603-620`, and workout bottom actions at `app/(tabs)/workout.tsx:2409-2474` are examples of important controls without explicit accessibility metadata.

Impact: Screen reader users get weak or ambiguous labels, small controls are harder to hit during exercise, and some state changes may not be announced.

Recommendation: Create shared `IconButton`, `ActionButton`, and `SegmentedControl` primitives with built-in roles, labels, disabled state, minimum 44x44 touch target, and optional hit slop. Retrofit the header, dashboard filters, search, workout controls, calendar actions, and modals.

### P1 / Medium

#### Dark Mode Status Bar And Brand Assets Are Not Fully Theme-Aware

Login and onboarding use `StatusBar style="dark"` and `logo-dark.png` regardless of theme. See `components/login/login-screen.tsx:210-248` and the similar onboarding header in `components/onboarding-form.tsx`.

Impact: Dark themes can show low-contrast status bar icons or an inappropriate logo asset.

Recommendation: Drive status bar style and logo source from theme mode. Use tokenized brand assets or a single SVG/image strategy that works on both light and dark backgrounds.

#### Workout Execution Screen Has Strong Content But Heavy Visual Density

The screen includes hero media, workout header, current block, current exercise card, set tracker, notes, circuit logging, full workout overview, sticky bottom actions, and modals. The current exercise card alone starts at `app/(tabs)/workout.tsx:1987`, with overview beginning at `app/(tabs)/workout.tsx:2299`.

Impact: During exercise, users need fast confirmation and large controls. Dense secondary information competes with logging actions.

Recommendation: Keep current exercise/logging and bottom actions dominant. Collapse “Today’s Workout Plan” by default after workout start, show a compact progress rail instead, and move notes behind an expandable row unless previously used.

#### Tap Targets Are Often Visually Smaller Than Mobile Guidelines

Several controls use 32-40px visual targets: header icons are `w-10 h-10` at `components/header.tsx:123-134`, round chips are `w-9 h-9` at `app/(tabs)/workout.tsx:2140-2165`, set increment buttons are `w-8 h-8` in the set trackers, and delete/clear icons often rely on small padding.

Impact: Small targets are especially hard during workouts when users are moving, sweaty, or one-handed.

Recommendation: Establish a minimum 44x44 interactive target. Keep visual circles smaller if desired, but wrap with hit slop or a larger touchable container.

#### Analytics Cards Repeat Filter Logic And Copy

Weight Performance, Strength Progress, and Workout Type Distribution each implement their own filter label and segmented control. This duplication caused the `6M`/`1Y` mismatch and makes future copy changes easy to miss.

Recommendation: Extract `TimeRangeSegmentedControl` and `formatTimeRangeLabel`. Add a prop for supported ranges so a card can intentionally omit unsupported periods.

#### Search Is Useful But Under-Guided

Search supports exercise query and date search, with an immediate date picker affordance at `components/search/search-view.tsx:573-620`. There is no visible mode label, recent searches, or empty-state guidance before a query.

Impact: Users may not discover that the calendar icon searches workout history by date, and general search can feel blank before input.

Recommendation: Add a compact initial state with two obvious actions: search exercises and browse by date. Consider recent exercises/dates once data is available.

#### Settings Has Good Coverage But Too Many Equal-Weight Sections

Settings includes profile, quick actions, personal details, goals, workout types, equipment, schedule, health info, subscription, app settings, developer tools, logout, and version. This is comprehensive, but the visual hierarchy treats many sections similarly.

Recommendation: Group settings into “Account,” “Training Profile,” “Subscription,” and “App” sections, with edit affordances near each section. Keep developer/debug content hidden unless activated.

### P2 / Lower

#### Mixed Styling Approaches Create Drift

The app mixes NativeWind classes, inline styles, hard-coded hex values, and theme colors. Examples include hard-coded red/error text, white text in subscription flows, static pull-to-refresh `tintColor="#fff"`, and inline shadows.

Recommendation: Move common color/spacing choices into tokens and primitives. Hard-coded brand colors like YouTube red can remain where semantically external.

#### Empty And Loading States Are Inconsistent

There are good skeletons in several places, but empty states vary from plain centered text to full cards and modals. Dashboard, calendar rest days, no active workout, search, and subscription all use slightly different patterns.

Recommendation: Define three reusable states: full-screen empty, card empty, and inline empty. Include icon, title, body, primary action, optional secondary action.

#### Chart Semantics Need Clarifying

Strength Progress now plots a rolling weekly average while “Latest Avg” and “Growth” are raw values. That can be okay, but the labels should make the difference explicit.

Recommendation: Either compute summary stats from the same smoothed series or label raw stats as “Latest Session Avg” and “Session Growth.”

## Flow Recommendations

### Onboarding

- Keep the current step flow; it is clear and progressive.
- Add “why this matters” microcopy sparingly for health connection and limitations.
- Ensure every validation error uses `accessibilityRole="alert"` and moves focus or scrolls to the first invalid field.
- Consider a review step before generating the first plan so users feel in control of AI output.

### Dashboard

- Make Active Workout the clear primary action. “View Workout” is good; consider “Start Today’s Workout” when today is incomplete.
- Fix all time-range filters and use one shared segmented control.
- Reduce chart reliance on low-contrast palette variants; add labels/legends that work without color.
- Make health metrics useful when disconnected: show a small connect card instead of hiding the whole carousel if the feature is important.

### Workout

- Resolve timer support decisively.
- Increase touch targets for set controls, rounds, pause, complete, and destructive actions.
- Collapse secondary content after start.
- Make “End Workout” copy more specific: “Finish Early” for saving partial progress, “Discard Workout” for destructive abandonment.
- Consider a persistent current-exercise summary in the bottom action area for long screens.

### Calendar

- Keep date grid and day detail model.
- Clarify regeneration copy: separate “Regenerate this day” from “Regenerate week” wherever the selected date has a scheduled workout.
- Use consistent primary/secondary button styles; the edit button currently depends on `bg-card`.
- Add a legend for calendar dots if users frequently need to distinguish complete, planned, rest, and historical days.

### Search

- Add an initial empty state explaining exercise search and date lookup.
- Give the calendar icon an accessible label and visible selected date state.
- Consider chips for recent exercises or recent workout dates.
- Keep auto-search debounce, but show a “Searching…” state close to the input so the user understands delayed results.

### Subscription

- The paywall is structurally sound.
- Add plan comparison clarity: show monthly equivalent for annual plan and renewal/cancel terms near the subscribe button.
- Use tokenized text colors instead of `text-white`.
- Make restore purchases accessible and disabled feedback explicit during purchase.

## Design System Recommendations

Create or standardize these primitives:

- `AppCard`: surface/background/card variants, border, radius, padding, shadow.
- `IconButton`: 44x44 target, role, label, hit slop, disabled state.
- `ActionButton`: primary, secondary, destructive, loading, icon-left.
- `SegmentedControl`: supported options, selected state, accessible role/state.
- `SectionHeader`: title, subtitle, optional action.
- `EmptyState`: icon, title, body, primary/secondary action.
- `MetricTile`: label, value, trend, semantic color.
- `ModalDialog`: replace duplicate modal button layouts with one accessible pattern.

## Accessibility Checklist

- Add `accessibilityRole="button"` and labels for all icon-only controls.
- Add `accessibilityState={{ disabled, selected, expanded }}` where relevant.
- Ensure minimum 44x44 touch targets.
- Announce validation errors with `accessibilityRole="alert"`.
- Avoid color-only status in charts, calendar dots, workout completion, and selection states.
- Audit dynamic type: avoid fixed-height text containers for user-facing copy.
- Add focus order checks for modals and bottom sheets.
- Use theme-aware status bar styles.

## Suggested Roadmap

### Week 1: Correctness And Trust

- Define or replace `bg-card`.
- Fix `6M` and `1Y` dashboard filtering and labels.
- Resolve timer behavior.
- Patch theme-aware status bar/logo usage.
- Add labels/roles to header, search, workout bottom actions, dashboard filters, and modal buttons.

### Week 2: Workout Ergonomics

- Increase touch targets in workout execution and set tracking.
- Collapse secondary overview during active workout.
- Clarify finish early vs abandon language.
- Test workout flow one-handed on small iPhone and Android sizes.

### Week 3: Design System Consolidation

- Build shared button, icon button, segmented control, card, and empty-state primitives.
- Replace repeated dashboard filter controls.
- Normalize modal/dialog layouts.
- Remove hard-coded internal colors where tokens exist.

### Week 4: Product Polish

- Improve search initial state and date search discoverability.
- Add calendar dot legend.
- Refine subscription comparison and renewal copy.
- Do an accessibility pass with VoiceOver/TalkBack.

## Verification Notes

- Static audit only; no simulator or browser screenshots were captured in this pass.
- `npx eslint components/dashboard/sections/strength-progress.tsx` was previously clean.
- Repo-wide `npm run lint` and `npx tsc --noEmit` currently fail on existing issues outside this audit scope, so automated UI confidence is limited until baseline tooling is cleaned up.
