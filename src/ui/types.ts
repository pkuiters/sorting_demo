/**
 * Shared UI-side types for the algorithm picker, controls, and stats display.
 *
 * `AlgorithmName` / `AlgorithmStats` / `ALGORITHM_LABELS` are re-exported
 * straight from renderer's real, finalized module (src/renderer/index.ts) —
 * this file is now just a thin barrel plus the two things renderer doesn't
 * own (the canonical "all four" list, and a zeroed-stats helper for initial
 * render), so the rest of src/ui/ didn't need to change imports.
 */

import type { AlgorithmName, AlgorithmStats } from "../renderer";

export type { AlgorithmName, AlgorithmStats };
export { ALGORITHM_LABELS } from "../renderer";

export const ALGORITHMS: readonly AlgorithmName[] = [
  "bubble",
  "insertion",
  "merge",
  "quick",
];

export function zeroStats(): AlgorithmStats {
  return { comparisons: 0, swaps: 0, elapsedMs: 0, done: false };
}
