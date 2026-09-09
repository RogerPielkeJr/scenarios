// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { mountApp, type RenderReport } from '../src/app.js';
import { PRESETS } from '../src/model/bounds.js';
import {
  INPUT_SPECS, SCENARIO_COUNT, approximateScenarioCount,
} from '../src/model/config.js';
import { MARKERS } from '../src/model/markers.js';
import { LEARN_ENTRIES } from '../src/learn/registry.js';

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

describe('the mark and the source under every figure', () => {
  beforeEach(() => { loadPage(); });

  it('sits under the chart and under the table', () => {
    mountApp();
    const credits = [...document.querySelectorAll('.figure-credit')];
    expect(credits).toHaveLength(2);
    for (const credit of credits) {
      expect(credit.querySelector('img')?.getAttribute('src')).toBe('/thb-logo.png');
      expect(credit.querySelector('.credit-data')?.textContent).toMatch(/^Data: .{20,}/);
      expect(credit.querySelector('.credit')?.textContent)
        .toContain('Roger Pielke Jr.');
    }
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

  it('appears for every slider whose page exists, and no others', () => {
    mountApp();
    const links = [...document.querySelectorAll('.learn-link')];
    const live = LEARN_ENTRIES.filter((entry) => entry.status === 'live');
    expect(links.map((link) => link.textContent)).toEqual(live.map((entry) => entry.linkText));
  });
});

describe('the toolbar routes off the front page', () => {
  beforeEach(() => { loadPage(); });

  // Every one of them lands on a page that offers a way back. A bare href
  // here would hand that page the defaults instead of the reader's own.
  it('carries the current scenario to the library, the pages and the sources', () => {
    const app = mountApp();
    app.state.set('population', 11.3);
    app.state.setName('Crowded century');
    for (const [id, path] of [['learn-toolbar', '/learn/'],
      ['library-toolbar', '/library.html'],
      ['bibliography-toolbar', '/bibliography.html']] as const) {
      const href = document.getElementById(id)?.getAttribute('href') ?? '';
      expect(href.startsWith(`${path}?s=11.3_`), id).toBe(true);
      expect(href, id).toContain('n=Crowded%20century');
    }
  });
});

describe('the scenario count on the front page', () => {
  beforeEach(() => { loadPage(); });

  // Printed from SCENARIO_COUNT, never typed into the markup, so a slider
  // whose range or step moves carries the sentence with it.
  it('prints the size of the space the sliders cover', () => {
    mountApp();
    const printed = document.getElementById('scenario-count')?.textContent ?? '';
    expect(printed).toBe(approximateScenarioCount());
    expect(printed).toBe('just over 1.2 quintillion');
    expect(printed).not.toBe('—');
    // The markup carries no figure at all, only the placeholder.
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    expect(html).toContain('id="scenario-count">&mdash;<');
    expect(html).not.toContain(SCENARIO_COUNT.toLocaleString('en-US'));
    expect(html).not.toContain('trillion');
  });

  // "Almost" and "just over" are claims about the rounding, so whichever the
  // page prints has to follow the number.
  it('picks almost or just over to match where the count actually sits', () => {
    const phrase = approximateScenarioCount();
    const match = /^(almost|just over) ([\d.]+) (\w+)$/.exec(phrase);
    expect(match, phrase).not.toBeNull();
    const [, qualifier, figure] = match as RegExpExecArray;
    const scale = { billion: 1_000_000_000n, trillion: 1_000_000_000_000n,
      quadrillion: 1_000_000_000_000_000n,
      quintillion: 1_000_000_000_000_000_000n }[(match as RegExpExecArray)[3] as string];
    const stated = BigInt(Math.round(Number(figure) * 10)) * (scale as bigint) / 10n;
    expect(qualifier).toBe(SCENARIO_COUNT < stated ? 'almost' : 'just over');
  });

  // It stands in the opening paragraph, not down beside the sliders.
  it('stands in the standfirst', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const standfirst = html.slice(html.indexOf('class="standfirst"'),
      html.indexOf('</p>', html.indexOf('class="standfirst"')));
    expect(standfirst).toContain('id="scenario-count"');
  });
});

describe('a published scenario on screen', () => {
  beforeEach(() => { loadPage(); });

  it('reports the reconstruction and names what the marker publishes beside it', () => {
    const app = mountApp();
    const medium = PRESETS.find((preset) => preset.id === 'cmip7-medium');
    if (medium === undefined) throw new Error('no CMIP7 MEDIUM preset');
    app.apply(medium.inputs);
    const report = app.lastReport();
    // The reconstruction, which is what the six sliders drive.
    expect(report?.outputs['tile-cumulative']).toBe('2,768');
    expect(report?.outputs['tile-warming']).toBe('2.94 °C');
    // The published figure stands beside it rather than replacing it.
    expect(report?.outputs['tile-cumulative-note']).toContain('CMIP7 MEDIUM publishes 2,770');
    expect(report?.outputs['tile-warming-note']).toContain('CMIP7 MEDIUM publishes 2.84 °C');
    // The reconstruction now tracks the marker's century total: 2,767 against
    // 2,770. What is left between the two warming figures is the emulator's
    // own residual, which no slider reaches.
    expect(report?.outputs['chart-caption']).toContain('reconstruction of CMIP7 MEDIUM');
    expect(report?.outputs['notes']).toContain('This sits on CMIP7 MEDIUM');
  });

  // The defect this replaced: the tiles reported the published totals until the
  // first slider move and the reconstruction afterwards, so one step of the
  // population slider changed which quantity was on screen. Lowering the 2100
  // population from 9.9 to 9.8 billion -- which lowers emissions -- showed
  // warming rising from 2.84 to 3.02 degrees.
  it('never raises warming when the population slider comes down', () => {
    const app = mountApp();
    const medium = PRESETS.find((preset) => preset.id === 'cmip7-medium');
    if (medium === undefined) throw new Error('no CMIP7 MEDIUM preset');
    app.apply(medium.inputs);
    const before = app.lastReport()?.outputs['tile-warming'] ?? '';
    const beforeC = Number.parseFloat(before);

    app.state.set('population', 9.8);
    const afterC = Number.parseFloat(app.lastReport()?.outputs['tile-warming'] ?? '');

    expect(Number.isFinite(beforeC) && Number.isFinite(afterC)).toBe(true);
    expect(afterC).toBeLessThanOrEqual(beforeC);
    // And the step is a step, not a mode switch.
    expect(Math.abs(afterC - beforeC)).toBeLessThan(0.05);
  });

  it('reports MEDIUM-to-LOW as published, and names the gap the right way round', () => {
    const app = mountApp();
    const ml = PRESETS.find((preset) => preset.id === 'cmip7-medium-to-low');
    if (ml === undefined) throw new Error('no CMIP7 MEDIUM-to-LOW preset');
    app.apply(ml.inputs);
    const report = app.lastReport();
    expect(report?.outputs['tile-cumulative']).toBe('1,712');
    expect(report?.outputs['tile-cumulative-note']).toContain('publishes 1,710');
    const notes = report?.outputs['notes'] ?? '';
    expect(notes).toContain('This sits on CMIP7 MEDIUM-to-LOW');
    // Once timing and removal carry this marker's own values, the
    // reconstruction lands on its century total rather than 480 GtCO2 under it.
    expect(notes).toContain('agree within 0%, 1,712 against 1,710 GtCO₂');
  });

  // The two technology bounds measure the reconstruction's total, which the
  // tiles now report whether or not a preset stands, so a bound sentence
  // judges a number the reader can see either way. It has to behave the same
  // on both sides of a slider move: a sentence that appeared or vanished on
  // the first touch would repeat the fault that made a preset's headline jump.
  it('applies the technology bounds to the reconstruction, preset or not', () => {
    const app = mountApp();
    const ml = PRESETS.find((preset) => preset.id === 'cmip7-medium-to-low');
    if (ml === undefined) throw new Error('no CMIP7 MEDIUM-to-LOW preset');
    app.apply(ml.inputs);
    const before = (app.lastReport()?.outputs['notes'] ?? '')
      .includes('you have passed the lowest total');
    app.state.set('landUse', -8.7);
    const after = (app.lastReport()?.outputs['notes'] ?? '')
      .includes('you have passed the lowest total');
    expect(after).toBe(before);
  });

  it('draws the reconstruction year by year and lights up the marker behind it', () => {
    const app = mountApp();
    const veryLow = PRESETS.find((preset) => preset.id === 'cmip7-very-low');
    const marker = MARKERS.find((candidate) => candidate.id === 'VL');
    if (veryLow === undefined || marker === undefined) throw new Error('no VERY LOW');
    app.apply(veryLow.inputs);
    const path = document.querySelector('#chart [data-user-path]')?.getAttribute('d') ?? '';
    const points = path.split(/[ML]/).filter(Boolean);
    // Annual, so far more points than the marker's five-yearly publication.
    expect(points.length).toBeGreaterThan(marker.co2Gt.length);
    // And VERY LOW itself is the marker picked out behind it.
    expect(document.querySelector('#chart [data-marker="VL"][data-highlight="1"]')).not.toBeNull();
  });

  it('hands back to the reconstruction as soon as a slider moves', () => {
    const app = mountApp();
    const medium = PRESETS.find((preset) => preset.id === 'cmip7-medium');
    if (medium === undefined) throw new Error('no CMIP7 MEDIUM preset');
    app.apply(medium.inputs);
    app.state.set('population', medium.inputs.population + 0.1);
    const report = app.lastReport();
    expect(report?.outputs['tile-cumulative']).not.toBe('2,770');
    expect(report?.outputs['chart']).not.toContain('as published');
    // Off the preset, the reader owns the six values, so the comparison with
    // the scenario they started from goes with them.
    expect(report?.outputs['notes']).not.toContain('as published');
  });

  it('leaves the presets we built ourselves as reconstructions', () => {
    const app = mountApp();
    const trend = PRESETS.find((preset) => preset.id === 'trend-continues');
    if (trend === undefined) throw new Error('no Trend continues preset');
    app.apply(trend.inputs);
    expect(app.lastReport()?.outputs['chart']).not.toContain('as published');
  });
});
