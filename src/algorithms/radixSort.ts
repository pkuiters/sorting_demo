import type { SortGenerator } from './types';

/**
 * LSD (least-significant-digit) radix sort, base 10. Repeatedly stable-sorts
 * the array by one decimal digit at a time — ones place first, then tens,
 * then hundreds, and so on — until a full pass over the most significant
 * digit of the largest value has happened. Each digit pass is itself a
 * counting sort keyed on that digit.
 *
 * Non-comparison-based, like counting sort: progress is modeled entirely with
 * `overwrite` steps as values get redistributed into their new positions at
 * the end of each digit pass (no `compare` steps are meaningful here).
 *
 * Classic radix sort assumes non-negative integers (digit extraction relies
 * on the value's sign never flipping the digit math). To support negative
 * input values, every value is offset by the array's minimum for internal
 * digit-extraction purposes only; the values written out via
 * `overwrite`/`done` always have the offset reversed back to the real value.
 *
 * Does not mutate the input array — operates on an internal copy.
 */
export function* radixSort(input: number[]): SortGenerator {
  const arr = [...input];
  const n = arr.length;

  if (n <= 1) {
    yield { type: 'done', result: arr };
    return;
  }

  const min = Math.min(...arr);
  // Internal offset-space view (all values >= 0) used only for digit math.
  let offsetArr = arr.map((v) => v - min);
  const maxOffset = Math.max(...offsetArr);

  // All values equal — already sorted, no digit passes needed.
  if (maxOffset === 0) {
    yield { type: 'done', result: arr };
    return;
  }

  for (let exp = 1; Math.floor(maxOffset / exp) > 0; exp *= 10) {
    const output = new Array<number>(n);
    const count = new Array(10).fill(0);

    for (let i = 0; i < n; i++) {
      const digit = Math.floor(offsetArr[i] / exp) % 10;
      count[digit]++;
    }
    for (let i = 1; i < 10; i++) {
      count[i] += count[i - 1];
    }

    // Stable placement: walk back to front, decrementing before placing.
    for (let i = n - 1; i >= 0; i--) {
      const digit = Math.floor(offsetArr[i] / exp) % 10;
      const pos = --count[digit];
      output[pos] = offsetArr[i];
    }

    offsetArr = output;

    for (let i = 0; i < n; i++) {
      const realValue = offsetArr[i] + min;
      arr[i] = realValue;
      yield { type: 'overwrite', index: i, value: realValue };
    }
  }

  yield { type: 'done', result: arr };
}
