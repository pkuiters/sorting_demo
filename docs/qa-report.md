# QA Delivery Report — Sorting Algorithm Race

Date: 2026-08-04
QA owner: qa (agent team)

## Summary

The app was verified against the app spec via two tracks: automated
correctness tests for the four sorting algorithms, and manual behavioral
verification of the running app against a derived checklist. Both tracks
pass with no unresolved issues.

**Final sign-off: PASS.** The app meets the definition of done — checkboxes
for the 4 algorithms, randomize/reset that regenerates the array and
restarts the race, selected algorithms racing side by side with visibly
step-by-step animation, and live per-algorithm stats (comparisons, swaps,
elapsed time) shown during and after the race.

## What was tested

### 1. Algorithm correctness (automated)

- Test data drafted in `tests/fixtures/sort-test-cases.ts` (task #16), wired
  into runnable Vitest tests in `tests/algorithms.test.ts` (task #18) against
  back-end's implementations in `src/algorithms/`.
- Run with `npx vitest run`.

### 2. UI behavior (manual)

- Checklist drafted in `tests/ui-checklist.md` (task #17), derived from the
  app spec, then verified against the running app via `npm run dev` at
  `http://localhost:5173` (task #19). Results and session notes are recorded
  directly at the bottom of `tests/ui-checklist.md`.

## Edge cases covered

**Algorithm correctness** — for all 4 algorithms (Bubble, Insertion, Merge,
Quick):
- Empty array
- Single element
- Two elements (already ordered, and swapped)
- Already sorted
- Reverse sorted
- Duplicate values
- All-identical values
- Negative and positive mixed values
- A larger (15-element) mixed array
- Contract checks: input array is never mutated, the generator always ends
  with a `done` step carrying the correct sorted result, and every yielded
  step is a single atomic `compare`/`swap`/`overwrite` (never batched)

**UI behavior**:
- Algorithm selection: 0, 1, 2, and 4 algorithms checked
- Randomize/reset clicked after a race completes, mid-race (interrupting a
  running animation), and rapidly repeated (6 clicks in quick succession)
- Panel layout and labeling for each selection size
- Step-by-step animation: visible progress, comparison/swap highlighting,
  concurrent racing, correct final sorted order, relative speed differences
  between algorithms
- Live stats: per-algorithm scoping, live updates during the race, freezing
  at final values once done, reset on randomize
- Console and dev-server error output across the full session
- Confirmation that out-of-scope v1 features (speed control, array-size
  control, pause/step-through) are correctly absent

## Results

| Area | Result |
|---|---|
| Algorithm correctness (Vitest) | 52/52 tests passed |
| UI behavior checklist | 26/26 items passed |
| Console/server errors | None observed |

No failures were found in either track, so there were no fixes to negotiate
with back-end, renderer, or ui, and no re-verification cycles were needed.

Observed algorithm behavior was consistent with expected complexity: on a
representative run, Quick Sort finished first (4362ms), then Merge Sort
(6207ms), then Insertion Sort (12200ms), then Bubble Sort slowest (15986ms) —
matching their theoretical relative performance and giving the race mode a
visible, meaningful comparison.

## Issues found and resolution

None. Both back-end's algorithm implementations and the full ui/renderer
integration passed verification on the first pass.

## Sign-off

QA verification is complete. The app satisfies the project's definition of
done:

- `npm run dev` starts a working app in the browser.
- The user can check a subset of the 4 algorithms, hit Randomize/Restart, and
  watch them race in side-by-side panels against the same array, sorting
  visibly step by step.
- Live stats (comparisons, swaps, time) are shown per algorithm during and
  after the race.
- Sorting correctness has been verified across edge cases for all 4
  algorithms, and the UI has been confirmed to behave per spec.

**Signed off by qa — ready for delivery.**
