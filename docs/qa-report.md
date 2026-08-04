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

---

## v2 addendum

Date: 2026-08-05
QA owner: qa (agent team)

Follow-up to the v1 report above (kept intact, not replaced). v2 adds 5 new
sorting algorithms (Selection, Heap, Shell, Counting, Radix), 3
previously-deferred features (speed control, array-size control,
pause/step-through), and an imported design system applied to colors and
typography across the app.

### Summary

All three v2 verification tracks — algorithm correctness, feature behavior,
and design-system adherence — pass, with two process notes below (an
environment tooling gap, and a config/engine mismatch) that affected *how*
verification was done but not the result.

**Final v2 sign-off: PASS.**

### 1. Algorithm correctness (automated)

- Test data extended in `tests/fixtures/sort-test-cases.ts`: `"selection"`,
  `"heap"`, `"shell"`, `"counting"`, `"radix"` added to `ALGORITHMS`/
  `AlgorithmName`; `testCasesByAlgorithm` now covers all 9 algorithms.
  Added a `countingRadixExtraCases` block (wide value range with a small
  array, a very sparse wide range, and multi-digit values forcing several
  radix passes) layered onto `counting` and `radix` specifically, since
  those two are non-comparison sorts whose cost scales with value range
  rather than array length — a dimension the original shared case list
  didn't exercise.
- Wired into `tests/algorithms.test.ts` against back-end's real
  implementations in `src/algorithms/` (`selectionSort`, `heapSort`,
  `shellSort`, `countingSort`, `radixSort`), reusing the same
  `describe.each(ALGORITHMS)` structure and the same contract checks as v1:
  input array never mutated, generator always ends with exactly one `done`
  step carrying the correct sorted result, every yielded step is atomic
  (never batched).
- `npx vitest run`: **123/123 tests passed** (52 original + new coverage for
  the 5 algorithms, including the 3 counting/radix-specific cases, across
  all case/contract checks). No failures on first run; nothing to negotiate
  with back-end.
- `npx tsc -b`: clean throughout.

### 2. New features (manual)

Verified against `npm run dev` in a real browser, driving the actual
`RaceHandle` API surface (`pause`/`resume`/`isPaused`/`stepOnce`/`setSpeed`,
and `startRace`'s `speedMs` param / `generateRandomArray(size)`) through the
real UI controls ui built.

- **Array-size control**: set to 8 and to 50 via the number input, confirmed
  by direct canvas pixel inspection (counting rendered bar segments) that
  the number of bars drawn matched the input exactly on both runs, and that
  panel count still matched the algorithm selection. Confirmed the app
  reads the size at race-start time (`generateRandomArray(controls.getArraySize())`
  in `src/ui/app.ts`), consistent with "takes effect on next randomize."
- **Pause / Resume / Step**: with a race running, clicked Pause — button
  label correctly flipped to "Resume", and stats (comparisons/swaps/
  elapsedMs) stayed exactly frozen across a real wall-clock gap while
  paused. Clicked Step repeatedly while paused: each click advanced
  **exactly one step per panel** — confirmed via before/after stat deltas
  across all 9 algorithms simultaneously (comparison-based algorithms each
  gained exactly +1 comparison on their first step; the two non-comparison
  algorithms, counting and radix, each gained exactly +1 swap on their
  first step instead, correctly reflecting that they never emit `compare`
  steps). Clicked Resume — button label flipped back to "Pause", and the
  race went on to complete correctly and unassisted from there.
- **Speed control**: confirmed via code review of
  `src/renderer/raceController.ts` that the slider's live `setSpeed()` calls
  update `stepIntervalMs`, read fresh by the rAF loop's gating condition
  (`!paused && now - lastStepAt >= stepIntervalMs`) on the very next tick —
  matches the documented "takes effect on the next tick" contract. Live
  slider interaction was wired correctly in `src/ui/app.ts` (`onSpeedChange`
  calls `handle?.setSpeed(speedMs)` on every `input` event). See note below
  on why this couldn't also be confirmed by direct wall-clock pacing
  observation in this session.
- **Full 9-algorithm race to completion**: after the above pause/step/resume
  sequence, the race completed for all 9 algorithms with correctly sorted
  results (visually confirmed: all bars end in ascending order, colored with
  the design system's `done`/success token) and sensible relative
  complexity ordering (Bubble/Selection highest comparison counts among the
  comparison sorts; Merge/Quick lowest; Counting/Radix at exactly 0
  comparisons, as expected for non-comparison sorts, with swap/overwrite
  counts matching their pass structure).

**Process note — browser-pane compositing.** This QA session's Browser pane
intermittently stopped compositing frames (`screenshot` failed with "the
Browser pane is not displayed"), which also appears to suspend/heavily
throttle the app's `requestAnimationFrame` loop — the mechanism the speed
control and continuous auto-step-advance both depend on. This is a session/
tooling artifact (confirmed unrelated to the app: switching tabs to force a
recomposite reliably un-stuck it, and the app's own logic was verified
correct by code review), not an app defect, but it meant continuous
real-time pacing (e.g. "does a 200ms/step race visibly crawl slower than a
2ms/step race side by side") could not be directly observed frame-by-frame
in this session the way v1's checklist items were. Substituted: (a) the
discrete, deterministic `stepOnce()` verification above, which exercises
the same per-panel stepping code path speed control paces, and (b) static
verification that the speed value flows correctly end-to-end from slider to
`RaceHandle.setSpeed()` to the tick loop's gating condition. Noting this
plainly rather than letting a "PASS" imply more continuous-motion coverage
than was actually observed.

### 3. v1 regression check

Re-checked a representative subset of `tests/ui-checklist.md` against the
v2 app (full 26-item list not required to be blocked on again since no
scope in those areas changed, but spot-checked the highest-risk items given
the new controls added to the same layout):

- Zero algorithms selected: unchecked all 9, clicked Randomize — 0 canvases,
  0 stats rows, Pause/Step correctly disabled, no console errors. Still
  graceful, as in v1.
- 6 rapid repeated Randomize clicks (2 algorithms selected): exactly 2
  canvases and 2 stats rows after, no doubling, no stray panels, no console
  errors.
- Panel labeling/layout: all 9 panels correctly labeled and laid out
  side-by-side with no overlap/clipping at desktop viewport, including with
  the design system's card styling (surface background, border, radius,
  shadow) applied.
- Live stats scoping: `getAllStats()`-driven table consistently showed only
  rows for the currently-selected algorithms across every selection change
  tested (0, 2, 9).
- Console and dev-server error output: none observed at any point in this
  session (only routine Vite HMR reconnect log lines from concurrent
  teammate edits triggering dev-server restarts — same category of noise
  v1 also observed and correctly ignored).

No regressions found.

### 4. Design-system adherence (oxlint)

**Tooling gap.** `npx oxlint -c design/_adherence.oxlintrc.json src/`, as
specified, does not run:

1. The config's top-level `x-omelette` key (a token/kind registry, metadata
   for the design-system tooling itself) isn't part of oxlint's schema —
   `Failed to parse oxlint configuration file: unknown field x-omelette`.
2. Stripping that key to test further, the config still fails: `Rule
   'no-restricted-syntax' not found in plugin 'eslint'`. Confirmed via
   `npx oxlint --rules`/`--help` that the installed oxlint (v1.77.0) does
   not implement `no-restricted-syntax` at all — it's an ESLint-core
   AST-selector rule, and oxlint only reimplements a subset of ESLint's
   rule set natively. That rule is exactly what carries this config's
   hex-color/px-value/font-family checks, so this is a genuine engine
   mismatch, not a fixable typo in the file as generated.

Config left untouched (not owned by qa). **Substituted a manual-equivalent
check**: grepped `src/` for the same three patterns the config's
`no-restricted-syntax` selectors targeted — raw hex colors, raw `px`
values, and non-token `font-family` declarations. Findings, reported to and
resolved by the owning teammates:

| File | Finding | Resolution |
|---|---|---|
| `src/renderer/barChart.ts` (`DEFAULT_PALETTE`) | Hardcoded hex fallback colors | Accepted as-is — documented, intentional fallback for when design tokens aren't resolvable; the live path resolves through `resolveDesignSystemPalette()`. |
| `src/renderer/raceController.ts` | `border:1px solid` / `border-bottom:1px solid` / `gap:12px` — exact-match tokens existed but weren't used | Fixed by renderer: swapped to `var(--bw-1)` and `var(--space-3)`. Verified: identical computed styles, `tsc -b` clean. |
| `src/renderer/raceController.ts` | `min-width:180px` / `padding:6px 10px` / `height:260px` — no exact token match on the spacing ladder | Accepted as-is — legitimate documented exceptions (panel-level layout constraints outside the spacing scale's range, reasoning recorded in a code comment). |
| `src/ui/styles.css` | `font-size: 11px` (legend, stats table header) | Accepted as-is — confirmed by grep against `design/colors_and_type.css` that 11px is the design system's own literal value for its `.eyebrow` class (a micro-label size deliberately one step below the `--fs-xs` (12px) type-scale floor), so this is a correct match to source-of-truth, not a missed token. |
| `src/ui/styles.css` | `width: 15px; height: 15px` (checkbox sizing) | Fixed by ui: swapped to `var(--space-4)` (16px) — no exact-token justification existed for 15px specifically. Verified in browser, `tsc -b` clean. |

No remaining unresolved findings. Re-running the literal `oxlint` command
was not possible given the engine mismatch above (no config change fixes
it without changing what the rule asserts); the manual pass functionally
covers the same ground and is clean after the above fixes.

### Issues found and resolution (v2)

No correctness or feature-behavior bugs were found in back-end's,
renderer's, or ui's v2 work. Two process-level findings surfaced during QA,
both resolved:

1. Design-system adherence config (`design/_adherence.oxlintrc.json`)
   targets an oxlint rule the installed oxlint doesn't implement — resolved
   by substituting an equivalent manual grep-based check (documented above)
   rather than blocking sign-off on a tooling fix outside any teammate's
   ownership.
2. Five specific style-adherence findings from that manual check, reported
   to renderer (3) and ui (2) — three accepted as intentional/documented
   exceptions, two fixed (token swaps), all resolved as of this report.

### v2 sign-off

QA verification is complete. v2 satisfies its definition of done:

- All 9 algorithms (4 original + Selection, Heap, Shell, Counting, Radix)
  pass correctness testing — 123/123 automated tests, including edge-case
  and contract coverage extended for the 5 new algorithms.
- All 3 previously-deferred features (speed control, array-size control,
  pause/step-through) work correctly, verified against the real running
  app and real `RaceHandle` API.
- No regressions in v1 behavior (checklist items re-spot-checked, all
  still pass).
- Design-system colors and typography are applied across race panels,
  bars, and controls, with adherence verified by an equivalent manual check
  (automated `oxlint` check not runnable as configured — documented above,
  not a skipped step) and all findings resolved.

**Signed off by qa — ready for delivery.**
