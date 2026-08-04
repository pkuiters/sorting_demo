# Sorting Visualizer — Agent Team Kickoff Prompt

Paste the prompt below into a **new Claude Code session opened in this directory** (`C:\Users\Peter\Dev\sorting_demo`). Agent teams are already enabled here via `.claude/settings.json`, so no extra setup is needed.

---

## Prompt

```text
Before doing anything else, read docs/agent-teams.md in this project — it's a reference guide on running Claude Code agent teams effectively, and this task is designed around it.

Goal: build a browser-based visual demo comparing sorting algorithm performance, in this directory. Spawn an agent team (not subagents) to build it — this task has independent, well-bounded pieces that map cleanly to a small team.

## App spec

- Stack: vanilla TypeScript + HTML5 Canvas + Vite. No framework.
- Algorithms (4 total): Bubble, Insertion, Merge, Quick sort.
- Race mode: the user checks which algorithms to include (via checkboxes), then all selected algorithms sort the *same* randomly-generated array simultaneously, each in its own side-by-side panel.
- Controls: a randomize/reset button (generates a new random array and restarts the race), and live per-algorithm stats displayed during and after the race — comparison count, swap count, elapsed time.
- Out of scope for v1: speed control, array size control, pause/step-through. Don't build these — keep scope tight.

## Functional requirements (not fixed interfaces — the team works these out)

- Each algorithm's sorting process must be observable step-by-step — comparisons and swaps happen visibly over time, not as an instant jump to the final sorted result.
- There are two interface boundaries in this app, and neither is specified here on purpose — the teammates on either side of each boundary should negotiate it directly with each other early, before diving into full implementation:
  1. Between `back-end` and `renderer`: how a sorting algorithm's step-by-step progress gets exposed so it can be animated.
  2. Between `renderer` and `ui`: how the UI starts/controls a race and reads live stats (comparisons, swaps, elapsed time) back out. `renderer` is in the best position to derive these stats, since it's already processing every step — it should compute them and surface them through this interface rather than `ui` reaching into `back-end` directly.

## Team structure (4 teammates, all using Sonnet 5) — name them exactly back-end, renderer, ui, and qa

1. **back-end** — owns the sorting logic, in its own directory (e.g. `src/algorithms/` — internal file layout is back-end's call). Implements Bubble, Insertion, Merge, and Quick sort with observable step-by-step progress, per the functional requirements above. Negotiates interface boundary 1 with `renderer`.

2. **renderer** — owns the rendering/animation engine, in its own directory (e.g. `src/renderer/`). Canvas-based bar-chart rendering, race-panel layout for side-by-side comparison, an animation loop driven by `back-end`'s step data, and stats computation (comparisons/swaps/time) derived from that same step data. Negotiates interface boundary 1 with `back-end` and interface boundary 2 with `ui`.

3. **ui** — owns the app shell: project scaffolding and root config (`package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`), plus its own directory for UI code (e.g. `src/ui/`) and the app entry point. Builds the algorithm picker (checkboxes), randomize/reset button, and live stats display, driving `renderer` through interface boundary 2. `ui` is the sole owner of the root config files listed above — nobody else should need to touch them; if another teammate needs a new dependency, they ask `ui` to add it.

4. **qa** — verifies the work rather than building features, and owns its own `tests/` directory for test code (never touches production `src/`). Has two kinds of tasks in the shared task list:
   - **Early, unblocked**: draft test case data for the 4 algorithms (input/expected-sorted-output pairs, covering empty array, single element, already-sorted, reverse-sorted, and duplicate values) and a UI behavior checklist derived from the app spec. These don't depend on anyone else and can start immediately — this is how `qa` stays productive while `back-end`/`renderer`/`ui` are still building.
   - **Later, dependent on the relevant `back-end`/`renderer`/`ui` tasks**: once the negotiated interfaces exist, wire the drafted test data into actual runnable tests (Vitest is a good fit since this is a Vite project — ask `ui` to add it as a dev dependency, per the dependency norm above) and execute them. Verify the UI against the checklist. Report issues back to the responsible teammate for fixes and re-verify before signing off.

   Finish with a delivery report at `docs/qa-report.md`: what was tested, edge cases covered, results, any issues found and how they were resolved, and final sign-off.

Give each teammate this full spec in their spawn prompt — they won't have your conversation history. Have them work through 5-6 self-contained tasks each rather than one giant task. Wait for teammates to actually finish their work (and for QA to sign off) before considering anything done.

## Definition of done

- `npm run dev` starts a working app in the browser.
- User can check a subset of the 4 algorithms, hit randomize, and watch them race in side-by-side panels against the same array, with the sort visibly happening step by step.
- Live stats (comparisons, swaps, time) are shown per algorithm during/after the race.
- QA has verified sorting correctness across edge cases and confirmed the UI behaves per spec.
- A QA delivery report exists at `docs/qa-report.md` summarizing what was tested and the final sign-off.
```
