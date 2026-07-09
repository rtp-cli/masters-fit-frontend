# Design Handoff Template (MastersFit)

Fill this out (or paste it with a screenshot) when handing a Claude Design screen/component
to Claude Code. The more of this you give, the closer the first implementation lands —
no back-and-forth guessing. Skip fields that don't apply.

---

## 1. What is it?
- **Name:** (e.g. `StreakChip`, `WorkoutSummaryCard`)
- **Type:** ☐ reusable component  ☐ full screen/route  ☐ section of an existing screen
- **Goes where:** target file or folder if you know it (e.g. `components/streak-chip.tsx`,
  or "new tab under `app/(tabs)/`"). If unsure, say so — I'll follow the
  `app/ = navigation only` rule and put logic in `components/`.

## 2. Screenshot / visual
- Attach the Claude Design export. A screenshot of each **state** beats one "happy path" shot.

## 3. Colors — map to ROLES, not hex
> The app has 8+ themes, so hardcoded hex breaks theming. Tell me the *role*; I'll wire it
> to the theme via `useThemeColors` / `lib/theme`.
- Background / surface: (e.g. "card surface", "primary brand", "muted/secondary")
- Text: (e.g. "primary text", "muted text", "on-primary")
- Accent / border: (role, not hex)
- If a color is genuinely one-off and non-themed, say "literal #RRGGBB — not themed".

## 4. Layout & spacing
- Rough structure: (e.g. "row: icon + label, 8px gap, 12px padding, full width")
- Use Tailwind/NativeWind scale words if you can ("p-4", "gap-2") — or just describe it.
- Corner radius, borders, shadows: (e.g. "rounded-2xl, subtle border, no shadow")

## 5. States & interaction
- States to cover: ☐ default ☐ pressed ☐ disabled ☐ loading ☐ empty ☐ error
- What happens on tap? (navigate where / call what / open which modal)
- Any animation? (e.g. "fade in", "count-up number")

## 6. Data
- What real data feeds this? (e.g. "current streak count from dashboard API")
- Where does it come from? (a `lib/` function name if you know it; otherwise describe it
  and I'll find/expose it — never `fetch()` in the component)

## 7. Match an existing component  ⭐ high-impact
- **Which existing component is this closest to?** (e.g. "style it like `card.tsx`",
  "it's a pill like `streak-chip.tsx`"). This is the single most useful field: it tells me
  the app's real convention — including things a screenshot/color spec can't encode, like
  *how* this app separates floating elements (it uses a lifted shadow, not borders, because
  in dark themes `surface`/`background`/`neutral-white` collapse to the same color).
- Edge cases, copy/text, accessibility notes.

---

### How to use this
1. Design in Claude Design as usual.
2. Fill the fields above (even loosely) and paste with the screenshot into Claude Code.
3. I'll route it through the `add-component` or `add-screen` skill so it matches house rules,
   then give you exact simulator steps to verify.

> Don't over-fill it. Even sections 1–3 + a screenshot get you a far better first pass than
> a bare image. The point is to stop me guessing on file location and theme colors.
