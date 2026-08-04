# UI Behavior Checklist (draft — task #17)

Derived from the app spec. Used for manual verification of the running app
(`npm run dev`) in task #19, once ui's integration task (#15) is done. Each
item should be checked off with a pass/fail note during verification; any
failure gets reported to the responsible teammate (renderer or ui) and
re-checked after a fix.

## 1. Algorithm picker (checkboxes)

- [x] All 4 algorithm checkboxes render on load: Bubble, Insertion, Merge, Quick
- [x] Each checkbox toggles independently (checking one doesn't affect others)
- [x] Checkbox state is visually clear (checked vs. unchecked)
- [x] Zero algorithms selected is handled gracefully (no crash; no panels, or a
      clear "select at least one" state — not an instant/empty race)

## 2. Randomize / reset button

- [x] Clicking generates a new random array
- [x] Clicking restarts the race for all currently-selected algorithms
- [x] All selected panels race against the *same* new array (fair comparison)
- [x] Stats (comparisons/swaps/time) reset to zero/blank on click
- [x] Works correctly when clicked after a race has already finished
- [x] Works correctly when clicked *while* a race is still running (previous
      race's animation/timers are cleanly stopped, no stray leftover frames,
      no doubled-up panels, no stats bleeding from the old run into the new one)
- [x] Rapid repeated clicks don't crash the app or leave it in a broken state

## 3. Panel selection & layout

- [x] Only the checked algorithms get a panel — unchecked ones show no panel
- [x] Selecting exactly 1 algorithm shows exactly 1 panel
- [x] Selecting all 4 shows exactly 4 panels
- [x] Panels render side-by-side (not stacked, not overlapping, not clipped)
- [x] Each panel is labeled with its algorithm's name
- [x] Changing the checkbox selection is reflected correctly the next time a
      race starts (e.g. via randomize) — newly checked algorithms get a panel,
      newly unchecked ones lose theirs

## 4. Step-by-step visible animation

- [x] Sorting is never an instant jump to the sorted array — progress is
      visible over time for every algorithm
- [x] Individual comparisons and/or swaps are visually distinguishable as they
      happen (e.g. highlighted/colored bars), not just a blurred redraw
- [x] When multiple algorithms are selected, they animate concurrently (a true
      side-by-side race), not one after another
- [x] Each panel ends in a fully, correctly sorted bar order
- [x] Relative speed differences between algorithms are visually observable on
      a non-trivial array (e.g. Bubble/Insertion visibly slower than Merge/Quick)

## 5. Live stats

- [x] Comparison count is shown per algorithm and increments during the race
- [x] Swap count is shown per algorithm and increments during the race
- [x] Elapsed time is shown per algorithm and updates during the race
- [x] Stats are correctly scoped per panel — never mixed up between algorithms
- [x] Once an algorithm's race finishes, its stats stop updating and remain
      visible as final values (not cleared, not still counting)
- [x] Stats values look sane (e.g. non-negative, comparison count roughly
      consistent with array size and algorithm complexity)

## 6. General / cross-cutting

- [x] `npm run dev` starts the app with no build errors
- [x] No errors/warnings in the browser console during normal use (load,
      toggle checkboxes, randomize, let a race finish, randomize again)
- [x] App is usable at a typical desktop viewport without obvious layout
      breakage (overlap, overflow cut off, unreadable text)
- [x] Out-of-scope features (speed control, array-size control, pause/step)
      are correctly absent — not a bug if missing, just confirming scope

## Verification results (task #19)

Verified manually against `npm run dev` at http://localhost:5173 on
2026-08-04. All items above pass. No issues found — nothing reported back to
ui/renderer.

Notes from the session:
- Confirmed 4/4, 2/4 (Insertion + Quick), 1/4 (Insertion only), and 0/4
  selected — panel count and stats table rows always matched the checked set.
- Zero-selected: no crash, empty panel area, stats table header only.
- Mid-race randomize click (~1s into an animating race) cleanly tore down the
  old race and started fresh — no stray panels, no leftover animation frames,
  no stat bleed from the interrupted run.
- 6 rapid repeated clicks on Randomize produced exactly one race, not
  overlapping/duplicated races.
- Full 4-algorithm race to completion: comparison counts and finish times
  showed the expected complexity ordering (Quick fastest, then Merge, then
  Insertion, then Bubble slowest) — e.g. one run finished at 4362ms / 6207ms /
  12200ms / 15986ms respectively.
- Stats correctly freeze at final values once `Done` flips to `Yes` — verified
  values were unchanged after an additional 3s wait post-completion.
- No console errors or dev-server errors observed at any point (only routine
  Vite HMR reconnect debug/log lines from an earlier server restart, unrelated
  to app code).
