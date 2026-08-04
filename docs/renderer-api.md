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
export type AlgorithmName = "bubble" | "insertion" | "merge" | "quick";

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
}

export const ARRAY_SIZE: number; // = 30
export function generateRandomArray(size?: number): number[];
export const ALGORITHM_LABELS: Record<AlgorithmName, string>;

export function startRace(
  container: HTMLElement,
  selectedAlgorithms: AlgorithmName[],
  array: number[],
): RaceHandle;
```

### Usage (ui side)

```ts
import { startRace, generateRandomArray, ARRAY_SIZE, type AlgorithmName, type RaceHandle } from "../renderer";

let handle: RaceHandle | null = null;

function onRandomizeOrStart(selected: AlgorithmName[]) {
  handle?.destroy(); // tear down the previous race's RAF loop + canvases first
  const array = generateRandomArray(); // ARRAY_SIZE elements by default
  handle = startRace(document.querySelector("#race-container")!, selected, array);

  const poll = setInterval(() => {
    if (!handle) return clearInterval(poll);
    updateStatsTable(handle.getAllStats()); // only has entries for `selected`
    if (handle.isRaceComplete()) clearInterval(poll);
  }, 100);
}
```

### Contract details

- **Container ownership**: renderer creates and owns all children of the
  `container` element passed to `startRace` for the lifetime of the race
  (one titled panel + canvas per selected algorithm, laid out side by side
  via flexbox, responsive to container width via `ResizeObserver`). ui hands
  over an empty container and doesn't touch its contents while a race is active.
- **`getAllStats()` scope**: only contains keys for the algorithms passed in
  `selectedAlgorithms` for that race — never all four unconditionally.
- **`destroy()`**: must be called before starting a new race on the same
  container (e.g. on randomize/reset), or the previous race's animation loop
  keeps running underneath the new one. Cancels the RAF loop, disconnects
  each panel's `ResizeObserver`, and clears the container's DOM.
- **Stats semantics**: `swaps` counts both `swap` steps (pairwise exchange —
  bubble/insertion/quick) and `overwrite` steps (single-index write — merge
  sort's buffer writeback). Both represent one array mutation; counting only
  `swap` would make merge sort's counter read 0 despite visibly moving bars,
  which would look like a bug rather than a fact about the algorithm.
  `elapsedMs` is wall-clock time since that panel's race started, frozen once
  `done` becomes true.
- **Pacing**: each panel advances at most one step per ~20ms of wall-clock
  time (a constant internal to `raceController.ts`, not exposed — speed
  control is out of scope for v1 per the app spec). This keeps O(n²) sorts
  (bubble/insertion) watchable over ~15-20s at `ARRAY_SIZE` while O(n log n)
  sorts (merge/quick) finish in a few seconds — the gap is the point of a
  race demo. Every rAF tick repaints regardless of whether a step advanced,
  so motion stays smooth.
- **`ARRAY_SIZE`**: fixed at 30 for v1 (array-size control is explicitly out
  of scope per the app spec). Exported so ui can display "N elements" without
  hardcoding the number twice.

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

Manually smoke-tested in a real browser (temporary harness, removed after
verification — not part of the shipped app) against the real `src/algorithms`
implementations: all 4 algorithms animate step-by-step (never jump to sorted),
highlight compare/swap/overwrite correctly, reach `done` with correctly sorted
output, stats numbers behave sensibly (bubble/insertion show far more
comparisons+swaps than merge/quick; elapsed time spreads out as expected for
a race), `getAllStats()` correctly scopes to only the selected subset when
fewer than 4 algorithms are chosen, and `destroy()` cleanly tears down and
allows a fresh race to start with a different algorithm subset without stale
panels or leaked animation frames. `npx tsc -b` and `npm run build` both pass
clean.
