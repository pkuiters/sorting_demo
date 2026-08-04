/**
 * Public API for the renderer module — the single import path ui should use
 * (interface boundary 2, negotiated directly with ui).
 *
 * Usage:
 *
 *   import { startRace, generateRandomArray, ARRAY_SIZE, type AlgorithmName } from "../renderer";
 *
 *   let handle: RaceHandle | null = null;
 *   function onRandomize(selected: AlgorithmName[]) {
 *     handle?.destroy();
 *     handle = startRace(document.querySelector("#race-container")!, selected, generateRandomArray());
 *   }
 *   // poll handle.getAllStats() / handle.isRaceComplete() from your own loop.
 */
import { RaceController } from "./raceController";
import type { AlgorithmName, RaceHandle } from "./types";

export type { AlgorithmName, AlgorithmStats, RaceHandle } from "./types";
export { ARRAY_SIZE, generateRandomArray } from "./randomArray";
export { ALGORITHM_LABELS } from "./raceController";

/**
 * Starts a new race: lays out one canvas panel per selected algorithm inside
 * `container` (renderer owns and fully manages the container's children while
 * the race is active), and begins animating all of them simultaneously over
 * the same `array`. Returns a handle for reading live stats and for tearing
 * the race down.
 *
 * Call `handle.destroy()` before starting a new race on the same container
 * (e.g. on randomize/reset) — otherwise the previous race's animation loop
 * keeps running underneath the new one.
 */
export function startRace(container: HTMLElement, selectedAlgorithms: AlgorithmName[], array: number[]): RaceHandle {
  return new RaceController(container, selectedAlgorithms, array);
}
