import type { SortGenerator } from './types';

/**
 * Counting sort. Non-comparison-based: instead of comparing pairs of values,
 * it counts how many times each value occurs, turns those counts into prefix
 * sums (each value's final placement boundary), then places every value
 * directly into its final index in a single stable pass. Progress is modeled
 * entirely with `overwrite` steps as each value lands in its final position —
 * there's no meaningful `compare` step for a non-comparison sort, so none are
 * emitted.
 *
 * Classic counting sort assumes non-negative integers (values index directly
 * into the count array). To support negative input values, every value is
 * offset by the array's minimum for internal counting/indexing purposes only;
 * the values written out via `overwrite`/`done` are always the real,
 * un-offset values.
 *
 * Does not mutate the input array — operates on an internal copy.
 */
export function* countingSort(input: number[]): SortGenerator {
  const arr = [...input];
  const n = arr.length;

  if (n === 0) {
    yield { type: 'done', result: arr };
    return;
  }

  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const range = max - min + 1;

  // Count occurrences of each (offset) value.
  const count = new Array(range).fill(0);
  for (const v of arr) {
    count[v - min]++;
  }

  // Prefix sums: count[k] becomes the number of elements <= (k + min).
  for (let i = 1; i < range; i++) {
    count[i] += count[i - 1];
  }

  // Place each value into its final index. Walking the source array back to
  // front (and decrementing before placing) keeps the sort stable.
  const output = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    const v = arr[i];
    const pos = --count[v - min];
    output[pos] = v;
  }

  for (let i = 0; i < n; i++) {
    arr[i] = output[i];
    yield { type: 'overwrite', index: i, value: output[i] };
  }

  yield { type: 'done', result: arr };
}
