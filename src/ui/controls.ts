export interface Controls {
  setDisabled(disabled: boolean): void;
  /** Current array-size input value, clamped to [MIN_ARRAY_SIZE, MAX_ARRAY_SIZE]. */
  getArraySize(): number;
  /** Current speed-slider value in ms/step, clamped to [MIN_SPEED_MS, MAX_SPEED_MS]. */
  getSpeed(): number;
  destroy(): void;
}

export const MIN_ARRAY_SIZE = 5;
export const MAX_ARRAY_SIZE = 200;
export const DEFAULT_ARRAY_SIZE = 30;

/** Step-pacing bounds, ms between auto-advanced steps per panel (lower = faster). */
export const MIN_SPEED_MS = 2;
export const MAX_SPEED_MS = 200;
export const DEFAULT_SPEED_MS = 20;

/**
 * Mounts the array-size input, speed slider, and the randomize/reset button.
 * `onTrigger` is called on click — it should read `getArraySize()`/`getSpeed()`,
 * generate a new random array, and (re)start the race. `onSpeedChange` fires
 * live as the speed slider moves, so an in-progress race's pacing can be
 * updated via `RaceHandle.setSpeed()` without waiting for a restart.
 */
export function mountControls(
  container: HTMLElement,
  onTrigger: () => void,
  onSpeedChange: (speedMs: number) => void,
): Controls {
  const wrapper = document.createElement("div");
  wrapper.className = "controls";

  const sizeLabel = document.createElement("label");
  sizeLabel.className = "controls__size-label";
  sizeLabel.textContent = "Array size ";

  const sizeInput = document.createElement("input");
  sizeInput.type = "number";
  sizeInput.className = "controls__size-input";
  sizeInput.min = String(MIN_ARRAY_SIZE);
  sizeInput.max = String(MAX_ARRAY_SIZE);
  sizeInput.step = "1";
  sizeInput.value = String(DEFAULT_ARRAY_SIZE);
  sizeLabel.appendChild(sizeInput);

  const speedLabel = document.createElement("label");
  speedLabel.className = "controls__speed-label";
  speedLabel.textContent = "Speed (ms/step, lower = faster) ";

  const speedInput = document.createElement("input");
  speedInput.type = "range";
  speedInput.className = "controls__speed-input";
  speedInput.min = String(MIN_SPEED_MS);
  speedInput.max = String(MAX_SPEED_MS);
  speedInput.step = "1";
  speedInput.value = String(DEFAULT_SPEED_MS);
  speedInput.addEventListener("input", () => onSpeedChange(getSpeed()));
  speedLabel.appendChild(speedInput);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "controls__randomize";
  button.textContent = "Randomize / Restart";
  button.addEventListener("click", onTrigger);

  wrapper.appendChild(sizeLabel);
  wrapper.appendChild(speedLabel);
  wrapper.appendChild(button);
  container.appendChild(wrapper);

  function getArraySize(): number {
    const raw = Number(sizeInput.value);
    if (!Number.isFinite(raw)) return DEFAULT_ARRAY_SIZE;
    return Math.min(MAX_ARRAY_SIZE, Math.max(MIN_ARRAY_SIZE, Math.round(raw)));
  }

  function getSpeed(): number {
    const raw = Number(speedInput.value);
    if (!Number.isFinite(raw)) return DEFAULT_SPEED_MS;
    return Math.min(MAX_SPEED_MS, Math.max(MIN_SPEED_MS, Math.round(raw)));
  }

  function setDisabled(disabled: boolean): void {
    button.disabled = disabled;
    sizeInput.disabled = disabled;
  }

  function destroy(): void {
    wrapper.remove();
  }

  return { setDisabled, getArraySize, getSpeed, destroy };
}
