# Renderer module — public API

Owner: `renderer`. Source: `src/renderer/`. This documents interface boundary 2
(renderer ↔ ui), as negotiated and now implemented, plus a summary of interface
boundary 1 (back-end ↔ renderer) for context since renderer is the consumer.

## What renderer owns

- Canvas bar-chart rendering for a single algorithm panel (`src/renderer/barChart.ts`)
- Race-panel layout for N side-by-side panels (`src/renderer/raceController.ts`)
- The animation loop that pulls steps from back-end's generators and paces them
  so sorting is visibly step-by-step, never an instant jump (`src/renderer/panel.ts`,
  `src/renderer/raceController.ts`)
- Stats computation (comparisons, swaps, elapsed time), derived from the same
  step stream as it's consumed for animation (`src/renderer/panel.ts`)
- Random array generation for race starts (`src/renderer/randomArray.ts`)

## Public API — `src/renderer/index.ts`

```ts
export type AlgorithmName =
  | "bubble"
  | "insertion"
  | "merge"
  | "quick"
  | "selection"
  | "heap"
  | "shell"
  | "counting"
  | "radix";

export interface AlgorithmStats {
  comparisons: number;
  swaps: number;
  elapsedMs: number;
  done: boolean;
}

export interface RaceHandle {
  getStats(name: AlgorithmName): AlgorithmStats;
  getAllStats(): Partial<Record<AlgorithmName, AlgorithmStats>>;
  isRaceComplete(): boolean;
  destroy(): void;

  pause(): void;
  resume(): void;
  isPaused(): boolean;
  stepOnce(): void;
  setSpeed(intervalMs: number): void;
}

export const ARRAY_SIZE: number; // = 30
export function generateRandomArray(size?: number): number[];
export const ALGORITHM_LABELS: Record<AlgorithmName, string>;

export function startRace(
  container: HTMLElement,
  selectedAlgorithms: AlgorithmName[],
  array: number[],
  speedMs?: number, // ms between steps; default 20
): RaceHandle;
```

### Usage (ui side)

```ts
import { startRace, generateRandomArray, ARRAY_SIZE, type AlgorithmName, type RaceHandle } from "../renderer";

let handle: RaceHandle | null = null;

function onRandomizeOrStart(selected: AlgorithmName[], speedMs?: number) {
  handle?.destroy(); // tear down the previous race's RAF loop + canvases first
  const array = generateRandomArray(); // ARRAY_SIZE elements by default
  handle = startRace(document.querySelector("#race-container")!, selected, array, speedMs);

  const poll = setInterval(() => {
    if (!handle) return clearInterval(poll);
    updateStatsTable(handle.getAllStats()); // only has entries for `selected`
    if (handle.isRaceComplete()) clearInterval(poll);
  }, 100);
}

// Pause/resume/step-through:
function onPauseToggle() {
  if (!handle) return;
  if (handle.isPaused()) handle.resume();
  else handle.pause();
}
function onStep() {
  handle?.stepOnce(); // typical usage: only meaningful while paused
}

// Live speed change (e.g. from a slider):
function onSpeedChange(intervalMs: number) {
  handle?.setSpeed(intervalMs);
}
```

### Contract details

- **Container ownership**: renderer creates and owns all children of the
  `container` element passed to `startRace` for the lifetime of the race
  (one titled panel + canvas per selected algorithm, laid out side by side
  via flexbox, responsive to container width via `ResizeObserver`). ui hands
  over an empty container and doesn't touch its contents while a race is active.
- **`getAllStats()` scope**: only contains keys for the algorithms passed in
  `selectedAlgorithms` for that race — never all nine unconditionally.
- **`destroy()`**: must be called before starting a new race on the same
  container (e.g. on randomize/reset), or the previous race's animation loop
  keeps running underneath the new one. Cancels the RAF loop, disconnects
  each panel's `ResizeObserver`, and clears the container's DOM.
- **Stats semantics**: `swaps` counts both `swap` steps (pairwise exchange —
  bubble/insertion/selection/quick/heap) and `overwrite` steps (single-index
  write — merge sort's buffer writeback, shell sort's gapped insertion, and
  counting/radix sort's placement into their output array). Both represent
  one array mutation; counting only `swap` would make merge sort's counter
  read 0 despite visibly moving bars, which would look like a bug rather than
  a fact about the algorithm. Note counting/radix sort are non-comparison
  sorts and never emit `compare` steps, so their `comparisons` stat stays 0 —
  that's expected, not a bug. `elapsedMs` is wall-clock time since that
  panel's race started, excluding any time spent paused (see below), frozen
  once `done` becomes true.
- **Pacing**: each panel advances at most one step per `speedMs` of
  wall-clock time (default 20ms, matching v1). This keeps O(n²) sorts
  (bubble/insertion/selection/shell at small gaps) watchable over ~15-20s at
  `ARRAY_SIZE` while O(n log n) sorts (merge/quick/heap) and the linear
  non-comparison sorts (counting/radix) finish in a few seconds at the
  default speed — the gap is the point of a race demo. Every rAF tick
  repaints regardless of whether a step advanced, so motion stays smooth.
  Pass `speedMs` to `startRace()` to set the initial pace, or call
  `handle.setSpeed(intervalMs)` to change it live mid-race (takes effect on
  the next tick).
- **`ARRAY_SIZE`**: fixed at 30 for v1/v2 (array-size control remains out of
  scope). Exported so ui can display "N elements" without hardcoding the
  number twice.
- **Pause/resume/step-through**: `pause()` freezes step-advancing (rendering
  continues every frame so resizes stay responsive); `resume()` un-freezes
  and resumes auto-stepping at the current speed. `isPaused()` starts `false`.
  `stepOnce()` manually advances exactly one step per panel immediately,
  bypassing the pacing interval and repainting right away — intended for use
  while paused, but not blocked if called while running (it just forces one
  extra step on top of normal cadence). `getStats()`/`getAllStats()` and
  `isRaceComplete()` reflect `stepOnce()`'s effect immediately (synchronous
  state mutation, no polling delay), so it's safe to check
  `isRaceComplete()` right after a `stepOnce()` call to decide whether to
  disable step/pause controls. Each panel's `elapsedMs` stat excludes time
  spent paused — the clock stops on `pause()` and resumes from where it left
  off on `resume()`, rather than counting wall-clock time the race was
  frozen.

## Design-system integration

`design/colors_and_type.css` (Wong colorblind-safe token set) is imported
globally by `ui` via `src/main.ts`, so its CSS custom properties resolve on
`:root` app-wide by the time a race is started. Renderer sources its colors
and panel typography from it rather than hardcoded hex, via two different
mechanisms depending on where the color is consumed:

- **`barChart.ts` (canvas)**: canvas `fillStyle` can't reference `var(...)`
  directly — it's a plain JS string evaluated once per draw call, not a live
  CSS value. `resolveDesignSystemPalette()` reads each token's computed value
  once (via `getComputedStyle(document.documentElement)`) at
  `BarChartRenderer` construction time and bakes it into a concrete
  `BarChartPalette`. `DEFAULT_PALETTE` keeps the original v1 hardcoded hex
  values as a per-role fallback for any token that resolves empty (e.g. if
  the stylesheet somehow isn't linked). Because resolution happens once, a
  panel's canvas does **not** live-update if the page's color theme changes
  mid-race — out of scope for this task, no theme-toggle requirement exists
  yet.
- **`raceController.ts`'s `buildPanelElement` (DOM)**: plain HTML element
  inline styles *can* reference `var(--token)` directly and stay live as part
  of the normal CSS cascade — no `getComputedStyle` needed. If the stylesheet
  isn't linked yet when a panel element is created, the vars are simply
  undefined and the browser falls back to each property's initial/inherited
  value; once linked, the same elements pick up real values automatically on
  the next style recalculation, with no renderer-side code change required.

Palette role → token mapping (`barChart.ts`'s `PALETTE_VAR_NAMES`):

| Role        | Token             | Rationale |
|-------------|-------------------|-----------|
| `background`| `--surface`       | Matches panel chrome background so the canvas blends into its card. |
| `bar`       | `--accent`        | Bars are the chart's main content, not a neutral "surface" — the primary-action blue reads as intentional. |
| `compare`   | `--warning`       | Semantic "attention" state. |
| `swap`      | `--danger`        | Semantic "mutation/error-adjacent" state. |
| `overwrite` | `--info`          | Semantic "informational" state — merge sort's buffer writeback reads naturally as informational, and it keeps all four highlight kinds drawn from the semantic-state family rather than a raw hue. `--wong-purple` was considered but rejected: the design system's own README marks purple "categorical, never semantic," and overwrite *is* a semantic state. |
| `done`      | `--success`       | Semantic "complete/positive" state. |

Panel chrome (`buildPanelElement`): background `var(--surface)`, border `1px
solid var(--border-1)`, radius `var(--r-lg)`, shadow `var(--shadow-sm)` (the
design system's card recipe). Title bar: `var(--font-display)` /
`var(--fw-semibold)` / `var(--fg-1)` text on a `var(--surface-2)` well,
separated by a `var(--border-1)` rule — the design system's header
convention. Title font size intentionally stays at `--fs-sm` (13px, matching
v1) rather than the larger `--fs-md`/`--fs-lg` the design system suggests for
headers generally — panels are compact (`min-width: 180px`) and growing the
title would eat into canvas space.

**Verified in-browser** (see Verification performed below): panel background
resolved to `#FFFFFF` (`--surface`), border to `#E6E5DE` (`--border-1`),
radius to `14px` (`--r-lg`), title font-family to `"Hanken Grotesk"`
(`--font-display`), weight `600` (`--fw-semibold`), title color to
`rgb(15,17,21)` (`--fg-1`), title background to `rgb(244,244,240)`
(`--surface-2`); canvas bar pixels sampled at exactly `rgb(0,114,178)` =
`#0072B2` = `--accent`.

## Interface boundary 1 (consumed from back-end) — for context

Renderer drives each algorithm via a plain generator, imported from
`src/algorithms`:

```ts
export type SortStep =
  | { type: "compare"; indices: [number, number] }
  | { type: "swap"; indices: [number, number] }
  | { type: "overwrite"; index: number; value: number }
  | { type: "done"; result: number[] };

export type SortAlgorithm = (arr: number[]) => Generator<SortStep, void, void>;
```

Renderer never reads or mutates the array passed into an algorithm — each
`RacePanel` keeps its own local mirror array, seeded from the same initial
values as every other panel in the race, and applies `swap`/`overwrite`
steps to that mirror itself as it pulls them one at a time. `done.result` is
used as an authoritative correctness cross-check/final value rather than
trusting the mirror's replay to have stayed in sync. This is what allows N
panels to animate the same starting array completely independently, off N
separate generator instances, with no shared mutable state between them.

## Verification performed

**v1**: Manually smoke-tested in a real browser (temporary harness, removed
after verification — not part of the shipped app) against the real
`src/algorithms` implementations: all 4 algorithms animate step-by-step
(never jump to sorted), highlight compare/swap/overwrite correctly, reach
`done` with correctly sorted output, stats numbers behave sensibly
(bubble/insertion show far more comparisons+swaps than merge/quick; elapsed
time spreads out as expected for a race), `getAllStats()` correctly scopes to
only the selected subset when fewer than 4 algorithms are chosen, and
`destroy()` cleanly tears down and allows a fresh race to start with a
different algorithm subset without stale panels or leaked animation frames.

**v2**: `npx tsc -b` passes clean against the full set of changes below.
`back-end` separately verified all 5 new algorithms' correctness against
`tests/fixtures/sort-test-cases.ts` before handing off export names, and `qa`
owns end-to-end verification of the wired-up app. Renderer additionally did a
live in-browser check of the design-system integration specifically (see
above for exact resolved values): loaded the running app, started a race with
all 9 algorithms selected, confirmed 9 panels + 9 canvases render, and
inspected computed styles/canvas pixel data directly via devtools-equivalent
JS execution rather than a full manual pass of every interaction (pause/step/
speed UI wiring belongs to `ui`; `qa` covers full end-to-end):

- Pause/resume/step-through (`pause()`, `resume()`, `isPaused()`,
  `stepOnce()`) added to `RaceController`/`RacePanel`/`RaceHandle`, negotiated
  with `ui` beforehand.
- Speed control (`speedMs` param on `startRace()`, `setSpeed()` on
  `RaceHandle`) added, default unchanged at 20ms.
- All 5 new algorithms from back-end (selection/heap/shell/counting/radix)
  wired into `AlgorithmName`, `ALGORITHMS`, and `ALGORITHM_LABELS` — no other
  renderer code needed to change, confirming the `SortAlgorithm`/`SortStep`
  interface genuinely decouples renderer from algorithm count.
- Design-system colors/typography applied to `barChart.ts`'s palette and
  `raceController.ts`'s panel chrome (see Design-system integration above);
  confirmed resolving to real values in-browser after `ui` linked the
  stylesheet, both for the canvas (pixel-sampled) and DOM panel chrome
  (computed-style-inspected).
