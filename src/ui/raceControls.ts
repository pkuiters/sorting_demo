export interface RaceControls {
  /** Reflects whether the active race is paused; updates the Pause/Resume
   *  button label accordingly. Call after every pause()/resume()/stepOnce()
   *  call on the active RaceHandle so the label stays in sync. */
  setPaused(paused: boolean): void;
  /** Enable/disable Pause/Resume + Step (e.g. no active race, or race complete). */
  setDisabled(disabled: boolean): void;
  destroy(): void;
}

/**
 * Mounts Pause/Resume and Step buttons. `onPauseToggle` is called on click
 * of the Pause/Resume button — it should call `handle.pause()` or
 * `handle.resume()` depending on current state, then call `setPaused()` to
 * reflect the new state. `onStep` is called on click of the Step button —
 * it should call `handle.stepOnce()` and refresh stats immediately.
 */
export function mountRaceControls(
  container: HTMLElement,
  onPauseToggle: () => void,
  onStep: () => void,
): RaceControls {
  const wrapper = document.createElement("div");
  wrapper.className = "race-controls";

  const pauseButton = document.createElement("button");
  pauseButton.type = "button";
  pauseButton.className = "race-controls__pause";
  pauseButton.textContent = "Pause";
  pauseButton.addEventListener("click", onPauseToggle);

  const stepButton = document.createElement("button");
  stepButton.type = "button";
  stepButton.className = "race-controls__step";
  stepButton.textContent = "Step";
  stepButton.addEventListener("click", onStep);

  wrapper.appendChild(pauseButton);
  wrapper.appendChild(stepButton);
  container.appendChild(wrapper);

  function setPaused(paused: boolean): void {
    pauseButton.textContent = paused ? "Resume" : "Pause";
  }

  function setDisabled(disabled: boolean): void {
    pauseButton.disabled = disabled;
    stepButton.disabled = disabled;
  }

  function destroy(): void {
    wrapper.remove();
  }

  // No active race at mount time.
  setDisabled(true);

  return { setPaused, setDisabled, destroy };
}
