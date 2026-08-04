---
name: peter-design
description: Use this skill to generate well-branded interfaces and assets for Peter's personal design system, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick reference

- **All tokens live in `colors_and_type.css`** — import it once, then use CSS vars (`var(--accent)`, `var(--fg-1)`, `var(--space-5)`, etc).
- **Fonts** (Google Fonts CDN): `Hanken Grotesk` for everything UI/display/body, `JetBrains Mono` for code.
- **Color palette is Wong colorblind-safe.** Hex values and semantic assignments are in `README.md` → Visual foundations → Color.
- **Icons:** Lucide via CDN (`https://unpkg.com/lucide-static@latest/icons/<name>.svg`). Never draw one-off SVGs.
- **Voice:** lowercase, calm, specifics over adjectives, no emoji in product UI. Examples in `preview/voice.html`.
- **UI kit:** `ui_kits/personal-os/` — a click-thru reference dashboard demonstrating cards, tasks, notes, sidebar, top bar, command palette.
- **Slide templates:** `slides/index.html` — title / section / content / quote / stats / comparison / closing.

## Files in this skill

| Path                          | What it is                                          |
| ------------------------------ | ----------------------------------------------------- |
| `README.md`                   | Full system: voice, visual foundations, iconography |
| `colors_and_type.css`         | All design tokens (CSS vars)                        |
| `assets/`                     | Logos + wordmark SVGs                               |
| `fonts/`                       | Font notes (CDN today; replace with local files)   |
| `preview/`                    | Token cards (colors, type, spacing, components)     |
| `ui_kits/personal-os/`        | Reference dashboard UI kit (React + Babel)          |
| `slides/`                      | 16:9 deck templates with `deck-stage` web component |
