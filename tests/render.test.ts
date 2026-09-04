// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { mountApp, type RenderReport } from '../src/app.js';
import { PRESETS } from '../src/model/bounds.js';
import { INPUT_SPECS } from '../src/model/config.js';

// import.meta.url is an http URL under the jsdom environment, so the page
// is read relative to the project root instead.
const HTML = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

/** The tiles that must always say something. */
const TILE_IDS = [
  'tile-cumulative', 'tile-cumulative-note',
  'tile-warming', 'tile-warming-note',
  'tile-added', 'tile-added-note',
  'tile-analogue', 'tile-analogue-note',
];

function loadPage(): void {
  const body = HTML.slice(HTML.indexOf('<body>') + '<body>'.length, HTML.indexOf('</body>'));
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, '');
}

function expectComplete(report: RenderReport, label: string): void {
  const failed = report.panels.filter((p) => !p.ok);
  expect(failed.map((p) => `${p.name}: ${p.error}`), `${label} panels`).toEqual([]);
  for (const id of TILE_IDS) {
    const text = report.outputs[id] ?? '';
    expect(text, `${label} → #${id}`).not.toBe('');
    expect(text, `${label} → #${id}`).not.toBe('—');
    expect(text, `${label} → #${id}`).not.toBe('unavailable');
  }
  expect(report.outputs['kaya-table'], `${label} table`).not.toBe('');
  expect(report.outputs['notes'], `${label} notes`).not.toBe('');
  expect(report.outputs['chart-caption'], `${label} caption`).not.toBe('');
}

describe('page render', () => {
  beforeEach(() => { loadPage(); });

  it('fills every tile on first load', () => {
    const app = mountApp();
    const report = app.lastReport();
    expect(report).not.toBeNull();
    if (report) expectComplete(report, 'default');
  });

  it.each(PRESETS.map((p) => [p.label, p] as const))(
    'fills every tile for %s', (label, preset) => {
      const app = mountApp();
      app.apply(preset.inputs);
      const report = app.lastReport();
      expect(report).not.toBeNull();
      if (report) expectComplete(report, label);
    });

  it('fills every tile at both ends of every slider', () => {
    const app = mountApp();
    for (const spec of INPUT_SPECS) {
      for (const value of [spec.min, spec.max]) {
        app.state.set(spec.id, value);
        const report = app.lastReport();
        expect(report).not.toBeNull();
        if (report) expectComplete(report, `${spec.id} at ${value}`);
      }
      app.state.set(spec.id, spec.default);
    }
  });

  it('draws one line per marker plus the reader path', () => {
    mountApp();
    const chart = document.getElementById('chart');
    expect(chart?.querySelectorAll('[data-marker]').length).toBe(7);
    expect(chart?.querySelectorAll('[data-user-path]').length).toBe(1);
  });

  it('builds a slider for each of the six inputs', () => {
    mountApp();
    for (const spec of INPUT_SPECS) {
      expect(document.getElementById(`input-${spec.id}`), spec.id).not.toBeNull();
      expect(document.getElementById(`readout-${spec.id}`)?.textContent, spec.id).not.toBe('');
    }
    expect(document.querySelectorAll('.control .scale').length).toBe(INPUT_SPECS.length);
  });

  it('reads a scenario back out of the URL hash', () => {
    window.location.hash = '#s=9.5_2_-2_-1_-3_200';
    const app = mountApp();
    expect(app.state.get().population).toBeCloseTo(9.5, 9);
    expect(app.state.get().methane).toBeCloseTo(200, 9);
    window.location.hash = '';
  });
});
