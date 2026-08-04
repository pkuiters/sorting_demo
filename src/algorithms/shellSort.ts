import type { SortGenerator } from './types';

/**
 * Shell sort using the classic halving gap sequence (n/2, n/4, ..., 1). For
 * each gap, performs a gapped insertion sort: elements `gap` apart are compared
 * and, if out of order, swapped and the walk continues backward by `gap` until
 * the element is in place relative to its gapped predecessors. As the gap
 * shrinks to 1, this degenerates into a regular adjacent-swap insertion sort
 * pass over an array that's already mostly ordered.
 *
 * Does not mutate the input array — operates on an internal copy.
 */
export function* shellSort(input: number[]): SortGenerator {
  const arr = [...input];
  const n = arr.length;

  for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
    for (let i = gap; i < n; i++) {
      let j = i;
      while (j >= gap) {
        yield { type: 'compare', indices: [j - gap, j] };
        if (arr[j - gap] > arr[j]) {
          [arr[j - gap], arr[j]] = [arr[j], arr[j - gap]];
          yield { type: 'swap', indices: [j - gap, j] };
          j -= gap;
        } else {
          break;
        }
      }
    }
  }

  yield { type: 'done', result: arr };
}
