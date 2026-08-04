import type { SortGenerator, SortStep } from './types';

/**
 * Top-down merge sort. Recursively splits the array in half, sorts each half,
 * then merges the two sorted halves back together.
 *
 * The merge phase copies from temporary left/right buffers back into the working
 * array — those writes don't have a 1:1 swap partner, so they're expressed as
 * `overwrite` steps (index + value) rather than `swap` steps. Comparisons during
 * the merge reference the *current* positions of the two candidate values in the
 * working array (lo+i and mid+1+j), since arr[lo..mid] and arr[mid+1..hi] still
 * hold the two sorted halves at the moment of comparison, prior to being
 * overwritten by the merge.
 *
 * Does not mutate the input array — operates on an internal copy.
 */
export function* mergeSort(input: number[]): SortGenerator {
  const arr = [...input];
  yield* mergeSortRange(arr, 0, arr.length - 1);
  yield { type: 'done', result: arr };
}

function* mergeSortRange(
  arr: number[],
  lo: number,
  hi: number
): Generator<SortStep, void, void> {
  if (lo >= hi) return;
  const mid = Math.floor((lo + hi) / 2);
  yield* mergeSortRange(arr, lo, mid);
  yield* mergeSortRange(arr, mid + 1, hi);
  yield* merge(arr, lo, mid, hi);
}

function* merge(
  arr: number[],
  lo: number,
  mid: number,
  hi: number
): Generator<SortStep, void, void> {
  const left = arr.slice(lo, mid + 1);
  const right = arr.slice(mid + 1, hi + 1);
  let i = 0;
  let j = 0;
  let k = lo;

  while (i < left.length && j < right.length) {
    yield { type: 'compare', indices: [lo + i, mid + 1 + j] };
    if (left[i] <= right[j]) {
      arr[k] = left[i];
      yield { type: 'overwrite', index: k, value: left[i] };
      i++;
    } else {
      arr[k] = right[j];
      yield { type: 'overwrite', index: k, value: right[j] };
      j++;
    }
    k++;
  }

  while (i < left.length) {
    arr[k] = left[i];
    yield { type: 'overwrite', index: k, value: left[i] };
    i++;
    k++;
  }

  while (j < right.length) {
    arr[k] = right[j];
    yield { type: 'overwrite', index: k, value: right[j] };
    j++;
    k++;
  }
}
