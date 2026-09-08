// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { mountApp } from '../src/app.js';
import { PRESETS } from '../src/model/bounds.js';

const HTML = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

function loadPage(url = '/'): void {
  const body = HTML.slice(HTML.indexOf('<body>') + '<body>'.length, HTML.indexOf('</body>'));
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, '');
  window.history.replaceState(null, '', url);
}

const text = (id: string) => document.getElementById(id)?.textContent ?? '';

describe('the scenario strip', () => {
  beforeEach(() => { loadPage(); });

  it('mounts, and reserves room for itself only once a script runs', () => {
    const app = mountApp();
    expect(app.strip()).not.toBeNull();
    expect(document.body.classList.contains('has-strip')).toBe(true);
  });

  // jsdom has no IntersectionObserver, so the strip keeps the state it starts
  // in: the chart counts as visible until something says otherwise.
  it('stays out of the way while the chart is on screen', () => {
    const app = mountApp();
    expect(app.strip()?.shown()).toBe(false);
    app.strip()?.chartInView(false);
    expect(app.strip()?.shown()).toBe(true);
    app.strip()?.chartInView(true);
    expect(app.strip()?.shown()).toBe(false);
  });

  // The whole point of the strip is that the reader trusts it in place of the
  // tiles. Two different answers for one scenario would be worse than none.
  it('says exactly what the tiles say, on load and after every change', () => {
    const app = mountApp();
    expect(text('strip-cumulative')).toBe(text('tile-cumulative'));
    expect(text('strip-warming')).toBe(text('tile-warming'));
    expect(text('strip-cumulative')).not.toBe('—');

    app.state.set('income', 3.1);
    expect(text('strip-cumulative')).toBe(text('tile-cumulative'));
    expect(text('strip-warming')).toBe(text('tile-warming'));
  });

  // With a CMIP7 preset untouched the tiles report that scenario as published,
  // and the strip has to follow them onto that basis rather than reporting the
  // reconstruction the chart is not drawing.
  it('follows the tiles onto a published scenario', () => {
    const app = mountApp();
    for (const preset of PRESETS) {
      app.apply(preset.inputs);
      expect(text('strip-cumulative'), preset.id).toBe(text('tile-cumulative'));
      expect(text('strip-warming'), preset.id).toBe(text('tile-warming'));
    }
  });

  it('carries the name the reader typed, and the preset label when one stands', () => {
    const app = mountApp();
    expect(text('strip-name')).toBe('Build your own');

    app.state.setName('Fast electrification');
    expect(text('strip-name')).toBe('Fast electrification');

    // Named, not searched-for-and-skipped: a preset id that stopped matching
    // would otherwise pass this test by testing nothing.
    const high = PRESETS.find((preset) => preset.id === 'cmip7-high');
    if (high === undefined) throw new Error('no preset with id cmip7-high');
    app.apply(high.inputs);
    // The strip names the scenario; the published figure lives in the tiles.
    expect(text('strip-name')).toContain('CMIP7 HIGH');
  });

  // The button swaps a long label for a short one below 480px by hiding one
  // span and showing the other. With the name left to the spans, a phone got
  // a button with no accessible name at all: the long label goes out of the
  // tree with display:none and the short one carries aria-hidden.
  it('keeps an accessible name whichever label shows', () => {
    mountApp();
    const jump = document.getElementById('strip-jump');
    expect(jump?.getAttribute('aria-label')).toBe('Show the chart');
    for (const span of document.querySelectorAll('#strip-jump span')) {
      expect(span.getAttribute('aria-hidden'), span.className).toBe('true');
    }
  });

  it('renders as a panel of its own, so a failure there cannot take the page down', () => {
    const app = mountApp();
    const names = app.lastReport()?.panels.map((entry) => entry.name) ?? [];
    expect(names).toContain('strip');
    expect(app.lastReport()?.panels.filter((entry) => !entry.ok)).toEqual([]);
  });
});
