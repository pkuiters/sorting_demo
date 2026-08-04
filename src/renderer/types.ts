/**
 * Public types for the renderer module — the surface UI negotiates against
 * (interface boundary 2). See src/renderer/index.ts for the entry point.
 */

/** The four algorithms back-end exposes, keyed by the same names UI's checkboxes use. */
export type AlgorithmName = "bubble" | "insertion" | "merge" | "quick";

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
}
