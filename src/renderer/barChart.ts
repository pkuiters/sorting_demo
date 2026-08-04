/**
 * Canvas bar-chart renderer for a single algorithm panel.
 *
 * Owns exactly one <canvas> element and knows how to paint an array of numbers
 * as vertical bars, with the two indices touched by the most recent step
 * highlighted in a distinct color. Stateless about *why* a bar is highlighted —
 * RacePanel decides that from the step stream and passes it in on each draw().
 */

export type HighlightKind = "compare" | "swap" | "overwrite";

export interface Highlight {
  indices: number[];
  kind: HighlightKind;
}

export interface BarChartPalette {
  background: string;
  bar: string;
  compare: string;
  swap: string;
  overwrite: string;
  done: string;
}

export const DEFAULT_PALETTE: BarChartPalette = {
  background: "#161821",
  bar: "#5b8cff",
  compare: "#ffb020",
  swap: "#ff4d4f",
  overwrite: "#a855f7",
  done: "#22c55e",
};

const BAR_GAP_RATIO = 0.15; // fraction of each bar's slot left as gap

export class BarChartRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly palette: BarChartPalette;
  private resizeObserver: ResizeObserver | null = null;
  private cssWidth = 0;
  private cssHeight = 0;

  constructor(canvas: HTMLCanvasElement, palette: BarChartPalette = DEFAULT_PALETTE) {
    this.canvas = canvas;
    this.palette = palette;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("BarChartRenderer: canvas 2D context unavailable");
    }
    this.ctx = ctx;

    // Keep the backing store in sync with the element's actual CSS size (and
    // device pixel ratio) so bars stay crisp and don't stretch when the race
    // container is resized (e.g. selecting a different number of algorithms).
    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      this.applySize(width, height);
    });
    this.resizeObserver.observe(canvas);

    // Initial size in case the observer's first callback hasn't fired yet.
    const rect = canvas.getBoundingClientRect();
    this.applySize(rect.width, rect.height);
  }

  private applySize(cssWidth: number, cssHeight: number): void {
    if (cssWidth <= 0 || cssHeight <= 0) return;
    this.cssWidth = cssWidth;
    this.cssHeight = cssHeight;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(cssWidth * dpr);
    this.canvas.height = Math.round(cssHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /**
   * Paint the current array state. `highlight` marks the indices touched by the
   * most recently applied step (compare/swap/overwrite); pass null once the
   * panel has no "current" step to show (e.g. before the first step, or once
   * `done` is true — pass done=true instead in that case).
   */
  draw(array: number[], highlight: Highlight | null, done: boolean): void {
    const { ctx, palette, cssWidth: width, cssHeight: height } = this;
    if (width <= 0 || height <= 0 || array.length === 0) {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, width, height);

    const max = Math.max(...array, 1);
    const slotWidth = width / array.length;
    const barWidth = Math.max(1, slotWidth * (1 - BAR_GAP_RATIO));
    const highlightSet = new Set(highlight?.indices ?? []);
    const highlightColor = highlight ? palette[highlight.kind] : palette.bar;

    for (let i = 0; i < array.length; i++) {
      const value = array[i];
      const barHeight = (value / max) * height;
      const x = i * slotWidth + (slotWidth - barWidth) / 2;
      const y = height - barHeight;
      ctx.fillStyle = done ? palette.done : highlightSet.has(i) ? highlightColor : palette.bar;
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }

  /** Releases the ResizeObserver. Call when the panel is torn down. */
  destroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }
}
