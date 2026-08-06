# Sorting Algorithm Race

A browser-based visualizer that races multiple sorting algorithms side by side on the same shuffled array, so you can watch how they compare in real time.

![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue) ![Vite](https://img.shields.io/badge/Vite-5.4-646CFF)

## Features

- **Live race view** — each selected algorithm gets its own animated bar-chart panel, sorting the same starting array in parallel.
- **Algorithm picker** — choose which algorithms race via checkboxes.
- **Race controls** — pause/resume and single-step through the animation.
- **Live stats** — comparisons, swaps, elapsed time, and completion status per algorithm, updated as the race runs.
- **Randomize/reset** — shuffle a new array and start over.

### Algorithms included

Bubble Sort, Insertion Sort, Selection Sort, Shell Sort, Merge Sort, Quick Sort, Heap Sort, Counting Sort, Radix Sort.

## Getting started

```bash
npm install
npm run dev
```

This starts the Vite dev server and opens the app in your browser.

On Windows, you can also double-click [start.bat](start.bat) to launch it directly.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run the test suite (Vitest) |

## Tech stack

- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Vitest](https://vitest.dev/) for testing

## Project structure

```
src/
  algorithms/   Sorting algorithm implementations
  renderer/     Canvas bar-chart rendering and race orchestration
  ui/           Controls, algorithm picker, stats display
tests/          Algorithm correctness tests and fixtures
docs/           Design and process notes
```
