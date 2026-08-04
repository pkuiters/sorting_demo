import type { SortGenerator } from './types';

/**
 * Bubble sort. Repeatedly steps through the array, comparing adjacent pairs and
 * swapping them if out of order. Each pass "bubbles" the largest remaining value
 * to the end. Stops early once a full pass makes no swaps.
 *
 * Does not mutate the input array — operates on an internal copy.
 */
export function* bubbleSort(input: number[]): SortGenerator {
  const arr = [...input];
  const n = arr.length;

  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      yield { type: 'compare', indices: [j, j + 1] };
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        yield { type: 'swap', indices: [j, j + 1] };
        swapped = true;
      }
    }
    if (!swapped) break;
  }

  yield { type: 'done', result: arr };
}
