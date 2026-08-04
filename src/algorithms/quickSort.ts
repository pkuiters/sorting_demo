import type { SortGenerator, SortStep } from './types';

/**
 * Quick sort using Lomuto partition scheme (pivot = last element of the range).
 * Every partition comparison against the pivot is a `compare` step; every
 * in-place exchange during partitioning (including the final pivot placement)
 * is a `swap` step. Recurses on the two partitions around the pivot's final index.
 *
 * Does not mutate the input array — operates on an internal copy.
 */
export function* quickSort(input: number[]): SortGenerator {
  const arr = [...input];
  yield* quickSortRange(arr, 0, arr.length - 1);
  yield { type: 'done', result: arr };
}

function* quickSortRange(
  arr: number[],
  lo: number,
  hi: number
): Generator<SortStep, void, void> {
  if (lo >= hi) return;
  const pivotIndex = yield* partition(arr, lo, hi);
  yield* quickSortRange(arr, lo, pivotIndex - 1);
  yield* quickSortRange(arr, pivotIndex + 1, hi);
}

function* partition(
  arr: number[],
  lo: number,
  hi: number
): Generator<SortStep, number, void> {
  const pivot = arr[hi];
  let i = lo - 1;

  for (let j = lo; j < hi; j++) {
    yield { type: 'compare', indices: [j, hi] };
    if (arr[j] < pivot) {
      i++;
      if (i !== j) {
        [arr[i], arr[j]] = [arr[j], arr[i]];
        yield { type: 'swap', indices: [i, j] };
      }
    }
  }

  if (i + 1 !== hi) {
    [arr[i + 1], arr[hi]] = [arr[hi], arr[i + 1]];
    yield { type: 'swap', indices: [i + 1, hi] };
  }

  return i + 1;
}
