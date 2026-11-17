# DESIGN.md — Scrapbook Design System

Single source of truth for the look and feel of the whole frontend (`frontend/`).
Product: a STEM learning platform for school students (Maths, Physics, Chemistry, Biology) with board-aligned lessons, MCQ practice, interactive diagrams, a virtual lab and the AI mentor **Chotu**.
Reference look: the "Quantum Quest" site — a pinned-paper scrapbook lying on a green ruled desk.

---

## 0. How agents must use this file

1. Read this whole file before writing or editing any UI code.
2. This file wins over library defaults, existing styles in the repo, and personal taste.
3. If a decision is not covered here, do not improvise. Add the rule to the right section of this file, say what you added, then implement it.
4. No hardcoded colours, fonts, radii, shadows, z-indexes or durations in components. Use the tokens in section 3 only.
5. UI only. Never change routes, API calls, auth, scoring, data models or `backend/`.
6. Values were sampled by eye and by pixel from reference screenshots. They are tokens on purpose, so a tweak is one edit in `tokens.css`.

---

## 1. Concept and principles

**Concept:** every screen is a desk. The desk is dark green graph paper with ruler marks on its edges. Everything the student touches is a piece of paper pinned or taped to it: lesson cards, quiz sheets, lab notebooks, sticky notes, stamps.

Principles:

- **One desk, always.** The green ruled background is identical on every page (section 2). It never changes per route.
- **Paper on desk.** Content sits on cream paper (`--paper`). Text on the desk itself is white and reserved for page titles and short handwritten notes.
- **Handmade, not messy.** Tilts are small (max 1.5° on cards), decoration is sparse, and anything the student must read or type is flat and straight.
- **Decoration carries meaning.** Tape and pins mark a card as pinned content, stamps mark status (Mastered, New, Locked, Passed), sticky notes mark hints and Chotu's replies. If a decoration does not say something, remove it.
- **Spend boldness in one place per screen.** One big display title, one primary button, one stamp. Everything else stays quiet.
- **Works on a cheap phone.** Mobile first, no heavy effects (section 10).

---

## 2. The desk (global background)

The background is one fixed layer, rendered once by the app shell. Every route (landing, auth, dashboard, lessons, practice, lab, profile, admin, 404) shows the exact same desk.

Rules:

- Component name: `Desk`. Mounted exactly once in `AppShell` (the root layout). Never mounted inside a page.
- `position: fixed; inset: 0; z-index: var(--z-desk); pointer-events: none; aria-hidden="true"`.
- Pages, sections and cards must not set their own page-level background. `body` has `background: var(--desk-800)` as the no-JS fallback only.
- Layers, bottom to top: base green, soft vignette, graph grid (minor + major lines), ruler strips, chalk doodles.

### 2.1 Base, vignette and grid

```css
.desk {
  position: fixed;
  inset: 0;
  z-index: var(--z-desk);
  pointer-events: none;
  background-color: var(--desk-800);
  background-image:
    radial-gradient(120% 90% at 50% 15%, rgba(255,255,255,.035), transparent 60%),
    linear-gradient(to bottom, transparent 55%, rgba(0,0,0,.2)),
    linear-gradient(var(--grid-major) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-major) 1px, transparent 1px),
    linear-gradient(var(--grid-minor) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-minor) 1px, transparent 1px);
  background-size: auto, auto, 240px 240px, 240px 240px, 48px 48px, 48px 48px;
}
@media (max-width: 640px) {
  .desk { background-size: auto, auto, 160px 160px, 160px 160px, 32px 32px, 32px 32px; }
}
```

### 2.2 Ruler strips

- Left strip (vertical) and bottom strip (horizontal), 28px thick, flush to the viewport edge.
- One tick every grid cell (48px; 32px on mobile) and a two-digit label next to it: `01`, `02`, `03`, … left strip counts downward from the top, bottom strip counts rightward from the left.
- Labels: `--font-mono`, 10px, colour `--ruler-ink`. Ticks: 6px long, 1px, same colour.
- Render a fixed number of labels (30 on the left, 50 at the bottom) inside an `overflow: hidden` strip, so no resize listeners are needed.
- Bottom-left corner: a small protractor mark with the text `45°` in `--ruler-ink`.
- Below 640px hide the number labels and keep only ticks.

### 2.3 Chalk doodles

A sparse layer of science sketches in the desk margins, drawn in `--font-hand` or inline SVG at `--chalk` (white, 14% opacity), rotated −8° to 8°. Same set and same positions on every page.

- Show only from 1280px up, and only in the outer margins (never behind content columns).
- 6 to 8 items, chosen from: `F = ma`, `E = mc²`, `v = u + at`, `a² + b² = c²`, `sin²θ + cos²θ = 1`, `PV = nRT`, `6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂`, a right triangle with a 45° mark, an atom with three orbits, a DNA helix, a conical flask, a pendulum, a benzene ring.
- Each doodle is decorative only (`aria-hidden`), static, never animated.

---

## 3. Tokens

Create `frontend/src/styles/tokens.css` with exactly these variables. Components read variables only.

```css
:root {
  /* Desk */
  --desk-950: #052620;
  --desk-900: #04241f;
  --desk-800: #052e27;   /* base desk green */
  --desk-700: #073b32;   /* dark green cards */
  --grid-minor: rgba(255,255,255,.045);
  --grid-major: rgba(255,255,255,.08);
  --ruler-ink: rgba(255,255,255,.22);
  --chalk: rgba(255,255,255,.14);

  /* Paper */
  --paper: #faf7ed;
  --paper-warm: #f4efe0;
  --paper-aged: #f6efe0;
  --paper-field: #fffdf6;
  --paper-edge: #e9d9a6;
  --paper-dots: rgba(90,80,40,.10);
  --paper-rule: rgba(59,130,246,.14);
  --paper-margin: rgba(220,80,80,.28);

  /* Ink */
  --ink: #0f172a;
  --ink-muted: #475569;
  --ink-soft: #64748b;
  --hand-rust: #9a3412;          /* handwritten sub-titles on paper */
  --on-desk: #ffffff;
  --on-desk-muted: rgba(255,255,255,.74);

  /* Actions and status */
  --emerald-700: #047857;        /* primary */
  --emerald-600: #059669;        /* primary hover */
  --emerald-800: #065f46;        /* primary pressed / button edge */
  --emerald-500: #10b981;        /* progress, success, rings */
  --emerald-300: #34d399;        /* "ready" dots */
  --amber-400: #fbbf24;          /* XP, active nav, level chips */
  --amber-300: #fcd34d;
  --amber-500: #f59e0b;
  --red-600: #dc2626;
  --kraft: #d8b98f;
  --kraft-edge: #b08a57;
  --kraft-ink: #4a3216;

  /* Notes and tape */
  --note-yellow: #fef08a;
  --note-blue: #bae6fd;
  --note-green: #bbf7d0;
  --note-pink: #fbcfe8;
  --tag-yellow: #fce99d;
  --tag-yellow-edge: #d4b94a;
  --tape-yellow: rgba(232,222,160,.88);
  --tape-green: rgba(167,214,170,.88);
  --tape-kraft: rgba(214,184,140,.88);

  /* Dark panels (code, graphs, locked) */
  --slate-950: #050b14;
  --slate-900: #0a1526;
  --slate-800: #1e293b;
  --slate-700: #334155;
  --locked: #0c2029;
  --locked-ink: #829092;
  --nav-bg: rgba(75,82,88,.94);

  /* Pins */
  --pin-red: #dc2626;
  --pin-amber: #e89713;
  --pin-orange: #f97316;
  --pin-green: #10b981;
  --pin-blue: #3b82f6;
  --pin-purple: #8b5cf6;
  --pin-grey: #94a3b8;

  /* Subjects (section 7) */
  --maths: #8b5cf6;     --maths-soft: #ede9fe;     --maths-ink: #5b21b6;
  --physics: #3b82f6;   --physics-soft: #dbeafe;   --physics-ink: #1d4ed8;
  --chemistry: #f97316; --chemistry-soft: #ffedd5; --chemistry-ink: #9a3412;
  --biology: #22c55e;   --biology-soft: #dcfce7;   --biology-ink: #166534;

  /* Type */
  --font-display: "Bricolage Grotesque", "Noto Sans Devanagari", "Noto Sans Kannada", "Noto Sans", system-ui, sans-serif;
  --font-body: "Plus Jakarta Sans", "Noto Sans Devanagari", "Noto Sans Kannada", "Noto Sans", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
  --font-hand: "Caveat", "Kalam", "Noto Sans Devanagari", cursive;

  /* Space (4px base) */
  --sp-1: 4px;  --sp-2: 8px;  --sp-3: 12px; --sp-4: 16px; --sp-5: 24px;
  --sp-6: 32px; --sp-7: 48px; --sp-8: 64px; --sp-9: 96px;
  --page-pad: clamp(16px, 4vw, 56px);
  --page-max: 1360px;
  --read-max: 72ch;

  /* Radius */
  --r-sm: 8px; --r-md: 12px; --r-lg: 20px; --r-xl: 28px; --r-pill: 999px;

  /* Elevation */
  --shadow-paper: 0 1px 0 rgba(255,255,255,.7) inset, 0 10px 24px rgba(0,0,0,.35);
  --shadow-lift: 0 1px 0 rgba(255,255,255,.7) inset, 0 18px 34px rgba(0,0,0,.4);
  --shadow-pin: 0 3px 4px rgba(0,0,0,.45);
  --shadow-note: 2px 6px 10px rgba(0,0,0,.28);

  /* Component & state helpers (derived from sections 2, 5 & 6; no raw hex/rgb outside tokens.css) */
  --white: #ffffff;
  --desk-vignette-top: rgba(255,255,255,.035);
  --desk-vignette-bottom: rgba(0,0,0,.2);
  --paper-70: rgba(255,255,255,.7);
  --paper-60: rgba(255,255,255,.6);
  --paper-border-warm: #e5e0cc;
  --paper-border-strong: #d9d0b0;
  --field-border: #cfc7a8;
  --btn-note-bg: #f1e9bf;
  --btn-note-edge: #d6c77c;
  --btn-edge-soft: rgba(0,0,0,.25);
  --btn-edge-pressed: rgba(0,0,0,.3);
  --nav-tab-active-bg: #4d4225;
  --nav-text: rgba(255,255,255,.88);
  --nav-border: rgba(255,255,255,.14);
  --note-ink: #3b3a1a;
  --track: #e2e8f0;
  --skeleton: #efe8d0;
  --streak-bg: #fffaec;
  --avatar-bg: #e6f8e2;
  --scrim: rgba(2,20,17,.72);
  --focus-ring: rgba(16,185,129,.35);
  --stamp-bg-emerald: rgba(16,185,129,.06);
  --stamp-bg-red: rgba(220,38,38,.05);
  --emerald-soft: #ecfdf5;
  --amber-soft: #fef3c7;
  --amber-ink: #92400e;
  --red-soft: #fee2e2;
  --red-ink: #991b1b;
  --red-border: #fca5a5;
  --dark-paper-border: rgba(233,217,166,.25);
  --dark-btn-edge: #0f172a;
  --danger-edge: #991b1b;

  /* Interactive Pixel-Art Subject Notebook Cards */
  --paper-grain: rgba(120, 96, 48, 0.045);
  --paper-grain-light: rgba(255, 255, 255, 0.45);
  --paper-deckle-edge: rgba(180, 154, 102, 0.35);
  --notebook-shadow-rest: 0 2px 0 rgba(255,255,255,.75) inset, 0 -2px 0 rgba(217,208,176,.55) inset, 0 10px 24px rgba(0,0,0,.35);
  --notebook-shadow-lift: 0 2px 0 rgba(255,255,255,.85) inset, 0 -2px 0 rgba(217,208,176,.7) inset, 0 18px 36px rgba(0,0,0,.44);
  --notebook-shadow-press: 0 1px 0 rgba(255,255,255,.65) inset, 0 5px 12px rgba(0,0,0,.32);
  --pin-pixel-outline: #181c26;
  --pin-pixel-highlight: #ffffff;
  --pin-pixel-shadow: rgba(0, 0, 0, 0.35);
  --physics-ring: rgba(59, 130, 246, 0.28);
  --chemistry-ring: rgba(249, 115, 22, 0.28);
  --biology-ring: rgba(34, 197, 94, 0.28);
  --maths-ring: rgba(139, 92, 246, 0.28);
  --notebook-tooltip-bg: #181c26;
  --notebook-tooltip-border: #334155;
  --notebook-tooltip-ink: #faf7ed;

  /* Landing hero exception (section 8.1) */
  --sky-1: #1c97e8;
  --sky-2: #26a6f8;
  --sky-3: #4ab7fa;
  --sky-4: #5bc7f9;
  --sky-scrim: rgba(6,38,90,.48);
  --nav-sky-bg: rgba(8,28,38,.84);
  --nav-sky-hover: rgba(255,255,255,.14);
  --nav-sky-active: rgba(251,191,36,.18);
  --nav-sky-border: rgba(255,255,255,.22);
  --nav-sky-shadow: 0 10px 28px rgba(3,14,22,.36);
  --glass-bg: rgba(8,28,38,.62);
  --glass-hover: rgba(8,28,38,.78);
  --glass-border: rgba(255,255,255,.34);
  --cream-cta: #f5f5f2;
  --cream-cta-edge: #d8d8d0;
  --hero-card-bg: rgba(10,34,34,.86);
  --hero-card-border: rgba(255,255,255,.22);
  --hero-card-muted: rgba(255,255,255,.76);
  --hero-card-shadow: 0 10px 24px rgba(3,14,16,.36);
  --hero-dot: #a3e635;
  --hero-dot-glow: rgba(163,230,53,.35);
  --hero-text-shadow: 0 2px 12px rgba(4,24,52,.36);

  /* Tilt (cards max 1.5deg) */
  --tilt-a: -1.1deg; --tilt-b: .7deg; --tilt-c: -.4deg; --tilt-d: 1deg;

  /* Layers */
  --z-desk: -1; --z-base: 1; --z-deco: 2; --z-nav: 50; --z-fab: 60; --z-modal: 80; --z-toast: 90;

  /* Motion */
  --t-fast: 120ms; --t-med: 200ms; --t-slow: 320ms;
  --ease: cubic-bezier(.2,.8,.2,1);
}
```

---

## 4. Typography

| Role | Font | Use |
|---|---|---|
| Display | Bricolage Grotesque, 800, `font-stretch: 85%`, tracking −0.03em, line-height 1.02 | Page titles on the desk (white), card titles on paper |
| Body | Plus Jakarta Sans, 400/500/700, line-height 1.6 | Lesson text, descriptions, buttons, form labels |
| Mono | JetBrains Mono, 500/700 | Stat lines, chips, stamps, ruler numbers, terminal output |
| Hand | Caveat (Kalam fallback for Devanagari) | Short margin notes, sticky notes, sub-titles under card titles. Max about 40 characters |

Scale (use `clamp` for the top three):

| Token | Size | Notes |
|---|---|---|
| `display-xl` | `clamp(2.5rem, 6vw, 5rem)` | Landing and section hero titles on the desk |
| `h1` | `clamp(2rem, 4vw, 3rem)` | Page title |
| `h2` | `clamp(1.5rem, 2.6vw, 2rem)` | Card title |
| `h3` | 1.25rem | Sub-section |
| `body` | 1rem | Default |
| `small` | 0.875rem | Secondary text |
| `label` | 0.75rem mono, tracking .08em | Chips, stat labels, stamps |
| `hand` | 1.25rem | Margin notes |

Rules:

- Minimum text size is 12px. Ruler numbers (10px) are decorative and `aria-hidden`.
- Uppercase is for mono chips, stamps and stat labels only. Headings, buttons and form labels are sentence case.
- Do not add a small label above every heading. A label above a title must carry information (a subject, a class, a status).
- Number markers (`Chapter 01`, `Question 3 of 10`) only where the content really is a sequence.
- Lesson body text uses `--font-body`, never `--font-hand`, at 65 to 72 characters per line (`--read-max`).

---

## 5. Paper primitives

Build these first. Every component is made from them.

### 5.1 Paper card

```css
.paper {
  position: relative;
  background-color: var(--paper);
  color: var(--ink);
  border: 1.5px solid var(--paper-edge);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-paper);
  rotate: var(--tilt, 0deg);
  transition: rotate var(--t-med) var(--ease), translate var(--t-med) var(--ease), box-shadow var(--t-med) var(--ease);
}
.paper--hero { border-radius: var(--r-xl); }
.paper--dots {
  background-image: radial-gradient(var(--paper-dots) 1.2px, transparent 1.4px);
  background-size: 14px 14px;
}
.paper--ruled {
  background-image: repeating-linear-gradient(to bottom, transparent 0 31px, var(--paper-rule) 31px 32px);
}
.paper--interactive:hover { rotate: 0deg; translate: 0 -4px; box-shadow: var(--shadow-lift); }
.paper--flat { rotate: 0deg; }                 /* lessons, forms, tables, admin */
.tilt-cycle > :nth-child(4n+1) { --tilt: var(--tilt-a); }
.tilt-cycle > :nth-child(4n+2) { --tilt: var(--tilt-b); }
.tilt-cycle > :nth-child(4n+3) { --tilt: var(--tilt-c); }
.tilt-cycle > :nth-child(4n+4) { --tilt: var(--tilt-d); }
```

Variants: `dots` for browsing cards (chapters, subjects), `ruled` for anything the student writes or answers on (quiz sheet, notes, Chotu chat), plain for everything else. `dark` paper (`--desk-700` with `--paper-edge` at 25%) is used for rank and stats cards.

### 5.2 Washi tape

A translucent strip across the top edge of a card, 96×28px, centred, rotated −4° to 4°. Colours: `--tape-yellow` (default), `--tape-green`, `--tape-kraft`. Torn short edges via `clip-path`.

```css
.tape {
  position: absolute; top: -14px; left: 50%; width: 96px; height: 28px;
  translate: -50% 0; rotate: var(--tape-rot, -2deg); z-index: var(--z-deco);
  background: var(--tape-yellow); pointer-events: none;
  clip-path: polygon(0 0,4% 18%,0 36%,4% 54%,0 72%,4% 90%,0 100%,100% 100%,96% 82%,100% 64%,96% 46%,100% 28%,96% 10%,100% 0);
}
```

### 5.3 Push pin

18px glossy ball near a top corner. Colours: red, amber, green, blue, grey. Grey is used on locked cards. A card has either tape or pins, not both, except the hero card.

```css
.pin {
  position: absolute; top: -8px; width: 18px; height: 18px; border-radius: 50%;
  z-index: var(--z-deco); pointer-events: none; box-shadow: var(--shadow-pin);
  background: radial-gradient(circle at 35% 30%, rgba(255,255,255,.75) 0 12%, var(--pin, var(--pin-red)) 13% 60%, color-mix(in srgb, var(--pin, var(--pin-red)) 55%, #000) 100%);
}
```

### 5.4 Paperclip

An inline SVG clip (grey outline, 14×34px), clipped to a card corner or a sticky note. Max one per screen.

### 5.5 Sticky note

Used for hints, Chotu replies, toasts and small callouts. Square-ish, handwritten text, rotation −4° to 4° (0° to 0.6° when it holds a chat message or an answer explanation).

```css
.sticky {
  background: var(--note-yellow); color: #3b3a1a; padding: 12px 14px; max-width: 200px;
  font: 500 1.25rem/1.15 var(--font-hand); box-shadow: var(--shadow-note); rotate: var(--note-rot, -3deg);
}
.sticky--blue { background: var(--note-blue); }
.sticky--green { background: var(--note-green); }
.sticky--pink { background: var(--note-pink); }
```

### 5.6 Stamp

A status mark pressed onto a card. Dashed border, mono bold, uppercase, rotated −8° to −4°.

```css
.stamp {
  display: inline-block; padding: 4px 12px; border: 2px dashed currentColor; border-radius: 6px;
  font: 700 .75rem/1.2 var(--font-mono); letter-spacing: .14em; text-transform: uppercase;
  rotate: -6deg; color: var(--emerald-700); opacity: .85; background: rgba(16,185,129,.06);
}
.stamp--new    { color: var(--red-600); border-style: solid; background: rgba(220,38,38,.05); }
.stamp--live   { color: var(--red-600); border-style: solid; background: rgba(220,38,38,.05); }
.stamp--locked { color: var(--slate-700); border-style: double; border-width: 4px; background: transparent; }
.stamp--ended  { color: var(--slate-700); border-style: double; border-width: 4px; background: transparent; }
.stamp--unlocked { color: var(--emerald-700); border-style: solid; }
```

Stamp vocabulary: `Mastered`, `Passed`, `Certified`, `Unlocked`, `New`, `Locked`, `Live`, `Ended`. Do not invent others without adding them here. `Live` uses the `stamp--new` style (static, never animated); `Ended` uses the `stamp--locked` style.

### 5.7 Tag (label chip)

- On paper (`tag--paper`): background `--tag-yellow`, 1px `--tag-yellow-edge` border, ink text, radius 6px, mono 12px.
- On desk (`tag--tape`): same yellow with ink text and a −1.5° tilt, so it reads like label-maker tape.
- Status chips (`ready`, `verified`): emerald tint background, `--emerald-700` text, pill radius, with a dot or tick icon.

---

## 6. Components

All live in `frontend/src/components/ui/`. Icons: Lucide, 16 to 20px, stroke 2, colour inherited. No emoji in the UI.

### 6.1 Buttons

Minimum height 44px, radius `--r-md`, bold body font, a 3D bottom edge that presses down on click.

| Variant | Look | Use |
|---|---|---|
| `primary` | `--emerald-700`, white text, edge `--emerald-800` | The one main action per screen (Start lesson, Resume, Check answers) |
| `kraft` | `--kraft`, `--kraft-ink` text, edge `--kraft-edge`, larger (52px) | Big run actions (Run experiment, Submit test) |
| `note` | Pale yellow `#f1e9bf`, 1.5px `#d6c77c` border, ink text, −0.6° tilt | Secondary actions on paper (Review notes) |
| `dark` | `--slate-800`, white text | Actions on dark panels (Run code, Copy) |
| `ghost` | Transparent, 1.5px currentColor border | Tertiary, cancel |
| `danger` | `--red-600` | Delete in admin only |

```css
.btn { min-height: 44px; padding: 0 20px; border: 0; border-radius: var(--r-md); display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  font: 700 .9375rem/1 var(--font-body); cursor: pointer; transition: translate var(--t-fast), box-shadow var(--t-fast), background var(--t-fast); }
.btn--primary { background: var(--emerald-700); color: #fff; box-shadow: 0 4px 0 var(--emerald-800), 0 8px 14px rgba(0,0,0,.25); }
.btn--primary:hover { background: var(--emerald-600); }
.btn:active { translate: 0 3px; box-shadow: 0 1px 0 rgba(0,0,0,.3); }
.btn:disabled { opacity: .5; cursor: not-allowed; }
```

**Retro Pixel Button (`PixelButton`):**

- `Button` (`frontend/src/components/ui/Button.jsx`) delegates all EduNova buttons across every route and variant to `PixelButton` (`frontend/src/components/ui/PixelButton.jsx`), rendering a unified 16-bit stepped arcade/notebook button using layered CSS spans (`.pixel-btn__shadow`, `.pixel-btn__extrude`, `.pixel-btn__surface`, `.pixel-btn__highlight`, `.pixel-btn__shimmer`, `.pixel-btn__pixels`, `.pixel-btn__label`) with two-step polygon pixel corners (`--px-step: 3px` for `sm`/`md`, `4px` for `lg`), `--font-pixel` centered label, mint/bright top highlight, dark extruded base, and deep bottom shadow (zero image/SVG assets).
- Supported variants: `primary` / `emerald`, `kraft`, `note` / `secondary`, `dark`, `ghost`, `danger`, `cream`, `glass`, `amber`, `blue`, and `purple` (all backed by `--pixel-btn-*` tokens in `tokens.css`).
- Supports `sm`/`md`/`lg` sizes, `fullWidth`, `disabled`, keyboard `:focus-visible`, tactile hover lift (`-2px`) + top glow, active press (`+4px`) compressing the 3D extrusion/shadow, and `@media (prefers-reduced-motion: reduce)`.

### 6.2 NavBar

- Floating pill, fixed, `top: 12px`, centred, width `min(980px, 100% - 24px)`, height 56px, background `--nav-bg`, radius pill, no backdrop blur.
- Left: logo tile (28px rounded square) + app name in display font, white.
- Middle: tab group in a darker pill (`--slate-800`). Tabs are mono 13px. Active tab: text `--amber-400`, background `#4d4225`, 1.5px `--amber-400` ring.
- Right: XP chip (lightning icon + number, `--amber-400`, mono bold) and user chip (username + sign-out icon).
- Items: Home, Syllabus, Live, Lab, Practice, Notes, Profile (mapped onto the current top bar alongside Arena/Community/Notebook as applicable). Admin adds Content.
- Public routes (`/`, `/login`, `/signup`) when unauthenticated: `NavBar` shows the logo tile + app name on the left, language selector (`EN | हिंदी | मराठी`) and `Log in` / `Sign up` actions on the right. `BottomTabs` and `ChotuFab` are hidden when unauthenticated.
- When offline, show a compact amber `Offline` status chip in the `NavBar` right cluster alongside the language selector, XP chip (computed from completed lessons/tests/labs, defaulting to `0 XP`), and user chip.
- Under 768px: the top pill shows only logo, XP and avatar (or language + Log in when unauthenticated); the tabs move to a bottom tab bar with the same pill style (5 items max: Home, Syllabus, Live, Labs, Notebook/Profile; icon above a 12px label, 56px tall, safe-area aware). In the live class view (`/live/:code`), mobile `BottomTabs` are hidden and `ControlBar` takes the bottom; `ChotuFab` stays visible above `ControlBar`.
- Page content starts 88px below the top to clear the pill.

### 6.3 Section header

Desk title block: optional `tag--tape` label, `display-xl` or `h1` white title, and on the right (desktop) a one-line hand-written note in `--on-desk-muted`. Title and note sit on the desk, never on a card.

### 6.4 Hero card

A `paper--hero` with tape. Left: tag, h1 title, one-sentence description, a meta row (icon + mono text, for example book "4 chapters", flask "1 lab", clock "about 60 min"). Right: a nested progress card (white at 70% on paper, radius 16): label, percentage, progress bar, XP line, primary button.

### 6.5 Progress

- Bar: 10px high pill, track `#e2e8f0`, fill in the subject colour (or `--amber-500` to `--emerald-500` gradient for overall progress). Percentage in mono, right aligned.
- Ring: 120px, 14px stroke, `--emerald-500` on a `#e2e8f0` track, big mono percentage in the middle, a status chip under it.

### 6.6 Chapter card

`paper--dots` with tape or a pin, tilted via `tilt-cycle`, interactive.

1. Top row: mono `Chapter 01` left, stamp right (`Mastered`, `New`, none).
2. Title in display `h2`; one-line hand-written sub-title in `--font-hand`, `--hand-rust`.
3. Two-line description in `--ink-muted`.
4. Inner box (white 60%, 1px `#e5e0cc`, radius 14): rows of icon + mono label on the left and mono value on the right (Lessons 3 parts, Quick check 3 questions, Virtual lab, Est. time 15 min). Subject colour is used on the lab row.
5. Footer buttons: `note` "Review notes" and `primary` "Start" or "Replay".

**Subject Notebook Cards (2×2 Dashboard Grid):**

- Uses `NotebookGrid` (`Physics`, `Chemistry`, `Biology`, `Mathematics` in a 2-column desktop grid, stacking vertically below 768px) with `Pin` (`pixel` 3D variant in blue, orange, green, purple) and top-right `NEW` / `MASTERED` `Stamp`.
- Two-zone upper layout: left zone (~56% width) shows notebook number (`NOTEBOOK 01`), subject badge (`Tag`), display heading, synced chapters count, and chapter count; right zone (~44% width) renders a deterministic, procedural HTML5 `<canvas>` pixel-art lab scene (`160 × 96` logical grid, `image-rendering: pixelated`, zero SVG/image assets) with independent idle animations, hover speed/particle boosts, and clickable apparatus hitboxes + formula tooltip.
- Bottom footer spans full width with percentage readout and subject-coloured `ProgressBar`. Interactive tilt follows pointer softly (`max 1.5°`) and pauses all continuous animations offscreen or under `prefers-reduced-motion`.

**Locked chapter card:** background `--locked`, text `--locked-ink`, grey pin, a `Prerequisite` tag with a lock icon top right, the sub-title and description dimmed, and a dashed divider with a lock icon and "Finish Chapter 3 to open this" at the bottom. The locked state is also announced in text for screen readers.

### 6.7 Illustration tile

Dark navy rounded panel (`--slate-800` to `--slate-900`) with simple line art in the subject colour and a tilted sticky note overlapping the top-left corner. Used for challenges, diagrams and chapter headers.

### 6.8 Stat chips

Pill or small rounded box, white 70%, 1px `--paper-edge`, icon + mono label + bold value. The streak chip uses `#fffaec` with an amber border and a flame icon. Level chip: `--amber-400` background, ink text, mono bold, overlapping the avatar corner.

### 6.9 Profile page ("My notebook")

- Profile card: 84px rounded-square avatar (`#e6f8e2`, 2px amber border) with level chip, name in display font, `@username` in mono, class and board chip, stat chips (enrolled, streak), a `Certified` stamp.
- Rank card: dark paper, trophy in a bordered square, rank number large in `--amber-300`, XP bar with `--amber-400` fill on `--slate-800`.
- Mastery panel: progress ring, then one white row card per chapter with title, percentage, subject-coloured bar, a status line and a `Verified` tick when mastered. Locked chapters show 0% and "Locked".

### 6.10 Practice (MCQ)

- Quiz sheet: `paper--ruled`, flat, max-width `--read-max` plus option column.
- Progress: a row of pin dots, one per question (current is amber, answered is emerald). "Question 3 of 10" in mono.
- Option tile: flat white-ish paper, 2px `#d9d0b0` border, radius 14, a letter tab (A to D) in a subject-colour square at the left. Selected: emerald border and tint. Correct: emerald border plus `Correct` text and tick. Wrong: red border plus `Not quite` text and cross. Never colour alone.
- Explanation: a yellow `sticky` with 0.5° tilt that appears after answering.
- Results: hero-style card, big score in display font, `Passed` or `Try again` stamp, per-topic bars, XP chip, buttons "Review wrong answers" and "Back to syllabus".

### 6.11 Lab workbench

A two-page notebook spread (stacks on mobile):

- Left page `paper`: apparatus and controls. Controls are large tiles (2 columns) in saturated subject colours with a bold label and a small sub-label, 3D bottom edge. Sliders and number inputs sit on `--paper-field`.
- Centre: binder strip (`--paper-aged`, a column of rounded holes) with a small yellow "live sync" tag between two arrow buttons. Hidden on mobile.
- Right page: dark panel (`--slate-900`) for the live view, output and readings. Title bar with a `Ready` chip (`--emerald-300` dot), `dark` buttons "Run" and "Copy". A terminal block (`--slate-950`, mono, cream and emerald text) shows readings and messages.
- Below: a row of paper or dark panels for graphs, tables of readings and the 3D or SVG view.
- Primary action is the `kraft` button "Run experiment".

### 6.12 Chotu (AI mentor)

- Floating button: 64px circle, `--slate-800` fill, 2px `--slate-700` ring, Chotu's face inside, a 20px emerald badge with a white sparkle at the top right. Fixed bottom right (16px from edges, above the mobile tab bar). `--z-fab`.
- Chat panel: `paper--ruled`, flat, 380px wide at the bottom right on desktop, full-height bottom sheet on mobile, with tape on top.
- Student messages: blue sticky, right aligned. Chotu messages: yellow sticky, left aligned with a small face. Rotation 0° to 0.6°. Text uses the body font at 16px, not the hand font.
- When an answer comes from the student's own notes, show a small paper clip chip under the message: "From your notes: Chapter 3".
- Input: `--paper-field` strip with a `kraft` send button. Typing state: three dots on a sticky.
- `ChotuFab` and `ChotuPanel` mount in `AppShell` when authenticated (hidden on `/mentor` where the full Chotu / Saarthi studio is active) and call `/api/mentor/chat`, with a shortcut to open `/mentor` for image upload, session history, and memory controls.

### 6.13 Forms

- Field: height 48px, `--paper-field`, 1.5px `#cfc7a8` border, radius `--r-md`. Focus: `--emerald-700` border and a 3px ring `rgba(16,185,129,.35)`. Error: `--red-600` border, message below with an icon.
- Label above the field, sentence case, bold, 14px. Helper text 13px `--ink-muted`.
- Select, checkbox and radio use the same border and focus style; checked state is `--emerald-700` with a white tick.
- Never tilt a form or a field.

### 6.14 Tables and lists

Flat paper. Header row in mono 12px on `--paper-warm`. Rows separated by 1px `#e5e0cc`, hover row `#f4efe0`. On mobile, rows become stacked cards. Admin tables follow this exactly.

### 6.15 Modal, toast, empty, loading, error

- Modal: `paper--flat`, radius `--r-xl`, tape on top, scrim `rgba(2,20,17,.72)`, focus trapped, close with Esc.
- Toast: a sticky note bottom-left on desktop and above the tab bar on mobile, with a pin. Success green, info blue, error pink with a red pin. Auto-dismiss after 5 seconds, errors stay until closed.
- Empty state: dashed 2px `#d9d0b0` paper "blank page", one hand-written line, one primary button.
- Loading: skeleton blocks `#efe8d0` pulsing at 1.2s; no spinner over content.
- Error: pink sticky with what happened and what to do next.

---

## 7. Subject colour coding

One colour per subject, used for the letter tab, progress bar, lab tiles, illustration line art and a small subject chip. Always use the `*-soft` tint for backgrounds and `*-ink` for text on that tint.

| Subject | Colour | Soft | Ink |
|---|---|---|---|
| Maths | `--maths` | `--maths-soft` | `--maths-ink` |
| Physics | `--physics` | `--physics-soft` | `--physics-ink` |
| Chemistry | `--chemistry` | `--chemistry-soft` | `--chemistry-ink` |
| Biology | `--biology` | `--biology-soft` | `--biology-ink` |

Overall progress and generic actions stay emerald and amber. Subject colour never replaces the desk green.

---

## 8. Page recipes

Every page: `AppShell` (desk + nav + `main`), content in a `--page-max` container with `--page-pad` side padding.

| Page | Layout |
|---|---|
| Landing | Desk title (`display-xl`) and a hand-written note, one hero paper card with the sign-up button, four subject cards as tilted paper with pins, Chotu intro as a sticky note, short "how it works" as three taped cards (a real sequence, so numbered) |
| Login / Sign up | One centred flat paper card (max 440px) with tape, Chotu peeking over the top edge. Page title on the desk above it |
| Onboarding | Three steps (class, board, language). Each choice is a selectable paper tile. Step pills are pins |
| Syllabus (home) | Hero card with overall progress, subject tabs (note-style), chapter card grid (1 column mobile, 2 tablet, 3 desktop) with `tilt-cycle` |
| Lesson reader | One flat `paper--ruled` sheet at `--read-max` with a left margin line, sticky action bar with kraft "Summarise" and `note` "Practice this chapter". Summary appears as a yellow sticky. Chotu button visible |
| Interactive diagram | Paper frame with title, dark illustration stage for the SVG, controls below on paper, hint as a sticky |
| Virtual lab | Workbench (6.11) |
| Practice and results | 6.10 |
| Profile | 6.9 |
| Admin | Same desk, flat paper panels, tables and forms from 6.13 and 6.14, no tilt, no stickers except tape on the page title card |
| STEM Labs & 3D Suite (`/learn`, `/virtual-learning`, `/learn/:subjectId`, topic modules) | `SectionHeader`, `HeroCard`, subject filter `Tag` / `note` tabs, `tilt-cycle` `PaperCard` (`dots`) module grid; interactive 3D/SVG module viewports use a dark `--slate-900` stage framed on flat `paper` with `note`/subject tabs and yellow sticky learning notes |
| Diagrams explorer (`/diagrams`) | Two-column spread: flat `paper` selector list left, dark `--slate-900` SVG stage with zoom/quiz controls and yellow sticky hint right |
| Video player (`/videos`) | Dark `--slate-900` stage for the video frame and checkpoint overlay left, flat `paper` chapter timestamps & transcript right |
| Notes & Handwriting studio (`/notes`) | Flat `paper` tab bar (`Handwriting Studio` / `Saved Notes`), `paper--ruled` preview/editor sheet, `Field` inputs, saved notes as `tilt-cycle` `PaperCard` grid |
| Chotu / Saarthi full studio (`/mentor`) | Flat `paper--ruled` chat sheet with mode tabs (`Doubt Solver` / `AI Mentor`), subject filter pills, blue sticky user notes, yellow sticky Chotu replies, paperclip source chips, `--paper-field` composer with image/camera attach, and `Modal` drawers for session history and memory |
| Community (`/community`) | Two-column spread: flat `paper` study room list + safety rules `StickyNote` left, flat `paper--ruled` chat sheet right |
| Live class lobby & room (`/live`, `/live/:code`) | Section 8.2 |
| Live translation demo (`/live/demo`) | Section 8.3 (public, no login) |
| Privacy (`/privacy`) | Flat `paper` governance sheet with callout panels and `danger` confirmation `Button` |
| 404 and errors | A tilted paper note "This page fell off the desk" with a primary button back to Home |

### 8.1 Landing hero exception

This hero is the one approved exception to the desk-background rule:

- The hero is a full-bleed section (`100svh`, min `600px`, max `960px`) on the Landing route only. It sits above the `Desk` layer and covers it only for the first screen. `Desk` stays mounted once in `AppShell` and is unchanged. Below the hero, the page shows the desk and paper cards as usual.
- The pixel-art environment is rendered procedurally on an HTML5 `<canvas>` (`PixelHeroCanvas.jsx`) using deterministic pixel grids, independent animation systems for trees/leaf clusters, swaying grass/flowers, drifting multi-layer clouds, twinkling skyline windows, and an articulated multi-state pixel character (**Chotu / student reading an open book**).
- The bottom edge of the hero canvas dithers into `--desk-800` over about 24 native pixels, so there is no seam between hero and desk.
- `NavBar` gets `variant="onSky"`: dark-tinted high-contrast surface (`--nav-sky-bg`), `1px` `--nav-sky-border` border, white text with active/hover highlights, prominent `EduNova` brand pill on the left, and cream CTA `#f5f5f2` (`--cream-cta`) with ink text (`--ink`) on the right. Past the hero it switches to the standard nav.
- `Button` gets variants `cream` (`#f5f5f2`, ink text) and `glass` (`--glass-bg`, white text, `1px` `--glass-border` border). Hero only.
- Three floating activity notification cards (`--hero-card-bg`, `1px solid var(--hero-card-border)`, `--hero-dot` green indicator, staggered entrance and subtle vertical bobbing) sit in the upper-right/center-right region without overlapping the heading or navbar.
- All continuous motion pauses or settles into a calm static frame under `prefers-reduced-motion: reduce` or `save-data`.

### 8.2 Live class

Near real-time Hindi-to-Kannada classroom built exclusively from existing desk and paper primitives:

- **Nav & Chrome:** Add a `Live` tab to `NavBar` (`/live`) and `BottomTabs` (keeping 5 mobile tabs max). In the active class view (`/live/:code`), mobile `BottomTabs` are hidden and `ControlBar` takes the bottom; `ChotuFab` stays visible above `ControlBar` (offset upward cleanly so neither overlaps).
- **Lobby (`/live`):** Two flat `PaperCard`s (`paper--flat`) with `Tape`:
  1. `"Join a class"`: class code `Field` (6 uppercase characters), display name `Field`, primary `Button` `"Join class"`.
  2. `"Start a class"`: title `Field`, teacher passcode `Field` (when `TEACHER_CODE` gating applies), primary `Button` `"Go live"`.
- **VideoTile:** Flat `PaperCard` (no tilt) with `Tape`, video inside a `--r-md` frame (`--slate-950` surface when video is loading, off, or audio-only), a name chip bottom-left, and a mic-off icon when muted. The active speaker gets a `2px solid var(--emerald-500)` ring. In this MVP only the teacher has a tile.
- **Stamp:** Uses `"Live"` (`stamp--new` style, static, no animation) while active and `"Ended"` (`stamp--locked` style) once the session ends.
- **ControlBar:** Floating pill styled like `NavBar` (`--nav-bg`, radius `--r-pill`), fixed `12px` above the bottom edge, centred, safe-area aware (`bottom: calc(12px + env(safe-area-inset-bottom, 0px))`). Icon buttons at least `44×44px` with `aria-label`. A toggled-on state uses a `2px` `--amber-400` ring (`--nav-tab-active-bg` fill). Includes a segmented language switch `"Hindi (original) | Kannada"` styled like the nav tab group.
  - **Teacher controls:** Mic toggle, Camera toggle, End class (`danger` variant, opens confirmation `Modal`).
  - **Student controls:** Language switch (`Hindi (original) | Kannada`, instant switch announced via `aria-live`), Captions toggle, Audio-only toggle (unsubscribes video), Leave.
- **CaptionSheet:** Flat `PaperCard` with `paper--ruled` (`--read-max` friendly), showing the last 6 sentences, newest at the bottom, auto-scrolling. Kannada text at `20px` in `--font-body`, Hindi text at `14px` in `--ink-muted`. Captions are always readable text, never `--font-hand`.
- **Class code:** Shown on a yellow `StickyNote` with the 6-character code in `--font-display`, plus a `"Copy link"` `note`-variant `Button`.
- **Status chips:** Mono (`--font-mono`, 12px+), `"Connecting"`, `"Live"`, `"Reconnecting"`, `"Catching up"`. Each pairs an icon and a word, never colour alone.
- **Pipeline panel (teacher only, collapsible):** Dark panel (`--slate-900` / `--slate-950`) with mono readout of stage timings in `ms` (`STT`, `Translate`, `TTS`) and total delay per sentence.
- **Sticky notes:**
  - Teacher: `"Use a headset so students' audio doesn't echo into your mic"` and `"Your voice is sent to Sarvam for translation. We don't store audio."`
  - Student: `"Use earphones."`
- **Fonts & Bundle:** `"Noto Sans Kannada"` is appended to `--font-display` and `--font-body` fallback stacks in `tokens.css`, self-hosted and loaded dynamically only when the Kannada channel or captions are on. `livekit-client` is lazy-loaded only on `/live` routes.

### 8.3 Live demo

Solo Hindi-to-Kannada speech translation showcase (`/live/demo`, public, no login required):

- **Entry points:** Route `/live/demo` (no auth); `"Live translation demo"` flat `PaperCard` with primary `Button` `"Try live translation"` on `/live`; landing hero `glass` `Button` updated to `"Try live translation"` linking to `/live/demo`.
- **Desk title block:** `tag--tape` `"Live demo"`, display title `"Speak Hindi. Hear Kannada."`, hand note `"one sentence at a time"`.
- **Source switch & authenticity chips:** Nav tab-group style switch with three modes, each showing an explicit chip on the page so the audience always knows what is real:
  1. `Microphone` (chip `"Live"`): full STT → Translate → TTS chain over `/ws/live/demo`.
  2. `Sample sentences` (chip `"Sample, live translation"`): steps through 6 scripted Hindi sentences via real server translation + TTS (no STT).
  3. `Offline sample` (chip `"Offline sample, pre-recorded"`): plays pre-generated files from `/demo/` with a short artificial pause between stages; never disguised as live output.
- **PipelineSteps:** Above both cards, four pins (`Pin`) labelled `Hindi speech`, `Hindi text`, `Kannada text`, `Kannada speech`. A pin switches to `--emerald-500` with a tick icon when that stage finishes for the current sentence (never colour alone) and resets for each new sentence.
- **Left card (`"Teacher speaks (Hindi)"`):** Flat `PaperCard` with `Tape`. Microphone mode uses a balanced half-and-half vertical split: the top half displays a local-only meeting camera preview inside a `--r-md` `--slate-950` frame with a bottom-left `"Teacher"` chip (showing `MicOff` when muted), a `2px` `--emerald-500` ring when actively speaking, a `"Camera on" / "Camera off"` `Button`, and a clean `"Camera off"` fallback when off or unavailable (video never leaves the browser); the bottom half shows a large `kraft` `Button` (`"Start speaking"` / `"Stop"`), an emerald level meter (`--emerald-500`), a `"Waiting for Kannada to finish"` half-duplex chip while audio plays, and the live interim Hindi line. Sample/Offline modes show the upcoming Hindi sentence in large body text, `"Sentence X of 6"`, and primary `Button` `"Translate next sentence"`.
- **Right card (`"Student hears (Kannada)"`):** Flat `paper--ruled` `PaperCard`. Sentences stack newest at the bottom and auto-scroll. Each row displays Hindi at `14px` in `--ink-muted`, Kannada at `22px` (`36px` when `"Big text"` is on) in `--font-body`, and a `ghost` `"Replay"` `Button`. The row currently playing gets a `4px` `--emerald-500` left border and a `"Playing"` chip with a speaker icon. On mobile (`< 960px`), this card stacks **first** above the speaker card.
- **Pipeline panel & Check card:** Collapsible dark panel (`--slate-900` / `--slate-950`, **open by default**) with mono readout per sentence (`STT ms`, `translate ms`, `TTS ms`, `total ms`). `"Before you present"` check card shows `Microphone ready`, `Translation service ready`, and `Sound ready` (icons + words) with a `"Run check"` `Button`.
- **Controls, shortcuts & notes:** `"Sound on/off"`, `"Big text"`, and `"Clear"` controls. Keyboard: `Space` toggles start/stop speaking in Microphone mode; `N` advances next sentence (when focus is not in a form field or interactive control). Yellow `StickyNote`: `"Use earphones or lower the speaker volume."` Status chips (`Connecting`, `Live`, `Reconnecting`). Errors show a calm pink `StickyNote` with `"Retry"` and `"Switch to offline sample"` `Button`s—never silent fallback.
- **Fonts:** Load self-hosted `Noto Sans Kannada` dynamically on `/live/demo`.

---

## 9. Motion

- Only `transform` (including `rotate` and `translate`) and `opacity` are animated. Never animate blur, box-shadow size or layout.
- Hover on interactive cards: lift 4px and straighten, `--t-med`.
- Button press: moves down 3px, `--t-fast`.
- One signature moment: when a chapter becomes Mastered, the stamp thunks onto the card (scale 1.6 and −14° to scale 1 and −6°, 280ms, once). Pins drop in at 200ms on first page load only.
- No scroll-triggered entrance animations on every section.
- `@media (prefers-reduced-motion: reduce)`: remove all motion above, keep state changes instant.

---

## 10. Responsive and performance

Target: a low-end Android phone on a slow network.

- Mobile first. Breakpoints: 640, 768, 1024, 1280.
- Mobile: single column, tilts reduced to 0.5° max, ruler labels hidden, doodles hidden, bottom tab bar.
- No `backdrop-filter`, no large blurs, no more than two box-shadow layers per element.
- The desk is pure CSS plus about 80 text nodes for ruler labels. No background images.
- Fonts: self-host WOFF2 subsets, `font-display: swap`, preload only display and body. Load the Indic font subset only for the language the student picked (and load `Noto Sans Kannada` only when the Kannada channel, captions, or `/live/demo` are active). No fonts from a CDN in the production build (offline mode later).
- Illustrations are inline SVG, each under 4 KB. Lazy-load the 3D lab bundle only on the lab route, and lazy-load `livekit-client` only on the `/live` routes.
- Safe-area insets respected on the top pill and bottom tab bar.

---

## 11. Accessibility and languages

- Contrast: ink on paper at least 7:1, white on desk at least 12:1, amber on slate at least 9:1. Check any new colour pair.
- Focus: `:focus-visible` outline 3px `--amber-400` with 2px offset, plus a 1px dark inner ring so it shows on both desk and paper.
- Touch targets at least 44×44px.
- Tape, pins, clips, doodles and the ruler are decorative: `aria-hidden`. A stamp that carries status (Mastered, Locked) also exists as real text.
- State is never colour only: pair colour with an icon and a word.
- Tilted elements are never inputs, table cells or lesson text.
- Support text expansion of 30% or more for Hindi and regional languages: no fixed widths or heights on anything with a label, use `min-height` and wrapping. Set `lang` on `html` and on mixed-language blocks.
- Hand font only for short decorative notes. Anything a student must read is in the body font.

---

## 12. Voice and vocabulary

Plain, friendly, short. Written for Class 8 to 10 students and easy to translate. Sentence case. Buttons start with a verb and keep the same name through the flow ("Start lesson", "Summarise", "Check answers", "Ask Chotu"). Errors say what happened and what to do. Empty screens invite one action.

Vocabulary (replace the reference site's terms):

| Reference site | Use here |
|---|---|
| Sector | Chapter |
| Research, Theory & Proofs | Lesson |
| Knowledge check | Quick check |
| Circuit simulator, Hardware lab | Virtual lab |
| Case, Expedition | Challenge |
| Dossier | My notebook |
| Cadet, Explorer | Student |
| Arena | Leaderboard (optional, later) |

Keep XP, streak and level. Do not use quantum, cadet or telemetry wording anywhere.

---

## 13. Do and don't

Do:

- Put every piece of content on paper and every page on the desk.
- Keep one primary button, one big title and at most one stamp per card.
- Flatten anything the student reads at length or types into.
- Use subject colours on tabs, bars and tiles only.
- Add a new token here before using a new value.

Don't:

- Set a different page background, gradient or colour on any route (except the first-screen Landing hero in section 8.1, which dithers into `--desk-800` at its bottom edge).
- Use pure white or pure black surfaces, glassmorphism, neon glows or purple-to-blue gradients (except the non-blurred translucent white `onSky` nav and `glass` / `cream` hero buttons in section 8.1).
- Stack tape, pin, clip, stamp and sticky on the same card.
- Rotate a card more than 1.5° (except the three perspective-tilted floating status cards in the section 8.1 Landing hero).
- Use more than two typefaces per view besides the hand font.
- Put text smaller than 12px (except the ruler).
- Add decorative motion or sound (except the 90s cloud drift and one-time staggered card fade-in in section 8.1, both disabled under `prefers-reduced-motion` or `save-data`).

---

## 14. Implementation map

```
frontend/src/
  styles/
    tokens.css        # section 3, nothing else
    base.css          # reset, @font-face, html/body, focus ring, reduced motion
    desk.css          # section 2
    paper.css         # section 5 primitives
  components/ui/
    Desk.jsx  Ruler.jsx  Doodles.jsx
    NavBar.jsx  BottomTabs.jsx
    PaperCard.jsx  Tape.jsx  Pin.jsx  Paperclip.jsx  StickyNote.jsx  Stamp.jsx  Tag.jsx
    Button.jsx  PixelButton.jsx  Field.jsx  ProgressBar.jsx  ProgressRing.jsx  StatChip.jsx
    SectionHeader.jsx  HeroCard.jsx  ChapterCard.jsx  LockedChapterCard.jsx  IllustrationTile.jsx
    Modal.jsx  Toast.jsx  EmptyState.jsx  Skeleton.jsx
    ChotuFab.jsx  ChotuPanel.jsx
  layouts/
    AppShell.jsx      # renders <Desk/> once, then <NavBar/>, <main>, <BottomTabs/>, <ChotuFab/>
```

- Pages compose these components only. Page files contain layout and content, no colours.
- If the project uses Tailwind, map tokens in `theme.extend` to the CSS variables (for example `colors.paper = "var(--paper)"`) so utilities and tokens never disagree.
- Admin uses the same `AppShell` with a `flat` prop that sets `--tilt: 0deg` for the subtree.

---

## 15. Definition of done

A change is finished only when all of these are true:

1. `Desk` is mounted once in `AppShell`. Navigating between any two routes does not change, flash or shift the background.
2. A search for hex or `rgb(` values outside `tokens.css` returns nothing.
3. Every button is `Button`, every card is `PaperCard`, every field is `Field`.
4. Checked at 360px, 768px, 1280px and 1920px: no horizontal scroll, nothing clipped, nav and tab bar clear the content.
5. Keyboard: every control reachable, focus ring visible on desk and on paper.
6. `prefers-reduced-motion` removes all motion.
7. Locked, mastered and error states are readable without colour.
8. Throttled mobile load stays smooth: no jank on scroll, no layout shift from fonts.
9. Routes, API calls, auth, scoring and data models are untouched and every existing feature still works.
10. Any new rule needed along the way has been added to this file.
