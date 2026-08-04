/**
 * RaceController: orchestrates N side-by-side RacePanels sharing one
 * requestAnimationFrame loop. This is the RaceHandle returned by startRace().
 *
 * Pacing: each panel advances at most one step per STEP_INTERVAL_MS of
 * wall-clock time (decoupled from display refresh rate, so a 144Hz monitor
 * doesn't blow through the animation instantly). Every rAF tick still repaints
 * every panel, so motion stays smooth even between step advances.
 */
import {
  bubbleSort,
  insertionSort,
  mergeSort,
  quickSort,
  selectionSort,
  heapSort,
  shellSort,
  countingSort,
  radixSort,
} from "../algorithms";
import type { SortAlgorithm } from "../algorithms/types";
import { RacePanel } from "./panel";
import type { AlgorithmName, AlgorithmStats, RaceHandle } from "./types";

/** One step per panel at most this often, by default. Tuned so O(n²) sorts
 *  stay watchable (~15-20s at ARRAY_SIZE) without O(n log n) sorts feeling
 *  instant (~a few seconds) — the gap between the two is the point of a race
 *  demo. Configurable per-race via startRace()'s speedMs param, and live via
 *  RaceHandle.setSpeed(). */
const DEFAULT_STEP_INTERVAL_MS = 20;

const ALGORITHMS: Record<AlgorithmName, SortAlgorithm> = {
  bubble: bubbleSort,
  insertion: insertionSort,
  merge: mergeSort,
  quick: quickSort,
  selection: selectionSort,
  heap: heapSort,
  shell: shellSort,
  counting: countingSort,
  radix: radixSort,
};

export const ALGORITHM_LABELS: Record<AlgorithmName, string> = {
  bubble: "Bubble Sort",
  insertion: "Insertion Sort",
  merge: "Merge Sort",
  quick: "Quick Sort",
  selection: "Selection Sort",
  heap: "Heap Sort",
  shell: "Shell Sort",
  counting: "Counting Sort",
  radix: "Radix Sort",
};

// Panel chrome is styled from design-system CSS custom properties (see
// design/colors_and_type.css, imported globally by ui via src/main.ts).
// Unlike barChart.ts's canvas fillStyle, plain DOM element styles *can*
// reference var(...) directly and stay live — no getComputedStyle resolution
// needed here. Follows the design system's card recipe (surface bg, bw-1
// border-1, r-lg radius, shadow-sm) for the panel, and its header
// conventions (font-display/fw-semibold/fg-1 on a surface-2 well) for the
// title bar. Title uses --fs-sm rather than the larger --fs-md/--fs-lg the
// design system suggests for headers in general — panels are compact
// (min-width 180px) and 13px matches v1's original title size, so this
// keeps the existing layout density rather than growing the title bar.
function buildPanelElement(name: AlgorithmName): { wrapper: HTMLDivElement; canvas: HTMLCanvasElement } {
  const wrapper = document.createElement("div");
  wrapper.className = "race-panel";
  wrapper.style.cssText = [
    "display:flex",
    "flex-direction:column",
    "flex:1 1 0",
    "min-width:180px",
    "background:var(--surface)",
    "border:var(--bw-1) solid var(--border-1)",
    "border-radius:var(--r-lg)",
    "box-shadow:var(--shadow-sm)",
    "overflow:hidden",
  ].join(";");

  const title = document.createElement("div");
  title.className = "race-panel-title";
  title.textContent = ALGORITHM_LABELS[name];
  title.style.cssText = [
    "padding:6px 10px",
    "font-family:var(--font-display)",
    "font-size:var(--fs-sm)",
    "font-weight:var(--fw-semibold)",
    "line-height:var(--lh-snug)",
    "color:var(--fg-1)",
    "background:var(--surface-2)",
    "border-bottom:var(--bw-1) solid var(--border-1)",
  ].join(";");

  const canvas = document.createElement("canvas");
  canvas.style.cssText = ["display:block", "width:100%", "height:260px"].join(";");

  wrapper.appendChild(title);
  wrapper.appendChild(canvas);
  return { wrapper, canvas };
}

export class RaceController implements RaceHandle {
  private readonly container: HTMLElement;
  private readonly panels: RacePanel[];
  private rafId: number | null = null;
  private lastStepAt: number;
  private destroyed = false;
  private paused = false;
  private pauseStartedAt: number | null = null;
  private stepIntervalMs: number;

  constructor(
    container: HTMLElement,
    selectedAlgorithms: AlgorithmName[],
    array: number[],
    speedMs: number = DEFAULT_STEP_INTERVAL_MS,
  ) {
    this.container = container;
    container.innerHTML = "";
    container.style.cssText = ["display:flex", "flex-wrap:wrap", "gap:var(--space-3)", "width:100%"].join(";");
    this.stepIntervalMs = speedMs > 0 ? speedMs : DEFAULT_STEP_INTERVAL_MS;

    const now = performance.now();
    this.lastStepAt = now;

    this.panels = selectedAlgorithms.map((name) => {
      const { wrapper, canvas } = buildPanelElement(name);
      container.appendChild(wrapper);
      return new RacePanel(name, canvas, ALGORITHMS[name], array, now);
    });

    // Paint the initial (unsorted) state immediately so there's no blank frame
    // before the first tick, then start the loop.
    for (const panel of this.panels) panel.render(now);
    if (this.panels.length > 0 && !this.isRaceComplete()) {
      this.rafId = requestAnimationFrame(this.tick);
    }
  }

  private tick = (now: number): void => {
    if (this.destroyed) return;

    if (!this.paused && now - this.lastStepAt >= this.stepIntervalMs) {
      for (const panel of this.panels) panel.step();
      this.lastStepAt = now;
    }
    for (const panel of this.panels) panel.render(now);

    if (this.isRaceComplete()) {
      this.rafId = null;
      return;
    }
    // Keep the loop alive even while paused: rendering must stay responsive
    // (e.g. to container resizes) and this is the only path back to stepping
    // once resume() flips `paused` back off.
    this.rafId = requestAnimationFrame(this.tick);
  };

  getStats(name: AlgorithmName): AlgorithmStats {
    const panel = this.panels.find((p) => p.name === name);
    if (!panel) {
      throw new Error(`getStats: "${name}" is not part of this race`);
    }
    return panel.getStats();
  }

  getAllStats(): Partial<Record<AlgorithmName, AlgorithmStats>> {
    const stats: Partial<Record<AlgorithmName, AlgorithmStats>> = {};
    for (const panel of this.panels) {
      stats[panel.name] = panel.getStats();
    }
    return stats;
  }

  isRaceComplete(): boolean {
    return this.panels.every((p) => p.isDone());
  }

  destroy(): void {
    this.destroyed = true;
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    for (const panel of this.panels) panel.destroy();
    this.container.innerHTML = "";
  }

  pause(): void {
    if (this.destroyed || this.paused || this.isRaceComplete()) return;
    this.paused = true;
    this.pauseStartedAt = performance.now();
  }

  resume(): void {
    if (this.destroyed || !this.paused) return;
    const now = performance.now();
    const pausedDuration = this.pauseStartedAt != null ? now - this.pauseStartedAt : 0;
    for (const panel of this.panels) panel.addPausedTime(pausedDuration);
    this.paused = false;
    this.pauseStartedAt = null;
    // Reset so the next tick waits a full interval rather than treating the
    // paused-over time as "overdue" and firing a step immediately.
    this.lastStepAt = now;
  }

  isPaused(): boolean {
    return this.paused;
  }

  stepOnce(): void {
    if (this.destroyed) return;
    const now = performance.now();
    for (const panel of this.panels) panel.step();
    for (const panel of this.panels) panel.render(now);
    this.lastStepAt = now;
  }

  setSpeed(intervalMs: number): void {
    if (intervalMs > 0) {
      this.stepIntervalMs = intervalMs;
    }
  }
}
