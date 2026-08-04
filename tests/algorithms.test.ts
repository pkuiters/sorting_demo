import { describe, it, expect } from "vitest";
import {
  bubbleSort,
  insertionSort,
  mergeSort,
  quickSort,
  selectionSort,
  heapSort,
  shellSort,
  countingSort,
  radixSort,
  runToCompletion,
  type SortAlgorithm,
} from "../src/algorithms";
import {
  ALGORITHMS,
  testCasesByAlgorithm,
  type AlgorithmName,
} from "./fixtures/sort-test-cases";

/**
 * Task #18: wires the task #16 test data into runnable Vitest tests against
 * back-end's finished algorithm implementations. Extended for v2 to cover
 * the 5 new algorithms (Selection, Heap, Shell, Counting, Radix) alongside
 * the original 4 (Bubble, Insertion, Merge, Quick) — same contract checks
 * apply to all 9.
 */

const implementations: Record<AlgorithmName, SortAlgorithm> = {
  bubble: bubbleSort,
  insertion: insertionSort,
  merge: mergeSort,
  quick: quickSort,
  selection: selectionSort,
  heap: heapSort,
  shell: shellSort,
  counting: countingSort,
  radix: radixSort,
};

describe.each(ALGORITHMS)("%s sort — correctness", (algorithmName) => {
  const algorithm = implementations[algorithmName];
  const cases = testCasesByAlgorithm[algorithmName];

  it.each(cases)("$name", ({ input, expected }) => {
    const result = runToCompletion(algorithm(input));
    expect(result).toEqual(expected);
  });

  it("does not mutate the input array", () => {
    const input = [5, 3, 1, 4, 2];
    const original = [...input];
    runToCompletion(algorithm(input));
    expect(input).toEqual(original);
  });

  it("yields a final 'done' step carrying the fully sorted array", () => {
    const input = [5, 3, 1, 4, 2];
    const gen = algorithm(input);
    let last: IteratorResult<ReturnType<typeof gen.next>["value"]> | undefined;
    let result = gen.next();
    while (!result.done) {
      last = result;
      result = gen.next();
    }
    expect(last?.value?.type).toBe("done");
    if (last?.value?.type === "done") {
      expect(last.value.result).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it("every yielded step is one atomic comparison/mutation (never batched)", () => {
    // Sanity check on the step contract: every step before 'done' must be
    // exactly one of compare/swap/overwrite, each touching only 1-2 indices.
    const input = [4, 2, 4, 1, 2, 4, 1];
    const gen = algorithm(input);
    for (const step of gen) {
      if (step.type === "compare" || step.type === "swap") {
        expect(step.indices).toHaveLength(2);
      } else if (step.type === "overwrite") {
        expect(typeof step.index).toBe("number");
        expect(typeof step.value).toBe("number");
      } else {
        expect(step.type).toBe("done");
      }
    }
  });
});
