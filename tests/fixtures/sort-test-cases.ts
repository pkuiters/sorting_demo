/**
 * Draft algorithm test case data (task #16).
 *
 * These are input/expected-sorted-output pairs for verifying the *correctness*
 * of the final sorted result produced by each of the 4 algorithms (Bubble,
 * Insertion, Merge, Quick). They intentionally say nothing about how the
 * step-by-step animation interface works (that's negotiated between
 * back-end and renderer) — correctness of the final output is algorithm-
 * agnostic, so the same case list is reused for all 4 algorithms.
 *
 * Consumed later by task #18, which wires these into runnable Vitest tests
 * against back-end's finished algorithm implementations (blocked on back-end's
 * task #6). Not runnable yet on its own — no test runner is wired up.
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

export const ALGORITHMS = ["bubble", "insertion", "merge", "quick"] as const;
export type AlgorithmName = (typeof ALGORITHMS)[number];

/**
 * Per-algorithm view of the case list. Kept as a map (rather than one flat
 * array) so task #18 can loop `describe.each` over algorithms, and so an
 * algorithm-specific case (e.g. a quicksort worst-case pivot pattern) can be
 * appended to a single algorithm later without restructuring every case.
 *
 * All 4 currently point at the same shared list — correctness of the final
 * output doesn't depend on which algorithm produced it.
 */
export const testCasesByAlgorithm: Record<AlgorithmName, SortTestCase[]> = {
  bubble: sharedTestCases,
  insertion: sharedTestCases,
  merge: sharedTestCases,
  quick: sharedTestCases,
};
