---
name: add-screen
description: Use when adding a new screen, page, route, or tab to the mobile app (e.g. "add a settings screen", "create a new onboarding step", "add a page for X"). Covers the Expo Router route file + the screen component + data wiring, following the app/ = navigation-only rule.
---

# Add a screen

Screens in this app are split into **two parts**, and getting the split right is the whole point:

1. A **route file** in `app/` — tiny, navigation only.
2. A **screen component** in `components/` — all the real UI and logic.

Example used below: adding a "Settings" screen.

## Step 1 — Build the screen component (where the real work goes)

Create it under `components/`. Pick the shape that matches its complexity:

- **Simple screen** → a single file: `components/settings/settings-screen.tsx`
- **Complex screen** (multiple sections) → a folder like the existing `components/calendar/`:
  ```
  components/settings/
    settings-screen.tsx     # the screen component
    sections/               # sub-pieces, one concern each
    index.ts                # barrel: export { SettingsScreen } from "./settings-screen";
  ```

Write the component in PascalCase, file in kebab-case:

```tsx
// components/settings/settings-screen.tsx
import { View, Text } from "react-native";

export function SettingsScreen() {
  return (
    <View className="flex-1 bg-background p-4">
      <Text className="text-lg font-semibold">Settings</Text>
    </View>
  );
}
```

Style with **NativeWind** `className` strings. For theme-aware colors use the helpers in
`lib/theme` (e.g. `useThemeColors`) — don't hardcode hex values.

**If the screen needs data:** fetch it through the `lib/` layer, never with raw `fetch()`.
Reuse or add a domain helper in `lib/` (e.g. `lib/profile.ts`) that calls `apiRequest`, and
either call it from a `use-*` hook or inside the component. Look at an existing screen like
`components/calendar/` for the pattern.

## Step 2 — Add the route file (navigation only)

Create the matching file in `app/`. Its only job is to render the component:

```tsx
// app/settings.tsx
import { SettingsScreen } from "@/components/settings";
export default function Settings() {
  return <SettingsScreen />;
}
```

Where to put the route file:
- **Standalone screen** (pushed/navigated to) → top level of `app/`, e.g. `app/settings.tsx`,
  reached via `router.push("/settings")`.
- **A new bottom tab** → inside `app/(tabs)/` AND register it in `app/(tabs)/_layout.tsx`
  (copy how an existing tab like `dashboard` or `workout` is declared).
- **An auth/onboarding screen** → inside `app/(auth)/`.

⚠️ **Keep the `app/` file to just the render.** No data fetching, no business logic there —
that all belongs in the component (Step 1). This is the core rule of this codebase.

## Step 3 — Make it reachable

Add navigation to it from wherever the user should enter — e.g. a button that calls
`router.push("/settings")` (import `router` from `expo-router`). A screen no one can navigate
to is not done.

## ✅ How to know it worked

```bash
npm run lint        # no lint errors
npm start           # then press i (iOS) or a (Android)
```

In the running app:
1. Navigate to the new screen the same way a user would.
2. Confirm it renders, looks right in **both light and dark mode**, and (if it loads data)
   shows real data without errors.
3. Check the Metro/terminal logs for red error boxes or warnings you introduced.

If the route 404s or shows a blank screen, double-check the route file path in `app/` and that
the component is exported from its `index.ts` barrel.
