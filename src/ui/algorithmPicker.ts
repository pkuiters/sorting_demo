import { ALGORITHMS, ALGORITHM_LABELS, type AlgorithmName } from "./types";

export interface AlgorithmPicker {
  /** Currently checked algorithms, in fixed canonical order. */
  getSelected(): AlgorithmName[];
  /** Enable/disable all checkboxes (e.g. while a race is running). */
  setDisabled(disabled: boolean): void;
  destroy(): void;
}

/**
 * Mounts one checkbox per algorithm into `container`. Calls `onChange`
 * with the full current selection (canonical order) whenever it changes.
 */
export function mountAlgorithmPicker(
  container: HTMLElement,
  onChange: (selected: AlgorithmName[]) => void,
  defaultSelected: readonly AlgorithmName[] = ALGORITHMS,
): AlgorithmPicker {
  const wrapper = document.createElement("fieldset");
  wrapper.className = "algorithm-picker";

  const legend = document.createElement("legend");
  legend.textContent = "Algorithms";
  wrapper.appendChild(legend);

  const checkboxes = new Map<AlgorithmName, HTMLInputElement>();

  for (const name of ALGORITHMS) {
    const label = document.createElement("label");
    label.className = "algorithm-picker__option";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = name;
    input.checked = defaultSelected.includes(name);
    input.addEventListener("change", () => onChange(getSelected()));

    checkboxes.set(name, input);

    label.appendChild(input);
    label.appendChild(document.createTextNode(` ${ALGORITHM_LABELS[name]}`));
    wrapper.appendChild(label);
  }

  container.appendChild(wrapper);

  function getSelected(): AlgorithmName[] {
    return ALGORITHMS.filter((name) => checkboxes.get(name)?.checked);
  }

  function setDisabled(disabled: boolean): void {
    for (const input of checkboxes.values()) {
      input.disabled = disabled;
    }
  }

  function destroy(): void {
    wrapper.remove();
  }

  return { getSelected, setDisabled, destroy };
}
