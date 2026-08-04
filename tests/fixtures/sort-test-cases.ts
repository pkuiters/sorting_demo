/**
 * Draft algorithm test case data (task #16, extended for v2).
 *
 * These are input/expected-sorted-output pairs for verifying the *correctness*
 * of the final sorted result produced by each algorithm. They intentionally
 * say nothing about how the step-by-step animation interface works (that's
 * negotiated between back-end and renderer) — correctness of the final
 * output is algorithm-agnostic, so the same shared case list is reused
 * across all algorithms, with extra edge cases layered on for algorithms
 * whose cost profile depends on more than just array length (see
 * `countingRadixExtraCases` below).
 *
 * v1 covered Bubble, Insertion, Merge, Quick. v2 adds Selection, Heap,
 * Shell, Counting, Radix — wired into runnable Vitest tests against
 * back-end's implementations in `tests/algorithms.test.ts`.
 */

export interface SortTestCase {
  /** Human-readable case name, used as the Vitest `it(...)` description later. */
  name: string;
  input: number[];
  expected: number[];
}

/**
 * Core cases required by task #16: empty array, single element,
 * already-sorted, reverse-sorted, and duplicate values — plus a few extra
 * cases worth covering while we're at it (identical values, negatives,
 * a larger mixed array to exercise more comparisons/swaps).
 */
export const sharedTestCases: SortTestCase[] = [
  {
    name: "empty array",
    input: [],
    expected: [],
  },
  {
    name: "single element",
    input: [42],
    expected: [42],
  },
  {
    name: "two elements, already in order",
    input: [1, 2],
    expected: [1, 2],
  },
  {
    name: "two elements, swapped",
    input: [2, 1],
    expected: [1, 2],
  },
  {
    name: "already sorted",
    input: [1, 2, 3, 4, 5, 6, 7],
    expected: [1, 2, 3, 4, 5, 6, 7],
  },
  {
    name: "reverse sorted",
    input: [9, 8, 7, 6, 5, 4, 3, 2, 1],
    expected: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  },
  {
    name: "duplicate values",
    input: [4, 2, 4, 1, 2, 4, 1],
    expected: [1, 1, 2, 2, 4, 4, 4],
  },
  {
    name: "all identical values",
    input: [7, 7, 7, 7, 7],
    expected: [7, 7, 7, 7, 7],
  },
  {
    name: "negative and positive mixed",
    input: [-3, 5, -1, 0, 2, -8],
    expected: [-8, -3, -1, 0, 2, 5],
  },
  {
    name: "larger mixed array",
    input: [23, 1, 45, 9, 3, 77, 12, 5, 66, 2, 89, 34, 0, -5, 100],
    expected: [-5, 0, 1, 2, 3, 5, 9, 12, 23, 34, 45, 66, 77, 89, 100],
  },
];

/**
 * Extra edge cases for counting sort and radix sort. Both are
 * non-comparison sorts whose cost scales with the *value range*
 * (max - min) rather than purely with array length — counting sort
 * allocates a count array sized to the range, and radix sort's number of
 * digit passes is driven by the largest (offset) value. Cases here are
 * chosen to exercise that dimension specifically, on top of the shared
 * cases every algorithm already gets:
 *
 * - "wide value range, small array": array length stays small but the
 *   value range is large and sparse (few distinct values re-occurring
 *   nowhere near each other) — the case v1's shared list doesn't cover,
 *   since none of those arrays have a range much larger than their length.
 * - "very sparse wide range": an extreme version (3 elements spanning a
 *   range of 5000) — cheap for a comparison sort, but sizes counting
 *   sort's internal count array to 5001 entries; keeps the value small
 *   enough to stay fast in a unit test while still being clearly
 *   disproportionate to array length.
 * - "multi-digit values requiring several radix passes": values spanning
 *   1 to 5 decimal digits, so radix sort's LSD loop must run through
 *   several digit passes (ones, tens, hundreds, thousands, ten-thousands)
 *   rather than bottoming out after one or two.
 */
export const countingRadixExtraCases: SortTestCase[] = [
  {
    name: "wide value range, small array",
    input: [500, 1, 250, 1000, 0],
    expected: [0, 1, 250, 500, 1000],
  },
  {
    name: "very sparse wide range",
    input: [0, 5000, 1],
    expected: [0, 1, 5000],
  },
  {
    name: "multi-digit values requiring several radix passes",
    input: [12345, 6, 789, 42, 10001, 999, 5],
    expected: [5, 6, 42, 789, 999, 10001, 12345],
  },
];

export const ALGORITHMS = [
  "bubble",
  "insertion",
  "merge",
  "quick",
  "selection",
  "heap",
  "shell",
  "counting",
  "radix",
] as const;
export type AlgorithmName = (typeof ALGORITHMS)[number];

/**
 * Per-algorithm view of the case list. Kept as a map (rather than one flat
 * array) so tests can loop `describe.each` over algorithms, and so an
 * algorithm-specific case (e.g. a quicksort worst-case pivot pattern) can be
 * appended to a single algorithm later without restructuring every case.
 *
 * Most algorithms point at the same shared list — correctness of the final
 * output doesn't depend on which algorithm produced it. Counting and radix
 * additionally get `countingRadixExtraCases` layered on, since their cost
 * profile (value range, not just length) warrants dedicated coverage.
 */
export const testCasesByAlgorithm: Record<AlgorithmName, SortTestCase[]> = {
  bubble: sharedTestCases,
  insertion: sharedTestCases,
  merge: sharedTestCases,
  quick: sharedTestCases,
  selection: sharedTestCases,
  heap: sharedTestCases,
  shell: sharedTestCases,
  counting: [...sharedTestCases, ...countingRadixExtraCases],
  radix: [...sharedTestCases, ...countingRadixExtraCases],
};
