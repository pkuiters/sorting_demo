export interface Controls {
  setDisabled(disabled: boolean): void;
  destroy(): void;
}

/**
 * Mounts the randomize/reset button. `onTrigger` is called on click —
 * it should generate a new random array and (re)start the race.
 */
export function mountControls(
  container: HTMLElement,
  onTrigger: () => void,
): Controls {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "controls__randomize";
  button.textContent = "Randomize / Restart";
  button.addEventListener("click", onTrigger);

  container.appendChild(button);

  function setDisabled(disabled: boolean): void {
    button.disabled = disabled;
  }

  function destroy(): void {
    button.remove();
  }

  return { setDisabled, destroy };
}
