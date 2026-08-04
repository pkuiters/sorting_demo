import { mountAlgorithmPicker } from "./algorithmPicker";
import { mountControls } from "./controls";
import { mountStatsDisplay } from "./statsDisplay";
import { ALGORITHMS } from "./types";
import {
  startRace,
  generateRandomArray,
  type AlgorithmName,
  type RaceHandle,
} from "../renderer";

export interface AppElements {
  pickerContainer: HTMLElement;
  controlsContainer: HTMLElement;
  raceContainer: HTMLElement;
  statsContainer: HTMLElement;
}

/** How often to pull fresh stats off the active RaceHandle (renderer's own
 *  test harness used 100ms and it read smoothly). */
const POLL_INTERVAL_MS = 100;

/**
 * Wires together the algorithm picker (#12), randomize/reset button (#13),
 * live stats display (#14), and renderer's race API (#11) into the full app
 * (#15). Renderer owns everything inside `raceContainer` once a race starts;
 * ui only ever calls `startRace`/`destroy` on it and reads stats back out.
 */
export function mountApp(elements: AppElements): void {
  const { pickerContainer, controlsContainer, raceContainer, statsContainer } =
    elements;

  const statsDisplay = mountStatsDisplay(statsContainer, ALGORITHMS);

  let handle: RaceHandle | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  function stopPolling(): void {
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function startRaceFor(selected: AlgorithmName[]): void {
    // Tear down any previous race's animation loop + canvases before
    // starting the next one, per renderer's contract.
    handle?.destroy();
    stopPolling();
    handle = null;

    statsDisplay.setAlgorithms(selected);

    if (selected.length === 0) {
      return;
    }

    const array = generateRandomArray();
    handle = startRace(raceContainer, selected, array);

    pollTimer = setInterval(() => {
      if (!handle) {
        stopPolling();
        return;
      }
      statsDisplay.update(handle.getAllStats());
      if (handle.isRaceComplete()) {
        stopPolling();
      }
    }, POLL_INTERVAL_MS);
  }

  const picker = mountAlgorithmPicker(pickerContainer, (selected) => {
    // Checkbox changes only relabel the stats rows shown; an in-progress
    // race keeps running against its original selection until the next
    // randomize/reset click — auto-restarting mid-animation would be
    // surprising and isn't asked for by the spec.
    statsDisplay.setAlgorithms(selected);
  });

  mountControls(controlsContainer, () => {
    startRaceFor(picker.getSelected());
  });
}
