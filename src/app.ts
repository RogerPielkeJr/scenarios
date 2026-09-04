import { PRESETS } from './model/bounds.js';
import { computeFlags } from './model/flags.js';
import { computePath } from './model/kaya.js';
import { MARKERS } from './model/markers.js';
import { defaultInputs } from './model/config.js';
import type { ScenarioInputs } from './model/types.js';
import { ScenarioState, decodeInputs } from './state.js';
import { renderChart } from './ui/chart.js';
import { downloadChart } from './ui/export.js';
import { renderNotes } from './ui/notes.js';
import { renderSliders, type SliderPanel } from './ui/sliders.js';
import { installShare, syncHash } from './ui/share.js';
import { renderStats, type StatTiles } from './ui/stats.js';
import { renderTable } from './ui/table.js';
import { installThemeToggle } from './ui/theme.js';

export interface PanelResult {
  name: string;
  ok: boolean;
  error?: string;
}

export interface RenderReport {
  panels: PanelResult[];
  /** Text of every output element after the render, keyed by element id. */
  outputs: Record<string, string>;
}

const OUTPUT_IDS = [
  'tile-cumulative', 'tile-cumulative-note',
  'tile-warming', 'tile-warming-note',
  'tile-added', 'tile-added-note',
  'tile-analogue', 'tile-analogue-note',
  'kaya-table', 'notes', 'chart', 'chart-caption',
];

function required<T extends Element>(root: Document, id: string): T {
  const element = root.getElementById(id);
  if (element === null) throw new Error(`missing element #${id}`);
  return element as unknown as T;
}

/**
 * Runs one panel's render inside its own boundary.
 *
 * A single failed edit used to take the whole page down halfway through the
 * render, leaving some tiles filled and others showing a dash with no clue
 * why. Now a broken panel says so in place and every other panel still draws.
 */
function panel(results: PanelResult[], name: string, target: Element | null, draw: () => void): void {
  try {
    draw();
    results.push({ name, ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, ok: false, error: message });
    if (target !== null) target.textContent = 'unavailable';
    console.error(`[kaya] panel "${name}" failed to render:`, error);
  }
}

function buildPresets(container: HTMLElement, apply: (inputs: ScenarioInputs) => void): void {
  container.textContent = '';
  for (const preset of PRESETS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ghost';
    button.textContent = preset.label;
    button.dataset['preset'] = preset.id;
    button.addEventListener('click', () => apply(preset.inputs));
    container.appendChild(button);
  }
}

function buildLegend(container: HTMLElement): void {
  const intro = document.createElement('div');
  intro.className = 'legend-intro';
  intro.textContent = 'The seven published CMIP7 scenarios, shown throughout for comparison.';
  container.textContent = '';
  container.appendChild(intro);

  const entries: Array<{ id: string; name: string; color: string; you: boolean }> = [
    { id: 'Yours', name: '', color: 'var(--you)', you: true },
    ...[...MARKERS].reverse().map((marker) => ({
      id: marker.id, name: marker.shortLabel, color: marker.color, you: false,
    })),
  ];
  for (const entry of entries) {
    const item = document.createElement('div');
    item.className = entry.you ? 'legend-item is-you' : 'legend-item';
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = entry.color;
    item.appendChild(swatch);
    const name = document.createElement('b');
    name.textContent = entry.id;
    item.appendChild(name);
    if (entry.name !== '') item.appendChild(document.createTextNode(` ${entry.name}`));
    container.appendChild(item);
  }
}

export interface App {
  render(): RenderReport;
  apply(inputs: ScenarioInputs): void;
  state: ScenarioState;
  lastReport(): RenderReport | null;
}

export function mountApp(root: Document = document): App {
  const controls = required<HTMLElement>(root, 'controls');
  const presetsContainer = required<HTMLElement>(root, 'presets');
  const legend = required<HTMLElement>(root, 'legend');
  const chart = required<SVGSVGElement>(root, 'chart');
  const chartCaption = required<HTMLElement>(root, 'chart-caption');
  const table = required<HTMLTableElement>(root, 'kaya-table');
  const notes = required<HTMLElement>(root, 'notes');

  const tiles: StatTiles = {
    cumulative: required(root, 'tile-cumulative'),
    cumulativeNote: required(root, 'tile-cumulative-note'),
    warming: required(root, 'tile-warming'),
    warmingNote: required(root, 'tile-warming-note'),
    added: required(root, 'tile-added'),
    addedNote: required(root, 'tile-added-note'),
    analogue: required(root, 'tile-analogue'),
    analogueNote: required(root, 'tile-analogue-note'),
  };

  const fromHash = decodeInputs(root.defaultView?.location.hash ?? '');
  const state = new ScenarioState(fromHash ?? defaultInputs());
  let report: RenderReport | null = null;
  let sliders: SliderPanel | null = null;

  function render(): RenderReport {
    const inputs = state.get();
    const results: PanelResult[] = [];

    // Computed once and shared, so a slow panel cannot disagree with a fast one.
    let path = computePath(inputs);
    panel(results, 'model', null, () => { path = computePath(inputs); });

    panel(results, 'sliders', null, () => sliders?.update(inputs));
    panel(results, 'chart', chart, () => {
      renderChart(chart, path);
      chartCaption.textContent = 'Annual CO2 including land use, 2025 to 2100. '
        + 'Your path in ink, the seven CMIP7 markers ghosted behind it.';
    });
    panel(results, 'stats', tiles.cumulative, () => renderStats(tiles, inputs, path));
    panel(results, 'table', table, () => renderTable(table, inputs));
    panel(results, 'notes', notes, () => {
      renderNotes(notes, computeFlags(inputs, path, state.matchingPresetId()));
    });

    const outputs: Record<string, string> = {};
    for (const id of OUTPUT_IDS) {
      outputs[id] = root.getElementById(id)?.textContent?.trim() ?? '';
    }
    report = { panels: results, outputs };
    return report;
  }

  function apply(inputs: ScenarioInputs): void {
    state.replace(inputs);
  }

  sliders = renderSliders(controls, (id, value) => state.set(id, value));
  buildPresets(presetsContainer, apply);
  buildLegend(legend);

  state.onChange(() => {
    render();
    syncHash(state.get());
  });

  const themeButton = root.getElementById('theme-toggle');
  const themeLabel = root.getElementById('theme-label');
  if (themeButton !== null && themeLabel !== null) installThemeToggle(themeButton, themeLabel);

  const shareButton = root.getElementById('share');
  const actionMessage = root.getElementById('action-message');
  if (shareButton !== null && actionMessage !== null) {
    installShare(shareButton, actionMessage, () => state.get());
  }

  const downloadButton = root.getElementById('download');
  if (downloadButton !== null && actionMessage !== null) {
    downloadButton.addEventListener('click', () => {
      downloadChart(chart, 'emissions-scenario.png').catch((error: unknown) => {
        actionMessage.textContent = 'Could not build the image';
        console.error('[kaya] chart download failed:', error);
      });
    });
  }

  render();
  return { render, apply, state, lastReport: () => report };
}
