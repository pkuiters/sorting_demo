/**
 * Public API for the sorting algorithms module.
 *
 * Each algorithm is a generator function: `(arr: number[]) => SortGenerator`.
 * None of them mutate the input array — each works on an internal copy — so the
 * same initial array can safely be handed to multiple generator instances at
 * once (e.g. one per race panel) with no shared-state hazard between them.
 *
 * Usage:
 *
 *   import { bubbleSort, type SortStep } from './algorithms';
 *
 *   const gen = bubbleSort([5, 3, 1, 4, 2]);
 *   let step: IteratorResult<SortStep, void> = gen.next();
 *   while (!step.done) {
 *     // handle step.value (compare | swap | overwrite | done)
 *     step = gen.next();
 *   }
 *
 * For synchronous/test use where only the final sorted result is needed, see
 * `runToCompletion` below — it drives a generator to its `done` step and
 * returns the sorted array directly.
 */

export type { SortStep, SortGenerator, SortAlgorithm } from './types';

export { bubbleSort } from './bubbleSort';
export { insertionSort } from './insertionSort';
export { mergeSort } from './mergeSort';
export { quickSort } from './quickSort';
export { selectionSort } from './selectionSort';
export { heapSort } from './heapSort';
export { shellSort } from './shellSort';
export { countingSort } from './countingSort';
export { radixSort } from './radixSort';

import type { SortGenerator } from './types';

/**
 * Drives a SortGenerator to completion and returns the final sorted array.
 * Convenience helper for tests / non-animated use — ignores intermediate steps.
 */
export function runToCompletion(gen: SortGenerator): number[] {
  let result: number[] | undefined;
  for (const step of gen) {
    if (step.type === 'done') {
      result = step.result;
    }
  }
  if (!result) {
    throw new Error('Sort generator completed without yielding a done step');
  }
  return result;
}
