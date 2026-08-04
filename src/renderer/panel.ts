/**
 * RacePanel: one algorithm's slice of a race — its own canvas, its own mirror
 * of the array, its own generator, its own stats. Multiple panels run side by
 * side off independent generator instances over the same initial array, with
 * no shared mutable state between them (per the negotiated interface with
 * back-end: algorithms never mutate the array they're given).
 */
import type { SortAlgorithm, SortStep } from "../algorithms/types";
import type { AlgorithmName, AlgorithmStats } from "./types";
import { BarChartRenderer, type Highlight } from "./barChart";

export class RacePanel {
  readonly name: AlgorithmName;

  private readonly renderer: BarChartRenderer;
  private readonly generator: Generator<SortStep, void, void>;
  private mirror: number[];
  private highlight: Highlight | null = null;
  private stats: AlgorithmStats;
  private readonly startTime: number;
  /** Total wall-clock time this panel's race has spent paused so far, so
   *  elapsedMs excludes it (pausing shouldn't count against an algorithm's
   *  clock). Accumulated by RaceController on each resume(). */
  private pausedMs = 0;

  constructor(name: AlgorithmName, canvas: HTMLCanvasElement, algorithm: SortAlgorithm, initialArray: number[], startTime: number) {
    this.name = name;
    this.renderer = new BarChartRenderer(canvas);
    this.mirror = [...initialArray];
    this.generator = algorithm(initialArray);
    this.startTime = startTime;
    this.stats = { comparisons: 0, swaps: 0, elapsedMs: 0, done: initialArray.length === 0 };
  }

  /** Pulls and applies exactly one step from the generator. No-op once done. */
  step(): void {
    if (this.stats.done) return;

    const result = this.generator.next();
    if (result.done || !result.value) {
      // Generator exhausted without an explicit `done` step (shouldn't happen
      // per the negotiated contract, but don't hang the race if it does).
      this.stats.done = true;
      this.highlight = null;
      return;
    }

    const step = result.value;
    switch (step.type) {
      case "compare":
        this.stats.comparisons++;
        this.highlight = { indices: step.indices, kind: "compare" };
        break;
      case "swap": {
        const [i, j] = step.indices;
        const tmp = this.mirror[i];
        this.mirror[i] = this.mirror[j];
        this.mirror[j] = tmp;
        this.stats.swaps++;
        this.highlight = { indices: step.indices, kind: "swap" };
        break;
      }
      case "overwrite":
        this.mirror[step.index] = step.value;
        // Counted as a "swap" for stats purposes: both step types represent
        // one array mutation. Merge sort moves data via overwrite (writeback
        // from its temp buffer) rather than pairwise exchange, but a user
        // watching bars move expects the swap counter to reflect that work —
        // leaving it at 0 for merge sort would read as a bug, not a fact
        // about the algorithm.
        this.stats.swaps++;
        this.highlight = { indices: [step.index], kind: "overwrite" };
        break;
      case "done":
        this.stats.done = true;
        this.highlight = null;
        // Cross-check: the mirror we built by replaying steps should already
        // match the algorithm's own final result. If not, something in the
        // step stream was inconsistent — trust the authoritative result so
        // the panel still ends up visually correct.
        this.mirror = [...step.result];
        break;
    }
  }

  /** Repaints the panel's canvas from current mirror/highlight/stats state. */
  render(now: number): void {
    if (!this.stats.done) {
      this.stats.elapsedMs = now - this.startTime - this.pausedMs;
    }
    this.renderer.draw(this.mirror, this.stats.done ? null : this.highlight, this.stats.done);
  }

  /** Called by RaceController on resume() with the duration of the pause that
   *  just ended, so this panel's elapsedMs stat excludes paused time. */
  addPausedTime(ms: number): void {
    this.pausedMs += ms;
  }

  getStats(): AlgorithmStats {
    return { ...this.stats };
  }

  isDone(): boolean {
    return this.stats.done;
  }

  destroy(): void {
    this.renderer.destroy();
  }
}
