/**
 * RaceController: orchestrates N side-by-side RacePanels sharing one
 * requestAnimationFrame loop. This is the RaceHandle returned by startRace().
 *
 * Pacing: each panel advances at most one step per STEP_INTERVAL_MS of
 * wall-clock time (decoupled from display refresh rate, so a 144Hz monitor
 * doesn't blow through the animation instantly). Every rAF tick still repaints
 * every panel, so motion stays smooth even between step advances.
 */
import { bubbleSort, insertionSort, mergeSort, quickSort } from "../algorithms";
import type { SortAlgorithm } from "../algorithms/types";
import { RacePanel } from "./panel";
import type { AlgorithmName, AlgorithmStats, RaceHandle } from "./types";

/** One step per panel at most this often. Tuned so O(n²) sorts stay watchable
 *  (~15-20s at ARRAY_SIZE) without O(n log n) sorts feeling instant (~a few
 *  seconds) — the gap between the two is the point of a race demo. */
const STEP_INTERVAL_MS = 20;

const ALGORITHMS: Record<AlgorithmName, SortAlgorithm> = {
  bubble: bubbleSort,
  insertion: insertionSort,
  merge: mergeSort,
  quick: quickSort,
};

export const ALGORITHM_LABELS: Record<AlgorithmName, string> = {
  bubble: "Bubble Sort",
  insertion: "Insertion Sort",
  merge: "Merge Sort",
  quick: "Quick Sort",
};

function buildPanelElement(name: AlgorithmName): { wrapper: HTMLDivElement; canvas: HTMLCanvasElement } {
  const wrapper = document.createElement("div");
  wrapper.className = "race-panel";
  wrapper.style.cssText = [
    "display:flex",
    "flex-direction:column",
    "flex:1 1 0",
    "min-width:180px",
    "background:#0d0e13",
    "border:1px solid #2a2d3a",
    "border-radius:8px",
    "overflow:hidden",
  ].join(";");

  const title = document.createElement("div");
  title.className = "race-panel-title";
  title.textContent = ALGORITHM_LABELS[name];
  title.style.cssText = [
    "padding:6px 10px",
    "font:600 13px system-ui, sans-serif",
    "color:#e6e8f0",
    "background:#1b1d29",
    "border-bottom:1px solid #2a2d3a",
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

  constructor(container: HTMLElement, selectedAlgorithms: AlgorithmName[], array: number[]) {
    this.container = container;
    container.innerHTML = "";
    container.style.cssText = ["display:flex", "flex-wrap:wrap", "gap:12px", "width:100%"].join(";");

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

    if (now - this.lastStepAt >= STEP_INTERVAL_MS) {
      for (const panel of this.panels) panel.step();
      this.lastStepAt = now;
    }
    for (const panel of this.panels) panel.render(now);

    if (this.isRaceComplete()) {
      this.rafId = null;
      return;
    }
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
}
