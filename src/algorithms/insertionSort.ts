import type { SortGenerator } from './types';

/**
 * Insertion sort (adjacent-swap variant, for step-by-step observability). Builds
 * the sorted portion of the array one element at a time, sliding each new element
 * left via single-position swaps until it lands in its correct spot relative to
 * the already-sorted prefix.
 *
 * Does not mutate the input array — operates on an internal copy.
 */
export function* insertionSort(input: number[]): SortGenerator {
  const arr = [...input];
  const n = arr.length;

  for (let i = 1; i < n; i++) {
    let j = i;
    while (j > 0) {
      yield { type: 'compare', indices: [j - 1, j] };
      if (arr[j - 1] > arr[j]) {
        [arr[j - 1], arr[j]] = [arr[j], arr[j - 1]];
        yield { type: 'swap', indices: [j - 1, j] };
        j--;
      } else {
        break;
      }
    }
  }

  yield { type: 'done', result: arr };
}
