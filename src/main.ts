import { mountApp } from "./ui/app";

const pickerContainer = document.querySelector<HTMLElement>("#algorithm-picker");
const controlsContainer = document.querySelector<HTMLElement>("#race-controls");
const raceContainer = document.querySelector<HTMLElement>("#race-container");
const statsContainer = document.querySelector<HTMLElement>("#stats");

if (pickerContainer && controlsContainer && raceContainer && statsContainer) {
  mountApp({ pickerContainer, controlsContainer, raceContainer, statsContainer });
} else {
  console.error("Sorting demo: expected mount points missing from index.html");
}
