import type { SortGenerator, SortStep } from './types';

/**
 * Heap sort. Builds a max-heap in place (bottom-up heapify over the internal
 * copy), then repeatedly swaps the heap's root (the current maximum) with the
 * last unsorted element and sifts the new root down to restore the heap
 * property — shrinking the heap by one each time.
 *
 * Every value comparison during sift-down (child-vs-sibling, and
 * parent-vs-larger-child) is its own `compare` step; every exchange is its own
 * `swap` step.
 *
 * Does not mutate the input array — operates on an internal copy.
 */
export function* heapSort(input: number[]): SortGenerator {
  const arr = [...input];
  const n = arr.length;

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    yield* siftDown(arr, i, n);
  }

  for (let end = n - 1; end > 0; end--) {
    [arr[0], arr[end]] = [arr[end], arr[0]];
    yield { type: 'swap', indices: [0, end] };
    yield* siftDown(arr, 0, end);
  }

  yield { type: 'done', result: arr };
}

/**
 * Sifts the value at `start` down within the heap occupying arr[0, end), so the
 * max-heap property holds again rooted at `start`.
 */
function* siftDown(
  arr: number[],
  start: number,
  end: number
): Generator<SortStep, void, void> {
  let root = start;

  while (true) {
    let child = 2 * root + 1;
    if (child >= end) break;

    if (child + 1 < end) {
      yield { type: 'compare', indices: [child, child + 1] };
      if (arr[child + 1] > arr[child]) {
        child++;
      }
    }

    yield { type: 'compare', indices: [root, child] };
    if (arr[child] > arr[root]) {
      [arr[root], arr[child]] = [arr[child], arr[root]];
      yield { type: 'swap', indices: [root, child] };
      root = child;
    } else {
      break;
    }
  }
}
