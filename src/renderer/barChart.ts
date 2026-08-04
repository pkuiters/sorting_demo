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

/** Hardcoded fallback values, used per-role if the corresponding design-system
 *  token isn't resolvable yet (e.g. design/colors_and_type.css hasn't been
 *  <link>ed into index.html, or a var is missing) — keeps the chart rendering
 *  sensibly rather than with blank/invalid canvas colors. These are the same
 *  values v1 used directly before the design-system import. */
export const DEFAULT_PALETTE: BarChartPalette = {
  background: "#161821",
  bar: "#5b8cff",
  compare: "#ffb020",
  swap: "#ff4d4f",
  overwrite: "#a855f7",
  done: "#22c55e",
};

/** Maps each palette role to its design-system CSS custom property, per
 *  design/colors_and_type.css (Wong colorblind-safe palette; confirmed live
 *  by ui via src/main.ts's import). `bar` (the unhighlighted/default state)
 *  uses `--accent`, the design system's primary-action blue — bars are the
 *  chart's main content, not a "surface," so this reads as intentional
 *  rather than as color used where a neutral was expected. The three
 *  highlight roles map onto the design system's semantic state colors so
 *  every non-default bar color has a stable, documented meaning:
 *  compare = warning (orange), swap = danger (vermillion),
 *  overwrite = info (sky blue — merge sort's buffer writeback reads
 *  naturally as "informational," and it keeps all four highlight kinds
 *  drawn from the same semantic-state family rather than reaching for a raw
 *  hue). `--wong-purple` was considered for `overwrite` but rejected: the
 *  design system's own README marks purple "categorical, never semantic,"
 *  and overwrite *is* a semantic state, so `--info` fits the system's rules
 *  better. done = success (green). */
const PALETTE_VAR_NAMES: Record<keyof BarChartPalette, string> = {
  background: "--surface",
  bar: "--accent",
  compare: "--warning",
  swap: "--danger",
  overwrite: "--info",
  done: "--success",
};

/**
 * Resolves the current design-system tokens (from :root, respecting light/dark
 * via `:root[data-theme="dark"]`) into a concrete BarChartPalette. Canvas
 * `fillStyle` can't reference CSS custom properties directly the way DOM
 * element styles can, so this reads each token's computed value once via
 * getComputedStyle — call it at renderer construction time, not per-frame.
 * Falls back to DEFAULT_PALETTE per-role for any token that resolves empty.
 *
 * Note: because this resolves once rather than staying live, a panel's canvas
 * won't automatically repaint if the page's color theme changes mid-race.
 * Out of scope here — no live theme-switching requirement for this task.
 */
export function resolveDesignSystemPalette(): BarChartPalette {
  const styles = getComputedStyle(document.documentElement);
  const resolved = {} as BarChartPalette;
  for (const role of Object.keys(PALETTE_VAR_NAMES) as (keyof BarChartPalette)[]) {
    const value = styles.getPropertyValue(PALETTE_VAR_NAMES[role]).trim();
    resolved[role] = value || DEFAULT_PALETTE[role];
  }
  return resolved;
}

const BAR_GAP_RATIO = 0.15; // fraction of each bar's slot left as gap

export class BarChartRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly palette: BarChartPalette;
  private resizeObserver: ResizeObserver | null = null;
  private cssWidth = 0;
  private cssHeight = 0;

  constructor(canvas: HTMLCanvasElement, palette: BarChartPalette = resolveDesignSystemPalette()) {
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
