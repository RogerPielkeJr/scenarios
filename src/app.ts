import { PRESETS } from './model/bounds.js';
import { computeFlags, markerIdForPreset } from './model/flags.js';
import { computePath } from './model/kaya.js';
import { MARKERS, MARKER_BY_ID, publishedPath } from './model/markers.js';
import { approximateScenarioCount, approximateSettingsCount, defaultInputs } from './model/config.js';
import type { ScenarioInputs } from './model/types.js';
import {
  ScenarioState, decodeScenario, displayName, pathWithScenario,
} from './state.js';
import { renderChart } from './ui/chart.js';
import { downloadScenarioPdf, downloadScenarioPng } from './ui/export.js';
import { renderNotes } from './ui/notes.js';
import { renderSliders, type SliderPanel } from './ui/sliders.js';
import { announceHandoff, appliedInput } from './ui/handoff.js';
import { installStrip, type Strip } from './ui/strip.js';
import { installShare, syncHash } from './ui/share.js';
import { renderStats, scenarioSummary, type StatTiles } from './ui/stats.js';
import { renderTable } from './ui/table.js';
import { installThemeToggle } from './ui/theme.js';
import { linkToolbar } from './ui/toolbar.js';
import { collectOutputs, panel, type PanelResult, type RenderReport } from './ui/report.js';

export type { PanelResult, RenderReport } from './ui/report.js';

const OUTPUT_IDS = [
  'tile-cumulative', 'tile-cumulative-note',
  'tile-warming', 'tile-warming-note',
  'tile-added', 'tile-added-note',
  'tile-analogue', 'tile-analogue-note',
  'kaya-table', 'notes', 'chart', 'chart-caption',
  'strip-cumulative', 'strip-warming',
];

function required<T extends Element>(root: Document, id: string): T {
  const element = root.getElementById(id);
  if (element === null) throw new Error(`missing element #${id}`);
  return element as unknown as T;
}

interface PresetPanel {
  /** Presses the button whose scenario the reader is on, and no other. */
  update(presetId: string | null): void;
}

function buildPresets(
  container: HTMLElement, apply: (inputs: ScenarioInputs) => void,
): PresetPanel {
  container.textContent = '';
  const buttons = new Map<string, HTMLButtonElement>();
  for (const preset of PRESETS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ghost';
    button.textContent = preset.label;
    button.dataset['preset'] = preset.id;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => apply(preset.inputs));
    container.appendChild(button);
    buttons.set(preset.id, button);
  }
  return {
    update(presetId) {
      // Nothing pressed means a scenario of the reader's own, which is what
      // a value arriving from a Learn More builder almost always produces.
      for (const [id, button] of buttons) {
        button.setAttribute('aria-pressed', String(id === presetId));
      }
    },
  };
}

/** A filename from the scenario's name, or the plain one when unnamed. */
function fileStem(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug === '' ? 'emissions-scenario' : slug.slice(0, 48);
}

function buildLegend(container: HTMLElement, readerLabel: string): void {
  const intro = document.createElement('div');
  intro.className = 'legend-intro';
  intro.textContent = 'The seven published CMIP7 scenarios, shown throughout for comparison.';
  container.textContent = '';
  container.appendChild(intro);

  const entries: Array<{ id: string; name: string; color: string; you: boolean }> = [
    { id: readerLabel, name: '', color: 'var(--you)', you: true },
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
  /** Null on a page carrying no strip. */
  strip(): Strip | null;
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

  const view = root.defaultView;
  const fromHash = decodeScenario(view?.location.hash ?? '');
  const state = new ScenarioState(fromHash ?? { inputs: defaultInputs(), name: '' });
  let report: RenderReport | null = null;
  let sliders: SliderPanel | null = null;
  let presets: PresetPanel | null = null;
  let strip: Strip | null = null;

  function render(): RenderReport {
    const inputs = state.get();
    const scenario = state.scenario();
    const name = displayName(scenario.name);
    const presetId = state.matchingPresetId();
    // A CMIP7 preset highlights its published path among the ghosted markers,
    // and the ink stays the reconstruction the sliders drive. Drawing the
    // published path as the ink instead, and swapping to the reconstruction on
    // the first slider move, made one step of the population slider look like
    // it raised warming by 0.18 degrees when it had lowered it by 0.002.
    const markerId = markerIdForPreset(presetId);
    const marker = markerId === null ? undefined : MARKER_BY_ID[markerId];
    const published = marker === undefined ? null : publishedPath(marker);
    // A preset still names the scenario, and says which of the two curves the
    // ink is: the marker itself sits highlighted behind it under the same name,
    // so calling the ink "CMIP7 MEDIUM" alone left two lines sharing one label.
    const label = published === null ? name : `${published.label} reconstructed`;
    const results: PanelResult[] = [];

    // Computed once and shared, so a slow panel cannot disagree with a fast one.
    let path = computePath(inputs);
    panel(results, 'model', null, () => { path = computePath(inputs); });

    panel(results, 'sliders', null, () => sliders?.update(scenario));
    // The toolbar routes off this page have to carry the scenario too; a bare
    // /learn/ or /library.html sends the reader on holding the defaults.
    panel(results, 'toolbar', null, () => linkToolbar(root, scenario));
    panel(results, 'presets', null, () => presets?.update(presetId));
    panel(results, 'legend', legend, () => buildLegend(legend, label));
    panel(results, 'chart', chart, () => {
      renderChart(chart, path, { name: label, highlightMarker: markerId });
      chart.setAttribute('aria-label',
        `Annual CO2 to 2100 for ${label} and the seven CMIP7 markers`);
      chartCaption.textContent = published === null
        ? `Annual CO2 including land use, 2025 to 2100. ${name} in ink, `
          + 'the seven CMIP7 markers ghosted behind it.'
        : `Annual CO2 including land use, 2025 to 2100. This reconstruction of `
          + `${published.label} in ink, with ${published.label} itself picked out `
          + 'among the markers behind it. The two differ, and the tiles below '
          + 'report both.';
    });
    panel(results, 'stats', tiles.cumulative,
      () => renderStats(tiles, inputs, path, published));
    panel(results, 'strip', null,
      () => strip?.update(label, scenarioSummary(inputs, path)));
    panel(results, 'table', table, () => renderTable(table, inputs, label));
    panel(results, 'notes', notes, () => {
      renderNotes(notes, computeFlags(inputs, path, presetId));
    });

    report = { panels: results, outputs: collectOutputs(root, OUTPUT_IDS) };
    return report;
  }

  function apply(inputs: ScenarioInputs): void {
    state.replace(inputs);
  }

  /** The published scenario on screen right now, if any. */
  function publishedNow() {
    const markerId = markerIdForPreset(state.matchingPresetId());
    const marker = markerId === null ? undefined : MARKER_BY_ID[markerId];
    return marker === undefined ? null : publishedPath(marker);
  }

  // How many scenarios the sliders reach. Written once: it depends on the
  // slider definitions, not on where the reader has put them.
  const count = root.getElementById('scenario-count');
  if (count !== null) count.textContent = approximateScenarioCount();
  const settings = root.getElementById('settings-count');
  if (settings !== null) settings.textContent = approximateSettingsCount();

  strip = installStrip(root, chart.closest('.chart-figure') ?? chart);

  sliders = renderSliders(controls, (id, value) => state.set(id, value));
  presets = buildPresets(presetsContainer, apply);

  const nameField = root.getElementById('scenario-name');
  if (nameField instanceof HTMLInputElement) {
    nameField.value = state.name();
    nameField.addEventListener('input', () => state.setName(nameField.value));
  }

  state.onChange(() => {
    render();
    syncHash(state.scenario());
  });

  const themeButton = root.getElementById('theme-toggle');
  const themeLabel = root.getElementById('theme-label');
  if (themeButton !== null && themeLabel !== null) installThemeToggle(themeButton, themeLabel);

  const shareButton = root.getElementById('share');
  const actionMessage = root.getElementById('action-message');
  if (shareButton !== null && actionMessage !== null) {
    installShare(shareButton, actionMessage, () => state.scenario());
  }

  const downloads: Array<[string, string, (file: string) => Promise<void>]> = [
    ['download-png', 'png',
      (file) => downloadScenarioPng(chart, state.scenario(), computePath(state.get()),
        publishedNow(), file)],
    ['download-pdf', 'pdf',
      (file) => downloadScenarioPdf(chart, state.scenario(), computePath(state.get()),
        publishedNow(), file)],
  ];
  for (const [id, extension, run] of downloads) {
    const button = root.getElementById(id);
    if (button === null || actionMessage === null) continue;
    button.addEventListener('click', () => {
      actionMessage.textContent = 'Building your sheet...';
      run(`${fileStem(state.name())}.${extension}`).then(
        () => {
          actionMessage.textContent = 'Downloaded';
          window.setTimeout(() => { actionMessage.textContent = ''; }, 2600);
        },
        (error: unknown) => {
          actionMessage.textContent = 'Could not build the file';
          console.error(`[kaya] ${id} failed:`, error);
        },
      );
    });
  }

  render();

  // A value arriving from a Learn More builder: say so, then take the marker
  // out of the address bar so a copied link opens clean.
  const applied = appliedInput(view?.location.search ?? '');
  if (applied !== null) {
    announceHandoff(root, applied, state.get());
    view?.history.replaceState(null, '', pathWithScenario(state.scenario()));
  }

  return { render, apply, state, lastReport: () => report, strip: () => strip };
}
