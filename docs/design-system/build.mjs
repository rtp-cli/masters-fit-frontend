// Generates the MastersFit design-system bundle for Claude Design.
// Values are EXTRACTED from lib/theme.ts + tailwind.config.js, never hand-copied,
// so `node docs/design-system/build.mjs` always re-syncs the system to the app.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const src = fs.readFileSync(path.join(ROOT, "lib/theme.ts"), "utf8");

// ---- extract the token exports -------------------------------------------
const T = {};
const re = /export const (\w+)\s*=\s*(\{[\s\S]*?\n\})\s*as const;/g;
let m;
while ((m = re.exec(src))) {
  if (m[1] === "colorThemes") continue; // references other exports; rebuilt manually below
  try {
    T[m[1]] = eval("(" + m[2].replace(/\s+as const/g, "") + ")");
  } catch (e) {
    console.warn("  ! skipped export", m[1], "-", e.message);
  }
}

const THEMES = [
  ["Original", "original", T.colors, T.darkColors],
  ["Steel Blue", "steel-blue", T.steelBlueColors, T.steelBlueDarkColors],
  ["Dusty Denim", "dusty-denim", T.dustyDenimColors, T.dustyDenimDarkColors],
  ["Dusty Sage", "dusty-sage", T.dustySageColors, T.dustySageDarkColors],
  ["Carbon Violet", "carbon-violet", T.carbonVioletColors, T.carbonVioletDarkColors],
];

// createThemeVars() in lib/theme.ts resolves these two defaults. Mirror it exactly.
const resolve = (p) => ({
  ...p,
  card: p.card ?? p.neutral.light[2],
  success: p.success ?? p.brand.primary,
});

// ---- contrast (for the AA annotations) -----------------------------------
const lum = (hex) => {
  const c = hex.replace("#", "");
  const v = [0, 2, 4].map((i) => {
    const s = parseInt(c.slice(i, i + 2), 16) / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const cr = (a, b) => ratio(a, b).toFixed(2);

// ---- page shell -----------------------------------------------------------
const P = resolve(T.colors);
const D = resolve(T.darkColors);

const SHELL = (o) => `<!-- @dsCard group="${o.group}" name="${o.name}" subtitle="${o.subtitle}" width="${o.width}" height="${o.height}" -->
<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>MastersFit — ${o.name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:${P.background}; --surface:${P.surface}; --card:${P.card}; --white:${P.neutral.white};
    --ink:${P.text.primary}; --ink-2:${P.text.secondary}; --muted:${P.text.muted};
    --primary:${P.brand.primary}; --on-primary:${P.contentOnPrimary};
    --line:${P.neutral.medium[1]}; --line-2:${P.neutral.light[2]};
    --danger:${P.danger}; --warning:${P.warning}; --success:${P.success};
    --l-1:${P.neutral.light[1]}; --l-2:${P.neutral.light[2]}; --m-3:${P.neutral.medium[3]};
  }
  .on-dark{
    --bg:${D.background}; --surface:${D.surface}; --card:${D.card}; --white:${D.neutral.white};
    --ink:${D.text.primary}; --ink-2:${D.text.secondary}; --muted:${D.text.muted};
    --primary:${D.brand.primary}; --on-primary:${D.contentOnPrimary};
    --line:${D.neutral.medium[1]}; --line-2:${D.neutral.light[2]};
    --danger:${D.danger}; --warning:${D.warning}; --success:${D.success};
    --l-1:${D.neutral.light[1]}; --l-2:${D.neutral.light[2]}; --m-3:${D.neutral.medium[3]};
  }
  *{box-sizing:border-box}
  body{
    margin:0; padding:40px;
    font-family:Manrope,-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
    background:#FFFFFF; color:${P.text.primary};
    font-size:16px; line-height:1.45; -webkit-font-smoothing:antialiased;
  }
  .wrap{max-width:${o.width - 80}px;margin:0 auto}
  h1{font-size:28px;font-weight:700;letter-spacing:-.02em;margin:0 0 6px}
  .lede{font-size:16px;color:${P.text.muted};margin:0 0 34px;max-width:62ch}
  h2{font-size:13px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;
     color:${P.text.muted};margin:38px 0 14px;padding-bottom:8px;border-bottom:1px solid ${P.neutral.medium[1]}}
  h2:first-of-type{margin-top:0}
  .note{font-size:14px;color:${P.text.muted};margin:10px 0 0;max-width:70ch}
  code,.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px}
  code{background:${P.neutral.light[2]};padding:2px 6px;border-radius:4px;color:${P.text.secondary}}
  table{border-collapse:collapse;width:100%;font-size:14px}
  th{text-align:left;font-weight:600;font-size:11.5px;letter-spacing:.07em;text-transform:uppercase;
     color:${P.text.muted};padding:0 14px 8px 0;border-bottom:1px solid ${P.neutral.medium[1]}}
  td{padding:11px 14px 11px 0;border-bottom:1px solid ${P.neutral.light[2]};vertical-align:top}
  .stage{background:var(--bg);border:1px solid ${P.neutral.medium[1]};border-radius:14px;padding:26px}
  .stage.on-dark{border-color:${D.neutral.medium[1]}}
  .row{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:18px}
  .cap{font-size:11.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;
       color:var(--muted);margin:0 0 12px}
  .pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.04em}
  .pass{background:${P.success}1A;color:${P.success}}
  .fail{background:${P.danger}1A;color:${P.danger}}
  .rule{border-left:3px solid ${P.brand.primary};padding:2px 0 2px 16px;margin:16px 0;font-size:14.5px;color:${P.text.secondary}}
  .rule b{color:${P.text.primary}}
${o.css || ""}
</style>
<div class="wrap">
<h1>${o.name}</h1>
<p class="lede">${o.lede}</p>
${o.body}
</div>
`;

const files = [];
const card = (p, o) => {
  files.push({ path: p, ...o });
  fs.mkdirSync(path.join(HERE, path.dirname(p)), { recursive: true });
  fs.writeFileSync(path.join(HERE, p), SHELL(o));
};

// =========================================================================
// FOUNDATIONS — brand & principles
// =========================================================================
const PRINCIPLES = [
  ["Solid ink is rationed", "MF-006",
   "Exactly one solid filled control per screen: the primary action. Everything informational — muscle groups, equipment, counts, tags — is an outline chip. When data wore ink pills, users tapped them."],
  ["No status by color alone", "MF-005 / MF-011 / MF-019",
   "Every stateful cue carries a second channel. The active tab is a <i>filled</i> glyph vs an outline one, not just a tint. A selected calendar day is a ring, not a fill. A chosen date prints the date. Selection is announced via accessibilityState, never inferred from hue."],
  ["Elevation goes lighter, both ways", "MF-010",
   "Light themes step surfaces toward grey; dark themes step them toward white. <code>surface</code> equalled <code>background</code> in every theme, which made every card invisible — <code>card</code> now resolves to <code>neutral.light[2]</code> so a card is always a real tonal step."],
  ["Built for masters-age eyes", "MF-008",
   "The type floor is raised across the board: xs 11→13, sm 13→14, base 15→16. There is no 11px body text in this app. 40+ lifters read this mid-set, sweaty, in a gym."],
  ["44px is the floor, always", "MF-009 / MF-014",
   "Every tappable thing presents a 44×44 target even when its glyph is 20px. Icon-only controls take a <i>required</i> accessibilityLabel — the component will not compile without one."],
  ["One control, one place", "MF-016 / MF-022",
   "Hand-rolled duplicates of a shared control are how bugs breed: five copies of a segmented row is what let the 6M/1Y filter-vs-label mismatch ship per-card. Shared primitives, fixed once."],
  ["The current task dominates", "MF-012",
   "Once a workout starts, the plan overview collapses to a progress rail and notes hide behind a row. Nothing competes with the set being logged."],
  ["Admit what a change costs", "MF-006 / trust",
   "When a swap loses a muscle group, the app shows a <b>dashed</b> grey chip with a minus — never a hidden gap. Covered gets a solid green chip and a check. The app says what it did."],
];

card("foundations/brand.html", {
  group: "Brand", name: "Principles", subtitle: "8 rules the app is actually built on",
  width: 1040, height: 1180,
  lede: "MastersFit is a training companion for masters-age lifters (40+). The visual system is deliberately quiet, achromatic by default, and high-contrast — the product's personality comes from precision and honesty, not decoration. These eight rules are extracted from the design decisions recorded in the codebase (the MF-### series), not invented for this document.",
  css: `.pr{display:grid;grid-template-columns:34px 1fr;gap:18px;padding:18px 0;border-bottom:1px solid ${P.neutral.light[2]}}
  .pr:last-child{border-bottom:0}
  .n{font-size:13px;font-weight:700;color:${P.neutral.medium[3]};padding-top:2px}
  .pt{font-size:17px;font-weight:700;margin:0 0 5px;letter-spacing:-.01em}
  .pb{font-size:14.5px;color:${P.text.secondary};margin:0;max-width:72ch}
  .ref{font-family:ui-monospace,Menlo,monospace;font-size:11px;color:${P.neutral.medium[3]};
       margin-left:10px;font-weight:600;letter-spacing:.02em}`,
  body: `<h2>Voice</h2>
  <div class="rule"><b>Plain, concrete, never hype.</b> "End now to save progress and mark the workout as done." — not "Awesome work, champion!" Numbers are stated, not celebrated. The one permitted flourish is the 🔥 streak emoji, which carries the warmth so the palette doesn't have to.</div>
  <div class="rule"><b>Irreversible actions are spelled out.</b> Destructive paths use the <code>danger</code> token and, where truly unrecoverable, a type-to-confirm gate.</div>
  <h2>Operating principles</h2>
  ${PRINCIPLES.map(([t, ref, b], i) => `<div class="pr"><div class="n">${String(i + 1).padStart(2, "0")}</div>
    <div><p class="pt">${t}<span class="ref">${ref}</span></p><p class="pb">${b}</p></div></div>`).join("\n")}`,
});

// =========================================================================
// COLOR — theme families
// =========================================================================
const swatchRow = (label, pal) => {
  const r = resolve(pal);
  const keys = [
    ["background", r.background], ["surface", r.surface], ["card", r.card],
    ["primary", r.brand.primary], ["on-primary", r.contentOnPrimary],
    ["text.primary", r.text.primary], ["text.secondary", r.text.secondary], ["text.muted", r.text.muted],
    ["line", r.neutral.medium[1]], ["danger", r.danger], ["warning", r.warning], ["success", r.success],
  ];
  return `<div class="tf">
    <div class="tfl">${label}</div>
    <div class="sw">${keys.map(([k, v]) =>
      `<div class="s"><div class="chip" style="background:${v}"></div><div class="sk">${k}</div><div class="sv mono">${v}</div></div>`).join("")}</div>
  </div>`;
};

card("foundations/color-themes.html", {
  group: "Color", name: "Theme families", subtitle: "5 families × light/dark = 10 variants",
  width: 1180, height: 1560,
  lede: "Every screen renders through CSS variables set by NativeWind's vars(), so all ten variants are the same components with a different palette bound. Original is achromatic — near-black ink on white — and the four alternates are low-chroma tints. None is a saturated brand colour; the system leans on contrast and tone, not hue.",
  css: `.tf{margin:0 0 26px}
  .tfl{font-size:15px;font-weight:700;margin:0 0 12px}
  .sw{display:grid;grid-template-columns:repeat(12,1fr);gap:8px}
  .s{min-width:0}
  .chip{height:54px;border-radius:8px;border:1px solid rgba(0,0,0,.12);margin-bottom:6px}
  .sk{font-size:10.5px;font-weight:600;color:${P.text.secondary};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sv{font-size:10px;color:${P.neutral.medium[3]}}`,
  body: THEMES.map(([name, key, light, dark]) =>
    `<h2>${name} <span style="text-transform:none;letter-spacing:0;font-weight:500">— <code>${key}</code></span></h2>
     ${swatchRow(`${name} · light`, light)}
     ${swatchRow(`${name} · dark`, dark)}`).join("\n") +
    `<p class="note"><b>Note for anyone reading the source:</b> <code>lib/theme.ts</code> still labels the default family “Original (Lime Green)”. It isn't — the values are a monochrome ink ramp. The comment is stale; the palette above is what ships.</p>`,
});

// =========================================================================
// COLOR — semantic roles
// =========================================================================
const ROLES = [
  ["background", "The page itself. Nothing else.", P.background, D.background],
  ["surface", "One step up from the page: cards, sheets, icon-button grounds.", P.surface, D.surface],
  ["card", "Elevated card fill. Resolves to neutral.light[2] because surface used to equal background.", P.card, D.card],
  ["primary", "The single filled action per screen, and the active-tab tint. Rationed.", P.brand.primary, D.brand.primary],
  ["content-on-primary", "Text/glyphs sitting ON primary. Always pair these two.", P.contentOnPrimary, D.contentOnPrimary],
  ["text.primary", "Headings, values, anything the user reads to decide.", P.text.primary, D.text.primary],
  ["text.secondary", "Body copy, descriptions, chip labels.", P.text.secondary, D.text.secondary],
  ["text.muted", "Labels, captions, inactive tabs. AA-checked — was raised from #686868.", P.text.muted, D.text.muted],
  ["danger", "Destructive actions and errors only. Never a generic accent.", P.danger, D.danger],
  ["warning", "Caution states. Darkened in light themes to clear AA on white.", P.warning, D.warning],
  ["success", "Reserved completion green. Decoupled from primary so 'done' is distinguishable without reading it.", P.success, D.success],
];

const contrastRows = THEMES.map(([name, , l, d]) => {
  const L = resolve(l), Dk = resolve(d);
  const cells = [
    ["text.primary", cr(L.text.primary, L.background), cr(Dk.text.primary, Dk.background)],
    ["text.secondary", cr(L.text.secondary, L.background), cr(Dk.text.secondary, Dk.background)],
    ["text.muted", cr(L.text.muted, L.background), cr(Dk.text.muted, Dk.background)],
    ["on-primary / primary", cr(L.contentOnPrimary, L.brand.primary), cr(Dk.contentOnPrimary, Dk.brand.primary)],
    ["success / background", cr(L.success, L.background), cr(Dk.success, Dk.background)],
  ];
  return `<tr><td style="font-weight:600">${name}</td>${cells.map(([, a, b]) =>
    `<td><span class="pill ${+a >= 4.5 ? "pass" : "fail"}">${a}</span> <span class="mono" style="color:${P.neutral.medium[3]}">/</span> <span class="pill ${+b >= 4.5 ? "pass" : "fail"}">${b}</span></td>`).join("")}</tr>`;
}).join("\n");

card("foundations/semantic-roles.html", {
  group: "Color", name: "Semantic roles", subtitle: "What each token is for + AA contrast per theme",
  width: 1120, height: 1200,
  lede: "Components never reference a palette step directly — they use these roles, so all ten themes stay correct for free. The two hard pairings: content-on-primary always sits on primary, and the layering order is background → surface → card, never reversed.",
  css: `.dot{width:26px;height:26px;border-radius:6px;border:1px solid rgba(128,128,128,.35);display:inline-block;vertical-align:middle}
  td .mono{color:${P.neutral.medium[3]}}`,
  body: `<h2>Roles</h2>
  <table><thead><tr><th>Token</th><th style="width:74px">Light</th><th style="width:74px">Dark</th><th>Used for</th></tr></thead><tbody>
  ${ROLES.map(([k, use, l, d]) => `<tr>
    <td><code>${k}</code></td>
    <td><span class="dot" style="background:${l}"></span><div class="mono" style="font-size:10px;color:${P.neutral.medium[3]};margin-top:3px">${l}</div></td>
    <td><span class="dot" style="background:${d}"></span><div class="mono" style="font-size:10px;color:${P.neutral.medium[3]};margin-top:3px">${d}</div></td>
    <td>${use}</td></tr>`).join("")}
  </tbody></table>
  <h2>Contrast against background — light / dark</h2>
  <table><thead><tr><th>Theme</th><th>text.primary</th><th>text.secondary</th><th>text.muted</th><th>on-primary</th><th>success</th></tr></thead>
  <tbody>${contrastRows}</tbody></table>
  <p class="note">Computed from the live token values at build time. Everything shown must clear <b>4.5:1</b> (WCAG AA, normal text). Any red cell is a regression, not a style choice.</p>
  <div class="rule" style="border-left-color:${P.danger}"><b>Three cells are red today, and they share one cause.</b>
  Only the Original family defines <code>success</code>; the other four fall back to <code>brand.primary</code>, which is a mid-tone tint chosen to sit <i>behind</i> white text, not to <i>be</i> text. Wherever success is used as a foreground — the MuscleCoverageChip's green border, check and label — it lands at 4.10:1 (Steel Blue light) and 3.84:1 (Dusty Sage light).
  Separately, Dusty Sage's own primary is light enough that white on it reads 4.23:1, so <b>every filled button in that theme</b> is marginally under AA.
  The fix is one line each: give the four alternate families an explicit darker <code>success</code>, and darken Dusty Sage's light <code>brand.primary</code> to roughly <code>#61735E</code>. Until then, don't design a light-theme surface that depends on green-on-background text.</div>
  <div class="rule"><b>The layering rule.</b> A card must never equal the page. In light themes the card steps toward grey; in dark themes it steps toward white. Elevation reads as <i>lighter</i> in dark mode — going darker made every card black-on-black.</div>`,
});

// =========================================================================
// TYPE
// =========================================================================
const FS = T.typography.fontSize;
const TEXT_VARIANTS = [
  ["h1 / h2 / h3", "xl 20px", 700, P.text.primary, "Screen and section headings. All three map to the same size today — a known flattening, not a scale."],
  ["h4 / title", "xl 20px", 600, P.text.primary, "Card and dialog titles."],
  ["subtitle", "base 16px", 500, P.text.secondary, "One-line context under a title."],
  ["body", "base 16px", 400, P.text.primary, "Default reading text."],
  ["bodySmall", "sm 14px", 400, P.text.primary, "Dense rows, list secondary lines."],
  ["label", "base 16px", 500, P.text.secondary, "Form labels."],
  ["caption", "sm 14px", 400, P.text.muted, "Metadata, timestamps, helper text."],
];

card("foundations/typography.html", {
  group: "Type", name: "Typography", subtitle: "Manrope · 8-step scale · raised floor",
  width: 1000, height: 1080,
  lede: "One family, four weights, eight sizes. The scale's floor was deliberately raised for a masters-age audience — 11px and 13px body text were removed from the system entirely.",
  css: `.spec{display:flex;align-items:baseline;gap:20px;padding:14px 0;border-bottom:1px solid ${P.neutral.light[2]}}
  .spec .k{width:150px;flex:none;font-family:ui-monospace,Menlo,monospace;font-size:12px;color:${P.text.muted}}
  .wt{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
  .wt div{padding:16px;background:${P.neutral.light[2]};border-radius:10px}
  .wt .l{font-size:11.5px;color:${P.text.muted};font-weight:600;letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px}
  .wt .d{font-size:22px;letter-spacing:-.01em}`,
  body: `<h2>Family</h2>
  <p style="font-size:15px;color:${P.text.secondary};margin:0 0 16px">
    <b>Manrope</b>, loaded via <code>@expo-google-fonts/manrope</code>. Fallback stack: <code>System → Arial → sans-serif</code>.</p>
  <div class="wt">
    ${[["Regular", 400], ["Medium", 500], ["SemiBold", 600], ["Bold", 700]].map(([n, w]) =>
      `<div><div class="l">${n} · ${w}</div><div class="d" style="font-weight:${w}">Squat 3×5</div></div>`).join("")}
  </div>
  <h2>Scale</h2>
  ${Object.entries(FS).map(([k, v]) =>
    `<div class="spec"><div class="k">${k} · ${v}px</div>
     <div style="font-size:${v}px;font-weight:${v >= 20 ? 700 : 400};letter-spacing:${v >= 24 ? "-.02em" : "-.005em"}">Front Squat — 4 sets</div></div>`).join("")}
  <div class="rule"><b>The floor is not negotiable.</b> <code>xs</code> went 11→13, <code>sm</code> 13→14, <code>base</code> 15→16. If a design needs 11px to fit, the layout is wrong, not the type.</div>
  <h2>Line height</h2>
  <p style="font-size:15px;color:${P.text.secondary};margin:0">
    ${Object.entries(T.typography.lineHeight).map(([k, v]) => `<code>${k}</code> ${v}`).join(" &nbsp;·&nbsp; ")}</p>
  <h2>Text variants</h2>
  <table><thead><tr><th>Variant</th><th>Size</th><th>Weight</th><th>Preview</th><th>Use</th></tr></thead><tbody>
  ${TEXT_VARIANTS.map(([n, s, w, c, u]) => `<tr><td><code>${n}</code></td><td>${s}</td><td>${w}</td>
    <td style="color:${c};font-weight:${w};font-size:${s.includes("20") ? 20 : s.includes("14") ? 14 : 16}px;white-space:nowrap">Rest day</td>
    <td style="font-size:13.5px;color:${P.text.secondary}">${u}</td></tr>`).join("")}
  </tbody></table>`,
});

// =========================================================================
// SPACING / RADIUS / ELEVATION
// =========================================================================
const shadowCss = (s) => `0 ${s.shadowOffset.height}px ${s.shadowRadius}px rgba(0,0,0,${s.shadowOpacity})`;

card("foundations/spacing.html", {
  group: "Spacing", name: "Space, radius & elevation", subtitle: "4pt spacing · 7 radii · RN-safe shadows",
  width: 1000, height: 1000,
  lede: "A 4pt base grid, a radius ramp that tops out in a full pill, and shadows authored as React Native shadow objects (with an Android elevation twin) rather than CSS. Plus the one measurement that overrides all of them: the 44px touch target.",
  css: `.sp{display:flex;align-items:center;gap:16px;padding:9px 0}
  .sp .k{width:120px;font-family:ui-monospace,Menlo,monospace;font-size:12px;color:${P.text.muted};flex:none}
  .bar{height:22px;background:${P.brand.primary};border-radius:3px}
  .rd{display:grid;grid-template-columns:repeat(7,1fr);gap:14px;text-align:center}
  .rd .b{height:76px;background:${P.neutral.light[2]};border:1px solid ${P.neutral.medium[1]};margin-bottom:8px}
  .rd .k{font-family:ui-monospace,Menlo,monospace;font-size:11.5px;color:${P.text.muted}}
  .sh{display:grid;grid-template-columns:repeat(5,1fr);gap:20px;text-align:center}
  .sh .b{height:74px;background:#fff;border-radius:12px;margin-bottom:10px}
  .tt{display:flex;align-items:center;gap:24px;flex-wrap:wrap}
  .tgt{width:44px;height:44px;border-radius:999px;background:${P.surface};border:1px dashed ${P.neutral.medium[2]};
       display:flex;align-items:center;justify-content:center;color:${P.text.primary};font-size:20px}`,
  body: `<h2>Spacing</h2>
  ${Object.entries(T.spacing).map(([k, v]) =>
    `<div class="sp"><div class="k">${k} · ${v}px</div><div class="bar" style="width:${v}px"></div></div>`).join("")}
  <p class="note">Card and dialog padding is <code>md</code> (16px) and <code>lg</code>/24px respectively; screen gutters are 20–24px.</p>
  <h2>Border radius</h2>
  <div class="rd">${Object.entries(T.borderRadius).map(([k, v]) =>
    `<div><div class="b" style="border-radius:${v > 100 ? 999 : v}px"></div><div class="k">${k}<br>${v > 100 ? "full" : v + "px"}</div></div>`).join("")}</div>
  <p class="note"><code>sm</code> 8px = buttons · <code>md</code> 12px = cards · <code>xl</code>/<code>2xl</code> = dialogs & sheets · <code>full</code> = chips, pills, icon buttons.</p>
  <h2>Elevation</h2>
  <div class="stage"><div class="sh">${["sm", "md", "lg", "card", "cardHover"].map((k) =>
    `<div><div class="b" style="box-shadow:${shadowCss(T.shadows[k])}"></div><div class="k mono" style="font-size:11.5px;color:${P.text.muted}">${k}<br>elev ${T.shadows[k].elevation}</div></div>`).join("")}</div></div>
  <div class="rule"><b>Shadow, not fill, is what lifts a pill.</b> Because <code>surface</code> can equal <code>background</code> in dark themes, floating chips (streak, stat pills) separate themselves with the lifted-pill shadow — <code>0 1px 3px rgba(0,0,0,.10)</code>, elevation 2 — so they read identically in all ten variants.</div>
  <h2>Touch target</h2>
  <div class="stage"><div class="tt">
    <div class="tgt">🔍</div><div class="tgt">👤</div><div class="tgt">✕</div>
    <div style="font-size:14.5px;color:${P.text.secondary};max-width:46ch">
      <b>44×44 minimum, no exceptions.</b> The glyph inside is usually 20px; the target is not. Icon buttons additionally carry <code>hitSlop</code> of 8px on all sides, and every button's base class includes <code>min-h-[44px]</code>.</div>
  </div></div>`,
});

// =========================================================================
// COMPONENTS — buttons
// =========================================================================
const BTN = `.btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;
  border-radius:8px;font-family:inherit;font-weight:600;border:1px solid transparent;cursor:default;white-space:nowrap}
  .btn.sm{padding:8px 12px;font-size:14px}
  .btn.md{padding:12px 16px;font-size:16px}
  .btn.lg{padding:16px 24px;font-size:17px}
  .primary{background:var(--primary);color:var(--on-primary)}
  .secondary{background:var(--l-2);color:var(--ink)}
  .outline{background:transparent;border-color:var(--primary);color:var(--primary)}
  .ghost{background:transparent;color:var(--primary)}
  .destructive{background:var(--danger);color:var(--white)}
  .dis{opacity:.6}`;

card("components/buttons.html", {
  group: "Components", name: "Button", subtitle: "5 variants × 3 sizes, light + dark",
  width: 1000, height: 880,
  lede: "One Button component, five variants. The rule that governs their use is scarcity: a screen gets exactly one primary. Everything else is outline or ghost. Destructive is wired to the semantic danger token — it was once wrongly mapped to the inverted brand colour, which made 'Abandon Workout' look like an ordinary dark button.",
  css: BTN + `
  .lbl{width:96px;font-size:12px;font-family:ui-monospace,Menlo,monospace;color:var(--muted);flex:none}
  .r{display:flex;align-items:center;gap:12px;padding:10px 0;flex-wrap:wrap}
  .spin{width:18px;height:18px;border-radius:999px;border:2px solid currentColor;border-top-color:transparent;opacity:.9}`,
  body: `<h2>Variants — light</h2>
  <div class="stage">
    ${["primary", "secondary", "outline", "ghost", "destructive"].map((v) =>
      `<div class="r"><div class="lbl">${v}</div>
       <button class="btn sm ${v}">Small</button>
       <button class="btn md ${v}">Start Workout</button>
       <button class="btn lg ${v}">Large action</button>
       <button class="btn md ${v} dis">Disabled</button></div>`).join("")}
  </div>
  <h2>Variants — dark</h2>
  <div class="stage on-dark">
    ${["primary", "secondary", "outline", "ghost", "destructive"].map((v) =>
      `<div class="r"><div class="lbl">${v}</div>
       <button class="btn sm ${v}">Small</button>
       <button class="btn md ${v}">Start Workout</button>
       <button class="btn lg ${v}">Large action</button>
       <button class="btn md ${v} dis">Disabled</button></div>`).join("")}
  </div>
  <h2>States</h2>
  <div class="stage"><div class="r">
    <button class="btn md primary">Default</button>
    <button class="btn md primary dis"><span class="spin"></span></button>
    <button class="btn md primary dis">Disabled</button>
  </div>
  <p class="note">Loading swaps the label for a spinner and sets <code>accessibilityState.busy</code>; both loading and disabled drop opacity to 60% and block the press. Icons may be slotted left or right of the label.</p></div>
  <h2>Anatomy</h2>
  <table><thead><tr><th>Prop</th><th>Values</th><th>Notes</th></tr></thead><tbody>
    <tr><td><code>variant</code></td><td>primary · secondary · outline · ghost · destructive</td><td>Default <code>primary</code>. One per screen.</td></tr>
    <tr><td><code>size</code></td><td>sm · md · lg</td><td>Padding only — the 44px min-height is constant.</td></tr>
    <tr><td><code>loading</code></td><td>boolean</td><td>Spinner tints to on-primary for filled variants, primary otherwise.</td></tr>
    <tr><td><code>fullWidth</code></td><td>boolean</td><td>Bottom action bars use this.</td></tr>
    <tr><td><code>leftIcon</code> / <code>rightIcon</code></td><td>node</td><td>Rendered inline with the label.</td></tr>
  </tbody></table>`,
});

// =========================================================================
// COMPONENTS — icon button
// =========================================================================
card("components/icon-button.html", {
  group: "Components", name: "IconButton", subtitle: "surface · ghost · primary — 44×44, label required",
  width: 920, height: 620,
  lede: "The accessible replacement for the ad-hoc w-10 h-10 TouchableOpacity + Ionicons pattern that used to be scattered across the header, search, workout and calendar surfaces. The 44×44 target is fixed regardless of glyph size, and accessibilityLabel is a required prop — an unlabelled icon button cannot be written.",
  css: `.ib{width:44px;height:44px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;
    font-size:19px;border:1px solid transparent}
  .ib.surface{background:var(--surface);color:var(--ink)}
  .ib.ghost{background:transparent;color:var(--ink)}
  .ib.primary{background:var(--primary);color:var(--on-primary)}
  .ib.dis{opacity:.4}
  .r{display:flex;align-items:center;gap:14px;padding:10px 0}
  .lbl{width:96px;font-size:12px;font-family:ui-monospace,Menlo,monospace;color:var(--muted);flex:none}
  .box{position:relative;display:inline-block}
  .slop{position:absolute;inset:-8px;border:1px dashed ${P.neutral.medium[2]};border-radius:999px}`,
  body: `<h2>Variants</h2>
  <div class="grid2">
    <div class="stage">
      <p class="cap">Light</p>
      ${["surface", "ghost", "primary"].map((v) =>
        `<div class="r"><div class="lbl">${v}</div>
         <span class="ib ${v}">🔍</span><span class="ib ${v}">👤</span><span class="ib ${v}">✕</span>
         <span class="ib ${v} dis">🔍</span></div>`).join("")}
    </div>
    <div class="stage on-dark">
      <p class="cap">Dark</p>
      ${["surface", "ghost", "primary"].map((v) =>
        `<div class="r"><div class="lbl">${v}</div>
         <span class="ib ${v}">🔍</span><span class="ib ${v}">👤</span><span class="ib ${v}">✕</span>
         <span class="ib ${v} dis">🔍</span></div>`).join("")}
    </div>
  </div>
  <h2>Target &amp; hit slop</h2>
  <div class="stage" style="display:flex;align-items:center;gap:34px">
    <span class="box"><span class="slop"></span><span class="ib surface">🔍</span></span>
    <div style="font-size:14.5px;color:var(--ink-2);max-width:52ch">
      Solid ring = the 44×44 target. Dashed ring = the extra 8px <code>hitSlop</code> on every side, giving a 60×60 effective area for a 20px glyph. A caller's <code>className</code> is <i>appended</i>, never substituted, so a layout tweak like <code>mr-1</code> can't wipe the target.</div>
  </div>
  <div class="rule"><b>Required:</b> <code>accessibilityLabel</code>. Icon-only controls have no text, so this is the only thing VoiceOver and TalkBack can announce.</div>`,
});

// =========================================================================
// COMPONENTS — cards
// =========================================================================
card("components/cards.html", {
  group: "Components", name: "Card", subtitle: "default · outlined · flat + header/content/footer",
  width: 1000, height: 760,
  lede: "Cards are the app's primary container: workout blocks, dashboard analytics, settings rows. They sit on surface, round at md (12px), and clip their children. The header/content/footer sub-components exist so padding never gets hand-rolled per card.",
  css: `.card{background:var(--surface);border-radius:12px;overflow:hidden}
  .card.outlined{border:1px solid var(--line-2)}
  .card .hd{display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid var(--l-1)}
  .card .ct{padding:16px}
  .card .ft{padding:16px;border-top:1px solid var(--l-1)}
  .t{font-size:16px;font-weight:700;color:var(--ink);margin:0}
  .s{font-size:14px;color:var(--muted);margin:4px 0 0}
  .b{font-size:15px;color:var(--ink-2);margin:0}
  .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .mini{font-size:13px;color:var(--muted)}`,
  body: `<h2>Variants</h2>
  <div class="grid2">
    <div class="stage"><p class="cap">Light</p><div class="g3">
      ${[["default", ""], ["outlined", "outlined"], ["flat", ""]].map(([n, c]) =>
        `<div class="card ${c}"><div class="ct"><p class="t">${n}</p><p class="s">bg-surface · rounded-md</p></div></div>`).join("")}
    </div></div>
    <div class="stage on-dark"><p class="cap">Dark</p><div class="g3">
      ${[["default", ""], ["outlined", "outlined"], ["flat", ""]].map(([n, c]) =>
        `<div class="card ${c}"><div class="ct"><p class="t">${n}</p><p class="s">bg-surface · rounded-md</p></div></div>`).join("")}
    </div></div>
  </div>
  <h2>Composed — header / content / footer</h2>
  <div class="stage" style="max-width:460px">
    <div class="card outlined">
      <div class="hd"><div><p class="t">Upper Body — Push</p><p class="s">Block 2 of 3 · 24 min</p></div>
        <span style="font-size:13px;font-weight:700;color:var(--success)">3/5</span></div>
      <div class="ct"><p class="b">Incline Dumbbell Press<br><span class="mini">4 sets · 8–10 reps · 40 lb</span></p></div>
      <div class="ft"><span class="mini">Last done 6 days ago</span></div>
    </div>
  </div>
  <p class="note"><code>flat</code> and <code>default</code> are currently identical in the implementation — <code>flat</code> is reserved for a shadowless card once elevation lands on <code>default</code>. Treat them as one until then.</p>`,
});

// =========================================================================
// COMPONENTS — chips & pills
// =========================================================================
card("components/chips-and-pills.html", {
  group: "Components", name: "Chips & pills", subtitle: "Outline · muscle coverage · stat · streak",
  width: 1000, height: 860,
  lede: "This family carries the single most important rule in the system: data wears an outline, actions wear ink. Informational chips — muscle groups, equipment, counts — are outline-only. The coverage chip goes further and uses a dashed border to admit a gap a swap created.",
  css: `.chip{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:6px 12px;
    font-size:13px;font-weight:600;margin:0 8px 8px 0}
  .outline{border:1px solid var(--line);color:var(--ink-2)}
  .cov{border:1px solid var(--success);color:var(--success)}
  .gap{border:1px dashed #9E9E9E;color:var(--muted)}
  .ink{border:1px solid transparent;background:var(--primary);color:var(--on-primary)}
  .pill{display:inline-flex;align-items:center;gap:8px;border-radius:999px;background:var(--white);
    padding:6px 12px;font-size:14px;box-shadow:0 1px 3px rgba(0,0,0,.10);margin:0 10px 10px 0}
  .pill .l{color:var(--muted)} .pill .v{color:var(--ink);font-weight:600}
  .x{position:relative;padding-left:26px}
  .x:before{content:"✕";position:absolute;left:0;top:-1px;color:${P.danger};font-weight:700}
  .ok{position:relative;padding-left:26px}
  .ok:before{content:"✓";position:absolute;left:0;top:-1px;color:${P.success};font-weight:700}`,
  body: `<h2>OutlineChip — the default for data</h2>
  <div class="grid2">
    <div class="stage"><p class="cap">Light</p>
      ${["Chest", "Triceps", "Front delts", "Dumbbells", "Bench", "12 exercises"].map((l) => `<span class="chip outline">${l}</span>`).join("")}</div>
    <div class="stage on-dark"><p class="cap">Dark</p>
      ${["Chest", "Triceps", "Front delts", "Dumbbells", "Bench", "12 exercises"].map((l) => `<span class="chip outline">${l}</span>`).join("")}</div>
  </div>
  <div class="stage" style="margin-top:18px">
    <p class="ok" style="margin:0 0 10px;font-size:14.5px;color:var(--ink-2)"><b>Do</b> — muscle groups, equipment and counts read as outline pills. They are facts, not buttons.</p>
    <p class="x" style="margin:0;font-size:14.5px;color:var(--ink-2)"><b>Don't</b> — <span class="chip ink" style="margin:0 4px">Chest</span> solid ink on data. Ink is reserved for the one primary action on the screen; users tap what looks tappable.</p>
  </div>
  <h2>MuscleCoverageChip — the trust component</h2>
  <div class="stage">
    <p class="cap">Replacement covers these muscles from the original</p>
    <span class="chip cov">✓ Chest</span><span class="chip cov">✓ Triceps</span>
    <span class="chip gap">− Front delts</span><span class="chip gap">− Serratus</span>
    <p class="note" style="margin-top:12px">Solid green + check = covered. <b>Dashed</b> grey + minus = the swap does not train it. The dashed chip is how the app admits what a substitution loses — never hide a gap.</p>
  </div>
  <h2>StatPill &amp; StreakChip</h2>
  <div class="grid2">
    <div class="stage"><p class="cap">Light</p>
      <span class="pill">🔥 <span class="l">Streak</span> <span class="v">5 days</span></span>
      <span class="pill"><span class="l">Volume</span> <span class="v">12,400 lb</span></span>
      <span class="pill">🔥 <span class="v">5</span></span></div>
    <div class="stage on-dark"><p class="cap">Dark</p>
      <span class="pill">🔥 <span class="l">Streak</span> <span class="v">5 days</span></span>
      <span class="pill"><span class="l">Volume</span> <span class="v">12,400 lb</span></span>
      <span class="pill">🔥 <span class="v">5</span></span></div>
  </div>
  <p class="note">These sit on <code>neutral.white</code> and are separated from the page by the <b>lifted-pill shadow</b>, not by a fill or a border — so they read correctly even in dark themes where surface equals background. The warmth is carried by the 🔥 glyph, which is why the chip looks right in all ten palettes.</p>`,
});

// =========================================================================
// COMPONENTS — segmented control
// =========================================================================
card("components/segmented-control.html", {
  group: "Components", name: "SegmentedControl", subtitle: "One selected segment · label + optional sublabel",
  width: 940, height: 640,
  lede: "A pill row where exactly one segment is selected. It replaced five hand-rolled copies across the dashboard analytics cards — and that duplication is exactly what let a filter offer 6M and 1Y while the data layer silently fell back to 30 days.",
  css: `.seg{display:flex;background:var(--l-2);border-radius:16px;padding:4px;gap:2px;max-width:420px}
  .seg > div{flex:1;min-height:44px;display:flex;flex-direction:column;align-items:center;justify-content:center;
    border-radius:12px;font-size:13px;font-weight:500;color:var(--muted);padding:4px 12px;text-align:center}
  .seg .on{background:var(--primary);color:var(--on-primary)}
  .seg .sub{font-size:12px;margin-top:2px;opacity:.9}`,
  body: `<h2>Time range — dashboard analytics</h2>
  <div class="grid2">
    <div class="stage"><p class="cap">Light</p>
      <div class="seg"><div class="on">1W</div><div>1M</div><div>3M</div><div>6M</div><div>1Y</div></div></div>
    <div class="stage on-dark"><p class="cap">Dark</p>
      <div class="seg"><div class="on">1W</div><div>1M</div><div>3M</div><div>6M</div><div>1Y</div></div></div>
  </div>
  <h2>With sublabels</h2>
  <div class="stage">
    <div class="seg" style="max-width:340px">
      <div class="on">Single Day<div class="sub">Today only</div></div>
      <div>Rest of Week<div class="sub">Thu–Sun</div></div>
    </div>
  </div>
  <div class="rule"><b>Only offer ranges the data layer honours.</b> The control takes a <code>supportedRanges</code> prop for exactly this reason — a card renders the subset it can actually filter, rather than every enum value.</div>
  <div class="rule"><b>Selection is not colour.</b> Each segment carries <code>accessibilityState.selected</code> so the choice is announced, and the group is a <code>tablist</code>. Every segment is 44px tall regardless of whether it has a sublabel.</div>`,
});

// =========================================================================
// COMPONENTS — dialog
// =========================================================================
card("components/dialog.html", {
  group: "Components", name: "CustomDialog", subtitle: "1–3 buttons · icon · type-to-confirm gate",
  width: 1040, height: 900,
  lede: "The app's only modal decision surface. Buttons stack vertically in strict priority order — primary on top, tertiary in the middle, destructive last — so the safe choice is nearest the thumb and the irreversible one is furthest from it.",
  css: `.dlg{background:var(--surface);border:1px solid var(--line);border-radius:24px;padding:24px;max-width:340px;
    text-align:center;box-shadow:0 12px 30px rgba(0,0,0,.22);margin:0 auto}
  .dlg .ic{width:64px;height:64px;border-radius:999px;margin:0 auto 16px;display:flex;align-items:center;
    justify-content:center;font-size:30px;background:color-mix(in srgb, var(--primary) 10%, transparent)}
  .dlg h3{font-size:20px;font-weight:700;color:var(--ink);margin:0 0 8px}
  .dlg p{font-size:16px;color:var(--ink-2);margin:0 0 24px;line-height:1.5}
  .db{display:block;width:100%;min-height:44px;border-radius:12px;padding:12px 24px;font-size:16px;
    font-weight:600;font-family:inherit;border:1px solid transparent;margin-bottom:8px}
  .db.p{background:var(--primary);color:var(--on-primary)}
  .db.t{background:var(--l-2);border-color:var(--line);color:var(--ink-2)}
  .db.d{background:transparent;color:var(--danger)}
  .db.off{opacity:.5}
  .inp{width:100%;border:1px solid var(--line);border-radius:12px;padding:12px 16px;font-size:16px;
    background:var(--l-2);color:var(--muted);text-align:left;font-family:inherit;margin-bottom:20px}
  .hint{font-size:14px;color:var(--muted);margin:0 0 8px !important}
  .back{background:rgba(0,0,0,.5);border-radius:16px;padding:34px 20px}
  .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}`,
  body: `<h2>Button counts</h2>
  <div class="g3">
    <div class="back"><div class="dlg">
      <div class="ic">✓</div><h3>Workout Complete</h3><p>Nice work — 42 minutes, 18 sets logged.</p>
      <button class="db p">Done</button></div></div>
    <div class="back"><div class="dlg">
      <div class="ic">⚠️</div><h3>Leave Workout?</h3><p>Your progress so far is saved.</p>
      <button class="db p">Continue Workout</button><button class="db d">Abandon Workout</button></div></div>
    <div class="back"><div class="dlg">
      <div class="ic">⚠️</div><h3>Workout In Progress</h3><p>End now to save progress and mark the workout as done.</p>
      <button class="db p">Continue Workout</button>
      <button class="db t">Finish &amp; Save Progress</button>
      <button class="db d">Abandon Workout</button></div></div>
  </div>
  <h2>Type-to-confirm — irreversible actions</h2>
  <div class="back" style="max-width:400px"><div class="dlg">
    <div class="ic">⚠️</div><h3>Delete Account</h3>
    <p>This removes every workout, log and plan. It cannot be undone.</p>
    <p class="hint">Type <b style="color:var(--ink)">DELETE</b> to confirm</p>
    <div class="inp">DELETE</div>
    <button class="db p off">Delete Account</button>
    <button class="db t">Cancel</button></div></div>
  <p class="note">The dialog owns the input state and clears it on every open and close, so a previous attempt can never leave the primary button pre-enabled. Matching is case-insensitive and trimmed.</p>
  <div class="rule"><b>Order is fixed:</b> primary (safe) → tertiary (middle path) → destructive (last). Backdrop tap dismisses by default; pass <code>dismissOnBackdropPress={false}</code> for decisions that must be made.</div>
  <div class="rule"><b>iOS sequencing.</b> <code>onDismiss</code> fires after the dismiss animation so a follow-up modal isn't triggered in the same tick — iOS drops that and leaves an orphaned sheet.</div>`,
});

// =========================================================================
// COMPONENTS — navigation
// =========================================================================
card("components/navigation.html", {
  group: "Components", name: "Navigation", subtitle: "Header + 3-tab bar",
  width: 1000, height: 780,
  lede: "Three tabs — Dashboard, Workout, Calendar — mapped to the three things a user actually does. The header carries a greeting or a title, a one-line subtitle, and at most two icon actions plus the streak chip.",
  css: `.phone{width:340px;background:var(--bg);border:1px solid var(--line);border-radius:26px;overflow:hidden}
  .hdr{display:flex;align-items:flex-start;justify-content:space-between;padding:14px 20px 16px;gap:12px}
  .hdr .t{font-size:17px;font-weight:700;color:var(--ink);margin:0}
  .hdr .s{font-size:14px;color:var(--muted);margin:4px 0 0}
  .acts{display:flex;align-items:center;gap:8px;flex:none}
  .ib{width:44px;height:44px;border-radius:999px;background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:18px}
  .sc{display:inline-flex;align-items:center;gap:5px;background:var(--white);border-radius:999px;
    padding:6px 12px 6px 10px;font-size:14px;font-weight:700;color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.10)}
  .body{height:150px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:13px}
  .prog{height:6px;background:var(--l-2);margin:0 20px 14px;border-radius:999px;overflow:hidden}
  .prog > div{height:100%;width:56%;background:var(--primary)}
  .tabs{display:flex;border-top:1px solid var(--line);height:68px;padding-top:6px;padding-bottom:8px;background:var(--bg)}
  .tab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
    font-size:11px;font-weight:600;color:var(--muted)}
  .tab .gl{font-size:24px;line-height:1}
  .tab.on{color:var(--primary)}
  .pair{display:flex;gap:26px;flex-wrap:wrap;align-items:flex-start}`,
  body: `<h2>Header + tab bar</h2>
  <div class="stage"><div class="pair">
    <div class="phone">
      <div class="hdr"><div><p class="t">Hey Rich!</p><p class="s">Friday, September 12</p></div>
        <div class="acts"><span class="sc">🔥 5</span><span class="ib">🔍</span><span class="ib">👤</span></div></div>
      <div class="body">Dashboard</div>
      <div class="tabs">
        <div class="tab on"><span class="gl">📊</span>Dashboard</div>
        <div class="tab"><span class="gl">🏋️</span>Workout</div>
        <div class="tab"><span class="gl">📅</span>Calendar</div></div>
    </div>
    <div class="phone">
      <div class="hdr"><div><p class="t">Upper Body — Push</p><p class="s">Exercise 3 of 8</p></div>
        <div class="acts"><span class="sc">24:16</span></div></div>
      <div class="prog"><div></div></div>
      <div class="body">Active workout</div>
      <div class="tabs">
        <div class="tab"><span class="gl">📊</span>Dashboard</div>
        <div class="tab on"><span class="gl">🏋️</span>Workout</div>
        <div class="tab"><span class="gl">📅</span>Calendar</div></div>
    </div>
  </div></div>
  <h2>Rules</h2>
  <div class="rule"><b>Active tab is a filled glyph; inactive is the outline variant.</b> The tint alone is not the cue — the icon itself changes shape, so the active tab reads even where the tint step is hard to discriminate.</div>
  <div class="rule"><b>Inactive tint is <code>text.muted</code>, not <code>neutral.medium[3]</code>.</b> The latter failed AA at ~3.7:1 on dark backgrounds; the tab bar was the last place still using it.</div>
  <div class="rule"><b>During an active workout, tabs guard rather than block.</b> Tapping away opens the three-way dialog (continue / finish &amp; save / abandon). Tapping the <i>current</i> tab scrolls it to top.</div>
  <div class="rule"><b>Header slots.</b> No title on the dashboard → "Hey {name}!" plus the streak chip when the streak is ≥ 1. A <code>rightAccessory</code> replaces the icons (the elapsed-time clock does this); <code>children</code> renders full-width underneath (the progress rail does this).</div>`,
});

// =========================================================================
// COMPONENTS — text styles
// =========================================================================
card("components/text-styles.html", {
  group: "Components", name: "Text", subtitle: "10 variants × 4 weight overrides",
  width: 940, height: 640,
  lede: "The Text component binds a variant to a size, a weight and a role colour in one prop, so screens never hand-assemble type. Weight can be overridden; colour and size should not be.",
  css: `.spec{display:flex;align-items:center;gap:22px;padding:13px 0;border-bottom:1px solid var(--l-2)}
  .spec:last-child{border-bottom:0}
  .k{width:120px;flex:none;font-family:ui-monospace,Menlo,monospace;font-size:12px;color:var(--muted)}`,
  body: `<h2>Variants</h2>
  <div class="grid2">
    <div class="stage"><p class="cap">Light</p>
      ${TEXT_VARIANTS.map(([n, s, w, , ]) => {
        const px = s.includes("20") ? 20 : s.includes("14") ? 14 : 16;
        const col = n === "subtitle" || n === "label" ? "var(--ink-2)" : n === "caption" ? "var(--muted)" : "var(--ink)";
        return `<div class="spec"><div class="k">${n.split(" ")[0]}</div>
          <div style="font-size:${px}px;font-weight:${w};color:${col}">Front Squat</div></div>`;
      }).join("")}</div>
    <div class="stage on-dark"><p class="cap">Dark</p>
      ${TEXT_VARIANTS.map(([n, s, w, , ]) => {
        const px = s.includes("20") ? 20 : s.includes("14") ? 14 : 16;
        const col = n === "subtitle" || n === "label" ? "var(--ink-2)" : n === "caption" ? "var(--muted)" : "var(--ink)";
        return `<div class="spec"><div class="k">${n.split(" ")[0]}</div>
          <div style="font-size:${px}px;font-weight:${w};color:${col}">Front Squat</div></div>`;
      }).join("")}</div>
  </div>
  <p class="note"><b>Known flattening:</b> <code>h1</code>, <code>h2</code> and <code>h3</code> all resolve to 20px/bold today — the component has three names for one style. Treat headings as a two-step hierarchy (20px bold / 16px medium) until the scale is split, and don't design layouts that depend on an h1-vs-h2 size difference.</p>`,
});

// =========================================================================
// index contact sheet (local preview only, not a card)
// =========================================================================
const byGroup = files.reduce((a, f) => ((a[f.group] ||= []).push(f), a), {});
fs.writeFileSync(path.join(HERE, "index.html"), `<!doctype html>
<meta charset="utf-8"><title>MastersFit Design System</title>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
 body{margin:0;padding:48px;background:#FAFAFA;color:#0A0A0A;
   font-family:Manrope,-apple-system,system-ui,sans-serif}
 .w{max-width:900px;margin:0 auto}
 h1{font-size:32px;letter-spacing:-.02em;margin:0 0 6px}
 .l{color:#6E6E6E;margin:0 0 40px;font-size:16px}
 h2{font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:#6E6E6E;
   margin:36px 0 12px;padding-bottom:8px;border-bottom:1px solid #E0E0E0}
 a{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:14px 0;
   border-bottom:1px solid #F4F4F4;text-decoration:none;color:inherit}
 a:hover{background:#F4F4F4}
 b{font-size:16px;font-weight:700} span{font-size:13.5px;color:#6E6E6E;text-align:right}
</style>
<div class="w"><h1>MastersFit Design System</h1>
<p class="l">Generated from <code>lib/theme.ts</code> and the shipped components. Re-run <code>node docs/design-system/build.mjs</code> to re-sync.</p>
${Object.entries(byGroup).map(([g, fs_]) => `<h2>${g}</h2>${fs_.map((f) =>
  `<a href="${f.path}"><b>${f.name}</b><span>${f.subtitle}</span></a>`).join("")}`).join("")}
</div>`);

fs.writeFileSync(path.join(HERE, "cards.json"), JSON.stringify(
  files.map(({ path: p, name, subtitle, group, width, height }) =>
    ({ path: p, name, subtitle, group, viewport: { width, height } })), null, 2));

console.log(`✓ ${files.length} cards + index.html + cards.json`);
console.log(`  themes extracted: ${THEMES.length} families (${THEMES.length * 2} variants)`);
