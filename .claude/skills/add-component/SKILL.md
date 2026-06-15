---
name: add-component
description: Use when building a new reusable UI component for the mobile app — a button, card, modal, list item, input, chart, etc. ("make a component for X", "add a reusable Y", "extract this into a component"). For a full screen/route, use add-screen instead.
---

# Add a reusable component

Use this for a **piece of UI** that's used inside screens (a card, modal, input, badge…),
not a whole screen. For a screen/route, use the `add-screen` skill instead.

## Step 1 — Check whether one already exists

Before building, glance through `components/` for something close. The repo already has shared
primitives like `button.tsx` and `card.tsx`. **Reuse and extend** existing components rather
than making a near-duplicate — e.g. add a variant to `button.tsx` instead of a new button.

## Step 2 — Create the component

- **File name: kebab-case** → `components/workout-card.tsx`.
- **Component name: PascalCase** → `export function WorkoutCard(...)`.
- Put it at the top of `components/` if it's broadly reusable, or inside the relevant feature
  folder (e.g. `components/calendar/sections/`) if it only belongs to one screen.

Follow the shape of existing components (look at `components/button.tsx`):

```tsx
// components/workout-card.tsx
import { View, Text, TouchableOpacity } from "react-native";

interface WorkoutCardProps {
  title: string;
  onPress?: () => void;
}

export function WorkoutCard({ title, onPress }: WorkoutCardProps) {
  return (
    <TouchableOpacity onPress={onPress} className="rounded-2xl bg-card p-4">
      <Text className="text-base font-semibold">{title}</Text>
    </TouchableOpacity>
  );
}
```

Conventions to match:
- **Typed props** with an `interface XProps`. Extend RN prop types where it makes sense
  (e.g. `TouchableOpacityProps`) like `button.tsx` does.
- **Style with NativeWind** `className`. Use `lib/theme` helpers (e.g. `useThemeColors`) for
  colors so the component respects light/dark mode — don't hardcode hex.
- **Keep it presentational.** A reusable component should take data/handlers via props, not
  fetch its own data. Data fetching belongs in the screen/hook that uses it.

## Step 3 — Export it cleanly

If it lives in a feature folder that has an `index.ts` barrel, add it there so consumers import
from the folder, not the deep file path. Use the `@components/*` (or `@/components/*`) alias.

## ✅ How to know it worked

```bash
npm run lint
npm start          # press i / a, then open a screen that uses the component
```

1. Render the component somewhere real and confirm it looks right.
2. Toggle **light and dark mode** — colors should adapt.
3. Test its interactive states (pressed, loading, disabled) if it has any.
