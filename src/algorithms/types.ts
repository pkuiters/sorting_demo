/**
 * Shared step-data interface between back-end (sorting algorithms) and renderer
 * (animation loop). Negotiated with renderer — see docs in project chat history.
 *
 * Each algorithm is a generator function over a plain number[] input. It does NOT
 * mutate the caller's array (it works on an internal copy) — the only thing a
 * consumer should react to is the yielded steps. This lets multiple generator
 * instances (e.g. one per race panel) run independently over the same initial
 * array with no shared mutable state between them.
 *
 * Step semantics:
 * - `compare`  — a comparison between the values at the two indices. No mutation.
 * - `swap`     — the values at the two indices are exchanged in place.
 * - `overwrite`— the value at a single index is set directly, without a swap
 *                partner (needed for merge sort's writeback from its temp buffer,
 *                which doesn't map 1:1 onto a swap).
 * - `done`     — always the final step yielded. Carries the fully sorted array as
 *                a definitive completion signal / correctness cross-check.
 *
 * Every comparison and every mutation is its own yielded step — never batched.
 */
export type SortStep =
  | { type: 'compare'; indices: [number, number] }
  | { type: 'swap'; indices: [number, number] }
  | { type: 'overwrite'; index: number; value: number }
  | { type: 'done'; result: number[] };

export type SortGenerator = Generator<SortStep, void, void>;

export type SortAlgorithm = (arr: number[]) => SortGenerator;
