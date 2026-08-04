import {
  ALGORITHM_LABELS,
  zeroStats,
  type AlgorithmName,
  type AlgorithmStats,
} from "./types";

export interface StatsDisplay {
  /** Replace the full set of rows shown (call when selection changes). */
  setAlgorithms(names: readonly AlgorithmName[]): void;
  /** Update displayed numbers. Only entries present in `stats` are touched;
   *  algorithms not in `stats` keep showing zeroed placeholders. */
  update(stats: Partial<Record<AlgorithmName, AlgorithmStats>>): void;
  destroy(): void;
}

const COLUMNS: Array<{ key: keyof AlgorithmStats; label: string }> = [
  { key: "comparisons", label: "Comparisons" },
  { key: "swaps", label: "Swaps" },
  { key: "elapsedMs", label: "Time (ms)" },
  { key: "done", label: "Done" },
];

/** Live per-algorithm stats table (comparisons, swaps, elapsed time). */
export function mountStatsDisplay(
  container: HTMLElement,
  initialAlgorithms: readonly AlgorithmName[] = [],
): StatsDisplay {
  const table = document.createElement("table");
  table.className = "stats-display";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const cornerCell = document.createElement("th");
  cornerCell.textContent = "Algorithm";
  headRow.appendChild(cornerCell);
  for (const col of COLUMNS) {
    const th = document.createElement("th");
    th.textContent = col.label;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  table.appendChild(tbody);
  container.appendChild(table);

  const rows = new Map<AlgorithmName, Record<string, HTMLTableCellElement>>();

  function buildRow(name: AlgorithmName): void {
    const tr = document.createElement("tr");
    tr.dataset.algorithm = name;

    const nameCell = document.createElement("th");
    nameCell.scope = "row";
    nameCell.textContent = ALGORITHM_LABELS[name];
    tr.appendChild(nameCell);

    const cells: Record<string, HTMLTableCellElement> = {};
    for (const col of COLUMNS) {
      const td = document.createElement("td");
      td.textContent = "0";
      tr.appendChild(td);
      cells[col.key] = td;
    }

    rows.set(name, cells);
    tbody.appendChild(tr);
    writeRow(name, zeroStats());
  }

  function writeRow(name: AlgorithmName, stats: AlgorithmStats): void {
    const cells = rows.get(name);
    if (!cells) return;
    cells.comparisons.textContent = String(stats.comparisons);
    cells.swaps.textContent = String(stats.swaps);
    cells.elapsedMs.textContent = stats.elapsedMs.toFixed(0);
    cells.done.textContent = stats.done ? "Yes" : "No";
  }

  function setAlgorithms(names: readonly AlgorithmName[]): void {
    tbody.innerHTML = "";
    rows.clear();
    for (const name of names) {
      buildRow(name);
    }
  }

  function update(stats: Partial<Record<AlgorithmName, AlgorithmStats>>): void {
    for (const [name, s] of Object.entries(stats) as Array<
      [AlgorithmName, AlgorithmStats]
    >) {
      writeRow(name, s);
    }
  }

  function destroy(): void {
    table.remove();
  }

  setAlgorithms(initialAlgorithms);

  return { setAlgorithms, update, destroy };
}
