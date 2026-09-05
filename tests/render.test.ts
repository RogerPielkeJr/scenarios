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

function loadPage(url = '/'): void {
  const body = HTML.slice(HTML.indexOf('<body>') + '<body>'.length, HTML.indexOf('</body>'));
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, '');
  window.history.replaceState(null, '', url);
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

describe('naming a scenario', () => {
  beforeEach(() => { loadPage(); });

  it('carries the name into the chart, the legend and the table', () => {
    const app = mountApp();
    app.state.setName('Fast electrification');
    const report = app.lastReport();
    expect(report?.outputs['chart']).toContain('Fast electrification');
    expect(report?.outputs['kaya-table']).toContain('Fast electrification');
    expect(document.querySelector('.legend-item.is-you b')?.textContent)
      .toBe('Fast electrification');
    expect(report?.outputs['chart-caption']).toContain('Fast electrification');
  });

  it('falls back to the default label with no name set', () => {
    const app = mountApp();
    expect(app.lastReport()?.outputs['kaya-table']).toContain('Build your own');
  });

  it('opens with the name a link carries', () => {
    loadPage('/#s=10.2_1.91_-1.62_-0.48_1_300&n=Coal%20holds%20on');
    const app = mountApp();
    expect(app.state.name()).toBe('Coal holds on');
    expect(app.lastReport()?.outputs['chart-caption']).toContain('Coal holds on');
  });
});

describe('a value arriving from a Learn More builder', () => {
  it('names it, points at its slider and cleans the address bar', () => {
    loadPage('/?applied=population#s=11.7_1.91_-1.62_-0.48_1_300');
    const app = mountApp();
    expect(app.state.get().population).toBe(11.7);
    const line = document.querySelector('.handoff');
    expect(line?.textContent).toContain('11.7');
    expect(line?.textContent).toContain('population page');
    expect(document.querySelector('.control.is-applied')?.getAttribute('data-input'))
      .toBe('population');
    expect(window.location.search).toBe('');
    expect(window.location.hash).toContain('s=11.7');
  });

  it('dismisses the line when asked', () => {
    loadPage('/?applied=methane#s=10.2_1.91_-1.62_-0.48_1_250');
    mountApp();
    const dismiss = document.querySelector('.handoff-dismiss');
    expect(dismiss).not.toBeNull();
    (dismiss as HTMLButtonElement).click();
    expect(document.querySelector('.handoff')).toBeNull();
  });
});

describe('the preset buttons', () => {
  beforeEach(() => { loadPage(); });

  it('presses the preset the reader is on, and only that one', () => {
    const app = mountApp();
    const preset = PRESETS[1];
    if (preset === undefined) throw new Error('no presets');
    app.apply(preset.inputs);
    const pressed = [...document.querySelectorAll('[data-preset][aria-pressed="true"]')];
    expect(pressed.map((button) => button.getAttribute('data-preset'))).toEqual([preset.id]);
  });

  it('presses nothing once a slider moves off a preset', () => {
    const app = mountApp();
    app.state.set('population', 11.3);
    expect(document.querySelectorAll('[data-preset][aria-pressed="true"]')).toHaveLength(0);
  });
});

describe('the learn link on a slider', () => {
  beforeEach(() => { loadPage(); });

  it('carries the reader\'s current scenario to the page', () => {
    const app = mountApp();
    app.state.set('population', 11.3);
    app.state.setName('Crowded century');
    const link = document.querySelector('.control[data-input="population"] .learn-link');
    const href = link?.getAttribute('href') ?? '';
    expect(href).toContain('/learn/population/?s=11.3_');
    expect(href).toContain('n=Crowded%20century');
  });

  it('appears only for the sliders whose pages exist', () => {
    mountApp();
    const links = document.querySelectorAll('.learn-link');
    expect(links).toHaveLength(1);
    expect(links[0]?.textContent).toBe('Learn more about population');
  });
});
