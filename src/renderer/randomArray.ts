/**
 * Random array generation for race starts. Owned by renderer per agreement
 * with ui — ui calls generateRandomArray() on randomize/reset and passes the
 * result straight into startRace().
 */

/** Number of bars per race. Fixed for v1 (array-size control is out of scope
 *  per spec) — large enough to be a meaningful comparison, small enough that
 *  O(n²) sorts stay watchable rather than tedious. */
export const ARRAY_SIZE = 30;

const MIN_VALUE = 5;
const MAX_VALUE = 400;

/** Generates a new random array of ARRAY_SIZE integers in [MIN_VALUE, MAX_VALUE]. */
export function generateRandomArray(size: number = ARRAY_SIZE): number[] {
  const arr: number[] = new Array(size);
  for (let i = 0; i < size; i++) {
    arr[i] = Math.floor(Math.random() * (MAX_VALUE - MIN_VALUE + 1)) + MIN_VALUE;
  }
  return arr;
}
