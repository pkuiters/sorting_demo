# Peter — Personal Design System

A personal design system for Peter's interfaces, prototypes, and decks. Built around three principles: **fresh modern aesthetics**, a **colorblind-friendly palette**, and **clean, restrained styling**.

> Not a product. A toolkit. Most of what's in here is meant to disappear into the work.

---

## Origin & context

This system was designed from a brief — no existing codebase, Figma file, or brand assets were provided. Choices were made deliberately to:

- Use the **Wong (2011) colorblind-safe palette** as a color foundation. The eight Wong hues are distinguishable under deuteranopia, protanopia, and tritanopia simulation. Semantic colors (success/warning/danger) are assigned to hues that remain distinguishable from each other under all three.
- Avoid common AI-era tropes (bluish-purple gradients, emoji-heavy cards, generic Inter/Roboto).
- Default to a **light, warm off-white** background (`#FAFAF7`) over pure white — softer to read, more confident, less laundromat.

**Sources used:** none external. If real product context is added later, replace the placeholder UI kit and slides with recreations of the actual surfaces.

---

## Index

| File / folder              | Purpose                                                      |
| --------------------------- | ------------------------------------------------------------ |
| `colors_and_type.css`      | All design tokens: color, type, spacing, radii, shadow, motion |
| `README.md`                | This file — fundamentals, voice, visual language             |
| `SKILL.md`                 | Agent Skill manifest (cross-compatible with Claude Code)     |
| `preview/`                 | Cards rendered in the Design System tab                      |
| `assets/`                  | Logos, icons, illustrations, sample imagery                  |
| `ui_kits/personal-os/`     | Reference UI kit: a "personal OS" dashboard surface          |
| `slides/`                  | Slide templates: title, content, comparison, quote, section  |
| `fonts/`                   | Webfont notes (Google Fonts CDN — see Typography below)      |

---

## Content fundamentals

### Voice & tone

- **First person, lowercase, calm.** "i shipped this on a sunday." Not "I shipped this on a Sunday!!"
- **Direct address.** "you" when speaking to the reader. Avoid "users" and "consumers" — they sound like a market research deck.
- **No hype.** Never "revolutionize", "unleash", "supercharge", "amazing". Replace with concrete verbs: "rewrote", "shipped", "halved".
- **Specifics over adjectives.** "180ms ease-out" beats "snappy". "65ch line length" beats "comfortable".
- **Comfortable with silence.** Empty states say one short thing, not a paragraph.

### Casing

- **Sentence case for headings, labels, buttons.** "Save changes", not "Save Changes". Title Case only for proper nouns and the wordmark.
- **Code, keys, and identifiers stay verbatim:** `colors_and_type.css`, `--fg-1`, `Cmd+K`.
- **Numerics use figure-style:** `1,240 commits`, `$12.40`, `9:30 — 10:15`.

### Punctuation conventions

- Em-dash with hairspaces around it for asides — like this.
- Smart quotes ("curly") in prose; straight quotes in code only.
- Oxford comma, always.
- One space after periods.
- No exclamation marks except in genuine alerts ("Saved!" only when you really mean it).

### Emoji

- **Avoided in product UI.** Status uses semantic color + a Lucide icon, not 🟢🟡🔴.
- **Permitted in personal writing** (notes, captions, casual labels) at most one per paragraph.
- **Never as bullets, never as decoration on buttons or headers.**

### Sample copy

✅  *"shipped a new color system. 8 hues, all colorblind-safe. took two evenings."*
✅  Button: `Save changes` — Empty state: `Nothing here yet.` — Error: `Couldn't reach the server. Try again in a moment.`
❌  *"🚀 Introducing our REVOLUTIONARY new Color System that will SUPERCHARGE your designs!"*

---

## Visual foundations

### Color

- **Primary palette is the Wong colorblind-safe set.** Blue (`#0072B2`), orange (`#E69F00`), green (`#009E73`), vermillion (`#D55E00`), sky (`#56B4E9`), yellow (`#F0E442`), purple (`#CC79A7`), black (`#0F1115`).
- **Color is rare and means something.** Most surfaces are neutral — white/off-white on light, near-black on dark. Color shows up to mark state, action, or category, not for decoration.
- **Semantic assignments are stable.** Blue = primary action / link. Green = success. Orange = warning. Vermillion = danger/destructive. Sky = info. Yellow = highlight (selection, mark). Purple = categorical, never semantic.
- **Soft tints** (`--*-soft`) for backgrounds; **shifted darks** (`--*-fg`) for text on tints. AA contrast minimum.

### Typography

- **One typeface for UI:** **Hanken Grotesk** (variable, 300–800). A contemporary grotesque with clean, uncut joins — confident at display, quiet at body sizes. No ink traps, no display notches. Loaded from Google Fonts CDN.
- **One typeface for code:** **JetBrains Mono** (400/500/600). Ligatures off, stylistic set 01 on (straight `j`/`f`/`t`).
- **Type is sized in 8 steps** (`--fs-xs` through `--fs-5xl`). Tracking tightens as size grows — `-0.025em` at h1, neutral at body.
- **Tracking tightens as size grows.** `-0.025em` on `h1`, neutral on body, `+0.08em` (uppercase) on eyebrows.
- **Body text is `var(--fg-2)`**, not `--fg-1`. Pure black on white is a printing-press hangover.

### Spacing

- **4px base unit.** Eleven steps from `--space-0` (0) to `--space-10` (128).
- **`gap:` first** for groups of siblings. Margins only on text flow inside prose blocks. Inline whitespace is never load-bearing.
- **Section rhythm:** `--space-7` (48px) between sections on cards; `--space-9` (96px) on full pages.

### Borders & corners

- **1px borders win over shadows** for most separation. Shadows are reserved for elements that genuinely float (modals, menus, dropped cards).
- **Corner radii ladder:** `--r-xs` 4 → `--r-sm` 6 → `--r-md` 10 → `--r-lg` 14 → `--r-xl` 20 → `--r-2xl` 28 → `--r-pill` 999.
  Inputs and small buttons: `--r-sm`. Cards: `--r-lg`. Modals/sheets: `--r-xl`. Pills: `--r-pill`.
- **No mixed radii on the same element.** A card with `r-lg` outside has `r-md` inside (one step down) for inset elements.

### Shadows & elevation

- **Five steps**, layered (two-shadow stacks): `xs` (1px line), `sm` (resting card), `md` (hover lift), `lg` (popover/menu), `xl` (modal).
- **Tints, not blacks.** Shadow color is `rgba(15,17,21,0.04–0.18)` — the brand black at low opacity, not pure black.
- **No inner shadows.** No emboss, no neumorphism.

### Backgrounds

- **Default app background:** warm off-white `#FAFAF7` in light, deep near-black `#0B0D11` in dark. Never pure `#FFF` or `#000`.
- **Optional texture:** a faint 1px dotted grid at `--space-6` (32px) intervals at ~6% opacity. Used on landing-style surfaces, never inside cards. CSS:
  ```css
  background-image: radial-gradient(rgba(15,17,21,0.06) 1px, transparent 1px);
  background-size: 32px 32px;
  ```
- **No gradients on surfaces.** Gradients are permitted only as *protection* — a 64px fade at the top/bottom of scrolling content to hint overflow.
- **No background photography under text** without a solid scrim. If imagery is full-bleed, it gets a 40% solid overlay using `--bg`.

### Motion

- **Default duration: 180ms.** Fast micro-interactions: 120ms. Page-level transitions: 280ms.
- **Default easing: `--ease-out`** (`cubic-bezier(0.22, 0.61, 0.36, 1)`). Crisp arrival, no overshoot.
- **Spring** (`--ease-spring`) reserved for *additive* delight — a checkmark appearing, a dot bouncing in.
- **No fades-only transitions.** Always pair opacity with a 4–8px translate. Never animate `blur`.
- **`prefers-reduced-motion`** disables transforms and shortens durations to 1ms — provided automatically in `colors_and_type.css` once added (TODO if needed).

### Hover & press states

- **Hover (buttons/links):** background shifts one step toward `surface-2`; primary buttons darken `accent → accent-hover` (~10% darker).
- **Press:** background goes one step further darker; transform `translateY(0.5px) scale(0.99)`; transition `--dur-fast`.
- **Focus:** never use `outline`. Use `box-shadow: var(--ring)` — 2px bg gap + 2px accent ring, sits outside the element.
- **Disabled:** `opacity: 0.45`, `cursor: not-allowed`, no hover transition.

### Transparency & blur

- **Used sparingly.** Translucent surfaces only when something *behind* is meant to read through — sticky headers over scrolling content, command palettes over the app.
- **Recipe:** `background: color-mix(in oklab, var(--surface) 80%, transparent); backdrop-filter: blur(12px) saturate(140%);` with a 1px bottom border for definition.
- **Never on buttons or cards in flow.**

### Imagery

- **Warm-neutral, grainless.** No heavy filters, no Instagram. If a photo, prefer documentary tone — uncropped, natural light, slight desaturation OK.
- **Illustrations:** none generated. If needed, leave a placeholder card with a dotted outline and `[image]` label until a real asset is provided.

### Cards

- **Resting card:** `background: var(--surface)`, `border: 1px solid var(--border-1)`, `border-radius: var(--r-lg)`, `box-shadow: var(--shadow-sm)`, `padding: var(--space-5)`.
- **Hoverable card:** add `transition: transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)`; on hover, `transform: translateY(-1px)` and `box-shadow: var(--shadow-md)`.
- **Inset content (within a card)** drops one radius step and uses `--surface-2`.

### Layout rules

- **Max prose width: 65ch.** Read-heavy pages are constrained.
- **Max page width: 1200px** for app dashboards, 1080px for landing/marketing.
- **Sticky elements** carry the translucent surface recipe above. Never opaque-stuck on top of content.
- **No carousels.** Period.

---

## Iconography

- **Lucide** is the canonical icon set. Loaded via the official CDN: `https://unpkg.com/lucide-static@latest/icons/<name>.svg`. Many examples are pre-bundled in `assets/icons/lucide/`.
- **Why Lucide:** clean 24×24 grid, consistent 2px stroke, generous license, comprehensive set (~1,500 icons). Visually pairs well with Hanken Grotesk.
- **Sizing:** 16, 20, or 24 only. Don't scale to weird sizes.
- **Color:** `currentColor`. Inherit from the surrounding text. Never recolor an icon independently of its label.
- **Stroke width:** Lucide ships at `stroke-width: 2`. Don't change it.
- **Emoji as icon:** never in product UI. Permitted in personal/notes contexts.
- **Unicode as icon:** acceptable for: `→` `←` `↑` `↓` arrows in text flow, `·` middots between metadata, `…` ellipsis in truncation. Not as button glyphs.
- **Custom SVG icons:** avoided. If a Lucide icon doesn't exist for a concept, label with text and skip the icon. Drawing one-off SVGs creates inconsistency.

> **Iconography substitution flag:** Lucide is the chosen substitute since no project-specific icon system was provided. If you have a custom icon library, drop SVGs in `assets/icons/<setname>/` and update this section.

---

## Caveats & known gaps

- No real product or codebase exists yet; the included UI kit and slides are reference surfaces, not recreations.
- Font files are CDN-loaded. Offline use requires self-hosting (drop `.woff2` files in `fonts/` and update `@import`).
- The dark theme is tuned by hand, not measured. Do a real contrast audit before shipping anything mission-critical.
- Accessibility tested visually against Coblis/Sim Daltonism for the three common colorblindness types. Not formally WCAG-audited.
