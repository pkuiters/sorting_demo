import type { SortGenerator } from './types';

/**
 * Selection sort. Repeatedly scans the unsorted suffix of the array to find its
 * minimum value, comparing each candidate against the current minimum, then
 * swaps that minimum into place at the front of the unsorted suffix.
 *
 * Does not mutate the input array — operates on an internal copy.
 */
export function* selectionSort(input: number[]): SortGenerator {
  const arr = [...input];
  const n = arr.length;

  for (let i = 0; i < n - 1; i++) {
    let minIndex = i;
    for (let j = i + 1; j < n; j++) {
      yield { type: 'compare', indices: [minIndex, j] };
      if (arr[j] < arr[minIndex]) {
        minIndex = j;
      }
    }
    if (minIndex !== i) {
      [arr[i], arr[minIndex]] = [arr[minIndex], arr[i]];
      yield { type: 'swap', indices: [i, minIndex] };
    }
  }

  yield { type: 'done', result: arr };
}
