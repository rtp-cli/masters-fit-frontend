# MastersFit Design System

A Claude Design–ready design system, **generated from the app** — every colour, size,
radius and shadow in these cards is extracted from `lib/theme.ts` at build time rather
than transcribed, so the system can never quietly drift from what ships.

## Regenerate

```bash
node docs/design-system/build.mjs
open docs/design-system/index.html      # local contact sheet
```

Re-run this after any change to `lib/theme.ts` or `tailwind.config.js`.

## Load into Claude Design

The `DesignSync` tool pushes this bundle to a design-system project on claude.ai/design.
It needs a one-time authorization:

1. In an **interactive** Claude Code session on this machine, run `/design-login`.
2. Then ask Claude to sync this folder. It will `list_projects`, `finalize_plan`
   (you approve the exact file list), and upload.

Each card's first line carries a `<!-- @dsCard group="…" name="…" -->` marker, which is
what the Design System pane groups by. `cards.json` mirrors those markers for the
`register_assets` fallback path.

## Cards

| Group | Card |
|---|---|
| Brand | Principles — the 8 rules, traced to the MF-### decisions in the code |
| Color | Theme families — 5 families × light/dark |
| Color | Semantic roles — what each token is for + AA contrast per theme |
| Type | Typography — Manrope, the 8-step scale, text variants |
| Spacing | Space, radius & elevation — plus the 44px touch target |
| Components | Button, IconButton, Card, Chips & pills, SegmentedControl, CustomDialog, Navigation, Text |

## Known gaps recorded in the cards

These are real, not documentation artifacts — the cards state them rather than hide them:

- `success` is only defined by the Original family; the other four fall back to
  `brand.primary`, which fails AA as a foreground (4.10:1 Steel Blue light,
  3.84:1 Dusty Sage light).
- Dusty Sage light `contentOnPrimary` on `brand.primary` is 4.23:1 — every filled
  button in that theme is marginally under AA.
- `Text` maps `h1`/`h2`/`h3` to one 20px bold style; heading hierarchy is effectively
  two steps, not four.
- `lib/theme.ts` still labels the default family "Original (Lime Green)". It is a
  monochrome ink ramp; the comment is stale.
