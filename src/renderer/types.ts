/**
 * Public types for the renderer module — the surface UI negotiates against
 * (interface boundary 2). See src/renderer/index.ts for the entry point.
 */

/** The algorithms back-end exposes, keyed by the same names UI's checkboxes use. */
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

/** Live (and final) stats for a single algorithm's race panel. */
export interface AlgorithmStats {
  comparisons: number;
  swaps: number;
  elapsedMs: number;
  done: boolean;
}

/** Handle returned by startRace(); the only thing UI needs to drive/read a race. */
export interface RaceHandle {
  /** Stats for one algorithm's panel. Throws if `name` wasn't part of this race. */
  getStats(name: AlgorithmName): AlgorithmStats;
  /** Stats for every algorithm selected in this race, keyed by name. Only contains
   *  entries for the algorithms passed to startRace — never all four unconditionally. */
  getAllStats(): Partial<Record<AlgorithmName, AlgorithmStats>>;
  /** True once every selected algorithm has reached its `done` step. */
  isRaceComplete(): boolean;
  /** Stops the animation loop and clears the container's contents. Call before
   *  starting a new race (e.g. on randomize/reset) to avoid leaking RAF loops. */
  destroy(): void;

  /** Freezes the animation loop: panels stop auto-advancing steps. Rendering
   *  continues every frame (so resize/repaint stays responsive), but no panel
   *  pulls a new step from its generator until resume() or stepOnce(). Each
   *  panel's elapsedMs stat stops accumulating while paused, and picks back
   *  up from where it left off on resume(). No-op if already paused or if
   *  the race has already completed. */
  pause(): void;
  /** Un-freezes a paused race: panels resume auto-advancing steps at the
   *  current speed. No-op if not paused. */
  resume(): void;
  /** True if pause() has been called without a matching resume(). Starts false. */
  isPaused(): boolean;
  /** Manually advances exactly one step per panel, immediately (does not wait
   *  for the normal step-pacing interval) and repaints right away. Intended
   *  for step-through use while paused, but works regardless of pause state —
   *  calling it while running just forces one extra step on top of the normal
   *  cadence. No-op per panel once that panel is done. */
  stepOnce(): void;
  /** Live-changes the step-pacing interval (ms between auto-advanced steps;
   *  smaller = faster). Takes effect on the next tick. Does not affect
   *  stepOnce(), which always advances immediately regardless of speed. */
  setSpeed(intervalMs: number): void;
}
